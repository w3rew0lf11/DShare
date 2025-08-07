import datetime
import json
import threading
import time
import os
from flask import Flask, Response, redirect, request, jsonify, send_file
from threading import Thread

import requests
from .storage import Storage
from .network import Network
from .utils import generate_cid
from flask import Flask
from flask_cors import CORS

from flask import Flask
from flask_cors import CORS

class API:
    def __init__(self, config, storage, network):
        self.config = config
        self.storage = storage
        self.network = network
        self.app = Flask(__name__)
        CORS(self.app)  # ✅ Apply CORS to the correct app instance
        self._setup_routes()

        
    def _setup_routes(self):
        @self.app.route('/api/info', methods=['GET'])
        def node_info():
            return jsonify({
                'node_id': self.network.node_id,
                'node_name': self.network.node_name,
                'api_url': self.network.api_url
            })
            
        @self.app.route('/api/files', methods=['GET'])
        def list_files():
            """List all files available locally and from peers"""
            try:
                # Get local files
                local_files = self.storage.get_all_files()
                
                # Get files from peers if requested
                include_peers = request.args.get('peers', 'false').lower() == 'true'
                peer_files = []
                if include_peers and hasattr(self.storage, 'network') and self.storage.network:
                    peer_files = self.storage.network.get_files_from_peers()
                
                return jsonify({
                    'local_files': local_files,
                    'peer_files': peer_files,
                    'timestamp': time.time()
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
            
        @self.app.route('/api/ping', methods=['GET'])
        def ping():
            return jsonify({
                'status': 'alive',
                'timestamp': time.time(),
                'node_id': self.network.node_id
            })        

        @self.app.route('/api/peers', methods=['GET'])
        def list_peers():
            peers = []
            for url, info in self.network.peers.items():
                peers.append({
                    'url': url,
                    'info': info,
                    'status': 'active' if time.time() - info.get('last_seen', 0) < 60 else 'inactive'
                })
            return jsonify(peers)

        @self.app.route('/api/peers/notify', methods=['POST'])
        def notify_peer():
            try:
                data = request.get_json()
                peer_url = data['url']
                peer_info = data['info']
                
                # Force update even if peer exists
                self.network.peers[peer_url] = {
                    **peer_info,
                    'last_seen': time.time(),
                    'force_active': True  # New flag
                }
                return jsonify({'status': 'ok'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

                    
        @self.app.route('/api/files', methods=['POST'])
        def upload_file():
            try:
                if 'file' not in request.files:
                    return jsonify({'error': 'No file provided'}), 400
                file = request.files['file']
                filename = file.filename
                temp_path = os.path.join(self.storage.storage_path, f"{filename}")
                file.save(temp_path)

                # Store file and get CID
                root_cid = self.storage.store_file(temp_path)

                # Propagate file availability to peers
                if hasattr(self.storage, 'network') and self.storage.network:
                    self.storage.network.propagate_file_availability(root_cid)

                return jsonify({
                    'cid': root_cid,
                    'filename': filename,
                    'message': 'File uploaded successfully'
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                            
            
        @self.app.route('/api/files/<cid>', methods=['GET'])
        def download_file(cid):
            """Download file with failback to other peers"""
            try:
                # First try to serve locally
                if self.storage.has_chunk(cid):
                    chunk_generator, original_filename = self.storage.retrieve_file(cid)
                    return Response(
                        chunk_generator,
                        mimetype='application/octet-stream',
                        headers={
                            'Content-Disposition': f'attachment; filename="{original_filename}"'
                        }
                    )
                
                # If not found locally, try to fetch from peers
                locations = self.network.find_file_location(cid)
                if locations:
                    # Try each peer until we get the file
                    for peer_url in locations:
                        try:
                            response = requests.get(
                                f"{peer_url}/api/files/{cid}",
                                stream=True,
                                timeout=10
                            )
                            if response.status_code == 200:
                                # Stream the response back to client while also storing
                                def generate():
                                    temp_chunks = []
                                    for chunk in response.iter_content(chunk_size=8192):
                                        if chunk:
                                            temp_chunks.append(chunk)
                                            yield chunk
                                    
                                    # After streaming to client, store the file
                                    temp_path = os.path.join(self.storage.storage_path, f"temp_{cid}")
                                    with open(temp_path, 'wb') as f:
                                        for c in temp_chunks:
                                            f.write(c)
                                    self.storage.store_file(temp_path)
                                    os.remove(temp_path)
                                
                                filename = response.headers.get('Content-Disposition', '').split('filename=')[-1].strip('"')
                                return Response(
                                    generate(),
                                    mimetype='application/octet-stream',
                                    headers={
                                        'Content-Disposition': f'attachment; filename="{filename}"'
                                    }
                                )
                        except Exception:
                            continue
                
                return jsonify({'error': 'File not found'}), 404
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/files/<cid>/exists', methods=['GET'])
        def file_exists(cid):
            """Check if file exists locally"""
            exists = self.storage.has_chunk(cid)
            return jsonify({'exists': exists, 'cid': cid})

        @self.app.route('/api/files/availability', methods=['POST'])
        def file_availability():
            """Notify that a peer has this file"""
            try:
                data = request.get_json()
                cid = data['cid']
                peer_url = data['url']
                self.storage.update_file_location(cid, peer_url)
                return jsonify({'status': 'ok'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500
                

        # In api.py
        @self.app.route('/api/chunks', methods=['POST'])
        def receive_chunk():
            try:
                data = request.json
                cid = data['cid']
                chunk_data = data['data'].encode('latin1') if isinstance(data['data'], str) else data['data']

                chunk_path = os.path.join(self.storage.storage_path, cid)
                if not os.path.exists(chunk_path):
                    with open(chunk_path, 'wb') as f:
                        f.write(chunk_data)
                    print(f"Saved new chunk: {cid[:8]}...")
                return jsonify({'status': 'ok'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/manifests', methods=['POST'])
        def receive_manifest():
            try:
                data = request.json
                cid = data['cid']
                manifest_data = data['data'].encode('latin1') if isinstance(data['data'], str) else data['data']

                manifest_path = os.path.join(self.storage.storage_path, cid)
                if not os.path.exists(manifest_path):
                    with open(manifest_path, 'wb') as f:
                        f.write(manifest_data)
                    print(f"Saved new manifest: {cid[:8]}...")
                return jsonify({'status': 'ok'})
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        @self.app.route('/api/manifests/<cid>', methods=['GET'])
        def get_manifest(cid):
            try:
                manifest_path = os.path.join(self.storage.storage_path, cid)
                if os.path.exists(manifest_path):
                    with open(manifest_path, 'rb') as f:
                        return f.read(), 200, {'Content-Type': 'application/octet-stream'}
                else:
                    manifest_data = self.network.get_manifest_from_peers(cid)
                    if manifest_data:
                        with open(manifest_path, 'wb') as f:
                            f.write(manifest_data)
                        return manifest_data, 200, {'Content-Type': 'application/octet-stream'}
                    return jsonify({'error': 'Manifest not found'}), 404
            except Exception as e:
                return jsonify({'error': str(e)}), 500
            
            @self.app.route('/api/peers/detailed', methods=['GET'])
            def detailed_peers():
                peers = []
                for url, info in self.network.peers.items():
                    peers.append({
                        'url': url,
                        'node_id': info.get('id'),
                        'node_name': info.get('name'),
                        'first_seen': datetime.fromtimestamp(info.get('first_seen', 0)).isoformat(),
                        'last_seen': datetime.fromtimestamp(info.get('last_seen', 0)).isoformat(),
                        'status': 'active' if time.time() - info.get('last_seen', 0) < 60 else 'inactive',
                        'connection_duration': time.time() - info.get('first_seen', time.time()),
                        'chunks_shared': info.get('chunks_shared', 0),  # You'd need to track this
                        'manifests_shared': info.get('manifests_shared', 0)  # You'd need to track this
                    })
                return jsonify(sorted(peers, key=lambda x: x['last_seen'], reverse=True))
            
            
            
        @self.app.route('/dashboard')
        def dashboard():
            # Get peer information
            peers = []
            for url, info in self.network.peers.items():
                peers.append({
                    'url': url,
                    'name': info.get('name'),
                    'status': 'active' if time.time() - info.get('last_seen', 0) < 60 else 'inactive',
                    'last_seen': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(info.get('last_seen', 0)))
                })
            
            # Get local node info
            local_node = {
                'node_id': self.network.node_id,
                'node_name': self.network.node_name,
                'api_url': self.network.api_url,
                'storage_path': self.storage.storage_path,
                'peer_count': len(peers)
            }
            
            return f"""
            <html>
            <head>
                <title>Node Dashboard</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .node-info {{ background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }}
                    table {{ border-collapse: collapse; width: 100%; }}
                    th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
                    tr:hover {{ background-color: #f5f5f5; }}
                    .active {{ color: green; }}
                    .inactive {{ color: red; }}
                </style>
            </head>
            <body>
                <div class="node-info">
                    <h1>Node: {local_node['node_name']}</h1>
                    <p><strong>ID:</strong> {local_node['node_id']}</p>
                    <p><strong>API URL:</strong> {local_node['api_url']}</p>
                    <p><strong>Storage Path:</strong> {local_node['storage_path']}</p>
                    <p><strong>Connected Peers:</strong> {local_node['peer_count']}</p>
                </div>
                
                <h2>Connected Peers</h2>
                <table>
                    <tr>
                        <th>Peer URL</th>
                        <th>Node Name</th>
                        <th>Status</th>
                        <th>Last Seen</th>
                    </tr>
                    {"".join(
                        f"<tr><td>{p['url']}</td><td>{p['name']}</td>"
                        f"<td class='{p['status']}'>{p['status'].upper()}</td>"
                        f"<td>{p['last_seen']}</td></tr>"
                        for p in peers
                    )}
                </table>
            </body>
            </html>
            """
    def run(self):
        self.app.run(
            host='0.0.0.0',
            port=self.config['port'],
            threaded=True
        )