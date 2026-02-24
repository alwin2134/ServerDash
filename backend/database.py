"""
ServerDash — Async SQLite database layer.

Connection-per-request model using async context manager.
"""

from __future__ import annotations
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import aiosqlite
from config import DATABASE_PATH, ALERT_RETENTION_DAYS


@asynccontextmanager
async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Yield a fresh DB connection per request, auto-closed on exit."""
    db = await aiosqlite.connect(DATABASE_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db() -> None:
    """Create tables on first run."""
    async with get_db() as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS servers (
                id          TEXT PRIMARY KEY,
                hostname    TEXT NOT NULL,
                ip_address  TEXT,
                os_info     TEXT,
                agent_version TEXT,
                status      TEXT DEFAULT 'unknown',
                health_state TEXT DEFAULT 'unknown',
                health_score INTEGER DEFAULT 0,
                previous_state TEXT,
                current_state TEXT,
                state_changed_at TIMESTAMP,
                last_seen   TIMESTAMP,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS metrics_snapshot (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id   TEXT NOT NULL REFERENCES servers(id),
                cpu_percent REAL,
                ram_total   INTEGER,
                ram_used    INTEGER,
                ram_percent REAL,
                disk_total  INTEGER,
                disk_used   INTEGER,
                disk_percent REAL,
                net_bytes_sent   INTEGER,
                net_bytes_recv   INTEGER,
                timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS services_snapshot (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id   TEXT NOT NULL REFERENCES servers(id),
                payload     TEXT NOT NULL,
                timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS processes_snapshot (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id   TEXT NOT NULL REFERENCES servers(id),
                payload     TEXT NOT NULL,
                timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ports_snapshot (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id   TEXT NOT NULL REFERENCES servers(id),
                payload     TEXT NOT NULL,
                timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS docker_snapshot (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id   TEXT NOT NULL REFERENCES servers(id),
                payload     TEXT NOT NULL,
                timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS pending_commands (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id   TEXT NOT NULL REFERENCES servers(id),
                command_type TEXT NOT NULL,
                payload     TEXT NOT NULL DEFAULT '{}',
                status      TEXT NOT NULL DEFAULT 'pending',
                result      TEXT,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS events (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id   TEXT,
                event_type  TEXT NOT NULL,
                severity    TEXT DEFAULT 'info',
                message     TEXT,
                metadata    TEXT,
                timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id   TEXT NOT NULL REFERENCES servers(id),
                severity    TEXT NOT NULL DEFAULT 'warning',
                metric      TEXT NOT NULL,
                value       REAL,
                threshold   REAL,
                message     TEXT NOT NULL,
                acknowledged INTEGER DEFAULT 0,
                resolved_at TIMESTAMP,
                duration_seconds INTEGER,
                timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS insights (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                server_id   TEXT NOT NULL REFERENCES servers(id),
                type        TEXT NOT NULL,
                severity    TEXT DEFAULT 'info',
                message     TEXT NOT NULL,
                metric      TEXT,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Indices
            CREATE INDEX IF NOT EXISTS idx_metrics_server
                ON metrics_snapshot(server_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_services_server
                ON services_snapshot(server_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_processes_server
                ON processes_snapshot(server_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_ports_server
                ON ports_snapshot(server_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_docker_server
                ON docker_snapshot(server_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_commands_server
                ON pending_commands(server_id, status);
            CREATE INDEX IF NOT EXISTS idx_alerts_server
                ON alerts(server_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_alerts_ack
                ON alerts(acknowledged, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_events_server
                ON events(server_id, timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_insights_server
                ON insights(server_id, created_at DESC);
        """)

        # Migration stubs for Phase 1-5 upgrades
        for col_sql in [
            "ALTER TABLE servers ADD COLUMN health_state TEXT DEFAULT 'unknown'",
            "ALTER TABLE servers ADD COLUMN health_score INTEGER DEFAULT 0",
            "ALTER TABLE servers ADD COLUMN previous_state TEXT",
            "ALTER TABLE servers ADD COLUMN current_state TEXT",
            "ALTER TABLE servers ADD COLUMN state_changed_at TIMESTAMP",
            "ALTER TABLE alerts ADD COLUMN resolved_at TIMESTAMP",
            "ALTER TABLE alerts ADD COLUMN duration_seconds INTEGER",
            "ALTER TABLE events ADD COLUMN metadata TEXT",
        ]:
            try:
                await db.execute(col_sql)
            except Exception:
                pass

        await db.commit()


async def prune_old_alerts() -> None:
    """Delete alerts older than retention period."""
    async with get_db() as db:
        await db.execute(
            f"""DELETE FROM alerts
                WHERE timestamp < datetime('now', '-{ALERT_RETENTION_DAYS} days')""",
        )
        await db.commit()
