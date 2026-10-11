"""Password hashing, JWT access tokens and opaque refresh tokens."""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.config.settings import get_settings

# OWASP (2023) recommends 600,000 iterations for PBKDF2-HMAC-SHA256.
PBKDF2_ITERATIONS = 600_000
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2:sha256:{PBKDF2_ITERATIONS}:{salt.hex()}:{derived.hex()}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Accepts the current PBKDF2 format and the legacy unsalted SHA-256 hashes of old accounts."""
    if not plain_password or not stored_hash:
        return False
    if stored_hash.startswith("pbkdf2:sha256:"):
        try:
            _, _, iterations, salt_hex, hash_hex = stored_hash.split(":")
            derived = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations))
            return hmac.compare_digest(derived, bytes.fromhex(hash_hex))
        except ValueError:
            return False
    legacy = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(legacy, stored_hash)


def password_needs_rehash(stored_hash: str) -> bool:
    if not stored_hash.startswith("pbkdf2:sha256:"):
        return True
    try:
        return int(stored_hash.split(":")[2]) < PBKDF2_ITERATIONS
    except (IndexError, ValueError):
        return True


def create_access_token(user_id: str, role: str) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


class TokenError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        claims = jwt.decode(token, get_settings().jwt_secret, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as error:
        raise TokenError("Session expired. Please sign in again.") from error
    except jwt.PyJWTError as error:
        raise TokenError("Invalid authentication token.") from error
    if claims.get("type") != "access" or not claims.get("sub"):
        raise TokenError("Invalid authentication token.")
    return claims


def new_refresh_token() -> tuple[str, str]:
    """Returns (raw token for the client, SHA-256 hash for the database)."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
