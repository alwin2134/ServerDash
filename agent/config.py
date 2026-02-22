"""
ServerDash Agent — Configuration.
"""

import os
import platform
import uuid
from pathlib import Path

# Dashboard connection
DASHBOARD_URL = os.getenv("SERVERDASH_URL", "http://localhost:8100")

# API key: read from env, or auto-read from shared .agent_key file
def _load_api_key() -> str:
    env_key = os.getenv("SERVERDASH_API_KEY", "")
    if env_key:
        return env_key
    # Try reading the key file created by backend
    key_file = Path(__file__).resolve().parent.parent / ".agent_key"
    if key_file.exists():
        key = key_file.read_text().strip()
        print(f"[config] Auto-loaded API key from {key_file}")
        return key
    return ""

API_KEY = _load_api_key()

# Agent identity
SERVER_ID = os.getenv(
    "SERVERDASH_SERVER_ID",
    uuid.uuid5(uuid.NAMESPACE_DNS, platform.node()).hex[:12],
)
HOSTNAME = platform.node()
OS_INFO = f"{platform.system()} {platform.release()}"
AGENT_VERSION = "1.0.0"

# Intervals (seconds)
PUSH_INTERVAL = int(os.getenv("SERVERDASH_PUSH_INTERVAL", "5"))
HEARTBEAT_INTERVAL = int(os.getenv("SERVERDASH_HEARTBEAT_INTERVAL", "15"))
SERVICE_SCAN_INTERVAL = int(os.getenv("SERVERDASH_SERVICE_INTERVAL", "60"))
