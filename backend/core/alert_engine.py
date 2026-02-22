"""
ServerDash — Alert generation engine (event-driven).

Subscribes to 'health_state_changed' events.
Generates threshold alerts with cooldown, writes to DB,
logs events, and publishes 'alert_created'.
"""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Any

from health import THRESHOLDS
from database import get_db
from core.event_bus import bus

# Alert cooldown tracker: "server_id:metric" -> last alert time
_last_alerts: dict[str, datetime] = {}
ALERT_COOLDOWN_SECONDS = 60


async def _on_health_changed(payload: dict[str, Any]) -> None:
    """Check metrics thresholds and generate alerts."""
    server_id = payload["server_id"]
    metrics = payload["metrics"]
    prev_state = payload.get("previous_state", "unknown")
    new_state = payload["state"]

    now_dt = datetime.now(timezone.utc)
    now = now_dt.isoformat()

    alert_checks = [
        ("cpu", metrics.get("cpu_percent", 0), THRESHOLDS["cpu"]),
        ("ram", metrics.get("ram_percent", 0), THRESHOLDS["ram"]),
        ("disk", metrics.get("disk_percent", 0), THRESHOLDS["disk"]),
    ]

    async with get_db() as db:
        for metric_name, value, thresh in alert_checks:
            alert_key = f"{server_id}:{metric_name}"
            last = _last_alerts.get(alert_key)
            if last and (now_dt - last).total_seconds() < ALERT_COOLDOWN_SECONDS:
                continue

            if value > thresh["critical"]:
                severity = "critical"
                threshold = thresh["critical"]
            elif value > thresh["warning"]:
                severity = "warning"
                threshold = thresh["warning"]
            else:
                continue

            message = f"{metric_name.upper()} at {value:.1f}% (threshold: {threshold}%)"
            await db.execute(
                """INSERT INTO alerts (server_id, severity, metric, value, threshold, message, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (server_id, severity, metric_name, value, threshold, message, now),
            )
            _last_alerts[alert_key] = now_dt

            # Log event
            await db.execute(
                """INSERT INTO events (server_id, event_type, severity, message, timestamp)
                   VALUES (?, 'alert_created', ?, ?, ?)""",
                (server_id, severity, message, now),
            )

            await db.commit()

            await bus.publish("alert_created", {
                "server_id": server_id,
                "severity": severity,
                "metric": metric_name,
                "value": value,
                "threshold": threshold,
                "message": message,
                "timestamp": now,
            })

        # Log health state transition
        if prev_state != new_state:
            await db.execute(
                """INSERT INTO events (server_id, event_type, severity, message, timestamp)
                   VALUES (?, 'health_state_changed', ?, ?, ?)""",
                (server_id, "info",
                 f"Health state: {prev_state} → {new_state} (score: {payload['score']})",
                 now),
            )
            await db.commit()


def register() -> None:
    """Wire up subscriptions."""
    bus.subscribe("health_state_changed", _on_health_changed)
