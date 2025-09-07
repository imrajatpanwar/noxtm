#!/bin/bash

# React MongoDB App Build Script
# This script builds the frontend and backend locally

echo "🚀 Starting build process..."

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

echo "🎉 Build process completed!"
echo ""
echo "Your built files are ready in Frontend/build/"
