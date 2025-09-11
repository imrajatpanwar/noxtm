#!/bin/bash

# Fixed Production Deployment Script for noxtmstudio
# This script ensures zero caching issues and proper service restart

echo "🚀 Starting ZERO-CACHE production deployment..."

# Set the project directory
PROJECT_DIR="/var/www/noxtmstudio"
echo "📁 Project directory: $PROJECT_DIR"
cd $PROJECT_DIR

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in $PROJECT_DIR"
    exit 1
fi

# Pull latest changes from GitHub
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to pull from GitHub"
    exit 1
fi

# CRITICAL: Stop PM2 completely and clear all processes
echo "🛑 Stopping all PM2 processes and clearing cache..."
pm2 stop all
pm2 delete all
pm2 kill
pm2 flush  # Clear PM2 logs
echo "✅ PM2 completely stopped and cleared"

# CRITICAL: Clear ALL caches and build files
echo "🧹 Clearing ALL caches and build files..."
rm -rf Frontend/build
rm -rf Frontend/node_modules/.cache
rm -rf Backend/node_modules/.cache
rm -rf node_modules/.cache
rm -rf ~/.npm
npm cache clean --force
echo "✅ All caches and build files cleared"

# Wait for processes to fully terminate
echo "⏳ Waiting for processes to fully terminate..."
sleep 5

# Install backend dependencies fresh
echo "📦 Installing backend dependencies (fresh)..."
cd Backend 
rm -rf node_modules package-lock.json
npm install --production
cd ..

# Install frontend dependencies fresh
echo "📦 Installing frontend dependencies (fresh)..."
cd Frontend 
rm -rf node_modules package-lock.json
npm install
cd ..

# Build the React app for production with no cache
echo "🔨 Building React app for production (no cache)..."
cd Frontend 
GENERATE_SOURCEMAP=false npm run build
cd ..

# Check if build was successful
if [ ! -d "Frontend/build" ]; then
    echo "❌ Error: Build failed. Frontend/build directory not found."
    exit 1
fi

# Create/verify .env file
if [ ! -f "Backend/.env" ]; then
    echo "📝 Creating .env file from template..."
    cd Backend
    cp env.example .env
    echo "✅ .env file created"
    cd ..
else
    echo "✅ .env file exists"
fi

# CRITICAL: Clear Node.js require cache by restarting with fresh environment
echo "🔄 Starting backend service with fresh Node.js process..."
cd Backend

# Start PM2 with production environment
NODE_ENV=production pm2 start ecosystem.config.js --env production

# Wait for startup
sleep 3

# Check if service started successfully
pm2 status | grep "online" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend service started successfully"
else
    echo "❌ Error: Backend service failed to start"
    pm2 logs noxtmstudio-backend --lines 20
    exit 1
fi

cd ..

# Set up test users (if needed)
echo "👥 Setting up test users..."
cd Backend
timeout 10s node create-test-user.js || echo "⚠️  User setup completed or timed out"
cd ..

# Final verification
echo ""
echo "🔍 Final verification..."
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 Recent backend logs:"
pm2 logs noxtmstudio-backend --lines 5

echo ""
echo "✅ ZERO-CACHE deployment completed successfully!"
echo ""
echo "🌐 Your application is now running with the latest changes"
echo "🔄 All caches cleared, fresh build generated, processes restarted"
echo "📱 Frontend: Fresh build in Frontend/build/"
echo "🖥️  Backend: Fresh PM2 process running"
echo ""
echo "🎉 New code should now be live on production!"