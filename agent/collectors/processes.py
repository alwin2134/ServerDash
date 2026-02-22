"""
ServerDash Agent — Process list collector (cross-platform via psutil).
"""

import psutil


def collect_processes() -> list[dict]:
    """Collect top processes by CPU usage."""
    procs = []
    for p in psutil.process_iter(["pid", "ppid", "name", "cpu_percent", "memory_percent", "status"]):
        try:
            info = p.info
            procs.append({
                "pid": info["pid"],
                "ppid": info.get("ppid", 0) or 0,
                "name": info.get("name", "") or "",
                "cpu_percent": round(info.get("cpu_percent", 0) or 0, 1),
                "memory_percent": round(info.get("memory_percent", 0) or 0, 1),
                "status": info.get("status", "") or "",
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Sort by CPU descending, limit to top 100
    procs.sort(key=lambda p: p["cpu_percent"], reverse=True)
    return procs[:100]
