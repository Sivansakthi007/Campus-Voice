import os
import sys
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Mock environment
os.environ["FACE_ENCRYPTION_KEY"] = "zqID27fJw2IcEQratneEZTjYgnXf-Jf3DFbwU9mfdQQ="

try:
    from backend.utils.encryption import face_encryption
    
    # Test embedding
    test_embedding = [0.1] * 128
    
    # Encrypt
    encrypted = face_encryption.encrypt(test_embedding)
    print(f"Encrypted length: {len(encrypted)}")
    print(f"Encrypted sample: {encrypted[:50]}...")
    
    # Decrypt
    decrypted = face_encryption.decrypt(encrypted)
    
    # Verify
    if decrypted == test_embedding:
        print("SUCCESS: Decrypted embedding matches original!")
    else:
        print("FAILURE: Decrypted embedding does not match!")
        print(f"Original: {test_embedding[:5]}...")
        print(f"Decrypted: {decrypted[:5]}...")

except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
