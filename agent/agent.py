"""
ServerDash Agent — Main loop.

Collects system data and pushes to the central dashboard.

Usage:
    # Set the API key first (printed by the dashboard on first run)
    set SERVERDASH_API_KEY=<your-key>
    python agent.py
"""

import asyncio
import time
import sys

import httpx

from config import (
    DASHBOARD_URL, API_KEY, SERVER_ID, HOSTNAME, OS_INFO,
    AGENT_VERSION, PUSH_INTERVAL, HEARTBEAT_INTERVAL, SERVICE_SCAN_INTERVAL,
)
from collectors.metrics import collect_metrics
from collectors.services import collect_services
from collectors.processes import collect_processes
from collectors.ports import collect_ports
from collectors.docker import collect_docker
from executor import executor_loop


BASE = DASHBOARD_URL.rstrip("/")
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}


async def send_heartbeat(client: httpx.AsyncClient) -> None:
    """Send heartbeat to register/update this server."""
    payload = {
        "server_id": SERVER_ID,
        "hostname": HOSTNAME,
        "ip_address": "",
        "os_info": OS_INFO,
        "agent_version": AGENT_VERSION,
    }
    try:
        resp = await client.post(f"{BASE}/api/agent/heartbeat", json=payload)
        if resp.status_code == 200:
            print(f"[heartbeat] OK — {HOSTNAME} ({SERVER_ID})")
        else:
            print(f"[heartbeat] ERROR {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[heartbeat] FAILED: {e}")


async def send_update(client: httpx.AsyncClient, include_services: bool = False) -> None:
    """Collect and push system data."""
    payload: dict = {"server_id": SERVER_ID}

    # Always collect metrics, processes, ports
    payload["metrics"] = collect_metrics()
    payload["processes"] = collect_processes()
    payload["ports"] = collect_ports()
    payload["docker"] = collect_docker()

    # Services are scanned less frequently
    if include_services:
        payload["services"] = collect_services()

    try:
        resp = await client.post(f"{BASE}/api/agent/update", json=payload)
        if resp.status_code == 200:
            svc_marker = " +services" if include_services else ""
            print(f"[update] OK — CPU: {payload['metrics']['cpu_percent']}%"
                  f"  RAM: {payload['metrics']['ram_percent']}%{svc_marker}")
        else:
            print(f"[update] ERROR {resp.status_code}: {resp.text}")
    except Exception as e:
        print(f"[update] FAILED: {e}")


async def main_loop() -> None:
    """Main agent event loop."""
    if not API_KEY:
        print("=" * 60)
        print("ERROR: SERVERDASH_API_KEY environment variable not set.")
        print("Set it to the key printed by the dashboard on first start.")
        print("  Windows:  set SERVERDASH_API_KEY=<key>")
        print("  Linux:    export SERVERDASH_API_KEY=<key>")
        print("=" * 60)
        sys.exit(1)

    print(f"[agent] Starting ServerDash Agent v{AGENT_VERSION}")
    print(f"[agent] Server ID: {SERVER_ID}")
    print(f"[agent] Hostname:  {HOSTNAME}")
    print(f"[agent] OS:        {OS_INFO}")
    print(f"[agent] Dashboard: {DASHBOARD_URL}")
    print(f"[agent] Push every {PUSH_INTERVAL}s, heartbeat every {HEARTBEAT_INTERVAL}s,",
          f"services every {SERVICE_SCAN_INTERVAL}s")
    print()

    last_heartbeat = 0.0
    last_service_scan = 0.0

    async with httpx.AsyncClient(headers=HEADERS, timeout=10.0) as client:
        # Initial heartbeat + full data push
        await send_heartbeat(client)
        await send_update(client, include_services=True)
        last_heartbeat = time.time()
        last_service_scan = time.time()

        while True:
            await asyncio.sleep(PUSH_INTERVAL)
            now = time.time()

            # Heartbeat check
            if now - last_heartbeat >= HEARTBEAT_INTERVAL:
                await send_heartbeat(client)
                last_heartbeat = now

            # Service scan check
            include_services = (now - last_service_scan >= SERVICE_SCAN_INTERVAL)
            if include_services:
                last_service_scan = now

            await send_update(client, include_services=include_services)


if __name__ == "__main__":
    try:
        async def run_all():
            # Run the main data loop and command executor concurrently
            await asyncio.gather(
                main_loop(),
                executor_loop(),
            )
        asyncio.run(run_all())
    except KeyboardInterrupt:
        print("\n[agent] Stopped.")
