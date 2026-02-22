"""
ServerDash — Health scoring engine.
Computes server health state from latest metrics.
"""

from models import MetricsPayload, HealthState


# Thresholds
THRESHOLDS = {
    "cpu": {"warning": 80, "critical": 95},
    "ram": {"warning": 85, "critical": 95},
    "disk": {"warning": 85, "critical": 95},
}


def compute_health(metrics: MetricsPayload) -> HealthState:
    """Compute a 0-100 health score and state from current metrics."""
    score = 100
    reasons = []

    # CPU
    if metrics.cpu_percent > THRESHOLDS["cpu"]["critical"]:
        score -= 40
        reasons.append(f"CPU critical: {metrics.cpu_percent:.1f}%")
    elif metrics.cpu_percent > THRESHOLDS["cpu"]["warning"]:
        score -= 15
        reasons.append(f"CPU high: {metrics.cpu_percent:.1f}%")

    # RAM
    if metrics.ram_percent > THRESHOLDS["ram"]["critical"]:
        score -= 35
        reasons.append(f"Memory critical: {metrics.ram_percent:.1f}%")
    elif metrics.ram_percent > THRESHOLDS["ram"]["warning"]:
        score -= 12
        reasons.append(f"Memory high: {metrics.ram_percent:.1f}%")

    # Disk
    if metrics.disk_percent > THRESHOLDS["disk"]["critical"]:
        score -= 30
        reasons.append(f"Disk critical: {metrics.disk_percent:.1f}%")
    elif metrics.disk_percent > THRESHOLDS["disk"]["warning"]:
        score -= 10
        reasons.append(f"Disk high: {metrics.disk_percent:.1f}%")

    score = max(0, score)

    if score >= 90:
        state = "healthy"
    elif score >= 70:
        state = "warning"
    elif score >= 40:
        state = "degraded"
    else:
        state = "critical"

    return HealthState(score=score, state=state, reasons=reasons)
