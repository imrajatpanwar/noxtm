#!/bin/bash
#
# Mail Server Diagnostic Script for 185.137.122.61
# This script checks the status of Postfix and port 25
#

echo "=============================================="
echo "  NOXTM MAIL SERVER DIAGNOSTIC"
echo "=============================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️  Please run as root: sudo bash $0"
  exit 1
fi

echo "📋 System Information:"
echo "   Hostname: $(hostname)"
echo "   IP Address: $(hostname -I | awk '{print $1}')"
echo ""

echo "=============================================="
echo "1️⃣  CHECKING POSTFIX SERVICE STATUS"
echo "=============================================="
if systemctl is-active --quiet postfix; then
    echo "✅ Postfix is running"
    systemctl status postfix --no-pager | head -10
else
    echo "❌ Postfix is NOT running"
    echo "   Status:"
    systemctl status postfix --no-pager | head -10
fi
echo ""

echo "=============================================="
echo "2️⃣  CHECKING PORT 25 LISTENER"
echo "=============================================="
PORT_CHECK=$(netstat -tulpn 2>/dev/null | grep :25 || ss -tulpn 2>/dev/null | grep :25)
if [ -n "$PORT_CHECK" ]; then
    echo "✅ Port 25 is listening:"
    echo "$PORT_CHECK"
else
    echo "❌ Port 25 is NOT listening"
fi
echo ""

echo "=============================================="
echo "3️⃣  CHECKING FIREWALL RULES"
echo "=============================================="
if command -v firewall-cmd &> /dev/null; then
    echo "🔥 Firewalld detected:"
    firewall-cmd --list-all | grep -E "services|ports"
    if firewall-cmd --list-services | grep -q smtp; then
        echo "✅ SMTP service is allowed in firewall"
    else
        echo "❌ SMTP service is NOT allowed in firewall"
    fi
elif command -v ufw &> /dev/null; then
    echo "🔥 UFW detected:"
    ufw status | grep 25
elif command -v iptables &> /dev/null; then
    echo "🔥 IPTables detected:"
    iptables -L -n | grep -E "25|ACCEPT"
else
    echo "⚠️  No firewall detected (or unable to check)"
fi
echo ""

echo "=============================================="
echo "4️⃣  CHECKING POSTFIX CONFIGURATION"
echo "=============================================="
if command -v postconf &> /dev/null; then
    echo "📧 Postfix inet_interfaces:"
    postconf inet_interfaces
    echo ""
    echo "📧 Postfix mynetworks:"
    postconf mynetworks
    echo ""
    echo "📧 Postfix mydestination:"
    postconf mydestination
else
    echo "❌ Postfix not installed or postconf command not found"
fi
echo ""

echo "=============================================="
echo "5️⃣  TESTING LOCAL CONNECTION"
echo "=============================================="
echo "Testing telnet to localhost:25..."
timeout 3 bash -c 'echo "QUIT" | telnet localhost 25 2>&1' || echo "❌ Cannot connect to localhost:25"
echo ""

echo "=============================================="
echo "6️⃣  CHECKING RECENT MAIL LOGS"
echo "=============================================="
if [ -f /var/log/maillog ]; then
    echo "📝 Last 10 lines from /var/log/maillog:"
    tail -10 /var/log/maillog
elif [ -f /var/log/mail.log ]; then
    echo "📝 Last 10 lines from /var/log/mail.log:"
    tail -10 /var/log/mail.log
else
    echo "📝 Checking journalctl for postfix logs:"
    journalctl -u postfix -n 10 --no-pager
fi
echo ""

echo "=============================================="
echo "  DIAGNOSTIC COMPLETE"
echo "=============================================="
echo ""
echo "Next step: Run the fix script with: sudo bash fix-mail-server.sh"