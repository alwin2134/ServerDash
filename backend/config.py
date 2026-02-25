"""
ServerDash — Central configuration.

Loads from environment variables with sensible defaults.
Persists API key and JWT secret to files for restart stability.
"""

import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent


def _load_or_create_key(filepath: Path, env_var: str, nbytes: int = 32) -> str:
    """Load key from env var, then file, or generate and persist."""
    val = os.getenv(env_var)
    if val:
        return val
    if filepath.exists():
        return filepath.read_text().strip()
    val = secrets.token_urlsafe(nbytes)
    filepath.write_text(val)
    print(f"[config] Generated {filepath.name}: {val}")
    return val


# Database
DATABASE_PATH = str(BASE_DIR / os.getenv("SERVERDASH_DB", "serverdash.db"))

# JWT
JWT_SECRET = _load_or_create_key(PROJECT_DIR / ".jwt_secret", "SERVERDASH_JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("SERVERDASH_JWT_EXPIRE", "1440"))  # 24 hours

# Agent API keys
_agent_key = _load_or_create_key(PROJECT_DIR / ".agent_key", "SERVERDASH_AGENT_KEYS")
AGENT_API_KEYS: set[str] = set(_agent_key.split(","))

# Admin credentials (plaintext default — hashed at runtime in auth.py)
ADMIN_USERNAME = os.getenv("SERVERDASH_ADMIN_USER", "admin")
ADMIN_PASSWORD = os.getenv("SERVERDASH_ADMIN_PASS", "serverdash")

# CORS
CORS_ORIGINS = os.getenv(
    "SERVERDASH_CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")

# Agent intervals (seconds)
METRIC_PUSH_INTERVAL = int(os.getenv("SERVERDASH_PUSH_INTERVAL", "5"))
HEARTBEAT_INTERVAL = int(os.getenv("SERVERDASH_HEARTBEAT_INTERVAL", "15"))
SERVER_OFFLINE_THRESHOLD = int(os.getenv("SERVERDASH_OFFLINE_THRESHOLD", "30"))

# Alert retention
ALERT_RETENTION_DAYS = int(os.getenv("SERVERDASH_ALERT_RETENTION_DAYS", "30"))

# Rate limiting
LOGIN_RATE_LIMIT = int(os.getenv("SERVERDASH_LOGIN_RATE_LIMIT", "5"))       # per minute per IP
AGENT_RATE_LIMIT_SECONDS = float(os.getenv("SERVERDASH_AGENT_RATE_LIMIT", "2"))  # min seconds between updates per server

# WebSocket
WS_MAX_CONNECTIONS = int(os.getenv("SERVERDASH_WS_MAX_CONNECTIONS", "100"))

# AI Output / Terminal Intelligence
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
