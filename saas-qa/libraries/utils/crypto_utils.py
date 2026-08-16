import hmac
import hashlib
import json

class CryptoUtils:
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    @staticmethod
    def generate_shopify_hmac(payload_dict, secret="test_shopify_secret"):
        raw_bytes = json.dumps(payload_dict).encode('utf-8')
        signature = hmac.new(secret.encode('utf-8'), raw_bytes, hashlib.sha256).digest()
        import base64
        return base64.b64encode(signature).decode('utf-8')
