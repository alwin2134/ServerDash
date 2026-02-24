"""
ServerDash — Agent communication router.
Handles heartbeats and data pushes from agents.
Now uses event bus — no inline health/alert logic.
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from auth import require_api_key
from database import get_db
from models import AgentHeartbeat, AgentUpdate
from core.event_bus import bus
from core.event_logger import log_event

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/heartbeat")
async def agent_heartbeat(
    heartbeat: AgentHeartbeat,
    _key: str = Depends(require_api_key),
):
    """Register or update a server via agent heartbeat."""
    now = datetime.now(timezone.utc).isoformat()

    async with get_db() as db:
        await db.execute(
            """INSERT INTO servers (id, hostname, ip_address, os_info, agent_version, status, last_seen)
               VALUES (?, ?, ?, ?, ?, 'online', ?)
               ON CONFLICT(id) DO UPDATE SET
                   hostname = excluded.hostname,
                   ip_address = excluded.ip_address,
                   os_info = excluded.os_info,
                   agent_version = excluded.agent_version,
                   status = 'online',
                   last_seen = excluded.last_seen""",
            (heartbeat.server_id, heartbeat.hostname, heartbeat.ip_address,
             heartbeat.os_info, heartbeat.agent_version, now),
        )

        # Log event: agent online if previously offline or new
        row = await db.execute_fetchall("SELECT current_state FROM servers WHERE id = ?", (heartbeat.server_id,))
        curr = row[0]["current_state"] if row and row[0]["current_state"] is not None else "unknown"
        
        if curr == "offline" or curr == "unknown":
            await log_event(
                server_id=heartbeat.server_id,
                event_type="agent_online",
                severity="info",
                message=f"Agent {heartbeat.hostname} connected",
                metadata={"version": heartbeat.agent_version, "ip": heartbeat.ip_address}
            )
            await db.execute(
                "UPDATE servers SET current_state = 'normal', previous_state = ?, state_changed_at = ? WHERE id = ?",
                (curr, now, heartbeat.server_id)
            )
            
        await db.commit()

    await bus.publish("server_status", {
        "server_id": heartbeat.server_id,
        "hostname": heartbeat.hostname,
        "status": "online",
        "last_seen": now,
    })

    return {"status": "ok"}


@router.post("/update")
async def agent_update(
    update: AgentUpdate,
    _key: str = Depends(require_api_key),
):
    """Receive metrics, services, processes, ports from an agent.
    Writes raw data to DB and publishes events. No inline logic."""
    now = datetime.now(timezone.utc).isoformat()

    broadcast_data: dict = {"server_id": update.server_id, "timestamp": now}

    async with get_db() as db:
        # Update server last_seen
        await db.execute(
            "UPDATE servers SET last_seen = ?, status = 'online' WHERE id = ?",
            (now, update.server_id),
        )

        # ── Metrics ───────────────────────────────────────
        if update.metrics:
            m = update.metrics
            await db.execute(
                """INSERT INTO metrics_snapshot
                   (server_id, cpu_percent, ram_total, ram_used, ram_percent,
                    disk_total, disk_used, disk_percent, net_bytes_sent, net_bytes_recv, timestamp)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (update.server_id, m.cpu_percent, m.ram_total, m.ram_used,
                 m.ram_percent, m.disk_total, m.disk_used, m.disk_percent,
                 m.net_bytes_sent, m.net_bytes_recv, now),
            )
            # Prune old snapshots (keep last 8640 = ~7 days at 5s)
            await db.execute(
                """DELETE FROM metrics_snapshot
                   WHERE server_id = ? AND id NOT IN (
                       SELECT id FROM metrics_snapshot
                       WHERE server_id = ?
                       ORDER BY timestamp DESC LIMIT 8640
                   )""",
                (update.server_id, update.server_id),
            )
            broadcast_data["metrics"] = m.model_dump()

        # ── Services ──────────────────────────────────────
        if update.services is not None:
            payload = json.dumps([s.model_dump() for s in update.services])
            await db.execute(
                """INSERT INTO services_snapshot (server_id, payload, timestamp)
                   VALUES (?, ?, ?)""",
                (update.server_id, payload, now),
            )
            await db.execute(
                """DELETE FROM services_snapshot
                   WHERE server_id = ? AND id NOT IN (
                       SELECT id FROM services_snapshot
                       WHERE server_id = ?
                       ORDER BY timestamp DESC LIMIT 5
                   )""",
                (update.server_id, update.server_id),
            )
            broadcast_data["services"] = [s.model_dump() for s in update.services]

        # ── Processes (now DB-persisted) ──────────────────
        if update.processes is not None:
            procs_payload = json.dumps([p.model_dump() for p in update.processes])
            # Upsert: delete old, insert new (keep latest only)
            await db.execute(
                "DELETE FROM processes_snapshot WHERE server_id = ?",
                (update.server_id,),
            )
            await db.execute(
                """INSERT INTO processes_snapshot (server_id, payload, timestamp)
                   VALUES (?, ?, ?)""",
                (update.server_id, procs_payload, now),
            )
            broadcast_data["processes"] = [p.model_dump() for p in update.processes]

        # ── Ports (now DB-persisted) ──────────────────────
        if update.ports is not None:
            ports_payload = json.dumps([p.model_dump() for p in update.ports])
            await db.execute(
                "DELETE FROM ports_snapshot WHERE server_id = ?",
                (update.server_id,),
            )
            await db.execute(
                """INSERT INTO ports_snapshot (server_id, payload, timestamp)
                   VALUES (?, ?, ?)""",
                (update.server_id, ports_payload, now),
            )
            broadcast_data["ports"] = [p.model_dump() for p in update.ports]

        # ── Docker (DB-persisted) ────────────────────────────
        if update.docker is not None:
            docker_payload = json.dumps(update.docker)
            await db.execute(
                "DELETE FROM docker_snapshot WHERE server_id = ?",
                (update.server_id,),
            )
            await db.execute(
                """INSERT INTO docker_snapshot (server_id, payload, timestamp)
                   VALUES (?, ?, ?)""",
                (update.server_id, docker_payload, now),
            )
            broadcast_data["docker"] = update.docker

        await db.commit()

    # Publish events for downstream processing
    if update.metrics:
        await bus.publish("metrics_updated", {
            "server_id": update.server_id,
            "metrics": update.metrics.model_dump(),
            "timestamp": now,
        })
        # Include health in broadcast (will be filled by health engine)
        # The health_state_changed event triggers its own WS broadcast

    # Broadcast raw data update to UI
    await bus.publish("agent_update_broadcast", broadcast_data)

    return {"status": "ok", "received": now}
