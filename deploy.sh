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

# Create web directory for domain
echo "📁 Setting up web directory..."
WEB_DIR="/var/www/noxtmstudio.com"
if [ -d "$WEB_DIR" ]; then
    echo "   Backing up existing web directory..."
    sudo cp -r "$WEB_DIR" "${WEB_DIR}.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
fi

echo "   Creating web directory: $WEB_DIR"
sudo mkdir -p "$WEB_DIR" 2>/dev/null || true

# Copy built React app to web directory
if [ -d "Frontend/build" ]; then
    echo "   Copying React build to web directory..."
    sudo cp -r Frontend/build/* "$WEB_DIR/" 2>/dev/null || {
        echo "⚠️  Warning: Could not copy to $WEB_DIR (permission issue)"
        echo "   You'll need to manually copy Frontend/build/* to $WEB_DIR"
        echo "   Run: sudo cp -r Frontend/build/* $WEB_DIR/"
    }
    
    # Set proper permissions
    sudo chown -R www-data:www-data "$WEB_DIR" 2>/dev/null || {
        echo "⚠️  Warning: Could not set web directory permissions"
        echo "   Run: sudo chown -R www-data:www-data $WEB_DIR"
    }
fi

echo "🎉 Deployment preparation completed!"
echo ""
echo "Next steps:"
echo "1. Make sure MongoDB is running"
echo "2. Set up your Backend/.env file with proper configuration"
echo "3. Configure Nginx with the provided configuration:"
echo "   sudo cp nginx-noxtmstudio.conf /etc/nginx/sites-available/noxtmstudio.com"
echo "   sudo ln -sf /etc/nginx/sites-available/noxtmstudio.com /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo "4. Set up SSL certificates: sudo ./setup-ssl.sh"
echo "5. Start the backend server: cd Backend && pm2 start ecosystem.config.js"
echo ""
echo "Your application will be available at: https://noxtmstudio.com"
