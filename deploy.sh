#!/bin/bash
# =============================================================================
# Noxtm Deployment Script
# Run on the server after git pull
# Usage: bash deploy.sh
# =============================================================================

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "============================================"
echo "  Noxtm Deployment"
echo "  Directory: $APP_DIR"
echo "============================================"

# --- Backend ---
echo ""
echo "[1/5] Installing Backend dependencies..."
cd "$APP_DIR/Backend"
npm install --production
echo "Backend dependencies installed."

# --- Frontend ---
echo ""
echo "[2/5] Installing Frontend dependencies..."
cd "$APP_DIR/Frontend"
npm install
echo "Frontend dependencies installed."

echo ""
echo "[3/5] Building Frontend..."
npm run build
echo "Frontend build complete."

# --- Mail Frontend ---
echo ""
echo "[4/5] Installing Mail Frontend dependencies..."
cd "$APP_DIR/mail-frontend"
npm install
echo "Mail Frontend dependencies installed."

echo ""
echo "[5/5] Building Mail Frontend..."
npm run build
echo "Mail Frontend build complete."

# --- PM2 ---
echo ""
echo "Starting/Restarting PM2 processes..."
cd "$APP_DIR"
pm2 startOrRestart ecosystem.config.js --env production
pm2 save

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
pm2 list
