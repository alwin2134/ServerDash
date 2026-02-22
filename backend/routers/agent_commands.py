"""
ServerDash — Agent command queue router.
Agents poll this to get pending commands and report results.
"""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from auth import require_api_key
from database import get_db

router = APIRouter(prefix="/api/agent", tags=["agent-commands"])


@router.get("/commands/{server_id}")
async def get_pending_commands(
    server_id: str,
    _key: str = Depends(require_api_key),
):
    """Return all pending commands for this server."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            """SELECT id, command_type, payload, created_at
               FROM pending_commands
               WHERE server_id = ? AND status = 'pending'
               ORDER BY created_at ASC""",
            (server_id,),
        )
        return [
            {
                "id": r["id"],
                "type": r["command_type"],
                "payload": json.loads(r["payload"]),
                "created_at": r["created_at"],
            }
            for r in rows
        ]


@router.post("/commands/{command_id}/result")
async def report_command_result(
    command_id: int,
    _key: str = Depends(require_api_key),
):
    """Agent reports command completion. Result in request body."""
    from fastapi import Request
    # We'll accept raw JSON body
    import sys
    # Simple approach: mark as done
    now = datetime.now(timezone.utc).isoformat()

    async with get_db() as db:
        await db.execute(
            """UPDATE pending_commands
               SET status = 'completed', completed_at = ?
               WHERE id = ?""",
            (now, command_id),
        )
        await db.commit()

    return {"status": "ok"}


@router.post("/commands/{command_id}/complete")
async def complete_command(
    command_id: int,
    _key: str = Depends(require_api_key),
):
    """Mark a command as completed with optional result."""
    now = datetime.now(timezone.utc).isoformat()

    async with get_db() as db:
        await db.execute(
            """UPDATE pending_commands
               SET status = 'completed', completed_at = ?
               WHERE id = ?""",
            (now, command_id),
        )
        await db.commit()

    return {"status": "ok"}


@router.get("/commands/{command_id}/status")
async def get_command_status(
    command_id: int,
    _key: str = Depends(require_api_key),
):
    """Check status of a specific command."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            """SELECT id, command_type, status, result, created_at, completed_at
               FROM pending_commands WHERE id = ?""",
            (command_id,),
        )
        if not rows:
            from fastapi import HTTPException
            raise HTTPException(404, "Command not found")
        r = rows[0]
        return {
            "id": r["id"],
            "type": r["command_type"],
            "status": r["status"],
            "result": json.loads(r["result"]) if r["result"] else None,
            "created_at": r["created_at"],
            "completed_at": r["completed_at"],
        }
