"""
ServerDash — Core package initializer.
Registers all event bus subscriptions when the package is imported.
"""

from core import health_engine, alert_engine, intelligence


def setup_event_bus() -> None:
    """Wire up all event bus subscribers. Called during app lifespan."""
    health_engine.register()
    alert_engine.register()
    intelligence.register()
