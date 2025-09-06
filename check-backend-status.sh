#!/bin/bash

echo "=== NOXTM STUDIO BACKEND STATUS CHECK ==="
echo

# Check if Node.js process is running
echo "1. Checking if Node.js backend is running..."
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Node.js backend process found:"
    ps aux | grep "node.*server.js" | grep -v grep
else
    echo "❌ No Node.js backend process found"
fi

echo

# Check if port 5000 is listening
echo "2. Checking if port 5000 is listening..."
if netstat -tlnp 2>/dev/null | grep ":5000 " > /dev/null; then
    echo "✅ Port 5000 is listening:"
    netstat -tlnp 2>/dev/null | grep ":5000 "
else
    echo "❌ Port 5000 is not listening"
fi

echo

# Check nginx status
echo "3. Checking nginx status..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is active"
else
    echo "❌ Nginx is not active"
fi

echo

# Check if backend directory exists and has files
echo "4. Checking backend files..."
if [ -d "/var/www/noxtmstudio.com/Backend" ]; then
    echo "✅ Backend directory exists"
    echo "Files in backend:"
    ls -la /var/www/noxtmstudio.com/Backend/
else
    echo "❌ Backend directory not found at expected location"
fi

echo

# Test local API health endpoint
echo "5. Testing local API health..."
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo "✅ Local API health endpoint responding:"
    curl -s http://localhost:5000/api/health | jq 2>/dev/null || curl -s http://localhost:5000/api/health
else
    echo "❌ Local API health endpoint not responding"
fi

echo
echo "=== STATUS CHECK COMPLETE ==="
