"""
ServerDash — Ports router.

Port data is now DB-persisted (latest snapshot per server).
"""

import json
from fastapi import APIRouter, Depends
from auth import require_jwt
from database import get_db

router = APIRouter(prefix="/api", tags=["ports"])


@router.get("/ports")
async def get_ports(
    server_id: str | None = None,
    _user: str = Depends(require_jwt),
):
    """Return the latest port list for a server."""
    async with get_db() as db:
        if server_id:
            rows = await db.execute_fetchall(
                """SELECT payload FROM ports_snapshot
                   WHERE server_id = ?
                   ORDER BY timestamp DESC LIMIT 1""",
                (server_id,),
            )
            payload = json.loads(rows[0]["payload"]) if rows else []
            return {"server_id": server_id, "ports": payload}

        rows = await db.execute_fetchall(
            """SELECT ps.server_id, ps.payload
               FROM ports_snapshot ps
               WHERE ps.id IN (
                   SELECT MAX(id) FROM ports_snapshot GROUP BY server_id
               )"""
        )
        return [
            {
                "server_id": r["server_id"],
                "ports": json.loads(r["payload"]),
            }
            for r in rows
        ]
