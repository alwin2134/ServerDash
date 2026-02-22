"""
ServerDash Agent — Metrics collector (cross-platform via psutil).

Uses non-blocking cpu_percent(interval=None) to avoid
blocking the async event loop.
"""

import psutil

# Warm up cpu_percent on import so first call returns meaningful value
psutil.cpu_percent(interval=None)


def collect_metrics() -> dict:
    """Collect CPU, RAM, disk, and network metrics (non-blocking)."""
    cpu = psutil.cpu_percent(interval=None)

    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    net = psutil.net_io_counters()

    return {
        "cpu_percent": cpu,
        "ram_total": mem.total,
        "ram_used": mem.used,
        "ram_percent": mem.percent,
        "disk_total": disk.total,
        "disk_used": disk.used,
        "disk_percent": disk.percent,
        "net_bytes_sent": net.bytes_sent,
        "net_bytes_recv": net.bytes_recv,
    }
