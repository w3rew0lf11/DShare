import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import threading
from typing import List, Optional, Dict
from urllib.parse import urljoin
import os
import time
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
import asyncio
import aiohttp
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NetworkManager:
    def __init__(self, node, peers: List[str], timeout: int = 30):
        """
        Initialize the NetworkManager with connection pooling and retry strategies.
        
        Args:
            node: Reference to the parent node
            peers: List of peer URLs
            timeout: Operation timeout in seconds
        """
        self.node = node
        self.peers = peers
        self.timeout = timeout
        self.server_thread = None
        self.shutdown_event = threading.Event()
        
        # Configure thread pool for concurrent operations
        self.executor = ThreadPoolExecutor(
            max_workers=min(32, (os.cpu_count() or 1) * 4),
            thread_name_prefix='network_worker'
        )
        
        # Enhanced retry strategy with exponential backoff
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[408, 429, 500, 502, 503, 504],
            allowed_methods=['GET', 'POST']
        )
        
        # Configure session with connection pooling
        self.session = requests.Session()
        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=20,
            pool_maxsize=100,
            pool_block=False
        )
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
    def start(self):
        """Start network services including API server"""
        from api.server import start_api_server
        
        self.server_thread = threading.Thread(
            target=start_api_server,
            args=(self.node, self.node.config['api_host'], self.node.config['api_port']),
            daemon=True
        )
        self.server_thread.start()
        logger.info(f"Network services started on {self.node.config['api_host']}:{self.node.config['api_port']}")
        
    def stop(self):
        """Gracefully shutdown network services"""
        logger.info("Shutting down network services...")
        self.shutdown_event.set()
        
        # Shutdown executor
        self.executor.shutdown(wait=False)
        
        # Stop API server
        if self.server_thread and self.server_thread.is_alive():
            try:
                requests.get(
                    f"http://{self.node.config['api_host']}:{self.node.config['api_port']}/shutdown",
                    timeout=1
                )
                self.server_thread.join(timeout=2)
            except:
                pass
        
    async def replicate_to_peers_async(self, cid: str):
        """
        Asynchronously replicate file to peers using aiohttp for better performance
        with many peers.
        """
        file_path = self.node.storage.retrieve_file(cid)
        if not file_path or not os.path.exists(file_path):
            logger.warning(f"File {cid} not found for replication")
            return
            
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
            tasks = []
            for peer in self.peers:
                task = asyncio.create_task(self._replicate_to_peer_async(session, peer, cid, file_path))
                tasks.append(task)
            
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _replicate_to_peer_async(self, session, peer, cid, file_path):
        """Helper method for async replication"""
        start_time = time.time()
        url = urljoin(peer, '/api/add')
        
        try:
            with open(file_path, 'rb') as f:
                async with session.post(
                    url,
                    data={'file': f},
                    timeout=self.timeout
                ) as response:
                    if response.status == 200:
                        logger.info(f"Replicated {cid} to {peer} in {time.time()-start_time:.2f}s")
                    else:
                        logger.warning(f"Replication to {peer} failed with status {response.status}")
        except Exception as e:
            logger.error(f"Replication to {peer} failed after {time.time()-start_time:.2f}s: {str(e)}")

    def replicate_to_peers(self, cid: str):
        """
        Replicate a file to all peers with improved performance.
        Uses ThreadPoolExecutor for synchronous operation.
        """
        file_path = self.node.storage.retrieve_file(cid)
        if not file_path or not os.path.exists(file_path):
            logger.warning(f"File {cid} not found for replication")
            return
            
        def _replicate_to_peer(peer):
            start_time = time.time()
            url = urljoin(peer, '/api/add')
            
            try:
                # Use streaming upload with progress monitoring
                with open(file_path, 'rb') as f:
                    response = self.session.post(
                        url,
                        files={'file': (os.path.basename(file_path), f)},
                        timeout=self.timeout,
                        stream=True
                    )
                    
                    if response.status_code == 200:
                        logger.info(f"Replicated {cid} to {peer} in {time.time()-start_time:.2f}s")
                    else:
                        logger.warning(f"Replication to {peer} failed with status {response.status_code}")
            except Exception as e:
                logger.error(f"Replication to {peer} failed after {time.time()-start_time:.2f}s: {str(e)}")
        
        # Submit all replication tasks
        futures = []
        for peer in self.peers:
            if self.shutdown_event.is_set():
                break
            futures.append(self.executor.submit(_replicate_to_peer, peer))
        
        # Wait for completion with timeout
        for future in concurrent.futures.as_completed(futures, timeout=self.timeout*2):
            try:
                future.result()
            except Exception as e:
                logger.error(f"Replication error: {str(e)}")

    def request_file(self, cid: str) -> Optional[str]:
        """
        Request a file from the network with improved performance.
        Returns path to downloaded file if successful.
        """
        file_path = os.path.join(self.node.storage.storage_path, cid)
        
        # First check local storage
        if os.path.exists(file_path):
            return file_path
            
        # Try each peer until successful
        for peer in self.peers:
            if self.shutdown_event.is_set():
                break
                
            temp_path = f"{file_path}.tmp"
            start_time = time.time()
            url = urljoin(peer, f'/api/get/{cid}')
            
            try:
                with self.session.get(url, timeout=self.timeout, stream=True) as response:
                    if response.status_code == 200:
                        # Stream to temporary file first
                        os.makedirs(os.path.dirname(temp_path), exist_ok=True)
                        with open(temp_path, 'wb') as f:
                            for chunk in response.iter_content(chunk_size=8192):
                                if chunk and not self.shutdown_event.is_set():
                                    f.write(chunk)
                                    
                        # Atomic rename on success
                        os.rename(temp_path, file_path)
                        logger.info(f"Retrieved {cid} from {peer} in {time.time()-start_time:.2f}s")
                        return file_path
            except Exception as e:
                logger.error(f"Request from {peer} failed after {time.time()-start_time:.2f}s: {str(e)}")
                # Clean up temp file if exists
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except:
                        pass
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except:
                        pass
                        
        return None

    async def request_file_async(self, cid: str) -> Optional[str]:
        """
        Asynchronous version of file request for better performance with many peers.
        """
        file_path = os.path.join(self.node.storage.storage_path, cid)
        
        if os.path.exists(file_path):
            return file_path
            
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
            tasks = []
            for peer in self.peers:
                tasks.append(asyncio.create_task(self._request_from_peer_async(session, peer, cid, file_path)))
            
            for task in asyncio.as_completed(tasks):
                try:
                    result = await task
                    if result is not None:
                        return result
                except Exception as e:
                    logger.error(f"Async request failed: {str(e)}")
                    
        return None

    async def _request_from_peer_async(self, session, peer, cid, file_path):
        """Helper method for async file request"""
        temp_path = f"{file_path}.tmp"
        start_time = time.time()
        url = urljoin(peer, f'/api/get/{cid}')
        
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    os.makedirs(os.path.dirname(temp_path), exist_ok=True)
                    with open(temp_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)
                    
                    os.rename(temp_path, file_path)
                    logger.info(f"Retrieved {cid} from {peer} in {time.time()-start_time:.2f}s")
                    return file_path
        except Exception as e:
            logger.error(f"Async request from {peer} failed: {str(e)}")
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass
        return None