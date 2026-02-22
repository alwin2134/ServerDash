"""
ServerDash — Internal event bus for decoupled pub/sub architecture.

Usage:
    from core.event_bus import bus

    # Subscribe
    async def on_metrics(payload):
        ...
    bus.subscribe("metrics_updated", on_metrics)

    # Publish
    await bus.publish("metrics_updated", {"server_id": "...", "metrics": {...}})
"""

from __future__ import annotations
import asyncio
from collections import defaultdict
from typing import Any, Callable, Coroutine


Handler = Callable[[dict[str, Any]], Coroutine[Any, Any, None]]


class EventBus:
    """Simple async event bus with topic-based pub/sub."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[Handler]] = defaultdict(list)

    def subscribe(self, event_type: str, handler: Handler) -> None:
        """Register an async handler for an event type."""
        self._subscribers[event_type].append(handler)

    async def publish(self, event_type: str, payload: dict[str, Any]) -> None:
        """Dispatch an event to all registered handlers concurrently."""
        handlers = self._subscribers.get(event_type, [])
        if not handlers:
            return
        results = await asyncio.gather(
            *(h(payload) for h in handlers),
            return_exceptions=True,
        )
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"[event_bus] Handler error for '{event_type}': {result}")


# Singleton
bus = EventBus()
