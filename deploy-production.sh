#!/bin/bash

# Enhanced NOXTM Studio Production Deployment Script
# This script automates the complete deployment process including:
# - Fresh code pull from GitHub
# - Clean build process 
# - Clean deployment
# - Service restarts
# - Cache clearing

echo "🚀 Starting automated deployment..."

# Navigate to project directory
cd /var/www/noxtmstudio

# Stash any local changes and pull latest code from GitHub
echo "📥 Pulling latest code from GitHub..."
git stash
git reset --hard HEAD
git pull origin main

# Check if pull was successful
if [ $? -ne 0 ]; then
    echo "❌ Error: Failed to pull latest changes from GitHub"
    exit 1
fi

echo "✅ Latest code pulled successfully"

# Fix permissions for node_modules (common issue)
echo "🔧 Fixing permissions..."
chmod -R 755 Frontend/node_modules/.bin 2>/dev/null || true

# Install/update dependencies
echo "📦 Installing dependencies..."
cd Frontend
npm install

# Build the production version
echo "🔨 Building production version..."
npm run build

# Check if build was successful
if [ ! -d "build" ]; then
    echo "❌ Error: Build failed. build directory not found."
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to production
echo "🚀 Deploying to production..."

# Clean old files and deploy new build
rm -rf /var/www/html/*
cp -r build/* /var/www/html/

# Set proper permissions
chown -R www-data:www-data /var/www/html/ 2>/dev/null || true

# Restart services
echo "🔄 Restarting services..."
pm2 restart all

# Reload nginx to clear any proxy caching
echo "🌐 Reloading nginx..."
systemctl reload nginx

# Clear any additional caches
echo "🧹 Clearing caches..."
# Clear nginx cache if it exists
rm -rf /var/cache/nginx/* 2>/dev/null || true

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "   ✅ Code updated from GitHub"
echo "   ✅ Fresh production build created"
echo "   ✅ Files deployed to /var/www/html/"
echo "   ✅ PM2 services restarted"
echo "   ✅ Nginx reloaded"
echo "   ✅ Caches cleared"
echo ""
echo "🌍 Your website is now live with the latest changes!"
echo "   Visit: https://noxtmstudio.com"
echo ""
echo "💡 Tip: Clear your browser cache (Ctrl+F5) if you still see old content"
