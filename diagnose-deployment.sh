#!/bin/bash

# Deployment Diagnostic Script
# Run this to check if your deployment is working correctly

echo "🔍 DEPLOYMENT DIAGNOSTIC REPORT"
echo "================================"
echo ""

# Check current directory
echo "📁 Current Directory:"
pwd
echo ""

# Check if we're in the project root
if [ ! -f "package.json" ]; then
    echo "❌ NOT in project root - please cd to your project directory"
    exit 1
fi

# Check Git status
echo "📋 Git Status:"
git status --porcelain
if [ $? -eq 0 ]; then
    echo "✅ Git working directory clean"
    echo "🏷️  Current branch: $(git branch --show-current)"
    echo "📝 Latest commit: $(git log -1 --oneline)"
else
    echo "❌ Git issues detected"
fi
echo ""

# Check PM2 status
echo "🖥️  PM2 Status:"
if command -v pm2 >/dev/null 2>&1; then
    pm2 status
    echo ""
    echo "📋 PM2 Process Details:"
    pm2 show noxtmstudio-backend 2>/dev/null || echo "⚠️  noxtmstudio-backend process not found"
else
    echo "❌ PM2 not installed or not in PATH"
fi
echo ""

# Check if build directory exists
echo "🏗️  Frontend Build Status:"
if [ -d "Frontend/build" ]; then
    echo "✅ Build directory exists"
    echo "📊 Build size: $(du -sh Frontend/build | cut -f1)"
    echo "📅 Last modified: $(stat -c %y Frontend/build 2>/dev/null || stat -f %Sm Frontend/build 2>/dev/null || echo 'Unable to get timestamp')"
    
    # Check if build is recent (within last hour)
    if [ "$(find Frontend/build -type d -newermt '1 hour ago' 2>/dev/null)" ]; then
        echo "✅ Build is recent (within last hour)"
    else
        echo "⚠️  Build might be outdated (older than 1 hour)"
    fi
else
    echo "❌ No build directory found - frontend not built"
fi
echo ""

# Check environment file
echo "⚙️  Environment Configuration:"
if [ -f "Backend/.env" ]; then
    echo "✅ .env file exists in Backend"
    echo "🔑 NODE_ENV: $(grep NODE_ENV Backend/.env | cut -d= -f2 || echo 'not set in .env')"
else
    echo "❌ No .env file found in Backend directory"
fi
echo ""

# Check server process
echo "🌐 Server Process Check:"
if lsof -i :5000 >/dev/null 2>&1; then
    echo "✅ Something is running on port 5000"
    echo "📡 Port 5000 process:"
    lsof -i :5000 2>/dev/null || echo "Cannot get detailed process info"
else
    echo "❌ Nothing running on port 5000"
fi
echo ""

# Check recent PM2 logs
echo "📋 Recent PM2 Logs (last 10 lines):"
pm2 logs noxtmstudio-backend --lines 10 2>/dev/null || echo "⚠️  Cannot retrieve PM2 logs"
echo ""

# Memory and disk check
echo "💻 System Resources:"
echo "📊 Memory usage: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "💽 Disk space: $(df -h . | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
echo ""

echo "🎯 DIAGNOSTIC SUMMARY:"
echo "======================"

# Provide recommendations
if [ ! -d "Frontend/build" ]; then
    echo "❌ Missing frontend build - run deployment script to build"
fi

if ! pm2 status | grep -q "online"; then
    echo "❌ PM2 process not running properly - restart needed"
fi

if [ ! "$(find Frontend/build -type d -newermt '1 hour ago' 2>/dev/null)" ]; then
    echo "⚠️  Frontend build is old - consider rebuilding"
fi

echo ""
echo "🔧 RECOMMENDED ACTIONS:"
echo "======================"
echo "1. Use the deploy-production-fixed.sh script for complete deployment"
echo "2. Make sure to run it from your server's project directory"
echo "3. The script will clear all caches and restart everything fresh"
echo ""
echo "📞 If issues persist, check:"
echo "   - Network connectivity to your server"
echo "   - File permissions in the project directory" 
echo "   - MongoDB connection (check PM2 logs)"