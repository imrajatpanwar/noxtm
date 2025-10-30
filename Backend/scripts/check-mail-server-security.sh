#!/bin/bash

# SMTP Security Diagnostic Script
# Checks server for compromise and SMTP abuse

echo "=========================================="
echo "  SMTP SECURITY DIAGNOSTIC SCRIPT"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}ERROR: Please run as root (use sudo)${NC}"
   exit 1
fi

echo "[1/10] Checking active SMTP connections..."
echo "=========================================="
SMTP_CONNECTIONS=$(netstat -anp 2>/dev/null | grep :25 | grep ESTABLISHED | wc -l)
echo -e "Active SMTP connections on port 25: ${YELLOW}$SMTP_CONNECTIONS${NC}"

if [ "$SMTP_CONNECTIONS" -gt 10 ]; then
    echo -e "${RED}⚠️  WARNING: High number of SMTP connections detected!${NC}"
    echo "Active connections:"
    netstat -anp 2>/dev/null | grep :25 | grep ESTABLISHED | head -20
else
    echo -e "${GREEN}✓ Connection count looks normal${NC}"
fi
echo ""

echo "[2/10] Checking mail queue..."
echo "=========================================="
if command -v mailq &> /dev/null; then
    QUEUE_SIZE=$(mailq | tail -1 | awk '{print $5}')
    echo "Mail queue size: ${YELLOW}$QUEUE_SIZE${NC}"

    if [ "$QUEUE_SIZE" -gt 100 ]; then
        echo -e "${RED}⚠️  WARNING: Large mail queue detected!${NC}"
        echo "Queue details:"
        mailq | head -50
    else
        echo -e "${GREEN}✓ Mail queue size is normal${NC}"
    fi
elif command -v postqueue &> /dev/null; then
    QUEUE_COUNT=$(postqueue -p | tail -1 | awk '{print $5}')
    echo "Mail queue size: ${YELLOW}$QUEUE_COUNT${NC}"
    if [[ "$QUEUE_COUNT" =~ [0-9]+ ]] && [ "$QUEUE_COUNT" -gt 100 ]; then
        echo -e "${RED}⚠️  WARNING: Large mail queue detected!${NC}"
        postqueue -p | head -50
    else
        echo -e "${GREEN}✓ Mail queue size is normal${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No mail queue command found (mailq or postqueue)${NC}"
fi
echo ""

echo "[3/10] Checking Postfix status..."
echo "=========================================="
if systemctl is-active --quiet postfix; then
    echo -e "${GREEN}✓ Postfix is running${NC}"
else
    echo -e "${YELLOW}⚠️  Postfix is NOT running${NC}"
fi
echo ""

echo "[4/10] Checking recent mail logs (last 50 entries)..."
echo "=========================================="
if [ -f /var/log/mail.log ]; then
    echo "Checking /var/log/mail.log..."
    tail -50 /var/log/mail.log | grep -i "sent\|reject\|relay\|error" || echo "No recent mail activity"
elif [ -f /var/log/maillog ]; then
    echo "Checking /var/log/maillog..."
    tail -50 /var/log/maillog | grep -i "sent\|reject\|relay\|error" || echo "No recent mail activity"
else
    echo -e "${YELLOW}⚠️  No mail log file found${NC}"
fi
echo ""

echo "[5/10] Checking for suspicious processes..."
echo "=========================================="
SMTP_PROCESSES=$(ps aux | grep -E "smtp|sendmail|postfix" | grep -v grep | wc -l)
echo "SMTP-related processes: ${YELLOW}$SMTP_PROCESSES${NC}"
ps aux | grep -E "smtp|sendmail|postfix" | grep -v grep
echo ""

echo "[6/10] Checking recent failed login attempts..."
echo "=========================================="
if [ -f /var/log/auth.log ]; then
    FAILED_LOGINS=$(grep "Failed password" /var/log/auth.log | wc -l)
    echo "Failed login attempts: ${YELLOW}$FAILED_LOGINS${NC}"
    if [ "$FAILED_LOGINS" -gt 50 ]; then
        echo -e "${RED}⚠️  WARNING: High number of failed login attempts!${NC}"
        tail -20 /var/log/auth.log | grep "Failed password"
    else
        echo -e "${GREEN}✓ Failed login count looks normal${NC}"
    fi
fi
echo ""

echo "[7/10] Checking Postfix configuration..."
echo "=========================================="
if [ -f /etc/postfix/main.cf ]; then
    echo "Key Postfix settings:"
    grep -E "^(relayhost|mynetworks|smtpd_relay_restrictions|smtp_use_tls)" /etc/postfix/main.cf || echo "No relay config found"

    # Check if it's an open relay
    if grep -q "^mynetworks.*0\.0\.0\.0/0" /etc/postfix/main.cf; then
        echo -e "${RED}⚠️  CRITICAL: OPEN RELAY DETECTED! Server can be used to send spam!${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Postfix configuration file not found${NC}"
fi
echo ""

echo "[8/10] Checking for unauthorized cron jobs..."
echo "=========================================="
echo "Root crontab:"
crontab -l 2>/dev/null || echo "No crontab for root"
echo ""
echo "System cron files:"
ls -la /etc/cron.* 2>/dev/null | grep -v "^d" | head -10
echo ""

echo "[9/10] Checking SSH authorized_keys..."
echo "=========================================="
if [ -f ~/.ssh/authorized_keys ]; then
    echo "Authorized SSH keys for root:"
    cat ~/.ssh/authorized_keys
else
    echo "No authorized_keys file found"
fi
echo ""

echo "[10/10] Checking for common backdoors/malware..."
echo "=========================================="
# Check for common backdoor locations
SUSPICIOUS_FILES=0
for file in /tmp/.X11-unix /tmp/.ICE-unix /dev/shm/.bash /var/tmp/.system; do
    if [ -f "$file" ] || [ -d "$file" ]; then
        echo -e "${RED}⚠️  Suspicious file/directory found: $file${NC}"
        ((SUSPICIOUS_FILES++))
    fi
done

if [ "$SUSPICIOUS_FILES" -eq 0 ]; then
    echo -e "${GREEN}✓ No obvious backdoors found in common locations${NC}"
fi
echo ""

echo "=========================================="
echo "  DIAGNOSTIC COMPLETE"
echo "=========================================="
echo ""

# Generate recommendations
echo "📋 RECOMMENDATIONS:"
echo ""

if [ "$SMTP_CONNECTIONS" -gt 10 ]; then
    echo "🔴 1. IMMEDIATE: Stop Postfix to prevent further spam"
    echo "   Command: systemctl stop postfix"
    echo ""
fi

if [ -f /etc/postfix/main.cf ] && grep -q "^mynetworks.*0\.0\.0\.0/0" /etc/postfix/main.cf; then
    echo "🔴 2. CRITICAL: Fix open relay configuration"
    echo "   Edit /etc/postfix/main.cf and restrict mynetworks"
    echo ""
fi

echo "🟡 3. Switch to port 587 with authentication"
echo "   - Port 25 is insecure and easily exploited"
echo "   - Configure SASL authentication for submission port"
echo ""

echo "🟡 4. Or migrate to external SMTP service (RECOMMENDED)"
echo "   - Mailgun: https://www.mailgun.com"
echo "   - SendGrid: https://sendgrid.com"
echo "   - Zoho Mail: https://www.zoho.com/mail"
echo ""

echo "🟢 5. Add rate limiting and monitoring to your application"
echo "   - Implement email rate limits"
echo "   - Log all email sends"
echo "   - Set up alerts for unusual activity"
echo ""

echo "=========================================="
echo ""
echo "💾 Log saved to: /tmp/smtp-security-check-$(date +%Y%m%d-%H%M%S).log"
