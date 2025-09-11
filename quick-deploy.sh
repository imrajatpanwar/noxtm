#!/bin/bash

# Quick Deploy Script - For small changes when you need fast deployment
# WARNING: This doesn't clear all caches - use deploy-production-fixed.sh for major changes

echo "⚡ QUICK DEPLOYMENT PROCESS"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this from the project root"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to pull from GitHub"
    exit 1
fi

# Quick build for frontend changes
echo "🔨 Quick building frontend..."
cd Frontend && npm run build && cd ..

# Check if build was successful
if [ ! -d "Frontend/build" ]; then
    echo "❌ Error: Build failed"
    exit 1
fi

# Restart PM2 process (this clears Node.js require cache)
echo "🔄 Restarting PM2 process..."
cd Backend
pm2 restart noxtmstudio-backend

# Wait for restart
sleep 2

# Check status
if pm2 status | grep -q "online"; then
    echo "✅ Quick deployment completed successfully!"
    echo "🌐 Backend restarted, frontend rebuilt"
    
    # Show recent logs
    echo ""
    echo "📋 Recent logs:"
    pm2 logs noxtmstudio-backend --lines 5
else
    echo "❌ Error: Service failed to restart properly"
    pm2 logs noxtmstudio-backend --lines 10
    exit 1
fi

cd ..

echo ""
echo "⚡ Quick deployment complete!"
echo "⚠️  Note: For major changes or persistent cache issues, use deploy-production-fixed.sh"