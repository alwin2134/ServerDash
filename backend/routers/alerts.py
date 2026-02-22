"""
ServerDash — Alerts router.
Returns and manages threshold-based alerts.
"""

from fastapi import APIRouter, Depends, Query
from auth import require_jwt
from database import get_db

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/alerts")
async def get_alerts(
    server_id: str | None = None,
    limit: int = Query(50, le=200),
    unread_only: bool = False,
    _user: str = Depends(require_jwt),
):
    """Return alerts, newest first."""
    async with get_db() as db:
        query = "SELECT * FROM alerts"
        params: list = []
        conditions = []

        if server_id:
            conditions.append("server_id = ?")
            params.append(server_id)
        if unread_only:
            conditions.append("acknowledged = 0")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        rows = await db.execute_fetchall(query, params)
        return [
            {
                "id": r["id"],
                "server_id": r["server_id"],
                "severity": r["severity"],
                "metric": r["metric"],
                "value": r["value"],
                "threshold": r["threshold"],
                "message": r["message"],
                "acknowledged": bool(r["acknowledged"]),
                "timestamp": r["timestamp"],
            }
            for r in rows
        ]


@router.get("/alerts/count")
async def get_alert_count(
    server_id: str | None = None,
    _user: str = Depends(require_jwt),
):
    """Return count of unacknowledged alerts."""
    async with get_db() as db:
        if server_id:
            row = await db.execute_fetchall(
                "SELECT COUNT(*) as cnt FROM alerts WHERE server_id = ? AND acknowledged = 0",
                (server_id,),
            )
        else:
            row = await db.execute_fetchall(
                "SELECT COUNT(*) as cnt FROM alerts WHERE acknowledged = 0"
            )
        return {"count": row[0]["cnt"] if row else 0}


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int,
    _user: str = Depends(require_jwt),
):
    """Mark an alert as acknowledged."""
    async with get_db() as db:
        await db.execute(
            "UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,),
        )
        await db.commit()
    return {"status": "ok"}


@router.post("/alerts/acknowledge-all")
async def acknowledge_all(
    server_id: str | None = None,
    _user: str = Depends(require_jwt),
):
    """Mark all alerts as acknowledged."""
    async with get_db() as db:
        if server_id:
            await db.execute(
                "UPDATE alerts SET acknowledged = 1 WHERE server_id = ?",
                (server_id,),
            )
        else:
            await db.execute("UPDATE alerts SET acknowledged = 1")
        await db.commit()
    return {"status": "ok"}
