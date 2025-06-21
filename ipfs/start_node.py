#!/usr/bin/env python3
import os
import signal
import yaml
import time
import logging
from node.core import IPFSNode
from api.server import start_api_server

# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_config():
    """Load and validate configuration"""
    try:
        with open('config/node.yaml', 'r') as f:
            config = yaml.safe_load(f)
        
        # Required configurations
        mandatory_keys = ['node_name', 'auth_secret', 'api_host', 'api_port']
        for key in mandatory_keys:
            if key not in config:
                raise ValueError(f"Missing required config: {key}")
        
        # Environment variable overrides
        config['api_host'] = os.getenv('API_HOST', config['api_host'])
        config['api_port'] = int(os.getenv('API_PORT', config['api_port']))
        config['auth_secret'] = os.getenv('AUTH_SECRET', config['auth_secret'])
        
        return config
    except Exception as e:
        logger.error(f"Config loading failed: {str(e)}")
        raise

# In start_node.py, replace the main() function with:
def main():
    try:
        config = load_config()
        logger.info("Configuration loaded successfully")
        
        node = IPFSNode(config)
        logger.info("IPFS node initialized")
        
        node.start()
        logger.info("Node services started")
        
        def shutdown_handler(signum, frame):
            logger.info("Received shutdown signal")
            node.stop()
            exit(0)
        
        signal.signal(signal.SIGINT, shutdown_handler)
        signal.signal(signal.SIGTERM, shutdown_handler)
        
        # Don't start the server here, just keep alive
        while True:
            time.sleep(1)
            
    except Exception as e:
        logger.critical(f"Fatal error: {str(e)}", exc_info=True)
        exit(1)

if __name__ == '__main__':
    main()