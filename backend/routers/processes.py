"""
ServerDash — Processes router.

Process data is now DB-persisted (latest snapshot per server).
"""

import json
from fastapi import APIRouter, Depends
from auth import require_jwt
from database import get_db
from models import KillProcessRequest

router = APIRouter(prefix="/api", tags=["processes"])


@router.get("/processes")
async def get_processes(
    server_id: str | None = None,
    _user: str = Depends(require_jwt),
):
    """Return the latest process list for a server."""
    async with get_db() as db:
        if server_id:
            rows = await db.execute_fetchall(
                """SELECT payload FROM processes_snapshot
                   WHERE server_id = ?
                   ORDER BY timestamp DESC LIMIT 1""",
                (server_id,),
            )
            payload = json.loads(rows[0]["payload"]) if rows else []
            return {"server_id": server_id, "processes": payload}

        rows = await db.execute_fetchall(
            """SELECT ps.server_id, ps.payload
               FROM processes_snapshot ps
               WHERE ps.id IN (
                   SELECT MAX(id) FROM processes_snapshot GROUP BY server_id
               )"""
        )
        return [
            {
                "server_id": r["server_id"],
                "processes": json.loads(r["payload"]),
            }
            for r in rows
        ]


@router.post("/processes/{server_id}/kill")
async def kill_process(
    server_id: str,
    req: KillProcessRequest,
    _user: str = Depends(require_jwt),
):
    """Queue a process kill command for the agent."""
    payload = json.dumps({"pid": req.pid, "signal": req.signal})

    async with get_db() as db:
        cursor = await db.execute(
            """INSERT INTO pending_commands (server_id, command_type, payload)
               VALUES (?, 'kill_process', ?)""",
            (server_id, payload),
        )
        command_id = cursor.lastrowid
        await db.commit()

    return {"status": "queued", "command_id": command_id}

