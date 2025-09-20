#!/bin/bash

# Production Deployment Script for noxtmstudio with Separate Frontend and Backend
# Frontend runs on port 3000, Backend runs on port 5000

echo "🚀 Starting production deployment with separate services..."

# Set the project directory
PROJECT_DIR="/root/noxtm"
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
# Install express for frontend server
npm install express
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

# Start Backend Service
echo "🖥️  Starting backend service on port 5000..."
cd Backend
NODE_ENV=production pm2 start ecosystem.config.js --env production

# Wait for backend startup
sleep 3

# Check if backend started successfully
pm2 status | grep "noxtmstudio-backend.*online" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Backend service started successfully on port 5000"
else
    echo "❌ Error: Backend service failed to start"
    pm2 logs noxtmstudio-backend --lines 20
    exit 1
fi
cd ..

# Start Frontend Service
echo "🌐 Starting frontend service on port 3000..."
cd Frontend
NODE_ENV=production pm2 start ecosystem.config.js --env production

# Wait for frontend startup
sleep 3

# Check if frontend started successfully
pm2 status | grep "noxtmstudio-frontend.*online" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Frontend service started successfully on port 3000"
else
    echo "❌ Error: Frontend service failed to start"
    pm2 logs noxtmstudio-frontend --lines 20
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
echo "📋 Recent frontend logs:"
pm2 logs noxtmstudio-frontend --lines 5

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🎯 Services running:"
echo "   - Backend API: http://localhost:5000 (noxtmstudio-backend)"
echo "   - Frontend: http://localhost:3000 (noxtmstudio-frontend)"
echo ""
echo "📝 Make sure your Nginx is configured to:"
echo "   - Proxy noxtmstudio.com to port 3000 (frontend)"
echo "   - Proxy noxtmstudio.com/api/* to port 5000 (backend)"
echo ""
echo "🎉 Both frontend and backend are now running as separate services!"