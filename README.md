# ServerDash — Lightweight Server Control Dashboard

A professional-grade, ultra-lightweight server command center with Apple-level minimal UX and future SaaS-ready modular architecture.

## Architecture

```text
Browser UI (React + TailwindCSS)
        │
Central Dashboard (FastAPI + SQLite)
        │
   Hybrid API (Push + Pull)
        │
   ┌────┼────┐
Agent A  B   C   (Python + psutil)
```

## Quick Start

### 1. Automated One-Line Install (Recommended for Linux)

```bash
curl -sL https://raw.githubusercontent.com/alwin2134/ServerDash/main/setup.sh | sudo bash
```

> This downloads and installs ServerDash as a background systemd service with Caddy reverse proxy automatically.

### 2. Manual Start - Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8100
```

> On first run, the dashboard prints a generated API key. Copy it for the agent.

### 3. Manual Start - Agent

```bash
cd agent
pip install -r requirements.txt

# Set the API key from step 1
set SERVERDASH_API_KEY=<your-key>          # Windows
# export SERVERDASH_API_KEY=<your-key>     # Linux/macOS

python agent.py
```

python agent.py

```

### 4. Manual Start - Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **<http://localhost:5173>** — the Vite dev server proxies API calls to the backend.

## Project Structure

```text
ServerDash/
├── backend/           FastAPI server
│   ├── main.py        Entry point
│   ├── config.py      Settings
│   ├── database.py    SQLite async
│   ├── models.py      Pydantic schemas
│   ├── auth.py        JWT + API key
│   ├── ws.py          WebSocket manager
│   ├── routers/       API endpoints
│   └── extensions/    Future AI modules
├── agent/             Monitoring agent
│   ├── agent.py       Main loop
│   └── collectors/    Data collectors
└── frontend/          React UI
    └── src/
        ├── components/  Reusable UI
        ├── pages/       Route pages
        ├── hooks/       WebSocket + data
        ├── store/       Zustand state
        └── api/         HTTP client
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `SERVERDASH_DB` | `./serverdash.db` | SQLite path |
| `SERVERDASH_JWT_SECRET` | Auto-generated | JWT signing key |
| `SERVERDASH_AGENT_KEYS` | Auto-generated | Comma-separated agent API keys |
| `SERVERDASH_ADMIN_USER` | `admin` | Dashboard login username |
| `SERVERDASH_ADMIN_PASS` | `serverdash` | Dashboard login password |
| `SERVERDASH_API_KEY` | — | Agent: key to authenticate with dashboard |
| `SERVERDASH_URL` | `http://localhost:8100` | Agent: dashboard URL |

## Features

- ✅ **Real-Time Monitoring**: Live CPU, RAM, Disk, and Network bandwidth metrics.
- ✅ **System Internals**: View active systemd services, sortable running process lists, and open listening ports.
- ✅ **Docker Management**: View, start, stop, restart, delete, and read logs from Docker containers seamlessly.
- ✅ **App Store**: 1-click deployments of popular open-source templates (Nginx, Redis, PostgreSQL) to any connected agent.
- ✅ **Operational Intelligence**: Tracks chronological state changes for services and server heartbeats via a master timeline.
- ✅ **Intelligent Insights**: Background mathematical engine analyzes metrics iteratively to detect CPU/Disk anomalies and zombie server optimization opportunities.
- ✅ **Integrated Web Terminal**: Fully functional, stateful web terminal running right in your browser (`alwin@laptop:~ $`), allowing unrestricted SSH-like environment interaction.
- ✅ **Gemini AI Integrated Shell**: Generate natural language bash commands (e.g. *“find all files over 50MB”*) and magically explain arcane backend/shell errors directly from your terminal UI window.
- ✅ **Multi-Node Architecture**: Control infinity agents securely from one central FastAPI and React dashboard.

## Future Phases

- 🔮 Remote File Browser & Editor
- 🔮 Firewall (UFW) & Network Security UI
- 🔮 Cron Job Manager
- 🔮 Automated Backup Engine
- 🔮 Multi-User Role-Based Access Control (RBAC)
