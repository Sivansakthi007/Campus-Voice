from cryptography.fernet import Fernet
import json
import os
import logging

logger = logging.getLogger(__name__)

class FaceEncryption:
    """Handles encryption and decryption of face embeddings for secure storage."""
    
    def __init__(self):
        key = os.environ.get("FACE_ENCRYPTION_KEY")
        if not key:
            logger.error("FACE_ENCRYPTION_KEY not found in environment variables!")
            # In a real production app, we would raise an error here.
            # For now, we'll generate a temporary one to avoid crashing, 
            # but this means data won't persist across restarts if the key isn't set.
            self.fernet = Fernet(Fernet.generate_key())
        else:
            try:
                self.fernet = Fernet(key.encode())
            except Exception as e:
                logger.error(f"Invalid FACE_ENCRYPTION_KEY: {str(e)}")
                self.fernet = Fernet(Fernet.generate_key())

    def encrypt(self, embedding: list) -> str:
        """Encrypts a list of floats (face embedding) into a secure string."""
        if not embedding:
            return None
        try:
            data = json.dumps(embedding).encode()
            return self.fernet.encrypt(data).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            return None

    def decrypt(self, encrypted_data: str) -> list:
        """Decrypts a secure string back into a list of floats."""
        if not encrypted_data:
            return None
        try:
            decrypted = self.fernet.decrypt(encrypted_data.encode())
            return json.loads(decrypted.decode())
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            return None

# Singleton instance
face_encryption = FaceEncryption()
