"""
Event Logger for ServerDash.
Records operational states and system events to SQLite database.
"""

from typing import Optional
import json
from database import get_db

async def log_event(
    server_id: Optional[str],
    event_type: str,
    severity: str,
    message: str,
    metadata: Optional[dict] = None
) -> None:
    """
    Log an event to the events table.
    
    event_type: state_changed, alert_created, alert_resolved,
                service_status_changed, agent_online, agent_offline, backend_restart
    severity: info, warning, critical
    """
    metadata_json = json.dumps(metadata) if metadata else None
    
    async with get_db() as db:
        await db.execute(
            """INSERT INTO events
               (server_id, event_type, severity, message, metadata)
               VALUES (?, ?, ?, ?, ?)""",
            (server_id, event_type, severity, message, metadata_json)
        )
        await db.commit()
