#!/bin/bash

# Deploy Mail Frontend Script
# This script deploys the mail-frontend to the production server

set -e  # Exit on error

echo "================================================"
echo "Mail Frontend Deployment Script"
echo "================================================"
echo ""

# Configuration
SERVER_IP="185.137.122.61"
SERVER_USER="root"
SERVER_PASS="admin@home"
REMOTE_DIR="/var/www/mail-noxtm"
LOCAL_BUILD_DIR="./mail-frontend/build"
NGINX_CONFIG="./nginx-mail-noxtm.conf"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available/mail-noxtm"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled/mail-noxtm"

echo "Step 1: Building mail-frontend for production..."
cd mail-frontend
npm run build
cd ..
echo "✓ Build complete"
echo ""

echo "Step 2: Creating remote directory..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'EOF'
    mkdir -p /var/www/mail-noxtm
    echo "✓ Directory created"
EOF
echo ""

echo "Step 3: Uploading build files to server..."
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no -r $LOCAL_BUILD_DIR/* $SERVER_USER@$SERVER_IP:$REMOTE_DIR/
echo "✓ Build files uploaded"
echo ""

echo "Step 4: Uploading Nginx configuration..."
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no $NGINX_CONFIG $SERVER_USER@$SERVER_IP:$NGINX_SITES_AVAILABLE
echo "✓ Nginx config uploaded"
echo ""

echo "Step 5: Configuring Nginx..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'EOF'
    # Create symbolic link if it doesn't exist
    if [ ! -L /etc/nginx/sites-enabled/mail-noxtm ]; then
        ln -s /etc/nginx/sites-available/mail-noxtm /etc/nginx/sites-enabled/mail-noxtm
        echo "✓ Nginx site enabled"
    else
        echo "✓ Nginx site already enabled"
    fi

    # Test Nginx configuration
    echo ""
    echo "Testing Nginx configuration..."
    nginx -t

    # Reload Nginx if test passes
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        echo "✓ Nginx reloaded successfully"
    else
        echo "✗ Nginx configuration test failed"
        exit 1
    fi
EOF
echo ""

echo "Step 6: Setting correct permissions..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'EOF'
    chown -R www-data:www-data /var/www/mail-noxtm
    chmod -R 755 /var/www/mail-noxtm
    echo "✓ Permissions set"
EOF
echo ""

echo "Step 7: Checking SSL certificate..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP << 'EOF'
    if [ -f /etc/letsencrypt/live/mail.noxtm.com/fullchain.pem ]; then
        echo "✓ SSL certificate exists for mail.noxtm.com"
    else
        echo "⚠ SSL certificate NOT found for mail.noxtm.com"
        echo ""
        echo "To create SSL certificate, run on server:"
        echo "  sudo certbot --nginx -d mail.noxtm.com"
        echo ""
        echo "Or use wildcard certificate:"
        echo "  sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials /root/.secrets/cloudflare.ini -d *.noxtm.com -d noxtm.com"
    fi
EOF
echo ""

echo "================================================"
echo "Deployment Complete!"
echo "================================================"
echo ""
echo "Mail Frontend deployed to: https://mail.noxtm.com"
echo ""
echo "Next steps:"
echo "1. Verify DNS points mail.noxtm.com to $SERVER_IP"
echo "2. Ensure SSL certificate is configured (see above)"
echo "3. Test access at https://mail.noxtm.com"
echo "4. Verify backend API connectivity"
echo "5. Test SSO login from main dashboard"
echo ""
echo "Useful commands:"
echo "  - Check Nginx status: systemctl status nginx"
echo "  - View Nginx logs: tail -f /var/log/nginx/mail-noxtm-*.log"
echo "  - Restart Nginx: systemctl restart nginx"
echo ""
