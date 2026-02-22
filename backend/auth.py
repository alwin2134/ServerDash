"""
ServerDash — Authentication (JWT for UI, API key for agents).

Passwords are bcrypt-hashed. JWT is validated for both HTTP and WebSocket.
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from config import (
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES,
    AGENT_API_KEYS, ADMIN_USERNAME, ADMIN_PASSWORD,
)

bearer_scheme = HTTPBearer(auto_error=False)

# Hash the admin password at startup (once)
_admin_password_hash = bcrypt.hashpw(
    ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()
)


# ── JWT Helpers ───────────────────────────────────────────

def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> str:
    """Return the subject (username) or raise."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        sub: str | None = payload.get("sub")
        if sub is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return sub
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def verify_ws_token(token: str | None) -> str | None:
    """Validate a JWT token for WebSocket. Returns username or None."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# ── Dependencies ──────────────────────────────────────────

async def require_jwt(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(bearer_scheme)
    ] = None,
) -> str:
    """Dependency: require a valid JWT Bearer token."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return verify_token(credentials.credentials)


async def require_api_key(
    x_api_key: Annotated[str | None, Header()] = None,
) -> str:
    """Dependency: require a valid agent API key."""
    if x_api_key is None or x_api_key not in AGENT_API_KEYS:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key


# ── Login Logic ───────────────────────────────────────────

def authenticate_user(username: str, password: str) -> bool:
    """Bcrypt-secured single-admin authentication."""
    if username != ADMIN_USERNAME:
        return False
    return bcrypt.checkpw(
        password.encode("utf-8"), _admin_password_hash
    )
