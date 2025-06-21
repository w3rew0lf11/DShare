import os
import tempfile
import threading
import time
import logging
from pathlib import Path
from typing import Optional, Dict, List
from logging.handlers import RotatingFileHandler

from flask import Flask, request, jsonify, send_file
from werkzeug.utils import secure_filename
from werkzeug.serving import WSGIRequestHandler
import gunicorn.app.base
from concurrent.futures import ThreadPoolExecutor

from node.auth import AuthManager

# Initialize Flask app
app = Flask(__name__)

# Global variables
node = None
auth = None
shutdown_flag = threading.Event()
executor = ThreadPoolExecutor(max_workers=4)

# Configure basic logging immediately
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StandaloneApplication(gunicorn.app.base.BaseApplication):
    """Gunicorn application wrapper for production deployment"""
    def __init__(self, app, options=None):
        self.options = options or {}
        self.application = app
        super().__init__()

    def load_config(self):
        config = {
            key: value for key, value in self.options.items()
            if key in self.cfg.settings and value is not None
        }
        for key, value in config.items():
            self.cfg.set(key.lower(), value)

    def load(self):
        return self.application

def configure_logging(node_storage_path=None):
    """Configure advanced logging with file rotation"""
    log_path = os.path.join(node_storage_path, 'logs') if node_storage_path else './logs'
    os.makedirs(log_path, exist_ok=True)

    file_handler = RotatingFileHandler(
        os.path.join(log_path, 'ipfs_node.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)

    # Clear any existing handlers
    logger.handlers.clear()
    logger.addHandler(file_handler)
    logger.setLevel(logging.INFO)

def start_api_server(ipfs_node, host='0.0.0.0', port=5000, start_server=True):
    global node, auth
    node = ipfs_node
    auth = AuthManager(node)
    
    configure_logging(node.storage.storage_path)
    WSGIRequestHandler.max_content_length = 1024 * 1024 * 1024 * 2
    
    if start_server:
        if os.getenv('FLASK_ENV') == 'production':
            options = {
                'bind': f'{host}:{port}',
                'workers': 4,
                'threads': 2,
                'timeout': 300,
                'worker_class': 'gevent'
            }
            StandaloneApplication(app, options).run()
        else:
            app.run(host=host, port=port)

@app.before_request
def authenticate_request():
    """Authenticate all API requests except health check, shutdown, and token generation"""
    if request.endpoint in ['health_check', 'shutdown', 'static', 'generate_token']:
        return
        
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Unauthorized'}), 401
        
    token = auth_header[7:]
    peer_id = auth.validate_token(token)
    if not peer_id:
        return jsonify({'error': 'Invalid token'}), 401
        
    request.peer_id = peer_id

@app.route('/api/health', methods=['GET'])
def health_check():
    """Lightweight health check endpoint"""
    try:
        if node is None:
            return jsonify({'status': 'uninitialized'}), 503
            
        return jsonify({
            'status': 'healthy',
            'node_id': node.node_id,
            'storage_usage': get_storage_usage()
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def get_storage_usage() -> Dict[str, int]:
    """Calculate storage usage statistics"""
    try:
        total = 0
        files = 0
        for entry in os.scandir(node.storage.storage_path):
            if entry.is_file():
                total += entry.stat().st_size
                files += 1
        return {'total_bytes': total, 'file_count': files}
    except Exception as e:
        logger.error(f"Failed to get storage usage: {str(e)}")
        return {'total_bytes': 0, 'file_count': 0}

@app.route('/shutdown')
def shutdown():
    """Gracefully shutdown the server"""
    try:
        shutdown_flag.set()
        executor.submit(_delayed_shutdown)
        return jsonify({'status': 'shutting_down'}), 200
    except Exception as e:
        logger.error(f"Shutdown failed: {str(e)}")
        return jsonify({'error': 'Shutdown failed'}), 500

def _delayed_shutdown():
    """Background task to handle shutdown"""
    time.sleep(1)
    func = request.environ.get('werkzeug.server.shutdown')
    if func:
        func()

@app.route('/api/add', methods=['POST'])
def add_file():
    """Handle file uploads with proper initialization checks"""
    if node is None:
        logger.error("Node not initialized when trying to add file")
        return jsonify({'error': 'Node not initialized'}), 503
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    try:
        # Create storage directories if they don't exist
        os.makedirs(node.storage.storage_path, exist_ok=True)
        temp_dir = os.path.join(node.storage.storage_path, 'tmp')
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save to temporary file
        temp_path = None
        with tempfile.NamedTemporaryFile(dir=temp_dir, delete=False) as temp_file:
            file.save(temp_file.name)
            temp_path = temp_file.name
            logger.info(f"Temporarily stored upload at {temp_path}")
            
        # Calculate CID
        cid = node.storage._calculate_cid(temp_path)
        logger.info(f"Generated CID: {cid}")
        
        # Process in background
        def process_upload():
            try:
                stored_cid = node.add_file(temp_path)
                logger.info(f"Stored file with CID: {stored_cid}")
                if stored_cid != cid:
                    logger.error(f"CID mismatch! Calculated: {cid}, Stored: {stored_cid}")
            except Exception as e:
                logger.error(f"Background storage failed: {str(e)}")
            finally:
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                        logger.info(f"Cleaned up temp file: {temp_path}")
                    except Exception as e:
                        logger.error(f"Failed to delete temp file: {str(e)}")
        
        executor.submit(process_upload)
        
        return jsonify({
            'cid': cid,
            'name': secure_filename(file.filename),
            'size': os.path.getsize(temp_path),
            'status': 'queued',
            'message': 'File is being processed'
        }), 200
        
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
            except Exception as e:
                logger.error(f"Cleanup failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/get/<cid>', methods=['GET'])
def get_file(cid: str):
    """Serve files with efficient streaming and range requests support"""
    if node is None:
        return jsonify({'error': 'Node not initialized'}), 503
        
    try:
        file_path = node.get_file(cid)
        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404
            
        if 'USE_X_SENDFILE' in os.environ:
            response = Flask.response_class()
            response.headers['X-Sendfile'] = file_path
            response.headers['Content-Disposition'] = f'attachment; filename={cid}'
            return response
            
        return send_file(
            file_path,
            as_attachment=True,
            download_name=cid,
            conditional=True
        )
        
    except Exception as e:
        logger.error(f"File retrieval failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/pin/<cid>', methods=['POST'])
def pin_file(cid: str):
    """Pin a file by CID"""
    if node is None:
        return jsonify({'error': 'Node not initialized'}), 503
        
    try:
        if not node.storage.retrieve_file(cid):
            return jsonify({'error': 'File not found'}), 404
            
        node.pinning.pin(cid)
        return jsonify({'status': 'pinned', 'cid': cid}), 200
    except Exception as e:
        logger.error(f"Pin operation failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/list', methods=['GET'])
def list_files():
    """List all files with pagination support"""
    if node is None:
        return jsonify({'error': 'Node not initialized'}), 503
        
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 100)), 1000)
        
        files = node.list_files()
        start = (page - 1) * per_page
        end = start + per_page
        paginated_files = {
            'local': files['local'][start:end],
            'pinned': files['pinned'][start:end]
        }
        
        return jsonify({
            'files': paginated_files,
            'page': page,
            'per_page': per_page,
            'total': len(files['local'])
        }), 200
    except Exception as e:
        logger.error(f"List files failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/peers', methods=['GET'])
def list_peers():
    """List known peers with connection status"""
    if node is None:
        return jsonify({'error': 'Node not initialized'}), 503
        
    try:
        peers = [{
            'node_id': node.node_id,
            'endpoint': f"http://{node.config['api_host']}:{node.config['api_port']}",
            'status': 'self'
        }]
        
        if hasattr(node.network, 'dht'):
            for peer_id, info in node.network.dht.peer_table.items():
                peers.append({
                    'node_id': peer_id,
                    'endpoint': info['endpoint'],
                    'status': 'active',
                    'last_seen': info['last_seen']
                })
                
        return jsonify({'peers': peers}), 200
    except Exception as e:
        logger.error(f"List peers failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/peers/announce', methods=['POST'])
def announce_peer():
    """Handle peer announcements for DHT"""
    if node is None:
        return jsonify({'error': 'Node not initialized'}), 503
        
    try:
        data = request.json
        if not data or 'node_id' not in data or 'endpoint' not in data:
            return jsonify({'error': 'Invalid data'}), 400
            
        if hasattr(node.network, 'dht'):
            node.network.dht._update_peers([{
                'node_id': data['node_id'],
                'endpoint': data['endpoint']
            }])
            
        return jsonify({'status': 'ok'}), 200
    except Exception as e:
        logger.error(f"Peer announcement failed: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/token', methods=['POST'])
def generate_token():
    """Generate an authentication token for API access"""
    try:
        if node is None:
            logger.error("Node not initialized during token generation")
            return jsonify({'error': 'Node not initialized'}), 503
            
        data = request.json
        if not data or 'node_id' not in data:
            logger.error("Missing node_id in token request")
            return jsonify({'error': 'Missing node_id'}), 400
        
        # Verify the node_id matches our node
        if data['node_id'] != node.node_id:
            logger.error(f"Invalid node_id: {data['node_id']}")
            return jsonify({'error': 'Invalid node_id'}), 401
            
        token = auth.generate_token(data['node_id'])
        logger.info(f"Generated token for node: {data['node_id']}")
        return jsonify({
            'token': token,
            'expires_in': 3600  # 1 hour
        }), 200
        
    except Exception as e:
        logger.error(f"Token generation failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500