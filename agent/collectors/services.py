"""
ServerDash Agent — Service detection (cross-platform).

Uses psutil + platform-specific enrichment:
  - Windows: psutil.win_service_iter()
  - Linux: systemctl fallback
"""

import platform
import subprocess
import psutil


def collect_services() -> list[dict]:
    """Detect installed and running services."""
    system = platform.system()

    if system == "Windows":
        return _collect_windows_services()
    elif system == "Linux":
        return _collect_linux_services()
    else:
        return _collect_generic_services()


def _collect_windows_services() -> list[dict]:
    """Use psutil's Windows service API."""
    services = []
    try:
        for svc in psutil.win_service_iter():
            try:
                info = svc.as_dict()
                status_map = {
                    "running": "running",
                    "stopped": "stopped",
                    "start_pending": "running",
                    "stop_pending": "stopped",
                }
                services.append({
                    "name": info.get("name", ""),
                    "display_name": info.get("display_name", ""),
                    "status": status_map.get(info.get("status", ""), "unknown"),
                    "enabled": info.get("start_type", "") == "automatic",
                    "type": "service",
                })
            except Exception:
                continue
    except Exception:
        pass
    return services


def _collect_linux_services() -> list[dict]:
    """Use systemctl on Linux."""
    services = []
    try:
        result = subprocess.run(
            ["systemctl", "list-units", "--type=service", "--all",
             "--no-pager", "--no-legend"],
            capture_output=True, text=True, timeout=10,
        )
        for line in result.stdout.strip().split("\n"):
            parts = line.split()
            if len(parts) >= 4:
                name = parts[0].replace(".service", "")
                load = parts[1]
                active = parts[2]
                sub = parts[3]

                status_map = {
                    "running": "running",
                    "exited": "stopped",
                    "dead": "stopped",
                    "failed": "failed",
                }
                services.append({
                    "name": name,
                    "display_name": name,
                    "status": status_map.get(sub, "unknown"),
                    "enabled": load == "loaded",
                    "type": "service",
                })
    except Exception:
        pass
    return services


def _collect_generic_services() -> list[dict]:
    """Fallback: return empty list for unsupported platforms."""
    return []
