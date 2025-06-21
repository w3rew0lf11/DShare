import os
import json
from typing import List

class PinningManager:
    def __init__(self, node):
        self.node = node
        self.pins_file = os.path.join(node.config['storage_path'], 'pins.json')
        self._ensure_pins_file()
        
    def _ensure_pins_file(self):
        """Ensure the pins file exists"""
        os.makedirs(os.path.dirname(self.pins_file), exist_ok=True)
        if not os.path.exists(self.pins_file):
            with open(self.pins_file, 'w') as f:
                json.dump([], f)
                
    def pin(self, cid: str):
        """Pin a file by its CID"""
        with open(self.pins_file, 'r') as f:
            pins = json.load(f)
            
        if cid not in pins:
            pins.append(cid)
            with open(self.pins_file, 'w') as f:
                json.dump(pins, f)
                
    def unpin(self, cid: str):
        """Unpin a file by its CID"""
        with open(self.pins_file, 'r') as f:
            pins = json.load(f)
            
        if cid in pins:
            pins.remove(cid)
            with open(self.pins_file, 'w') as f:
                json.dump(pins, f)
                
    def list_pinned(self) -> List[str]:
        """List all pinned CIDs"""
        with open(self.pins_file, 'r') as f:
            return json.load(f)
            
    def is_pinned(self, cid: str) -> bool:
        """Check if a CID is pinned"""
        with open(self.pins_file, 'r') as f:
            return cid in json.load(f)