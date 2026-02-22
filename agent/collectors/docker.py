"""
ServerDash Agent — Docker container collector.

Collects container info via the Docker SDK.
Gracefully returns [] if Docker is not available.
"""

try:
    import docker as docker_sdk
    _DOCKER_AVAILABLE = True
except ImportError:
    _DOCKER_AVAILABLE = False


def collect_docker() -> list[dict]:
    """Return a list of Docker container dicts."""
    if not _DOCKER_AVAILABLE:
        return []

    try:
        client = docker_sdk.from_env()
    except Exception:
        return []

    containers = []
    try:
        for c in client.containers.list(all=True):
            # Basic info
            info = {
                "container_id": c.short_id,
                "name": c.name,
                "image": str(c.image.tags[0]) if c.image.tags else str(c.image.short_id),
                "status": c.status,    # e.g. "running", "exited"
                "state": c.status,
                "cpu_percent": 0.0,
                "memory_usage": 0,
                "memory_limit": 0,
                "ports": _format_ports(c.ports),
            }

            # Try to get live stats (only for running containers)
            if c.status == "running":
                try:
                    stats = c.stats(stream=False)
                    info["cpu_percent"] = _calc_cpu(stats)
                    mem = stats.get("memory_stats", {})
                    info["memory_usage"] = mem.get("usage", 0)
                    info["memory_limit"] = mem.get("limit", 0)
                except Exception:
                    pass

            containers.append(info)
    except Exception as e:
        print(f"[docker] Error listing containers: {e}")

    return containers


def _format_ports(ports: dict) -> str:
    """Format Docker port bindings into a readable string."""
    if not ports:
        return ""
    parts = []
    for container_port, bindings in ports.items():
        if bindings:
            for b in bindings:
                parts.append(f"{b.get('HostPort', '?')}->{container_port}")
        else:
            parts.append(str(container_port))
    return ", ".join(parts)


def _calc_cpu(stats: dict) -> float:
    """Calculate CPU % from Docker stats."""
    try:
        cpu = stats["cpu_stats"]
        precpu = stats["precpu_stats"]
        delta = cpu["cpu_usage"]["total_usage"] - precpu["cpu_usage"]["total_usage"]
        system_delta = cpu["system_cpu_usage"] - precpu["system_cpu_usage"]
        cpus = cpu.get("online_cpus", len(cpu["cpu_usage"].get("percpu_usage", [1])))
        if system_delta > 0 and delta > 0:
            return round((delta / system_delta) * cpus * 100, 2)
    except (KeyError, ZeroDivisionError, TypeError):
        pass
    return 0.0
