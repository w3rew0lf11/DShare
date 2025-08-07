import os, requests
import json
from .utils import generate_cid, ensure_dir
from .chunker import Chunker


class Storage:
    def __init__(self, config, network=None):  # Add network parameter
        self.storage_path = os.path.abspath(config['storage_path'])
        ensure_dir(self.storage_path)
        self.chunk_size = config['chunk_size']
        self.chunker = Chunker(self.chunk_size)
        self.network = network  # Store network reference
        
        self.chunk_locations_path = os.path.join(self.storage_path, 'chunk_locations.json')
        self.file_locations_path = os.path.join(self.storage_path, 'file_locations.json')
        if not os.path.exists(self.file_locations_path):
            with open(self.file_locations_path, 'w') as f:
                json.dump({}, f)
        if not os.path.exists(self.chunk_locations_path):
            with open(self.chunk_locations_path, 'w') as f:
                json.dump({}, f)
                


    def update_file_location(self, cid, peer_url):
        """Update which peers have which files"""
        with open(self.file_locations_path, 'r') as f:
            locations = json.load(f)
            
        if cid not in locations:
            locations[cid] = []
        if peer_url not in locations[cid]:
            locations[cid].append(peer_url)
            
        with open(self.file_locations_path, 'w') as f:
            json.dump(locations, f)

    def get_file_locations(self, cid):
        """Get all peers that have this file"""
        with open(self.file_locations_path, 'r') as f:
            locations = json.load(f)
        return locations.get(cid, [])
    

    def store_file(self, file_path):
        """Store a file and automatically propagate to all active peers"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File {file_path} does not exist")

        # Store chunks and get their CIDs
        chunk_cids = self.chunker.store_chunks(file_path, self.storage_path)

        # Create and store manifest
        manifest = {
            'chunks': chunk_cids,
            'filename': os.path.basename(file_path)
        }
        manifest_data = json.dumps(manifest).encode('utf-8')
        root_cid = generate_cid(manifest_data)

        manifest_path = os.path.join(self.storage_path, root_cid)
        with open(manifest_path, 'wb') as f:
            f.write(manifest_data)

        # Update tracking
        self._update_chunk_locations(root_cid, chunk_cids)
        self.update_file_location(root_cid, self.network.api_url)

        # Propagate to all active peers
        if hasattr(self, 'network') and self.network:
            # First propagate manifest
            self.network.propagate_manifest(root_cid, manifest_data)

            # Then propagate all chunks
            for cid in chunk_cids:
                chunk_path = os.path.join(self.storage_path, cid)
                with open(chunk_path, 'rb') as f:
                    chunk_data = f.read()
                self.network.propagate_chunk(cid, chunk_data)

        return root_cid

    def retrieve_file(self, root_cid):
        """Retrieve file data from chunks without creating temp file"""
        manifest_path = os.path.join(self.storage_path, root_cid)
        if not os.path.exists(manifest_path):
            raise FileNotFoundError(f"Manifest {root_cid} not found")
        
        with open(manifest_path, 'rb') as f:
            manifest = json.loads(f.read().decode('utf-8'))
        
        # Generator that yields file data by reading chunks sequentially
        def generate():
            for cid in manifest['chunks']:
                chunk_path = os.path.join(self.storage_path, cid)
                if not os.path.exists(chunk_path):
                    raise FileNotFoundError(f"Chunk {cid} not found")
                with open(chunk_path, 'rb') as chunk_file:
                    yield chunk_file.read()
        
        return generate(), manifest['filename']
    
    def has_chunk(self, cid):
        return os.path.exists(os.path.join(self.storage_path, cid))

    def _update_chunk_locations(self, root_cid, chunk_cids):
        with open(self.chunk_locations_path, 'r') as f:
            locations = json.load(f)
            
        for cid in chunk_cids:
            if cid not in locations:
                locations[cid] = []
            if root_cid not in locations[cid]:
                locations[cid].append(root_cid)
                
        with open(self.chunk_locations_path, 'w') as f:
            json.dump(locations, f)
            
    def get_all_files(self):
        """Get all files with their names and CIDs"""
        files = []
        for filename in os.listdir(self.storage_path):
            filepath = os.path.join(self.storage_path, filename)
            if os.path.isfile(filepath):
                # Skip chunk files and metadata files
                if (len(filename) == 64 and  # Assuming CIDs are 64 chars
                    not filename.endswith('.json')):
                    try:
                        with open(filepath, 'rb') as f:
                            manifest = json.loads(f.read().decode('utf-8'))
                            files.append({
                                'cid': filename,
                                'name': manifest.get('filename', 'unknown')
                            })
                    except:
                        continue
        return files