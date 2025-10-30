#!/bin/bash
#
# Mail Server Fix Script for 185.137.122.61
# This script will attempt to fix common Postfix issues
#

echo "=============================================="
echo "  NOXTM MAIL SERVER AUTO-FIX"
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️  Please run as root: sudo bash $0"
  exit 1
fi

echo "🔧 Starting automatic fixes..."
echo ""

# Fix 1: Install Postfix if not installed
echo "=============================================="
echo "1️⃣  CHECKING POSTFIX INSTALLATION"
echo "=============================================="
if ! command -v postfix &> /dev/null; then
    echo "⚠️  Postfix not found. Installing..."
    if command -v yum &> /dev/null; then
        yum install -y postfix
    elif command -v apt-get &> /dev/null; then
        apt-get update && apt-get install -y postfix
    else
        echo "❌ Cannot install Postfix automatically. Please install manually."
        exit 1
    fi
    echo "✅ Postfix installed"
else
    echo "✅ Postfix is already installed"
fi
echo ""

# Fix 2: Configure Postfix to listen on all interfaces
echo "=============================================="
echo "2️⃣  CONFIGURING POSTFIX"
echo "=============================================="
MAIN_CF="/etc/postfix/main.cf"
if [ -f "$MAIN_CF" ]; then
    echo "📝 Backing up $MAIN_CF to $MAIN_CF.backup"
    cp "$MAIN_CF" "$MAIN_CF.backup"

    # Set inet_interfaces to all
    if grep -q "^inet_interfaces" "$MAIN_CF"; then
        sed -i 's/^inet_interfaces.*/inet_interfaces = all/' "$MAIN_CF"
    else
        echo "inet_interfaces = all" >> "$MAIN_CF"
    fi
    echo "✅ Set inet_interfaces = all"

    # Set inet_protocols to all (IPv4 and IPv6)
    if grep -q "^inet_protocols" "$MAIN_CF"; then
        sed -i 's/^inet_protocols.*/inet_protocols = all/' "$MAIN_CF"
    else
        echo "inet_protocols = all" >> "$MAIN_CF"
    fi
    echo "✅ Set inet_protocols = all"

    # Set mynetworks to allow local and your backend server
    if ! grep -q "^mynetworks" "$MAIN_CF"; then
        echo "mynetworks = 127.0.0.0/8, [::1]/128, 185.137.122.0/24" >> "$MAIN_CF"
        echo "✅ Set mynetworks"
    fi
else
    echo "❌ Postfix main.cf not found at $MAIN_CF"
fi
echo ""

# Fix 3: Enable and start Postfix
echo "=============================================="
echo "3️⃣  STARTING POSTFIX SERVICE"
echo "=============================================="
systemctl enable postfix
systemctl restart postfix
sleep 2

if systemctl is-active --quiet postfix; then
    echo "✅ Postfix is now running"
else
    echo "❌ Postfix failed to start. Checking logs..."
    journalctl -u postfix -n 20 --no-pager
    exit 1
fi
echo ""

# Fix 4: Configure firewall
echo "=============================================="
echo "4️⃣  CONFIGURING FIREWALL"
echo "=============================================="
if command -v firewall-cmd &> /dev/null; then
    echo "🔥 Configuring firewalld..."
    firewall-cmd --permanent --add-service=smtp
    firewall-cmd --permanent --add-port=25/tcp
    firewall-cmd --reload
    echo "✅ Firewalld configured to allow SMTP (port 25)"
elif command -v ufw &> /dev/null; then
    echo "🔥 Configuring UFW..."
    ufw allow 25/tcp
    ufw reload
    echo "✅ UFW configured to allow port 25"
elif command -v iptables &> /dev/null; then
    echo "🔥 Configuring iptables..."
    iptables -I INPUT -p tcp --dport 25 -j ACCEPT
    if command -v iptables-save &> /dev/null; then
        iptables-save > /etc/iptables/rules.v4 2>/dev/null || iptables-save > /etc/sysconfig/iptables 2>/dev/null
    fi
    echo "✅ iptables configured to allow port 25"
else
    echo "⚠️  No firewall detected or unable to configure"
fi
echo ""

# Fix 5: Test the configuration
echo "=============================================="
echo "5️⃣  TESTING CONFIGURATION"
echo "=============================================="
echo "Testing local SMTP connection..."
sleep 2
if timeout 3 bash -c 'echo "QUIT" | telnet localhost 25 2>&1' | grep -q "220"; then
    echo "✅ SMTP server is responding on localhost:25"
else
    echo "❌ SMTP server is not responding properly"
fi
echo ""

# Check if port 25 is listening
PORT_CHECK=$(netstat -tulpn 2>/dev/null | grep :25 || ss -tulpn 2>/dev/null | grep :25)
if [ -n "$PORT_CHECK" ]; then
    echo "✅ Port 25 is listening:"
    echo "$PORT_CHECK"
else
    echo "❌ Port 25 is still not listening"
fi
echo ""

echo "=============================================="
echo "6️⃣  FINAL STATUS"
echo "=============================================="
systemctl status postfix --no-pager | head -15
echo ""

echo "=============================================="
echo "  FIX COMPLETE!"
echo "=============================================="
echo ""
echo "📧 Next steps:"
echo "   1. Test email sending from your Node.js app"
echo "   2. Check /var/log/maillog for any errors"
echo "   3. If emails still fail, check your DNS/SPF/DKIM records"
echo ""
echo "🧪 Test SMTP from command line:"
echo "   telnet 185.137.122.61 25"
echo ""