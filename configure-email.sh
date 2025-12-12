#!/bin/bash

# Email Configuration Script for Noxtm
# This script helps configure email settings for password reset and other transactional emails

echo "=========================================="
echo "  📧 NOXTM EMAIL CONFIGURATION"
echo "=========================================="
echo ""

echo "Choose your email provider:"
echo ""
echo "1. Gmail (Recommended for testing)"
echo "2. SendGrid (Production)"
echo "3. Mailgun (Production)"
echo "4. Zoho Mail"
echo "5. Custom SMTP"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
  1)
    echo ""
    echo "=== Gmail Configuration ==="
    echo ""
    echo "📝 Steps to get Gmail App Password:"
    echo "1. Go to https://myaccount.google.com/apppasswords"
    echo "2. Sign in to your Google Account"
    echo "3. Create a new app password for 'Mail'"
    echo "4. Copy the 16-character password"
    echo ""
    read -p "Enter your Gmail address: " EMAIL_USER
    read -p "Enter your Gmail App Password: " EMAIL_PASS
    read -p "Enter FROM email (e.g., Noxtm <$EMAIL_USER>): " EMAIL_FROM
    
    EMAIL_HOST="smtp.gmail.com"
    EMAIL_PORT="587"
    ;;
    
  2)
    echo ""
    echo "=== SendGrid Configuration ==="
    echo ""
    echo "📝 Steps to get SendGrid API Key:"
    echo "1. Go to https://app.sendgrid.com/settings/api_keys"
    echo "2. Create a new API Key with 'Mail Send' permissions"
    echo "3. Copy the API key"
    echo ""
    read -p "Enter your SendGrid API Key: " EMAIL_PASS
    read -p "Enter FROM email: " EMAIL_FROM
    
    EMAIL_HOST="smtp.sendgrid.net"
    EMAIL_PORT="587"
    EMAIL_USER="apikey"
    ;;
    
  3)
    echo ""
    echo "=== Mailgun Configuration ==="
    echo ""
    echo "📝 Get your Mailgun credentials from:"
    echo "https://app.mailgun.com/app/sending/domains"
    echo ""
    read -p "Enter your Mailgun domain (e.g., mg.yourdomain.com): " MAILGUN_DOMAIN
    read -p "Enter your Mailgun SMTP password: " EMAIL_PASS
    read -p "Enter FROM email: " EMAIL_FROM
    
    EMAIL_HOST="smtp.mailgun.org"
    EMAIL_PORT="587"
    EMAIL_USER="postmaster@$MAILGUN_DOMAIN"
    ;;
    
  4)
    echo ""
    echo "=== Zoho Mail Configuration ==="
    echo ""
    read -p "Enter your Zoho email address: " EMAIL_USER
    read -p "Enter your Zoho password: " EMAIL_PASS
    read -p "Enter FROM email (e.g., Noxtm <$EMAIL_USER>): " EMAIL_FROM
    
    EMAIL_HOST="smtp.zoho.com"
    EMAIL_PORT="587"
    ;;
    
  5)
    echo ""
    echo "=== Custom SMTP Configuration ==="
    echo ""
    read -p "Enter SMTP host: " EMAIL_HOST
    read -p "Enter SMTP port (usually 587 or 465): " EMAIL_PORT
    read -p "Enter SMTP username: " EMAIL_USER
    read -p "Enter SMTP password: " EMAIL_PASS
    read -p "Enter FROM email: " EMAIL_FROM
    ;;
    
  *)
    echo "Invalid choice!"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "  📝 Updating Configuration"
echo "=========================================="

# Update .env file on server
ssh root@185.137.122.61 << ENDSSH
cd /root/noxtm/Backend

# Backup current .env
cp .env .env.backup-\$(date +%Y%m%d-%H%M%S)

# Update email settings
sed -i "s|^EMAIL_HOST=.*|EMAIL_HOST=$EMAIL_HOST|" .env
sed -i "s|^EMAIL_PORT=.*|EMAIL_PORT=$EMAIL_PORT|" .env
sed -i "s|^EMAIL_USER=.*|EMAIL_USER=$EMAIL_USER|" .env
sed -i "s|^EMAIL_PASS=.*|EMAIL_PASS=$EMAIL_PASS|" .env
sed -i "s|^EMAIL_FROM=.*|EMAIL_FROM=$EMAIL_FROM|" .env

echo "✅ Configuration updated!"
echo ""
echo "=== Current Email Settings ==="
grep "^EMAIL_" .env

echo ""
echo "=== Restarting Backend ==="
pm2 restart noxtm-backend
sleep 3
pm2 list

echo ""
echo "=== Testing Email Configuration ==="
echo "Checking if backend can connect to SMTP server..."

# Test SMTP connection
node << 'NODEEOF'
const nodemailer = require('nodemailer');
require('dotenv').config();

const transportConfig = {
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

const transporter = nodemailer.createTransport(transportConfig);

transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ SMTP Connection Failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ SMTP Server is ready to send emails!');
    console.log('   Host:', process.env.EMAIL_HOST);
    console.log('   Port:', process.env.EMAIL_PORT);
    console.log('   User:', process.env.EMAIL_USER);
    console.log('   From:', process.env.EMAIL_FROM);
    process.exit(0);
  }
});
NODEEOF

ENDSSH

echo ""
echo "=========================================="
echo "  ✅ Email Configuration Complete!"
echo "=========================================="
echo ""
echo "You can now test the forgot password feature:"
echo "curl -X POST https://noxtm.com/api/forgot-password \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\":\"your-email@example.com\"}'"
echo ""
