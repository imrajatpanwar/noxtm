#!/bin/bash
# =============================================================================
# Noxtm VPS Server Setup Script
# Run this ONCE on a fresh Ubuntu 22.04+ VPS
# Usage: sudo bash server-setup.sh
# =============================================================================

set -e

echo "============================================"
echo "  Noxtm Server Setup - Ubuntu VPS"
echo "============================================"

# --- 1. System Update ---
echo ""
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y

# --- 2. Install Node.js 20 LTS ---
echo ""
echo "[2/8] Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "Node.js version: $(node -v)"
echo "npm version: $(npm -v)"

# --- 3. Install PM2 ---
echo ""
echo "[3/8] Installing PM2 globally..."
npm install -g pm2
pm2 startup systemd -u noxtm --hp /home/noxtm
echo "PM2 installed: $(pm2 -v)"

# --- 4. Install Nginx ---
echo ""
echo "[4/8] Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# --- 5. Install Certbot (SSL) ---
echo ""
echo "[5/8] Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

# --- 6. Install Git ---
echo ""
echo "[6/8] Installing Git..."
apt install -y git

# --- 7. Create noxtm user ---
echo ""
echo "[7/8] Creating noxtm user..."
if ! id "noxtm" &>/dev/null; then
    adduser --disabled-password --gecos "" noxtm
    usermod -aG sudo noxtm
    echo "noxtm ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/noxtm
    echo "User 'noxtm' created"
else
    echo "User 'noxtm' already exists"
fi

# --- 8. Install serve (for mail-frontend static serving) ---
echo ""
echo "[8/8] Installing serve globally..."
npm install -g serve

# --- Firewall ---
echo ""
echo "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ""
echo "============================================"
echo "  Server Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Switch to noxtm user: su - noxtm"
echo "  2. Clone your repo: git clone <your-repo> /home/noxtm/noxtm"
echo "  3. Run deploy script: cd /home/noxtm/noxtm && bash deploy.sh"
echo "  4. Set up SSL: sudo certbot --nginx -d noxtm.com -d mail.noxtm.com"
echo ""
