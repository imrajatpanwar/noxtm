#!/bin/bash

# SSL Certificate Setup for Noxtm Mail Server using Let's Encrypt

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

HOSTNAME="mail.noxtm.com"
ADMIN_EMAIL="admin@noxtm.com"

echo -e "${GREEN}Setting up SSL certificates for $HOSTNAME${NC}"

# Install Certbot
echo -e "${GREEN}Installing Certbot...${NC}"
apt-get install -y certbot

# Stop Postfix temporarily
systemctl stop postfix

# Get certificate
echo -e "${GREEN}Obtaining SSL certificate...${NC}"
certbot certonly --standalone \
    -d $HOSTNAME \
    --non-interactive \
    --agree-tos \
    --email $ADMIN_EMAIL \
    --preferred-challenges http

# Update Postfix configuration with new certificates
echo -e "${GREEN}Updating Postfix configuration...${NC}"
sed -i "s|smtpd_tls_cert_file=.*|smtpd_tls_cert_file=/etc/letsencrypt/live/$HOSTNAME/fullchain.pem|" /etc/postfix/main.cf
sed -i "s|smtpd_tls_key_file=.*|smtpd_tls_key_file=/etc/letsencrypt/live/$HOSTNAME/privkey.pem|" /etc/postfix/main.cf

# Set up auto-renewal
echo -e "${GREEN}Setting up auto-renewal...${NC}"
cat > /etc/cron.d/certbot-renewal << EOF
# Renew Let's Encrypt certificates and reload Postfix
0 3 * * * root certbot renew --quiet --post-hook "systemctl reload postfix"
EOF

# Start Postfix
systemctl start postfix

echo -e "${GREEN}SSL certificates installed successfully!${NC}"
echo ""
echo "Certificate: /etc/letsencrypt/live/$HOSTNAME/fullchain.pem"
echo "Private Key: /etc/letsencrypt/live/$HOSTNAME/privkey.pem"
echo "Auto-renewal: Configured (runs daily at 3 AM)"
echo ""
