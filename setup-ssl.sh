#!/bin/bash

# SSL Setup Script for noxtmstudio.com
# This script sets up Let's Encrypt SSL certificates for the domain

echo "🔒 Setting up SSL certificates for noxtmstudio.com..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root. Use: sudo ./setup-ssl.sh"
    exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
apt update -y

# Install Certbot and Nginx plugin
echo "🔧 Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Check if Nginx is installed
if ! command -v nginx &> /dev/null; then
    echo "🔧 Installing Nginx..."
    apt install -y nginx
fi

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Check if domain is properly pointed to this server
echo "🌐 Checking domain configuration..."
echo "Make sure noxtmstudio.com and www.noxtmstudio.com are pointed to this server's IP: 185.137.122.61"

# Create a temporary Nginx configuration for domain verification
echo "📝 Creating temporary Nginx configuration..."
cat > /etc/nginx/sites-available/noxtmstudio.com << 'EOF'
server {
    listen 80;
    server_name noxtmstudio.com www.noxtmstudio.com;
    
    root /var/www/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/noxtmstudio.com /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed"
    exit 1
fi

# Reload Nginx
systemctl reload nginx

# Obtain SSL certificate
echo "🔒 Obtaining SSL certificate from Let's Encrypt..."
certbot --nginx -d noxtmstudio.com -d www.noxtmstudio.com --non-interactive --agree-tos --email admin@noxtmstudio.com --redirect

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained successfully!"
    
    # Set up automatic renewal
    echo "⏰ Setting up automatic certificate renewal..."
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    echo "✅ SSL setup completed!"
    echo ""
    echo "Your domain is now configured with SSL:"
    echo "- https://noxtmstudio.com"
    echo "- https://www.noxtmstudio.com"
    echo ""
    echo "Next steps:"
    echo "1. Replace the temporary Nginx config with your application config"
    echo "2. Deploy your React app to /var/www/noxtmstudio.com"
    echo "3. Start your Node.js backend on port 5000"
else
    echo "❌ SSL certificate setup failed"
    echo "Please check:"
    echo "1. Domain DNS is properly configured"
    echo "2. Port 80 and 443 are open"
    echo "3. Domain is accessible from the internet"
    exit 1
fi
