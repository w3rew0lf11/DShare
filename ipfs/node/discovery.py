import socket
import threading
import time
import json
from typing import List, Dict, Set
from urllib.parse import urlparse
import logging, requests

class NodeDiscovery:
    def __init__(self, node, multicast_group: str = '239.255.255.250', port: int = 1900):
        self.node = node
        self.multicast_group = multicast_group
        self.port = port
        self.peers: Set[str] = set()
        self.running = False
        self.discovery_thread = None
        self.broadcast_thread = None
        self.logger = logging.getLogger('NodeDiscovery')
        
        # Initialize socket
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.sock.bind(('', self.port))
        
        # Add to multicast group
        mreq = socket.inet_aton(self.multicast_group) + socket.inet_aton('0.0.0.0')
        self.sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
        
    def start(self):
        """Start the discovery service"""
        if self.running:
            return
            
        self.running = True
        self.discovery_thread = threading.Thread(target=self._listen_for_peers)
        self.discovery_thread.daemon = True
        self.discovery_thread.start()
        
        self.broadcast_thread = threading.Thread(target=self._broadcast_presence)
        self.broadcast_thread.daemon = True
        self.broadcast_thread.start()
        
    def stop(self):
        """Stop the discovery service"""
        self.running = False
        if self.discovery_thread:
            self.discovery_thread.join(timeout=1)
        if self.broadcast_thread:
            self.broadcast_thread.join(timeout=1)
        self.sock.close()
        
    def _listen_for_peers(self):
        """Listen for peer announcements"""
        while self.running:
            try:
                data, address = self.sock.recvfrom(1024)
                message = json.loads(data.decode())
                
                if message.get('type') == 'discovery' and 'node_url' in message:
                    node_url = message['node_url']
                    if node_url not in self.peers and node_url != self._get_self_url():
                        self.peers.add(node_url)
                        self.node.network.peers.append(node_url)
                        self.logger.info(f"Discovered new peer: {node_url}")
            except Exception as e:
                self.logger.error(f"Error in discovery listener: {str(e)}")
                time.sleep(1)
                
    def _broadcast_presence(self):
        """Broadcast to bootstrap nodes instead of multicast"""
        for bootstrap in self.node.config['bootstrap_nodes']:
            try:
                requests.post(f"{bootstrap}/api/peers/announce", json={
                    'node_id': self.node.node_id,
                    'endpoint': self._get_self_url()
                }, timeout=2)
            except:
                pass
                
    def _get_self_url(self) -> str:
        """Get our own node URL"""
        return f"http://{self.node.config['api_host']}:{self.node.config['api_port']}"
        
    def get_peers(self) -> List[str]:
        """Get current list of discovered peers"""
        return list(self.peers)