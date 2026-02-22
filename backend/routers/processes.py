"""
ServerDash — Processes router.

Process data is now DB-persisted (latest snapshot per server).
"""

import json
from fastapi import APIRouter, Depends
from auth import require_jwt
from database import get_db

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
