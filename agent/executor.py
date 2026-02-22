"""
ServerDash Agent — Command executor.

Polls the backend for pending commands and executes them:
- docker_action: start/stop/restart containers
- docker_logs: fetch container logs
- kill_process: terminate a process by PID
"""

import asyncio
import json
import os
import signal
import sys

import httpx

try:
    import docker as docker_sdk
    _DOCKER_AVAILABLE = True
except ImportError:
    _DOCKER_AVAILABLE = False

from config import DASHBOARD_URL, API_KEY, SERVER_ID

BASE = DASHBOARD_URL.rstrip("/")
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}
POLL_INTERVAL = 3  # seconds


async def executor_loop() -> None:
    """Poll for commands and execute them."""
    async with httpx.AsyncClient(headers=HEADERS, timeout=10.0) as client:
        while True:
            try:
                resp = await client.get(f"{BASE}/api/agent/commands/{SERVER_ID}")
                if resp.status_code == 200:
                    commands = resp.json()
                    for cmd in commands:
                        await execute_command(client, cmd)
            except Exception as e:
                print(f"[executor] Poll error: {e}")

            await asyncio.sleep(POLL_INTERVAL)


async def execute_command(client: httpx.AsyncClient, cmd: dict) -> None:
    """Execute a single command and report back."""
    cmd_id = cmd["id"]
    cmd_type = cmd["type"]
    payload = cmd["payload"]

    print(f"[executor] Running {cmd_type}: {payload}")

    try:
        if cmd_type == "docker_action":
            _exec_docker_action(payload)
        elif cmd_type == "docker_logs":
            _exec_docker_logs(payload)
        elif cmd_type == "kill_process":
            _exec_kill_process(payload)
        else:
            print(f"[executor] Unknown command type: {cmd_type}")

        # Mark complete
        await client.post(f"{BASE}/api/agent/commands/{cmd_id}/complete")
        print(f"[executor] Completed command {cmd_id}")

    except Exception as e:
        print(f"[executor] Command {cmd_id} failed: {e}")
        # Still mark as complete to avoid retrying forever
        try:
            await client.post(f"{BASE}/api/agent/commands/{cmd_id}/complete")
        except Exception:
            pass


def _exec_docker_action(payload: dict) -> None:
    """Execute a Docker start/stop/restart action."""
    if not _DOCKER_AVAILABLE:
        print("[executor] Docker not available")
        return

    client = docker_sdk.from_env()
    container_id = payload["container_id"]
    action = payload["action"]

    container = client.containers.get(container_id)
    if action == "start":
        container.start()
    elif action == "stop":
        container.stop(timeout=10)
    elif action == "restart":
        container.restart(timeout=10)
    else:
        print(f"[executor] Unknown docker action: {action}")

    print(f"[executor] Docker {action} on {container_id}: OK")


def _exec_docker_logs(payload: dict) -> None:
    """Fetch container logs (currently just prints; future: store result)."""
    if not _DOCKER_AVAILABLE:
        return

    client = docker_sdk.from_env()
    container = client.containers.get(payload["container_id"])
    lines = payload.get("lines", 100)
    logs = container.logs(tail=lines, timestamps=True).decode("utf-8", errors="replace")
    print(f"[executor] Fetched {lines} log lines for {payload['container_id']}")


def _exec_kill_process(payload: dict) -> None:
    """Kill a process by PID."""
    pid = payload["pid"]
    sig_name = payload.get("signal", "SIGTERM")

    if sys.platform == "win32":
        # Windows doesn't have SIGTERM, use taskkill
        os.system(f"taskkill /PID {pid} /F")
    else:
        sig = getattr(signal, sig_name, signal.SIGTERM)
        try:
            os.kill(pid, sig)
            print(f"[executor] Sent {sig_name} to PID {pid}")
        except ProcessLookupError:
            print(f"[executor] PID {pid} not found")
        except PermissionError:
            print(f"[executor] Permission denied for PID {pid}")
