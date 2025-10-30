#!/bin/bash

# Check Mail Logs on 185.137.122.61
# This script helps diagnose email delivery issues

echo "=========================================="
echo "📧 MAIL SERVER LOG CHECKER"
echo "=========================================="
echo ""

SERVER_IP="185.137.122.61"

echo "Checking mail logs on $SERVER_IP..."
echo ""

# Check if we can connect
if ! ping -c 1 $SERVER_IP &> /dev/null; then
    echo "❌ Cannot reach $SERVER_IP"
    echo "   Check your network connection"
    exit 1
fi

echo "✅ Server is reachable"
echo ""
echo "📋 Recent Mail Activity (last 50 lines):"
echo "=========================================="
echo ""

# Try different log locations
ssh root@$SERVER_IP 'bash -s' << 'ENDSSH'
    # Function to check log files
    check_log() {
        if [ -f "$1" ]; then
            echo "📄 Checking $1"
            echo "---"
            tail -50 "$1" | grep -i "noreply\|noxtm\|250\|status=" | tail -20
            echo ""
        fi
    }

    # Check common mail log locations
    check_log "/var/log/mail.log"
    check_log "/var/log/maillog"
    check_log "/var/log/messages"

    # Check Postfix queue
    echo "📬 Current Mail Queue:"
    echo "---"
    mailq
    echo ""

    # Check if Postfix is running
    echo "🔍 Postfix Status:"
    echo "---"
    systemctl status postfix --no-pager | head -10

ENDSSH

echo ""
echo "=========================================="
echo "✨ Log check complete!"
echo "=========================================="
echo ""
echo "Look for:"
echo "  ✅ 'status=sent' - Email delivered successfully"
echo "  ⚠️  'status=deferred' - Temporary failure, will retry"
echo "  ❌ 'status=bounced' - Permanent failure"
echo ""
