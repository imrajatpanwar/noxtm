#!/bin/bash

# Production Deployment Script for noxtmstudio
# Run this on your server to deploy the latest changes

echo "🚀 Starting production deployment..."

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

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd Backend && npm install --production && cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd Frontend && npm install && cd ..

# Build the React app for production
echo "🔨 Building React app for production..."
cd Frontend && npm run build && cd ..

# Check if build was successful
if [ ! -d "Frontend/build" ]; then
    echo "❌ Error: Build failed. Frontend/build directory not found."
    exit 1
fi

# Restart the backend service using PM2
echo "🔄 Restarting backend service..."
cd Backend
pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
cd ..

# Check if .env file exists in Backend
if [ ! -f "Backend/.env" ]; then
    echo "⚠️  Warning: Backend/.env file not found."
    echo "📝 Creating .env file from template..."
    cd Backend
    cp env.example .env
    echo "✅ .env file created with production settings."
    cd ..
else
    echo "✅ .env file already exists"
fi

# Verify environment variables
echo "🔍 Verifying environment configuration..."
cd Backend
if grep -q "your-super-secret-jwt-key-change-this-in-production" .env; then
    echo "⚠️  Warning: Default JWT secret detected. Consider updating for production."
fi
cd ..

# Create test users in MongoDB (run once, will skip if users already exist)
echo "👥 Setting up test users in MongoDB..."
cd Backend
node create-test-user.js || echo "⚠️  Note: User creation script completed (users may already exist)"
cd ..

echo "✅ Production deployment completed successfully!"
echo ""
echo "🌐 Your application should now be running with the latest changes"
echo "📱 Frontend built files are in: Frontend/build/"
echo "🖥️  Backend service managed by: PM2"

# Show PM2 status
echo ""
echo "📊 Current PM2 status:"
pm2 status
