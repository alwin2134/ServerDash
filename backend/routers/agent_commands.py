"""
ServerDash — Agent command queue router.
Agents poll this to get pending commands and report results.
"""

import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, HTTPException
from auth import require_api_key, require_jwt
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
    request: Request,
    _key: str = Depends(require_api_key),
):
    """Agent reports command completion. Result in request body."""
    # We accept a raw JSON body containing the command output/result
    try:
        payload = await request.json()
    except Exception:
        payload = {}
        
    result_str = json.dumps(payload)
    now = datetime.now(timezone.utc).isoformat()

    async with get_db() as db:
        await db.execute(
            """UPDATE pending_commands
               SET status = 'completed', completed_at = ?, result = ?
               WHERE id = ?""",
            (now, result_str, command_id),
        )
        await db.commit()

    return {"status": "ok"}


@router.post("/servers/{server_id}/shell")
async def queue_shell_command(
    server_id: str,
    payload: dict,
    _user: str = Depends(require_jwt),
):
    """Add a shell command to be picked up by the agent. Requires JWT auth."""
    command_str = payload.get("command", "")
    if not command_str:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Missing command")

    async with get_db() as db:
        cursor = await db.execute(
            """INSERT INTO pending_commands (server_id, command_type, payload)
               VALUES (?, ?, ?)""",
            (server_id, "shell", json.dumps({"command": command_str})),
        )
        command_id = cursor.lastrowid
        await db.commit()

    return {"status": "ok", "command_id": command_id}


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
    _user: str = Depends(require_jwt),
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
