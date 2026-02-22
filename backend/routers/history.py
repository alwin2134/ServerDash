"""
ServerDash — History router.
Returns time-series metrics for charts.
"""

from fastapi import APIRouter, Depends, Query
from auth import require_jwt
from database import get_db

router = APIRouter(prefix="/api", tags=["history"])

# Map time range to approximate number of data points (at 5s intervals)
RANGE_LIMITS = {
    "1h": 720,
    "6h": 4320,
    "24h": 8640,
    "7d": 8640,     # capped at retention limit
}


@router.get("/history/{server_id}")
async def get_history(
    server_id: str,
    limit: int = Query(60, le=10000),
    range: str = Query(None),
    _user: str = Depends(require_jwt),
):
    """Return last N metric snapshots for a server."""
    actual_limit = RANGE_LIMITS.get(range, limit) if range else limit

    async with get_db() as db:
        rows = await db.execute_fetchall(
            """SELECT cpu_percent, ram_percent, disk_percent,
                      net_bytes_sent, net_bytes_recv, timestamp
               FROM metrics_snapshot
               WHERE server_id = ?
               ORDER BY timestamp DESC
               LIMIT ?""",
            (server_id, actual_limit),
        )
        # Return oldest-first for left-to-right chart rendering
        return [
            {
                "cpu": r["cpu_percent"],
                "ram": r["ram_percent"],
                "disk": r["disk_percent"],
                "net_sent": r["net_bytes_sent"],
                "net_recv": r["net_bytes_recv"],
                "ts": r["timestamp"],
            }
            for r in reversed(rows)
        ]
