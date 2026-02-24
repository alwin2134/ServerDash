"""
ServerDash — Intelligence Engine.

Performs lightweight statistical anomaly detection on incoming metrics.
Subscribes to 'metrics_updated' events.
"""

from __future__ import annotations
from typing import Any
import asyncio
from datetime import datetime, timezone

from core.event_bus import bus
from database import get_db
from models import MetricsPayload
from core.event_logger import log_event


async def _analyze_metrics(payload: dict[str, Any]) -> None:
    """Analyze incoming metrics for anomalies and optimize suggestions."""
    server_id = payload.get("server_id")
    if not server_id:
        return
        
    raw = payload.get("metrics")
    if not getattr(raw, "cpu_percent", None) and not (isinstance(raw, dict) and "cpu_percent" in raw):
        return
        
    async with get_db() as db:
        # Fetch last 60 metrics (approx 15 minutes of data assuming 15s intervals)
        cursor = await db.execute(
            "SELECT cpu_percent, ram_percent, disk_percent FROM metrics_snapshot WHERE server_id = ? ORDER BY timestamp DESC LIMIT 60",
            (server_id,)
        )
        rows = await cursor.fetchall()
            
    if len(rows) < 10:
        return  # Not enough data for baseline
        
    cpu_vals = [r["cpu_percent"] for r in rows if r["cpu_percent"] is not None]
    if not cpu_vals:
        return
        
    avg_cpu = sum(cpu_vals) / len(cpu_vals)
    current_cpu = cpu_vals[0]
    
    insights = []
    
    # 1. Anomaly: CPU Spike (current > 85%, but average is < 50%)
    if current_cpu > 85 and avg_cpu < 50:
        insights.append({
            "type": "anomaly",
            "severity": "warning",
            "message": f"Anomalous CPU spike detected (Current: {current_cpu:.1f}%, 15m Avg: {avg_cpu:.1f}%)",
            "metric": "cpu"
        })
        
    # 2. Optimization: Zombie Server (average CPU < 5% over the entire 60-sample window)
    if len(cpu_vals) == 60 and avg_cpu < 5.0 and current_cpu < 5.0:
        insights.append({
            "type": "optimization",
            "severity": "info",
            "message": "Server is consistently underutilized (avg CPU < 5%). Consider downsizing or decommissioning.",
            "metric": "cpu"
        })
        
    # 3. Prediction: Fast Disk Fill
    disk_vals = [r["disk_percent"] for r in rows if r["disk_percent"] is not None]
    if len(disk_vals) > 30:
        current_disk = disk_vals[0]
        old_disk = disk_vals[-1]
        
        # If disk grew more than 5% in the last timeframe and is above 70%
        if current_disk > 70 and (current_disk - old_disk) > 5.0:
            insights.append({
                "type": "prediction",
                "severity": "critical",
                "message": f"Disk space is filling rapidly (+{(current_disk - old_disk):.1f}% recently). Exhaustion imminent.",
                "metric": "disk"
            })
    
    if not insights:
        return
        
    # Store and log insights
    async with get_db() as db:
        for ins in insights:
            # Prevent spam: check if similar insight exists in last 1 hour
            cursor = await db.execute(
                "SELECT 1 FROM insights WHERE server_id = ? AND type = ? AND created_at > datetime('now', '-1 hour')",
                (server_id, ins["type"])
            )
            exists = await cursor.fetchone()
                
            if not exists:
                await db.execute(
                    "INSERT INTO insights (server_id, type, severity, message, metric) VALUES (?, ?, ?, ?, ?)",
                    (server_id, ins["type"], ins["severity"], ins["message"], ins["metric"])
                )
                await db.commit()
                
                # Log as an event for the Timeline UI
                await log_event(
                    server_id=server_id,
                    event_type="insight_generated",
                    severity=ins["severity"],
                    message=ins["message"],
                    metadata=str({"insight_type": ins["type"], "metric": ins["metric"]})
                )

def register() -> None:
    """Wire up subscriptions for Intelligence Engine."""
    bus.subscribe("metrics_updated", _analyze_metrics)
