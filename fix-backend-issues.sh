#!/bin/bash

echo "=== FIXING NOXTM STUDIO BACKEND ISSUES ==="
echo

# Navigate to project directory
cd /var/www/noxtmstudio.com

echo "1. Setting up environment variables..."
# Create .env file if it doesn't exist
if [ ! -f Backend/.env ]; then
    echo "Creating .env file from example..."
    cp Backend/env.example Backend/.env
    
    # Update with production values
    echo "Updating .env with production settings..."
    sed -i 's/PORT=5000/PORT=5000/' Backend/.env
    sed -i 's/mongodb:\/\/localhost:27017\/react-app/mongodb:\/\/localhost:27017\/noxtmstudio/' Backend/.env
    sed -i 's/your-super-secret-jwt-key-change-this-in-production/noxtm-jwt-secret-production-key-2024/' Backend/.env
else
    echo "✅ .env file already exists"
fi

echo

echo "2. Installing/updating backend dependencies..."
cd Backend
npm install

echo

echo "3. Starting MongoDB if not running..."
systemctl start mongod
systemctl enable mongod

echo

echo "4. Stopping any existing backend processes..."
pkill -f "node.*server.js" || true

echo

echo "5. Starting backend server..."
# Option 1: Using PM2 (recommended for production)
if command -v pm2 > /dev/null; then
    echo "Starting with PM2..."
    pm2 start ecosystem.config.js --env production
    pm2 save
else
    echo "PM2 not found, installing..."
    npm install -g pm2
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
fi

echo

echo "6. Checking if backend is now running..."
sleep 3
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ Backend is now running successfully!"
    curl -s http://localhost:5000/api/health | jq 2>/dev/null || curl -s http://localhost:5000/api/health
else
    echo "❌ Backend still not responding. Checking logs..."
    pm2 logs --lines 20
fi

echo

echo "7. Restarting nginx..."
systemctl restart nginx

echo

echo "=== BACKEND FIX COMPLETE ==="
echo "Test the login at: https://noxtmstudio.com/login"
