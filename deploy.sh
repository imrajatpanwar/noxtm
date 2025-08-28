#!/bin/bash

# React MongoDB App Deployment Script
# This script automates the deployment process on your Contabo server

echo "🚀 Starting deployment process..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd Backend && npm install && cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd Frontend && npm install && cd ..

# Build the React app
echo "🔨 Building React app..."
cd Frontend && npm run build && cd ..

# Check if build was successful
if [ ! -d "Frontend/build" ]; then
    echo "❌ Error: Build failed. Frontend/build directory not found."
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if .env file exists in Backend
if [ ! -f "Backend/.env" ]; then
    echo "⚠️  Warning: Backend/.env file not found. Please create one from env.example"
    echo "   cp Backend/env.example Backend/.env"
    echo "   Then edit Backend/.env with your configuration"
fi

echo "🎉 Deployment preparation completed!"
echo ""
echo "Next steps:"
echo "1. Make sure MongoDB is running"
echo "2. Set up your Backend/.env file with proper configuration"
echo "3. Start the server with: npm start"
echo "4. Or use PM2: cd Backend && pm2 start ecosystem.config.js"
