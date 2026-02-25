#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# ServerDash — One-Line Installer
#
# Usage:
#   curl -sL https://raw.githubusercontent.com/alwin2134/ServerDash/main/setup.sh | sudo bash
# ═══════════════════════════════════════════════════════════

set -e

# Run as root check
if [[ $EUID -ne 0 ]]; then
   echo -e "\033[0;31m[FAIL]\033[0m This script must be run as root (sudo)."
   exit 1
fi

echo -e "\n\033[1m══════════════════════════════════════════\033[0m"
echo -e "\033[1m  ServerDash — Quick Setup\033[0m"
echo -e "\033[1m══════════════════════════════════════════\033[0m\n"

# Install git if missing
if ! command -v git &> /dev/null; then
    echo -e "\033[0;36m[INFO]\033[0m Installing git..."
    apt-get update -qq
    apt-get install -y -qq git > /dev/null 2>&1
fi

# Clone and run
echo -e "\033[0;36m[INFO]\033[0m Cloning latest ServerDash repository..."
rm -rf /tmp/serverdash-install
git clone --quiet https://github.com/alwin2134/ServerDash.git /tmp/serverdash-install

echo -e "\033[0;36m[INFO]\033[0m Launching main installer..."
cd /tmp/serverdash-install
bash install.sh

# Cleanup
echo -e "\033[0;36m[INFO]\033[0m Cleaning up temporary install files..."
cd /
rm -rf /tmp/serverdash-install

echo -e "\033[0;32m[OK]\033[0m Setup wrapper complete!"
