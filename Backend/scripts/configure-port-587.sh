#!/bin/bash
#
# Configure Postfix to use port 587 (submission) instead of port 25
# Many hosting providers block port 25 but allow 587
#

echo "=============================================="
echo "  CONFIGURE POSTFIX FOR PORT 587"
echo "=============================================="
echo ""

if [ "$EUID" -ne 0 ]; then
  echo "⚠️  Please run as root"
  exit 1
fi

# Enable submission port in master.cf
MASTER_CF="/etc/postfix/master.cf"
echo "📝 Configuring $MASTER_CF for port 587..."

# Backup
cp "$MASTER_CF" "$MASTER_CF.backup-587"

# Enable submission port (587)
if ! grep -q "^submission inet" "$MASTER_CF"; then
    cat >> "$MASTER_CF" << 'EOF'

# Enable submission port (587) for authenticated clients
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=may
  -o smtpd_sasl_auth_enable=no
  -o smtpd_client_restrictions=permit_mynetworks,reject
  -o smtpd_relay_restrictions=permit_mynetworks,reject
  -o milter_macro_daemon_name=ORIGINATING
EOF
    echo "✅ Added submission port configuration"
else
    echo "✅ Submission port already configured"
fi

# Configure firewall for port 587
echo ""
echo "🔥 Opening firewall port 587..."
if command -v ufw &> /dev/null; then
    ufw allow 587/tcp
    echo "✅ UFW: Port 587 allowed"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=587/tcp
    firewall-cmd --reload
    echo "✅ Firewalld: Port 587 allowed"
fi

# Restart Postfix
echo ""
echo "🔄 Restarting Postfix..."
systemctl restart postfix
sleep 2

if systemctl is-active --quiet postfix; then
    echo "✅ Postfix is running"
else
    echo "❌ Postfix failed to start"
    exit 1
fi

# Check if port 587 is listening
echo ""
echo "📡 Checking port 587..."
if netstat -tulpn 2>/dev/null | grep :587 || ss -tulpn 2>/dev/null | grep :587; then
    echo "✅ Port 587 is listening"
else
    echo "❌ Port 587 is not listening"
fi

echo ""
echo "=============================================="
echo "  CONFIGURATION COMPLETE"
echo "=============================================="
echo ""
echo "Update your .env file to use port 587:"
echo "  EMAIL_HOST=185.137.122.61"
echo "  EMAIL_PORT=587"
echo ""