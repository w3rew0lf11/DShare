import threading
import time
import requests
import uuid
import platform
import json
import os
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

class Network:
    def __init__(self, config):
        self.config = config
        self.node_id = str(uuid.uuid4())
        self.node_name = self._generate_node_name()
        self.peers = {}
        self.bootstrap_nodes = config.get('bootstrap_nodes', [])
        self.host = config['host']
        self.port = config['port']
        # self.api_url = f"http://{self.host}:{self.port}"
        self.api_url = self._get_public_api_url()
        self.peers_file = os.path.join(config['storage_path'], 'peers.json')
        self.scan_ports = config.get('scan_ports', [5000, 5001, 5002])
        self.scan_timeout = config.get('scan_timeout', 1.5)
        
        # Enhanced configuration parameters
        self.peer_timeout = config.get('peer_timeout', 15)  # Seconds before marking inactive
        self.peer_check_interval = config.get('peer_check_interval', 5)  # Check frequency
        self.max_retries = config.get('max_retries', 2)  # Retry attempts
        self.discovery_config = config.get('discovery', {
            'aggressive_threshold': 3,
            'moderate_threshold': 5,
            'scan_threads': 20
        })
        
        self._load_peers()
        
    def _generate_node_name(self):
        hostname = platform.node() or "unknown-host"
        return f"{hostname}-{self.node_id[:8]}"
        
    def _load_peers(self):
        try:
            if os.path.exists(self.peers_file):
                with open(self.peers_file, 'r') as f:
                    self.peers = json.load(f)

                # Clean up invalid entries
                self.peers = {
                    url: info for url, info in self.peers.items()
                    if url != self.api_url  # Remove self-reference
                    and not url.startswith('http://0.0.0.0')  # Remove 0.0.0.0
                    and not any(  # Remove duplicates with different URLs
                        u != url and u.split('//')[-1].split(':')[0] == url.split('//')[-1].split(':')[0]
                        for u in self.peers
                    )
                }
        except Exception as e:
            print(f"Error loading peers: {e}")
            self.peers = {}
            
    def _save_peers(self):
        try:
            with open(self.peers_file, 'w') as f:
                json.dump(self.peers, f)
        except Exception as e:
            print(f"Error saving peers: {e}")
        
    def start(self):
        # Wait for API server to start
        time.sleep(2)
        
        # Connect to bootstrap nodes first
        for node in self.bootstrap_nodes:
            if node:  # Only try if not empty
                if node.startswith('https://') and self.api_url.startswith('http://'):
                    node = node.replace('https://', 'http://')
                self.connect_to_peer(node)
            
        # Then try saved peers
        for peer_url in list(self.peers.keys()):
            self.connect_to_peer(peer_url)
            
        # Start background discovery
        threading.Thread(
            target=self._continuous_discovery,
            daemon=True
        ).start()
        
        # Start maintenance thread
        threading.Thread(
            target=self._peer_maintenance,
            daemon=True
        ).start()
        
    def _continuous_discovery(self):
        """Hybrid discovery with prioritized scanning"""
        while True:
            active_count = sum(1 for p in self.peers.values() 
                          if time.time() - p.get('last_seen', 0) < self.peer_timeout)
            
            # Discovery modes based on peer count
            if active_count < self.discovery_config['aggressive_threshold']:
                self._prioritized_scan()
                time.sleep(2)
            elif active_count < self.discovery_config['moderate_threshold']:
                self._prioritized_scan()
                time.sleep(10)
            else:
                time.sleep(30)
    
    def _prioritized_scan(self):
        """Scan nearby IPs first for faster discovery"""
        local_ip = self._get_local_ip()
        if not local_ip:
            return
            
        base_octets = local_ip.split('.')[:3]
        base_ip = '.'.join(base_octets)
        
        # Scan sequence: same subnet first, then nearby subnets
        scan_sequence = [
            *range(1, 255),  # Local subnet
            *range(1, 255)   # Nearby subnets (could be expanded)
        ]
        
        with ThreadPoolExecutor(max_workers=self.discovery_config['scan_threads']) as executor:
            for last_octet in scan_sequence:
                ip = f"{base_ip}.{last_octet}"
                for port in self.scan_ports:
                    executor.submit(self._probe_peer, ip, port)
    
    def _probe_peer(self, ip, port):
        """Probe a potential peer"""
        peer_url = f"http://{ip}:{port}"
        if peer_url not in self.peers and peer_url != self.api_url:
            self.connect_to_peer(peer_url)
    
    def _peer_maintenance(self):
        """Enhanced peer maintenance with faster failure detection"""
        while True:
            dead_peers = []
            
            with ThreadPoolExecutor(max_workers=10) as executor:
                futures = {
                    executor.submit(self._check_peer_status, url, info): url
                    for url, info in self.peers.items()
                }
                
                for future in as_completed(futures):
                    url = futures[future]
                    try:
                        is_active = future.result()
                        if not is_active:
                            dead_peers.append(url)
                    except Exception:
                        dead_peers.append(url)
            
            # Remove dead peers
            for url in dead_peers:
                if url in self.peers:
                    del self.peers[url]
            self._save_peers()
            
            time.sleep(self.peer_check_interval)
    
    def _check_peer_status(self, url, info):
        """Check individual peer status with timeout and retries"""
        for attempt in range(self.max_retries):
            try:
                start = time.time()
                response = requests.get(
                    f"{url}/api/ping", 
                    timeout=self.peer_timeout/self.max_retries
                )
                if response.status_code == 200:
                    self.peers[url]['last_seen'] = time.time()
                    self.peers[url]['latency'] = time.time() - start
                    return True
            except requests.exceptions.RequestException:
                continue
        return False
    def _continuous_discovery(self):
        """Hybrid discovery with prioritized scanning"""
        while True:
            active_count = sum(1 for p in self.peers.values() 
                          if time.time() - p.get('last_seen', 0) < self.peer_timeout)
            
            # Discovery modes based on peer count
            if active_count < self.discovery_config['aggressive_threshold']:
                self._prioritized_scan()
                time.sleep(2)
            elif active_count < self.discovery_config['moderate_threshold']:
                self._prioritized_scan()
                time.sleep(10)
            else:
                time.sleep(30)
    def connect_to_peer(self, peer_url):
        """Enhanced peer connection with fast-fail"""
        try:
            # First do a quick ping check
            ping_response = requests.get(
                f"{peer_url}/api/ping",
                timeout=2  
            )
            if ping_response.status_code != 200:
                return False
                
            # Then get full info if ping succeeded
            response = requests.get(
                f"{peer_url}/api/info",
                timeout=5
            )

            if response.status_code == 200:
                info = response.json()

                # Ensure we're not connecting to ourselves
                if info['node_id'] == self.node_id:
                    return False

                # Store the peer information
                self.peers[peer_url] = {
                    'id': info['node_id'],
                    'name': info['node_name'],
                    'last_seen': time.time(),
                    'first_seen': self.peers.get(peer_url, {}).get('first_seen', time.time()),
                    'source': 'manual' if peer_url in self.bootstrap_nodes else 'discovered',
                    'ip': self._extract_ip_from_url(peer_url),
                    'latency': None
                }
                self._save_peers()

                # Notify peer about us
                self._notify_peer_of_our_existence(peer_url)
                return True

        except requests.exceptions.RequestException as e:
            print(f"Connection to {peer_url} failed: {e}")
            return False

    def _normalize_peer_url(self, url):
        """Convert 0.0.0.0 to actual IP and standardize format"""
        try:
            if not url or '://' not in url:
                return None

            # Replace 0.0.0.0 with local IP if possible
            if '0.0.0.0' in url:
                local_ip = self._get_local_ip()
                if not local_ip:
                    return None
                url = url.replace('0.0.0.0', local_ip)

            # Standardize URL format
            parsed = requests.utils.urlparse(url)
            if not parsed.netloc:
                return None

            # Ensure port is included
            if ':' not in parsed.netloc:
                netloc = f"{parsed.netloc}:{self.port}" 
            else:
                netloc = parsed.netloc

            return f"{parsed.scheme or 'http'}://{netloc}"
        except Exception as e:
            print(f"URL normalization failed: {e}")
            return None

    def _find_existing_connection(self, normalized_url):
        """Check if we're already connected to this node via different URL"""
        target_ip = self._extract_ip_from_url(normalized_url)
        if not target_ip:
            return None

        for existing_url in self.peers:
            existing_ip = self._extract_ip_from_url(existing_url)
            if existing_ip == target_ip:
                return existing_url
        return None

    def _extract_ip_from_url(self, url):
        """Extract just the IP/hostname from URL"""
        try:
            return url.split('://')[1].split(':')[0]
        except:
            return None

    def _notify_peer_of_our_existence(self, peer_url):
        """Handles peer notification with retries"""
        max_retries = 2
        for attempt in range(max_retries):
            try:
                requests.post(
                    f"{peer_url}/api/peers/notify",
                    json={
                        'url': self.api_url,
                        'info': {
                            'id': self.node_id,
                            'name': self.node_name,
                            'last_seen': time.time()
                        }
                    },
                    timeout=3
                )
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    print(f"Peer notification to {peer_url} failed: {e}")

    def _fetch_and_process_peer_list(self, peer_url):
        """Fetch and process peer list with safeguards"""
        try:
            response = requests.get(f"{peer_url}/api/peers", timeout=5)
            if response.status_code == 200:
                for peer in response.json():
                    if peer['url'] != self.api_url:
                        # Prevent infinite recursion by limiting depth
                        if len(self.peers) < 20:  
                            self.connect_to_peer(peer['url'])
        except Exception as e:
            print(f"Failed to process peer list from {peer_url}: {e}")

    def _get_local_ip(self):
        """Get primary local IP address"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception as e:
            print(f"Error getting local IP: {e}")
            return None
            
    def propagate_chunk(self, cid, data):
        """Send chunk to all active peers in parallel"""
        active_peers = [
            url for url, info in self.peers.items()
            if time.time() - info.get('last_seen', 0) < self.peer_timeout
            and url != self.api_url  # Don't send to ourselves
        ]

        def _send_chunk(peer_url):
            try:
                # Skip if peer already has it
                response = requests.head(
                    f"{peer_url}/api/chunks/{cid}",
                    timeout=2
                )
                if response.status_code == 200:
                    return True

                encoded_data = data.decode('latin1') if isinstance(data, bytes) else data
                requests.post(
                    f"{peer_url}/api/chunks",
                    json={
                        'cid': cid,
                        'data': encoded_data
                    },
                    timeout=10
                )
                print(f"Propagated chunk {cid[:8]} to {peer_url}")
                return True
            except Exception as e:
                print(f"Failed to propagate chunk to {peer_url}: {str(e)}")
                return False

        # Use thread pool for parallel propagation
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(_send_chunk, peer_url) for peer_url in active_peers]
            for future in as_completed(futures):
                future.result()  # Just wait for completion, we don't need the results

    def propagate_manifest(self, cid, data):
        """Send manifest to all active peers in parallel"""
        active_peers = [
            url for url, info in self.peers.items()
            if time.time() - info.get('last_seen', 0) < self.peer_timeout
            and url != self.api_url  # Don't send to ourselves
        ]

        def _send_manifest(peer_url):
            try:
                # Skip if peer already has it
                response = requests.head(
                    f"{peer_url}/api/manifests/{cid}",
                    timeout=2
                )
                if response.status_code == 200:
                    return True

                encoded_data = data.decode('latin1') if isinstance(data, bytes) else data
                requests.post(
                    f"{peer_url}/api/manifests",
                    json={
                        'cid': cid,
                        'data': encoded_data
                    },
                    timeout=10
                )
                print(f"Propagated manifest {cid[:8]} to {peer_url}")
                return True
            except Exception as e:
                print(f"Failed to propagate manifest to {peer_url}: {str(e)}")
                return False

        # Use thread pool for parallel propagation
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(_send_manifest, peer_url) for peer_url in active_peers]
            for future in as_completed(futures):
                future.result()  # Just wait for completion
                
    def get_chunk_from_peers(self, cid):
        """Fetch chunk from first available peer"""
        for peer_url, peer_info in self.peers.items():
            if time.time() - peer_info.get('last_seen', 0) > self.peer_timeout:
                continue
                
            try:
                response = requests.get(f"{peer_url}/api/chunks/{cid}", timeout=5)
                if response.status_code == 200:
                    return response.content
            except requests.exceptions.RequestException:
                continue
        return None
        
    def get_manifest_from_peers(self, cid):
        """Fetch manifest from first available peer"""
        for peer_url, peer_info in self.peers.items():
            if time.time() - peer_info.get('last_seen', 0) > self.peer_timeout:
                continue
                
            try:
                response = requests.get(f"{peer_url}/api/manifests/{cid}", timeout=5)
                if response.status_code == 200:
                    return response.content
            except requests.exceptions.RequestException:
                continue
        return None
    
    def get_peer_stats(self):
        """Return detailed peer statistics"""
        stats = {
            'node_id': self.node_id,
            'node_name': self.node_name,
            'api_url': self.api_url,
            'total_peers': len(self.peers),
            'active_peers': sum(1 for p in self.peers.values() 
                              if time.time() - p.get('last_seen', 0) < self.peer_timeout),
            'peer_list': []
        }
        
        for url, info in self.peers.items():
            stats['peer_list'].append({
                'url': url,
                'name': info.get('name'),
                'source': info.get('source', 'unknown'),
                'uptime': time.time() - info.get('first_seen', time.time()),
                'last_contact': time.time() - info.get('last_seen', 0),
                'latency': info.get('latency'),
                'status': 'active' if time.time() - info.get('last_seen', 0) < self.peer_timeout else 'inactive'
            })
        
        return stats
    
    def print_peer_table(self):
        """Print formatted peer table to console"""
        print("\n=== Network Peer Table ===")
        print(f"{'URL':<30} {'Name':<20} {'Source':<10} {'Status':<10} {'Latency':<8} {'Last Seen':<12}")
        print("-" * 80)
        
        for url, info in self.peers.items():
            status = 'ACTIVE' if time.time() - info.get('last_seen', 0) < self.peer_timeout else 'INACTIVE'
            uptime = time.time() - info.get('first_seen', time.time())
            last_seen = time.time() - info.get('last_seen', 0)
            latency = f"{info.get('latency', 0)*1000:.1f}ms" if info.get('latency') else "N/A"
            
            print(f"{url:<30} {info.get('name','unknown'):<20} "
                  f"{info.get('source','unknown'):<10} {status:<10} "
                  f"{latency:<8} {last_seen:.1f}s ago")

    def _get_public_api_url(self):
        """Get the publicly reachable API URL"""
        if self.host == '0.0.0.0':
            return f"http://{self._get_local_ip()}:{self.port}"
        return self.api_url
    
    def propagate_file_availability(self, cid):
        """Notify peers that we have this file"""
        for peer_url, peer_info in self.peers.items():
            if time.time() - peer_info.get('last_seen', 0) > self.peer_timeout:
                continue
                
            try:
                requests.post(
                    f"{peer_url}/api/files/availability",
                    json={
                        'cid': cid,
                        'url': self.api_url
                    },
                    timeout=3
                )
            except Exception as e:
                print(f"Failed to propagate file availability: {str(e)}")

    def find_file_location(self, cid):
        """Find which peers have this file"""
        locations = []
        for peer_url, peer_info in self.peers.items():
            if time.time() - peer_info.get('last_seen', 0) > self.peer_timeout:
                continue
                
            try:
                response = requests.get(
                    f"{peer_url}/api/files/{cid}/exists",
                    timeout=2
                )
                if response.status_code == 200 and response.json().get('exists'):
                    locations.append(peer_url)
            except Exception:
                continue
        return locations

    def fetch_file_from_peer(self, cid, peer_url):
        """Download file from another peer"""
        try:
            response = requests.get(
                f"{peer_url}/api/files/{cid}",
                stream=True,
                timeout=30
            )
            if response.status_code == 200:
                temp_path = os.path.join(self.storage.storage_path, f"{cid}")
                with open(temp_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                # Store the file properly
                root_cid = self.storage.store_file(temp_path)
                os.remove(temp_path)
                return root_cid
        except Exception as e:
            print(f"Failed to fetch file from peer: {str(e)}")
        return None    
    
    def get_files_from_peers(self):
        """Get file lists from all active peers"""
        all_files = []
        active_peers = [
            url for url, info in self.peers.items()
            if time.time() - info.get('last_seen', 0) < self.peer_timeout
        ]
        
        for peer_url in active_peers:
            try:
                response = requests.get(
                    f"{peer_url}/api/files",
                    timeout=3
                )
                if response.status_code == 200:
                    peer_files = response.json()
                    for file in peer_files:
                        file['peer'] = peer_url  # Track which peer has it
                    all_files.extend(peer_files)
            except Exception as e:
                print(f"Failed to get files from {peer_url}: {str(e)}")
        
        return all_files
