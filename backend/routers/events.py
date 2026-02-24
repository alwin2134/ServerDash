"""
ServerDash — Events router.
Fetches operational timeline events.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from auth import require_jwt
from database import get_db

router = APIRouter(prefix="/api/events", tags=["events"])

@router.get("/")
async def get_events(
    server_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    cursor: Optional[int] = Query(None, description="The ID of the last event seen for pagination"),
    _user: str = Depends(require_jwt),
):
    """
    Fetch chronological events.
    If server_id is provided, filters by server.
    """
    query = "SELECT * FROM events"
    params = []
    
    conditions = []
    if server_id:
        conditions.append("server_id = ?")
        params.append(server_id)
        
    if cursor:
        conditions.append("id < ?")
        params.append(cursor)
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    query += " ORDER BY id DESC LIMIT ?"
    params.append(limit)
    
    async with get_db() as db:
        rows = await db.execute_fetchall(query, tuple(params))
        
        events = []
        for r in rows:
            events.append({
                "id": r["id"],
                "server_id": r["server_id"],
                "event_type": r["event_type"],
                "severity": r["severity"],
                "message": r["message"],
                "metadata": r["metadata"],
                "timestamp": r["timestamp"]
            })
            
    return {"events": events}
