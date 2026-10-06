"""Cryptographic and password security utilities for SwasthyaConnect.

Implements PBKDF2-HMAC-SHA256 with cryptographically random salting
and high iteration count (100,000) meeting OWASP password storage guidelines.
Maintains backward compatibility with legacy hashes while facilitating
seamless upgrade.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets


def hash_password(password: str) -> str:
    """Generate secure salted PBKDF2-HMAC-SHA256 password hash."""
    salt = secrets.token_bytes(16)
    iterations = 100_000
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2:sha256:{iterations}:{salt.hex()}:{derived.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Verify password against stored PBKDF2 or legacy SHA-256 hash."""
    if not stored_hash or not plain_password:
        return False

    # Standard PBKDF2 format: pbkdf2:sha256:<iterations>:<salt_hex>:<hash_hex>
    if stored_hash.startswith("pbkdf2:sha256:"):
        try:
            parts = stored_hash.split(":")
            if len(parts) != 5:
                return False
            iterations = int(parts[2])
            salt = bytes.fromhex(parts[3])
            expected_derived = bytes.fromhex(parts[4])
            actual_derived = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
            return hmac.compare_digest(expected_derived, actual_derived)
        except Exception:
            return False

    # Legacy SHA-256 fallback (hex digest)
    legacy_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(legacy_hash, stored_hash)


def is_hash_legacy(stored_hash: str) -> bool:
    """Check if hash requires upgrade to modern PBKDF2 standard."""
    return not stored_hash.startswith("pbkdf2:sha256:")
