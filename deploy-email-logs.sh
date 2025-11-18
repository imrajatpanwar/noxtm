#!/bin/bash

echo "🚀 Deploying Email Logs Enhancement..."
echo "=================================="

# Navigate to project directory
cd /root/noxtm || exit 1

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Backend - install dependencies
echo "📦 Installing backend dependencies..."
cd Backend
npm install

# Frontend - install dependencies and build
echo "📦 Installing frontend dependencies..."
cd ../Frontend
npm install

echo "🔨 Building frontend..."
npm run build

# Restart services
echo "🔄 Restarting PM2 services..."
pm2 restart all

# Show status
echo ""
echo "✅ Deployment complete!"
echo "=================================="
echo ""
pm2 status

echo ""
echo "📊 Recent logs:"
pm2 logs --lines 20 --nostream

echo ""
echo "✅ Email Logs is now updated with:"
echo "   - Direction filtering (Sent/Received)"
echo "   - Stats dashboard"
echo "   - Enhanced email logging"
echo ""
echo "🧪 Test by sending a verification email!"
