"""
ServerDash — Services router.
"""

import json
from fastapi import APIRouter, Depends
from auth import require_jwt
from database import get_db

router = APIRouter(prefix="/api", tags=["services"])


@router.get("/services")
async def get_services(
    server_id: str | None = None,
    _user: str = Depends(require_jwt),
):
    """Return the latest services snapshot for a server."""
    async with get_db() as db:
        if server_id:
            rows = await db.execute_fetchall(
                """SELECT payload FROM services_snapshot
                   WHERE server_id = ?
                   ORDER BY timestamp DESC LIMIT 1""",
                (server_id,),
            )
        else:
            rows = await db.execute_fetchall(
                """SELECT ss.server_id, ss.payload, s.hostname
                   FROM services_snapshot ss
                   JOIN servers s ON s.id = ss.server_id
                   WHERE ss.id IN (
                       SELECT MAX(id) FROM services_snapshot GROUP BY server_id
                   )"""
            )

        results = []
        for r in rows:
            payload = json.loads(r["payload"])
            if server_id:
                return {"server_id": server_id, "services": payload}
            results.append({
                "server_id": r["server_id"],
                "hostname": r["hostname"],
                "services": payload,
            })

        if server_id:
            return {"server_id": server_id, "services": []}
        return results
