"""
ServerDash Agent — Port detection (cross-platform via psutil).
"""

import psutil


def collect_ports() -> list[dict]:
    """Detect listening ports and their associated processes."""
    ports = []
    seen = set()

    for conn in psutil.net_connections(kind="inet"):
        if conn.status != "LISTEN":
            continue

        laddr = conn.laddr
        if not laddr:
            continue

        key = (laddr.port, "tcp")
        if key in seen:
            continue
        seen.add(key)

        proc_name = ""
        pid = conn.pid
        if pid:
            try:
                proc_name = psutil.Process(pid).name()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        ports.append({
            "port": laddr.port,
            "protocol": "tcp",
            "address": laddr.ip or "0.0.0.0",
            "pid": pid,
            "process_name": proc_name,
            "status": "LISTEN",
        })

    ports.sort(key=lambda p: p["port"])
    return ports
