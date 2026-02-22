"""
ServerDash — Servers router.
"""

from fastapi import APIRouter, Depends, HTTPException
from auth import require_jwt
from database import get_db

router = APIRouter(prefix="/api", tags=["servers"])


@router.get("/servers")
async def get_servers(_user: str = Depends(require_jwt)):
    """Return all registered servers with their statuses."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            """SELECT id, hostname, ip_address, os_info, agent_version,
                      status, health_state, health_score, last_seen, created_at
               FROM servers ORDER BY hostname"""
        )
        return [
            {
                "id": r["id"],
                "hostname": r["hostname"],
                "ip_address": r["ip_address"],
                "os_info": r["os_info"],
                "agent_version": r["agent_version"],
                "status": r["status"],
                "health_state": r["health_state"],
                "health_score": r["health_score"],
                "last_seen": r["last_seen"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]


@router.delete("/servers/{server_id}")
async def delete_server(server_id: str, _user: str = Depends(require_jwt)):
    """Remove a server and all its data."""
    async with get_db() as db:
        row = await db.execute_fetchall(
            "SELECT id FROM servers WHERE id = ?", (server_id,),
        )
        if not row:
            raise HTTPException(status_code=404, detail="Server not found")

        # Cascade delete all related data
        for table in [
            "metrics_snapshot", "services_snapshot",
            "processes_snapshot", "ports_snapshot",
            "alerts", "events",
        ]:
            await db.execute(
                f"DELETE FROM {table} WHERE server_id = ?", (server_id,),
            )
        await db.execute("DELETE FROM servers WHERE id = ?", (server_id,))
        await db.commit()

    return {"status": "deleted", "server_id": server_id}
