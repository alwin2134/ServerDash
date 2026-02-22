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


async def _on_metrics_updated(payload: dict[str, Any]) -> None:
    """React to new metrics: compute health and persist."""
    server_id = payload["server_id"]
    raw = payload["metrics"]
    metrics = MetricsPayload(**raw) if isinstance(raw, dict) else raw

    health = compute_health(metrics)

    async with get_db() as db:
        # Read previous state for change detection
        row = await db.execute_fetchall(
            "SELECT health_state FROM servers WHERE id = ?", (server_id,),
        )
        prev_state = row[0]["health_state"] if row else "unknown"

        await db.execute(
            "UPDATE servers SET health_state = ?, health_score = ? WHERE id = ?",
            (health.state, health.score, server_id),
        )
        await db.commit()

    await bus.publish("health_state_changed", {
        "server_id": server_id,
        "score": health.score,
        "state": health.state,
        "reasons": health.reasons,
        "previous_state": prev_state,
        "metrics": raw if isinstance(raw, dict) else raw.model_dump(),
    })


def register() -> None:
    """Wire up subscriptions."""
    bus.subscribe("metrics_updated", _on_metrics_updated)
