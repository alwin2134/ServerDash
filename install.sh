#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# ServerDash — Production Installer
#
# Deploys ServerDash behind Caddy reverse proxy.
# Access dashboard at http://SERVER_IP (port 80).
#
# Usage:
#   sudo bash install.sh
# ═══════════════════════════════════════════════════════════

set -euo pipefail

INSTALL_DIR="/opt/serverdash"
DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)/deploy"
CADDY_LOG_DIR="/var/log/caddy"

# ── Colors ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; exit 1; }

# ── Preflight ─────────────────────────────────────────────

[[ $EUID -ne 0 ]] && fail "This script must be run as root (sudo)."

echo -e "\n${BOLD}══════════════════════════════════════════${NC}"
echo -e "${BOLD}  ServerDash — Production Installer${NC}"
echo -e "${BOLD}══════════════════════════════════════════${NC}\n"

# ── 1. System Dependencies ───────────────────────────────

info "Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip curl gnupg2 > /dev/null 2>&1
ok "System dependencies installed."

# ── 2. Install Node.js (if not present) ──────────────────

if ! command -v node &> /dev/null; then
    info "Installing Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null 2>&1
    ok "Node.js $(node --version) installed."
else
    ok "Node.js $(node --version) already installed."
fi

# ── 3. Install Caddy ─────────────────────────────────────

if ! command -v caddy &> /dev/null; then
    info "Installing Caddy..."
    apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https > /dev/null 2>&1
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
        gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
        tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq caddy > /dev/null 2>&1
    ok "Caddy $(caddy version) installed."
else
    ok "Caddy $(caddy version) already installed."
fi

# ── 4. Create Service User ───────────────────────────────

if ! id -u serverdash &>/dev/null; then
    info "Creating 'serverdash' system user..."
    useradd --system --home-dir "$INSTALL_DIR" --shell /usr/sbin/nologin serverdash
    ok "User 'serverdash' created."
else
    ok "User 'serverdash' already exists."
fi

# ── 5. Copy Project Files ────────────────────────────────

info "Copying project to ${INSTALL_DIR}..."
mkdir -p "$INSTALL_DIR"
rsync -a --exclude='node_modules' --exclude='.git' --exclude='venv' \
    --exclude='__pycache__' --exclude='*.pyc' --exclude='dist' \
    "$(cd "$(dirname "$0")" && pwd)/" "$INSTALL_DIR/"
ok "Project copied."

# ── 6. Python Virtual Environment ────────────────────────

info "Setting up Python virtual environment..."
python3 -m venv "${INSTALL_DIR}/venv"
"${INSTALL_DIR}/venv/bin/pip" install --quiet --upgrade pip
"${INSTALL_DIR}/venv/bin/pip" install --quiet -r "${INSTALL_DIR}/backend/requirements.txt"
"${INSTALL_DIR}/venv/bin/pip" install --quiet -r "${INSTALL_DIR}/agent/requirements.txt"
ok "Python dependencies installed."

# ── 7. Build Frontend ────────────────────────────────────

info "Building frontend (production)..."
cd "${INSTALL_DIR}/frontend"
npm ci --silent 2>/dev/null
npm run build --silent
ok "Frontend built → ${INSTALL_DIR}/frontend/dist/"

# ── 8. Configure Caddy ───────────────────────────────────

info "Configuring Caddy..."
mkdir -p "$CADDY_LOG_DIR"
cp "${INSTALL_DIR}/deploy/Caddyfile" /etc/caddy/Caddyfile
ok "Caddyfile installed at /etc/caddy/Caddyfile"

# ── 9. Install systemd Services ──────────────────────────

info "Installing systemd services..."
cp "${INSTALL_DIR}/deploy/serverdash.service" /etc/systemd/system/serverdash.service
cp "${INSTALL_DIR}/deploy/serverdash-agent.service" /etc/systemd/system/serverdash-agent.service
systemctl daemon-reload
ok "systemd services installed."

# ── 10. Set Permissions ──────────────────────────────────

info "Setting file permissions..."
chown -R serverdash:serverdash "$INSTALL_DIR"
chown -R caddy:caddy "$CADDY_LOG_DIR"
chmod 755 "$INSTALL_DIR"
chmod -R 755 "${INSTALL_DIR}/frontend/dist"
ok "Permissions configured."

# ── 11. Enable & Start Services ──────────────────────────

info "Starting services..."
systemctl enable --now serverdash.service
systemctl enable --now serverdash-agent.service
systemctl enable --now caddy.service
ok "All services running."

# ── Done ──────────────────────────────────────────────────

echo ""
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✓ ServerDash deployed successfully!${NC}"
echo -e "${BOLD}══════════════════════════════════════════${NC}"
echo ""
echo -e "  Dashboard:  ${CYAN}http://$(hostname -I | awk '{print $1}')${NC}"
echo -e "  Backend:    127.0.0.1:8100 (internal only)"
echo ""
echo -e "  ${BOLD}Service commands:${NC}"
echo -e "    systemctl status serverdash"
echo -e "    systemctl status serverdash-agent"
echo -e "    systemctl status caddy"
echo ""
echo -e "    journalctl -u serverdash -f     ${CYAN}# backend logs${NC}"
echo -e "    journalctl -u serverdash-agent -f  ${CYAN}# agent logs${NC}"
echo ""
