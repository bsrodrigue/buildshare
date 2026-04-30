import secrets
import string


class CryptoService:
    """
    CryptoService provides utilities for generating cryptographically secure
    random strings, tokens, and OTPs.
    """

    @staticmethod
    def generate_otp(length: int = 6) -> str:
        """
        Generates a numeric OTP of the specified length.
        """
        digits = string.digits
        return "".join(secrets.choice(digits) for _ in range(length))

    @staticmethod
    def generate_token(length: int = 32) -> str:
        """
        Generates a random alphanumeric token.
        """
        alphabet = string.ascii_letters + string.digits
        return "".join(secrets.choice(alphabet) for _ in range(length))
