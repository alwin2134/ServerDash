"""
ServerDash — Metrics router.
"""

from fastapi import APIRouter, Depends
from auth import require_jwt
from database import get_db

router = APIRouter(prefix="/api/system", tags=["metrics"])


@router.get("/metrics")
async def get_metrics(
    server_id: str | None = None,
    _user: str = Depends(require_jwt),
):
    """Return the latest metrics snapshot."""
    async with get_db() as db:
        if server_id:
            rows = await db.execute_fetchall(
                """SELECT m.*, s.hostname FROM metrics_snapshot m
                   JOIN servers s ON s.id = m.server_id
                   WHERE m.server_id = ?
                   ORDER BY m.timestamp DESC LIMIT 1""",
                (server_id,),
            )
        else:
            rows = await db.execute_fetchall(
                """SELECT m.*, s.hostname FROM metrics_snapshot m
                   JOIN servers s ON s.id = m.server_id
                   WHERE m.id IN (
                       SELECT MAX(id) FROM metrics_snapshot GROUP BY server_id
                   )
                   ORDER BY s.hostname"""
            )

        return [
            {
                "server_id": r["server_id"],
                "hostname": r["hostname"],
                "cpu_percent": r["cpu_percent"],
                "ram_total": r["ram_total"],
                "ram_used": r["ram_used"],
                "ram_percent": r["ram_percent"],
                "disk_total": r["disk_total"],
                "disk_used": r["disk_used"],
                "disk_percent": r["disk_percent"],
                "net_bytes_sent": r["net_bytes_sent"],
                "net_bytes_recv": r["net_bytes_recv"],
                "timestamp": r["timestamp"],
            }
            for r in rows
        ]
