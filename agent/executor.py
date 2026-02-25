"""
ServerDash Agent — Command executor.

Polls the backend for pending commands and executes them:
- docker_action: start/stop/restart containers
- docker_deploy: pull image + create + start container
- docker_remove: remove a container
- docker_pull: pull an image
- docker_logs: fetch container logs
- kill_process: terminate a process by PID
- apt_install: install a system package
"""

import asyncio
import json
import os
import signal
import subprocess
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
        result_payload = {}
        if cmd_type == "docker_action":
            _exec_docker_action(payload)
        elif cmd_type == "docker_deploy":
            _exec_docker_deploy(payload)
        elif cmd_type == "docker_remove":
            _exec_docker_remove(payload)
        elif cmd_type == "docker_pull":
            _exec_docker_pull(payload)
        elif cmd_type == "docker_logs":
            _exec_docker_logs(payload)
        elif cmd_type == "kill_process":
            _exec_kill_process(payload)
        elif cmd_type == "apt_install":
            _exec_apt_install(payload)
        elif cmd_type == "shell":
            result_payload = _exec_shell(payload)
        else:
            print(f"[executor] Unknown command type: {cmd_type}")

        # Mark complete with result
        await client.post(
            f"{BASE}/api/agent/commands/{cmd_id}/result",
            json=result_payload
        )
        print(f"[executor] Completed command {cmd_id}")

    except Exception as e:
        print(f"[executor] Command {cmd_id} failed: {e}")
        # Still mark as complete to avoid retrying forever
        try:
            await client.post(
                f"{BASE}/api/agent/commands/{cmd_id}/result",
                json={"error": str(e)}
            )
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


def _exec_docker_deploy(payload: dict) -> None:
    """Pull image and create + start a container."""
    if not _DOCKER_AVAILABLE:
        print("[executor] Docker not available")
        return

    client = docker_sdk.from_env()
    image = payload["image"]
    name = payload["name"]

    # Pull the image first
    print(f"[executor] Pulling image {image}...")
    client.images.pull(image)
    print(f"[executor] Image {image} pulled successfully")

    # Build port bindings: {"8080/tcp": 8080} -> {"8080/tcp": ("0.0.0.0", 8080)}
    ports = payload.get("ports") or {}
    port_bindings = {}
    for container_port, host_port in ports.items():
        port_bindings[container_port] = ("0.0.0.0", int(host_port))

    # Environment variables
    env = payload.get("env") or {}
    env_list = [f"{k}={v}" for k, v in env.items()]

    # Volumes
    volumes = payload.get("volumes") or []
    volume_binds = {}
    for v in volumes:
        if ":" in v:
            parts = v.split(":", 1)
            volume_binds[parts[0]] = {"bind": parts[1], "mode": "rw"}

    # Restart policy
    restart = payload.get("restart_policy", "unless-stopped")
    restart_policy = {"Name": restart}
    if restart == "on-failure":
        restart_policy["MaximumRetryCount"] = 5

    # Create and start
    container = client.containers.run(
        image,
        name=name,
        ports=port_bindings,
        environment=env_list if env_list else None,
        volumes=volume_binds if volume_binds else None,
        restart_policy=restart_policy,
        detach=True,
    )
    print(f"[executor] Container {name} ({container.short_id}) deployed and running")


def _exec_docker_remove(payload: dict) -> None:
    """Remove a container."""
    if not _DOCKER_AVAILABLE:
        return

    client = docker_sdk.from_env()
    container_id = payload["container_id"]
    force = payload.get("force", True)

    container = client.containers.get(container_id)
    container.remove(force=force)
    print(f"[executor] Container {container_id} removed")


def _exec_docker_pull(payload: dict) -> None:
    """Pull a Docker image."""
    if not _DOCKER_AVAILABLE:
        return

    client = docker_sdk.from_env()
    image = payload["image"]
    client.images.pull(image)
    print(f"[executor] Image {image} pulled")


def _exec_docker_logs(payload: dict) -> None:
    """Fetch container logs."""
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


def _exec_apt_install(payload: dict) -> None:
    """Install a system package via apt."""
    package = payload["package"]

    # Sanitize package name (basic safety)
    if not all(c.isalnum() or c in "-._+" for c in package):
        print(f"[executor] Invalid package name: {package}")
        return

    print(f"[executor] Installing package {package} via apt...")
    result = subprocess.run(
        ["sudo", "apt", "install", "-y", package],
        capture_output=True,
        text=True,
        timeout=300,  # 5 min timeout
    )

    if result.returncode == 0:
        print(f"[executor] Package {package} installed successfully")
    else:
        print(f"[executor] apt install failed: {result.stderr[:500]}")


def _exec_shell(payload: dict) -> dict:
    """Execute an arbitrary shell command."""
    command = payload["command"]
    print(f"[executor] Executing shell command: {command}")
    
    try:
        # Run safely with timeout
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=120  # 2 min timeout for shell commands
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired as e:
        return {
            "stdout": e.stdout.decode() if e.stdout else "",
            "stderr": e.stderr.decode() if e.stderr else "Command timed out after 120s",
            "exit_code": -1
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "exit_code": -1
        }

