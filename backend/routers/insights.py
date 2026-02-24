"""
ServerDash — Insights Router.

Endpoints for retrieving and dismissing AI-generated operational insights.
"""

from fastapi import APIRouter, HTTPException
from database import get_db
from models import Insight

router = APIRouter(prefix="/api", tags=["insights"])


@router.get("/servers/{server_id}/insights", response_model=dict[str, list[Insight]])
async def get_insights(server_id: str):
    """Fetch active intelligent insights for a particular server."""
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT * FROM insights WHERE server_id = ? ORDER BY created_at DESC LIMIT 50",
            (server_id,)
        )
        rows = await cursor.fetchall()

    insights = [Insight(**dict(r)) for r in rows]
    return {"insights": insights}


@router.delete("/insights/{insight_id}")
async def dismiss_insight(insight_id: int):
    """Dismiss/delete an insight after it has been acknowledged by the user."""
    async with get_db() as db:
        cursor = await db.execute("DELETE FROM insights WHERE id = ?", (insight_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Insight not found")
        await db.commit()

    return {"status": "success", "detail": "Insight dismissed"}
