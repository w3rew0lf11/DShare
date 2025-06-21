import hmac
import hashlib
import os
from typing import Optional
import base64
from datetime import datetime, timedelta
import secrets

class AuthManager:
    def __init__(self, node):
        self.node = node
        self.shared_secret = os.getenv('IPFS_SHARED_SECRET', 'default-secret-change-me')
        self.session_tokens = {}
        
    # In node/auth.py
    def generate_token(self, peer_id: str) -> str:
        """Generate a time-limited auth token"""
        expiry = (datetime.now() + timedelta(hours=1)).timestamp()
        message = f"{peer_id}:{expiry}"
        signature = hmac.new(
            self.shared_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        # Encode the token in base64 before returning
        token = f"{message}:{signature}"
        return base64.b64encode(token.encode()).decode()

    def validate_token(self, token: str) -> Optional[str]:
        """Validate an auth token, returns peer_id if valid"""
        try:
            # Decode the base64 token first
            decoded = base64.b64decode(token.encode()).decode()
            message, signature = decoded.rsplit(':', 1)
            peer_id, expiry = message.split(':', 1)
            
            # Check expiry
            if datetime.now().timestamp() > float(expiry):
                return None
                
            # Verify signature
            expected_signature = hmac.new(
                self.shared_secret.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()
        
            if hmac.compare_digest(signature, expected_signature):
                return peer_id
            return None
        except:
            return None
            
    def generate_challenge(self) -> str:
        """Generate a challenge for peer authentication"""
        return secrets.token_hex(16)
        
    def verify_challenge(self, challenge: str, response: str) -> bool:
        """Verify a challenge response"""
        expected = hmac.new(
            self.shared_secret.encode(),
            challenge.encode(),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(response, expected)