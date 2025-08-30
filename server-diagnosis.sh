#!/bin/bash

echo "🔍 Diagnosing server status for noxtmstudio..."
echo "=============================================="

# Check if Node.js is installed
echo "📦 Checking Node.js installation:"
if command -v node &> /dev/null; then
    echo "✅ Node.js version: $(node --version)"
else
    echo "❌ Node.js not installed"
fi

if command -v npm &> /dev/null; then
    echo "✅ npm version: $(npm --version)"
else
    echo "❌ npm not installed"
fi

echo ""

# Check if PM2 is installed
echo "🔧 Checking PM2 installation:"
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 is installed"
    echo "PM2 processes:"
    pm2 list
else
    echo "❌ PM2 not installed"
fi

echo ""

# Check what's running on common ports
echo "🌐 Checking ports:"
echo "Port 3000:" 
netstat -tlnp | grep :3000 || echo "❌ Nothing running on port 3000"

echo "Port 5000:" 
netstat -tlnp | grep :5000 || echo "❌ Nothing running on port 5000"

echo "Port 80:" 
netstat -tlnp | grep :80 || echo "❌ Nothing running on port 80"

echo "Port 443:" 
netstat -tlnp | grep :443 || echo "❌ Nothing running on port 443"

echo ""

# Check if project directory exists
echo "📁 Checking project structure:"
if [ -d "/root/noxtmstudio" ]; then
    echo "✅ Found project at /root/noxtmstudio"
    ls -la /root/noxtmstudio
elif [ -d "/home/noxtmstudio" ]; then
    echo "✅ Found project at /home/noxtmstudio"
    ls -la /home/noxtmstudio
else
    echo "❌ Project directory not found"
    echo "Current directory: $(pwd)"
    echo "Contents:"
    ls -la
fi

echo ""

# Check if MongoDB is running
echo "🗃️ Checking MongoDB:"
if systemctl is-active --quiet mongod; then
    echo "✅ MongoDB is running"
elif systemctl is-active --quiet mongodb; then
    echo "✅ MongoDB is running"
else
    echo "❌ MongoDB is not running"
fi

echo ""

# Check Nginx status
echo "🌐 Checking Nginx:"
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx is running"
    else
        echo "⚠️ Nginx installed but not running"
    fi
else
    echo "❌ Nginx not installed"
fi

echo ""
echo "🔍 Diagnosis complete!"
