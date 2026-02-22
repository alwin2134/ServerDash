"""
ServerDash — WebSocket connection manager for real-time broadcast.

Improvements over Phase 1:
 - Dict-based storage keyed by id for O(1) add/remove.
 - Concurrent broadcast via asyncio.gather.
 - Max connection limit.
 - JWT auth on connect.
 - Event bus integration for automatic broadcast.
"""

from __future__ import annotations
import asyncio
import json
from typing import Any
from fastapi import WebSocket

from config import WS_MAX_CONNECTIONS
from core.event_bus import bus


class ConnectionManager:
    """Manages authenticated WebSocket connections and broadcasts."""

    def __init__(self, max_connections: int = WS_MAX_CONNECTIONS) -> None:
        self._connections: dict[int, WebSocket] = {}
        self._max = max_connections
        self._counter = 0

    async def connect(self, ws: WebSocket) -> int | None:
        """Accept and register a connection. Returns client_id or None if full."""
        if len(self._connections) >= self._max:
            await ws.close(code=1013, reason="Server at capacity")
            return None
        await ws.accept()
        self._counter += 1
        cid = self._counter
        self._connections[cid] = ws
        return cid

    def disconnect(self, client_id: int) -> None:
        self._connections.pop(client_id, None)

    async def broadcast(self, event_type: str, data: dict) -> None:
        """Send a JSON message to all connected clients concurrently."""
        if not self._connections:
            return
        message = json.dumps({"type": event_type, "data": data})
        stale: list[int] = []

        async def _send(cid: int, ws: WebSocket) -> None:
            try:
                await ws.send_text(message)
            except Exception:
                stale.append(cid)

        await asyncio.gather(
            *(_send(cid, ws) for cid, ws in self._connections.items())
        )
        for cid in stale:
            self.disconnect(cid)

    @property
    def client_count(self) -> int:
        return len(self._connections)


# Singleton instance
manager = ConnectionManager()


# ── Event bus subscribers ─────────────────────────────────

async def _on_agent_update(payload: dict[str, Any]) -> None:
    """Broadcast full agent update to UI clients."""
    await manager.broadcast("agent_update", payload)


async def _on_server_status(payload: dict[str, Any]) -> None:
    await manager.broadcast("server_status", payload)


async def _on_health_changed(payload: dict[str, Any]) -> None:
    """Broadcast health changes (already part of agent_update, but also standalone)."""
    await manager.broadcast("health", {
        "server_id": payload["server_id"],
        "score": payload["score"],
        "state": payload["state"],
        "reasons": payload["reasons"],
    })


async def _on_alert_created(payload: dict[str, Any]) -> None:
    await manager.broadcast("alert", payload)


def register_ws_events() -> None:
    """Subscribe to event bus for WebSocket broadcast."""
    bus.subscribe("agent_update_broadcast", _on_agent_update)
    bus.subscribe("server_status", _on_server_status)
    bus.subscribe("health_state_changed", _on_health_changed)
    bus.subscribe("alert_created", _on_alert_created)
