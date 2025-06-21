import os
import hashlib
import shutil
from typing import Optional, List, Dict
import threading
import mmap
from concurrent.futures import ThreadPoolExecutor
import concurrent.futures

class Storage:
    def __init__(self, storage_path: str, chunk_size: int = 262144):
        """
        Initialize the storage system.
        
        Args:
            storage_path: Path to store files and chunks
            chunk_size: Size of chunks in bytes (default: 256KB)
        """
        self.storage_path = os.path.abspath(storage_path)
        self.chunk_size = chunk_size
        self.chunks_dir = os.path.join(self.storage_path, 'chunks')
        self.lock = threading.Lock()  # For thread-safe operations
        
        # Create directories if they don't exist
        os.makedirs(self.chunks_dir, exist_ok=True)
        os.makedirs(self.storage_path, exist_ok=True)
        
    def _calculate_cid(self, file_path: str) -> str:
        """Calculate Content ID for a file with memory mapping"""
        hasher = hashlib.sha256()
        with open(file_path, 'rb') as f:
            # Memory map the file for faster reading
            with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                # Process in chunks to be memory efficient with very large files
                offset = 0
                while offset < len(mm):
                    chunk = mm[offset:offset+self.chunk_size]
                    hasher.update(chunk)
                    offset += self.chunk_size
        return 'Qm' + hasher.hexdigest()
        
    def store_file(self, file_path: str) -> str:
        """Store a file and return its CID"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File {file_path} does not exist")
            
        # Calculate CID first
        cid = self._calculate_cid(file_path)
        target_path = os.path.join(self.storage_path, cid)
        
        # Only store if file doesn't already exist
        if not os.path.exists(target_path):
            # Use hard links if possible for faster "copying"
            try:
                os.link(file_path, target_path)
            except (OSError, AttributeError):
                # Fall back to copy if hard links don't work or not supported
                shutil.copy2(file_path, target_path)
            
            # Store chunks in parallel
            self._store_chunks_parallel(file_path, cid)
        
        return cid
        
    def _store_chunks_parallel(self, file_path: str, cid: str):
        """Store chunks in parallel using ThreadPool"""
        def store_chunk(chunk_data: bytes, chunk_index: int):
            """Helper function to store a single chunk"""
            chunk_hash = hashlib.sha256(chunk_data).hexdigest()
            chunk_path = os.path.join(
                self.chunks_dir, 
                f"{cid}_{chunk_index}_{chunk_hash}"
            )
            
            # Double-check pattern to avoid race conditions
            if not os.path.exists(chunk_path):
                with self.lock:  # Ensure thread-safe file operations
                    if not os.path.exists(chunk_path):
                        # Write to temporary file first, then rename (atomic operation)
                        temp_path = chunk_path + '.tmp'
                        with open(temp_path, 'wb') as chunk_file:
                            chunk_file.write(chunk_data)
                        os.rename(temp_path, chunk_path)
        
        with ThreadPoolExecutor(max_workers=min(4, os.cpu_count() or 1)) as executor:
            futures = []
            chunk_index = 0
            
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(self.chunk_size)
                    if not chunk:
                        break
                    # Submit chunk storage task
                    futures.append(executor.submit(
                        store_chunk, 
                        chunk, 
                        chunk_index
                    ))
                    chunk_index += 1
            
            # Wait for all chunks to be stored
            for future in concurrent.futures.as_completed(futures):
                try:
                    future.result()  # Check for exceptions
                except Exception as e:
                    print(f"Error storing chunk: {str(e)}")
        
    def retrieve_file(self, cid: str) -> Optional[str]:
        """
        Retrieve a file by CID.
        
        Args:
            cid: Content ID of the file to retrieve
            
        Returns:
            Path to the file if found, None otherwise
        """
        file_path = os.path.join(self.storage_path, cid)
        return file_path if os.path.exists(file_path) else None
        
    def list_files(self) -> List[str]:
        """List all files in storage"""
        try:
            with os.scandir(self.storage_path) as it:
                return [entry.name for entry in it if entry.is_file()]
        except OSError:
            return []
               
    def list_chunks(self) -> Dict[str, List[Dict]]:
        """
        List all chunks with metadata.
        
        Returns:
            Dictionary mapping CIDs to list of chunk metadata
        """
        chunks = {}
        try:
            with os.scandir(self.chunks_dir) as it:
                for entry in it:
                    if entry.is_file() and '_' in entry.name:
                        parts = entry.name.split('_')
                        if len(parts) >= 3:
                            cid = parts[0]
                            if cid not in chunks:
                                chunks[cid] = []
                            chunks[cid].append({
                                'index': int(parts[1]),
                                'hash': '_'.join(parts[2:]),
                                'path': entry.path
                            })
        except OSError:
            pass
        return chunks