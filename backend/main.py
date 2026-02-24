"""
ServerDash — FastAPI entry point.

Start:
    uvicorn main:app --reload --port 8100
"""

import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import CORS_ORIGINS, LOGIN_RATE_LIMIT, AGENT_RATE_LIMIT_SECONDS
from database import init_db, prune_old_alerts
from models import LoginRequest, TokenResponse
from auth import authenticate_user, create_access_token, verify_ws_token
from ws import manager, register_ws_events
from core import setup_event_bus
from core.agent_sweeper import sweep_offline_agents
import asyncio

# Routers
from routers.metrics import router as metrics_router
from routers.services import router as services_router
from routers.processes import router as processes_router
from routers.ports import router as ports_router
from routers.servers import router as servers_router
from routers.agent import router as agent_router
from routers.history import router as history_router
from routers.alerts import router as alerts_router
from routers.docker import router as docker_router
from routers.agent_commands import router as agent_commands_router
from routers.apps import router as apps_router
from routers.events import router as events_router


# ── Rate Limiting ─────────────────────────────────────────

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter for login and agent endpoints."""

    def __init__(self, app):
        super().__init__(app)
        # Login: {ip: [timestamps]}
        self._login_attempts: dict[str, list[float]] = defaultdict(list)
        # Agent update: {server_id: last_timestamp}
        self._agent_updates: dict[str, float] = {}

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Rate-limit login
        if path == "/api/auth/login" and request.method == "POST":
            ip = request.client.host if request.client else "unknown"
            now = time.time()
            window = [t for t in self._login_attempts[ip] if now - t < 60]
            self._login_attempts[ip] = window
            if len(window) >= LOGIN_RATE_LIMIT:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many login attempts. Try again later."},
                )
            self._login_attempts[ip].append(now)

        # Rate-limit agent updates
        if path == "/api/agent/update" and request.method == "POST":
            # We need to peek at the body for server_id — but the actual
            # enforcement is lightweight: use X-Server-Id header if available
            server_id = request.headers.get("x-server-id", "")
            if server_id:
                now = time.time()
                last = self._agent_updates.get(server_id, 0)
                if now - last < AGENT_RATE_LIMIT_SECONDS:
                    return JSONResponse(
                        status_code=429,
                        content={"detail": "Agent update too frequent."},
                    )
                self._agent_updates[server_id] = now

        return await call_next(request)


# ── Lifespan ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    setup_event_bus()
    register_ws_events()
    await prune_old_alerts()
    
    # Start background agent sweeper
    asyncio.create_task(sweep_offline_agents())
    
    print("[serverdash] Database initialized, event bus wired.")
    yield
    print("[serverdash] Shutdown complete.")


# ── App ───────────────────────────────────────────────────

app = FastAPI(
    title="ServerDash",
    description="Lightweight server control dashboard",
    version="2.1.0",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(metrics_router)
app.include_router(services_router)
app.include_router(processes_router)
app.include_router(ports_router)
app.include_router(servers_router)
app.include_router(agent_router)
app.include_router(history_router)
app.include_router(alerts_router)
app.include_router(docker_router)
app.include_router(agent_commands_router)
app.include_router(apps_router)
app.include_router(events_router)


# ── Auth endpoint ─────────────────────────────────────────

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    if not authenticate_user(req.username, req.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(req.username)
    return TokenResponse(access_token=token)


# ── WebSocket (JWT-authenticated) ─────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    # Require token via query parameter
    token = ws.query_params.get("token")
    user = verify_ws_token(token)
    if not user:
        await ws.close(code=4001, reason="Authentication required")
        return

    client_id = await manager.connect(ws)
    if client_id is None:
        return  # capacity reached, already closed

    try:
        while True:
            data = await ws.receive_text()
            if data == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(client_id)


# ── Health ────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "ServerDash",
        "version": "2.1.0",
        "status": "running",
        "ws_clients": manager.client_count,
    }
