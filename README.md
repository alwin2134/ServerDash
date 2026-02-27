# ServerDash — Lightweight Server Control Dashboard

A professional-grade, ultra-lightweight server command center with Apple-level minimal UX and future SaaS-ready modular architecture.

## Architecture

```
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

```
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
|---|---|---|
| `SERVERDASH_DB` | `./serverdash.db` | SQLite path |
| `SERVERDASH_JWT_SECRET` | Auto-generated | JWT signing key |
| `SERVERDASH_AGENT_KEYS` | Auto-generated | Comma-separated agent API keys |
| `SERVERDASH_ADMIN_USER` | `admin` | Dashboard login username |
| `SERVERDASH_ADMIN_PASS` | `serverdash` | Dashboard login password |
| `SERVERDASH_API_KEY` | — | Agent: key to authenticate with dashboard |
| `SERVERDASH_URL` | `http://localhost:8100` | Agent: dashboard URL |

## Phase 1 Scope

- ✅ Real-time system metrics (CPU, RAM, Disk, Network)
- ✅ Service detection & status
- ✅ Process list with sorting
- ✅ Port detection
- ✅ Multi-server support
- ✅ WebSocket live updates
- ✅ JWT auth for UI, API key for agents

## Future Phases

- 🔮 Operational states engine
- 🔮 Predictive analysis
- 🔮 Adaptive layout
- 🔮 Flow visualization
- 🔮 Time navigation
- 🔮 Command palette assistant
