"""
ServerDash — Docker container router.
Lists containers and queues start/stop/restart/log commands.
"""

import json
from fastapi import APIRouter, Depends, Query
from auth import require_jwt
from database import get_db
from models import DockerAction

router = APIRouter(prefix="/api", tags=["docker"])


@router.get("/docker")
async def get_docker_containers(
    server_id: str | None = None,
    _user: str = Depends(require_jwt),
):
    """Return latest Docker container snapshot for a server."""
    async with get_db() as db:
        if server_id:
            rows = await db.execute_fetchall(
                """SELECT payload FROM docker_snapshot
                   WHERE server_id = ?
                   ORDER BY timestamp DESC LIMIT 1""",
                (server_id,),
            )
            payload = json.loads(rows[0]["payload"]) if rows else []
            return {"server_id": server_id, "containers": payload}

        rows = await db.execute_fetchall(
            """SELECT ds.server_id, ds.payload
               FROM docker_snapshot ds
               WHERE ds.id IN (
                   SELECT MAX(id) FROM docker_snapshot GROUP BY server_id
               )"""
        )
        return [
            {
                "server_id": r["server_id"],
                "containers": json.loads(r["payload"]),
            }
            for r in rows
        ]


@router.post("/docker/{server_id}/action")
async def docker_action(
    server_id: str,
    action: DockerAction,
    _user: str = Depends(require_jwt),
):
    """Queue a Docker action (start/stop/restart) for the agent."""
    if action.action not in ("start", "stop", "restart"):
        from fastapi import HTTPException
        raise HTTPException(400, "Invalid action. Use start, stop, or restart.")

    payload = json.dumps({
        "container_id": action.container_id,
        "action": action.action,
    })

    async with get_db() as db:
        cursor = await db.execute(
            """INSERT INTO pending_commands (server_id, command_type, payload)
               VALUES (?, 'docker_action', ?)""",
            (server_id, payload),
        )
        command_id = cursor.lastrowid
        await db.commit()

    return {"status": "queued", "command_id": command_id}


@router.get("/docker/{server_id}/logs/{container_id}")
async def get_docker_logs(
    server_id: str,
    container_id: str,
    lines: int = Query(100, le=500),
    _user: str = Depends(require_jwt),
):
    """Queue a log fetch command and return the command ID for polling."""
    payload = json.dumps({
        "container_id": container_id,
        "lines": lines,
    })

    async with get_db() as db:
        cursor = await db.execute(
            """INSERT INTO pending_commands (server_id, command_type, payload)
               VALUES (?, 'docker_logs', ?)""",
            (server_id, payload),
        )
        command_id = cursor.lastrowid
        await db.commit()

    return {"status": "queued", "command_id": command_id}


from models import DockerDeployRequest, DockerRemoveRequest


@router.post("/docker/{server_id}/deploy-container")
async def deploy_container(
    server_id: str,
    req: DockerDeployRequest,
    _user: str = Depends(require_jwt),
):
    """Queue a Docker container deployment with full configuration."""
    payload = json.dumps({
        "image": req.image,
        "name": req.name,
        "ports": req.ports,
        "env": req.env,
        "volumes": req.volumes,
        "restart_policy": req.restart_policy,
    })

    async with get_db() as db:
        cursor = await db.execute(
            """INSERT INTO pending_commands (server_id, command_type, payload)
               VALUES (?, 'docker_deploy', ?)""",
            (server_id, payload),
        )
        command_id = cursor.lastrowid
        await db.commit()

    return {"status": "queued", "command_id": command_id}


@router.post("/docker/{server_id}/remove")
async def remove_container(
    server_id: str,
    req: DockerRemoveRequest,
    _user: str = Depends(require_jwt),
):
    """Queue container removal."""
    payload = json.dumps({
        "container_id": req.container_id,
        "force": req.force,
    })

    async with get_db() as db:
        cursor = await db.execute(
            """INSERT INTO pending_commands (server_id, command_type, payload)
               VALUES (?, 'docker_remove', ?)""",
            (server_id, payload),
        )
        command_id = cursor.lastrowid
        await db.commit()

    return {"status": "queued", "command_id": command_id}


@router.post("/docker/{server_id}/pull")
async def pull_image(
    server_id: str,
    image: str = Query(...),
    _user: str = Depends(require_jwt),
):
    """Queue an image pull."""
    payload = json.dumps({"image": image})

    async with get_db() as db:
        cursor = await db.execute(
            """INSERT INTO pending_commands (server_id, command_type, payload)
               VALUES (?, 'docker_pull', ?)""",
            (server_id, payload),
        )
        command_id = cursor.lastrowid
        await db.commit()

    return {"status": "queued", "command_id": command_id}

