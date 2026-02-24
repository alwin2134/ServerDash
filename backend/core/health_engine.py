"""
ServerDash — Health scoring engine (event-driven).

Subscribes to 'metrics_updated' events, computes health,
writes to DB, and publishes 'health_state_changed'.
"""

from __future__ import annotations
from typing import Any

from health import compute_health
from models import MetricsPayload
from database import get_db
from core.event_bus import bus
from core.event_logger import log_event
from datetime import datetime, timezone


def evaluate_state(health_score: int) -> str:
    """
    Evaluate composite operational state from health score.
    Returns: normal, busy, degraded, critical, offline
    """
    if health_score >= 90:
        return "normal"
    elif health_score >= 70:
        return "busy"
    elif health_score >= 40:
        return "degraded"
    else:
        return "critical"


async def _on_metrics_updated(payload: dict[str, Any]) -> None:
    """React to new metrics: compute health and persist."""
    server_id = payload["server_id"]
    raw = payload["metrics"]
    metrics = MetricsPayload(**raw) if isinstance(raw, dict) else raw

    health = compute_health(metrics)

    async with get_db() as db:
        # Read previous state for change detection
        row = await db.execute_fetchall(
            "SELECT health_state, current_state FROM servers WHERE id = ?", (server_id,),
        )
        prev_health = row[0]["health_state"] if row else "unknown"
        prev_state = row[0]["current_state"] if row else "unknown"

        curr_state = evaluate_state(health.score)
        
        if curr_state != prev_state and prev_state != "unknown":
            now = datetime.now(timezone.utc).isoformat()
            await db.execute(
                """UPDATE servers 
                   SET health_state = ?, health_score = ?, 
                       previous_state = ?, current_state = ?, state_changed_at = ? 
                   WHERE id = ?""",
                (health.state, health.score, prev_state, curr_state, now, server_id),
            )
            await db.commit()
            await log_event(
                server_id=server_id,
                event_type="state_changed",
                severity="info" if curr_state in ["normal", "busy"] else "warning",
                message=f"System state changed from {prev_state} to {curr_state}",
                metadata={"previous": prev_state, "current": curr_state, "score": health.score}
            )
        else:
            await db.execute(
                "UPDATE servers SET health_state = ?, health_score = ?, current_state = ? WHERE id = ?",
                (health.state, health.score, curr_state, server_id),
            )
            await db.commit()

    await bus.publish("health_state_changed", {
        "server_id": server_id,
        "score": health.score,
        "state": health.state,
        "reasons": health.reasons,
        "reasons": health.reasons,
        "previous_state": prev_health,
        "metrics": raw if isinstance(raw, dict) else raw.model_dump(),
    })


def register() -> None:
    """Wire up subscriptions."""
    bus.subscribe("metrics_updated", _on_metrics_updated)
