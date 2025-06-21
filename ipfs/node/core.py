import os
import hashlib
import json
from typing import Dict, List, Optional
from pathlib import Path
from .storage import Storage
from .network import NetworkManager
from .pinning import PinningManager

# Add to imports
from .discovery import NodeDiscovery

class IPFSNode:
    def __init__(self, config: dict):
        self.node_id = hashlib.sha256(config['node_name'].encode()).hexdigest()
        self.config = config
        self.config['storage_path'] = os.path.abspath(config['storage_path'])
        
        self.storage = Storage(self.config['storage_path'])
        self.network = NetworkManager(self, config.get('peers', []))
        self.pinning = PinningManager(self)
        self.discovery = NodeDiscovery(self)  # Add discovery service
        
    def start(self):
        """Start the node services"""
        self.discovery.start()  # Start discovery first
        self.network.start()
        
    def stop(self):
        """Stop the node services"""
        self.network.stop()
        self.discovery.stop()
                
    def add_file(self, file_path: str, pin: bool = True) -> str:
        """Add a file to the network"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File {file_path} not found")
            
        # Store file locally
        cid = self.storage.store_file(file_path)
        
        # Automatically pin the file
        if pin:
            self.pinning.pin(cid)
            
        # Replicate to peers
        self.network.replicate_to_peers(cid)
        
        return cid
        
    def get_file(self, cid: str) -> Optional[str]:
        """Retrieve a file by its CID"""
        # First try local storage
        file_path = self.storage.retrieve_file(cid)
        if file_path:
            return file_path
            
        # If not found locally, request from network
        return self.network.request_file(cid)
        
    def list_files(self) -> Dict[str, List[str]]:
        """List all files in the node"""
        return {
            'local': self.storage.list_files(),
            'pinned': self.pinning.list_pinned()
        }
        
    def list_chunks(self) -> Dict[str, List[Dict]]:
        """List all chunks in the node"""
        return self.storage.list_chunks()