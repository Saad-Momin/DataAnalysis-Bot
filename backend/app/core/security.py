"""Password hashing, session JWTs and reset-token helpers. Nothing here logs secrets."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher

from app.core.config import get_settings

COOKIE_NAME = "dl_session"
_hasher = PasswordHasher()
_DUMMY_HASH = _hasher.hash("dataloom-dummy-password-1")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    """Always performs one argon2 verification (against a dummy hash if there is no user) to keep timing similar."""
    try:
        ok = _hasher.verify(password_hash or _DUMMY_HASH, password)
    except Exception:
        return False
    return bool(ok) and password_hash is not None


def create_session_token(user_id: str) -> str:
    s = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": user_id, "iat": now, "exp": now + timedelta(days=s.session_days)}
    return jwt.encode(payload, s.secret_key, algorithm="HS256")


def decode_session_token(token: str) -> str | None:
    try:
        data = jwt.decode(token, get_settings().secret_key, algorithms=["HS256"], options={"require": ["exp", "sub"]})
    except jwt.PyJWTError:
        return None
    sub = data.get("sub")
    return sub if isinstance(sub, str) else None


def new_reset_token() -> tuple[str, str]:
    """(raw token for the link, sha256 hash to store)."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_reset_token(raw)


def hash_reset_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
