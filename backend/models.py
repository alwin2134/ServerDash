"""
ServerDash — Pydantic data models.
"""

from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Metrics ───────────────────────────────────────────────

class MetricsPayload(BaseModel):
    cpu_percent: float = 0.0
    ram_total: int = 0
    ram_used: int = 0
    ram_percent: float = 0.0
    disk_total: int = 0
    disk_used: int = 0
    disk_percent: float = 0.0
    net_bytes_sent: int = 0
    net_bytes_recv: int = 0


# ── Services ──────────────────────────────────────────────

class ServiceInfo(BaseModel):
    name: str
    display_name: str = ""
    status: str = "unknown"          # running | stopped | failed | unknown
    enabled: bool = False
    type: str = "service"


# ── Processes ─────────────────────────────────────────────

class ProcessInfo(BaseModel):
    pid: int
    ppid: int = 0
    name: str = ""
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    status: str = ""


# ── Ports ─────────────────────────────────────────────────

class PortInfo(BaseModel):
    port: int
    protocol: str = "tcp"            # tcp | udp
    address: str = "0.0.0.0"
    pid: Optional[int] = None
    process_name: str = ""
    status: str = "LISTEN"


# ── Server ────────────────────────────────────────────────

class ServerInfo(BaseModel):
    id: str
    hostname: str
    ip_address: str = ""
    os_info: str = ""
    agent_version: str = "1.0.0"
    status: str = "unknown"
    health_state: str = "unknown"    # healthy | warning | degraded | critical | unknown
    health_score: int = 0            # 0–100
    last_seen: Optional[datetime] = None


# ── Agent Communication ──────────────────────────────────

class AgentHeartbeat(BaseModel):
    server_id: str
    hostname: str
    ip_address: str = ""
    os_info: str = ""
    agent_version: str = "1.0.0"


class AgentUpdate(BaseModel):
    server_id: str
    metrics: Optional[MetricsPayload] = None
    services: Optional[list[ServiceInfo]] = None
    processes: Optional[list[ProcessInfo]] = None
    ports: Optional[list[PortInfo]] = None
    docker: Optional[list] = None  # list of container dicts


# ── Auth ──────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Operational States ───────────────────────────────────

class HealthState(BaseModel):
    """Computed server health state."""
    score: int = 0
    state: str = "unknown"       # healthy | warning | degraded | critical
    reasons: list[str] = []


# ── Alerts ───────────────────────────────────────────────

class AlertInfo(BaseModel):
    id: int
    server_id: str
    severity: str                # warning | critical
    metric: str
    value: float
    threshold: float
    message: str
    acknowledged: bool = False
    timestamp: Optional[datetime] = None


# ── Docker ────────────────────────────────────────────────

class DockerContainer(BaseModel):
    container_id: str
    name: str
    image: str
    status: str = "unknown"
    state: str = "unknown"      # running | exited | paused | created
    cpu_percent: float = 0.0
    memory_usage: int = 0       # bytes
    memory_limit: int = 0       # bytes
    ports: str = ""


class DockerAction(BaseModel):
    container_id: str
    action: str                  # start | stop | restart


class KillProcessRequest(BaseModel):
    pid: int
    signal: str = "SIGTERM"      # SIGTERM | SIGKILL


class CommandResponse(BaseModel):
    command_id: int
    status: str
    result: Optional[str] = None
