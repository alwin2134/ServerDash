"""
ServerDash — Agent background sweeper.
Periodically checks for agents that missed heartbeats and marks them offline.
"""

import asyncio
from datetime import datetime, timezone

from database import get_db
from core.event_logger import log_event
from core.event_bus import bus

OFFLINE_THRESHOLD_SECONDS = 30
SWEEP_INTERVAL_SECONDS = 15

async def sweep_offline_agents():
    """Loop to find and mark disconnected agents offline."""
    print("[serverdash] Agent sweeper started.")
    while True:
        try:
            now_dt = datetime.now(timezone.utc)
            now = now_dt.isoformat()
            
            async with get_db() as db:
                # Find servers marked online but stale
                # Using SQLite datetime('now', '-30 seconds') compares against UTC CURRENT_TIMESTAMP
                rows = await db.execute_fetchall(
                    f"SELECT id, hostname, current_state FROM servers WHERE status = 'online' AND last_seen < datetime('now', '-{OFFLINE_THRESHOLD_SECONDS} seconds')"
                )
                
                for r in rows:
                    server_id = r["id"]
                    hostname = r["hostname"]
                    curr_state = r["current_state"]
                    
                    await db.execute(
                        "UPDATE servers SET status = 'offline', current_state = 'offline', previous_state = ?, state_changed_at = ? WHERE id = ?",
                        (curr_state, now, server_id)
                    )
                    
                    await log_event(
                        server_id=server_id,
                        event_type="agent_offline",
                        severity="critical",
                        message=f"Agent {hostname} went offline",
                        metadata={"previous_state": curr_state}
                    )
                    
                    # Broadcast status change
                    await bus.publish("server_status", {
                        "server_id": server_id,
                        "hostname": hostname,
                        "status": "offline",
                        "last_seen": now
                    })
                    
                if rows:
                    await db.commit()
                    
        except Exception as e:
            print(f"[sweeper] Error in sweep loop: {e}")
            
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
