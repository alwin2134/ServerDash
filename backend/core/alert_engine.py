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
from core.event_logger import log_event

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
                # Resolve active alerts for this metric if any
                unresolved = await db.execute_fetchall(
                    "SELECT id, timestamp FROM alerts WHERE server_id = ? AND metric = ? AND resolved_at IS NULL",
                    (server_id, metric_name)
                )
                if unresolved:
                    for u in unresolved:
                        alert_id = u["id"]
                        created_ts = datetime.fromisoformat(u["timestamp"]).replace(tzinfo=timezone.utc)
                        duration = int((now_dt - created_ts).total_seconds())
                        
                        await db.execute(
                            "UPDATE alerts SET resolved_at = ?, duration_seconds = ? WHERE id = ?",
                            (now, duration, alert_id)
                        )
                        await log_event(
                            server_id=server_id,
                            event_type="alert_resolved",
                            severity="info",
                            message=f"{metric_name.upper()} alert resolved after {duration}s",
                            metadata={"alert_id": alert_id, "duration": duration, "metric": metric_name}
                        )
                    await db.commit()
                continue

            message = f"{metric_name.upper()} at {value:.1f}% (threshold: {threshold}%)"
            await db.execute(
                """INSERT INTO alerts (server_id, severity, metric, value, threshold, message, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (server_id, severity, metric_name, value, threshold, message, now),
            )
            _last_alerts[alert_key] = now_dt

            # Log event
            await log_event(
                server_id=server_id,
                event_type="alert_created",
                severity=severity,
                message=message,
                metadata={"metric": metric_name, "value": value}
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

        # Log health state transition if needed
        # (This is mostly redundant now since health_engine logs it, 
        # but we'll leave it as a secondary check or remove it. 
        # Since Phase 5 uses state_changed logged in health_engine, 
        # we can remove the manual health_state_changed here to avoid duplicates.)
        pass


def register() -> None:
    """Wire up subscriptions."""
    bus.subscribe("health_state_changed", _on_health_changed)
