#!/bin/bash

# Noxtm Mail Server Installation Script
# This script installs and configures Postfix + DKIM on Ubuntu 22.04

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="noxtm.com"
HOSTNAME="mail.noxtm.com"
SERVER_IP="185.137.122.61"
ADMIN_EMAIL="admin@noxtm.com"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Noxtm Mail Server Installation${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Domain: $DOMAIN"
echo "Hostname: $HOSTNAME"
echo "Server IP: $SERVER_IP"
echo ""
echo -e "${YELLOW}This script will install:${NC}"
echo "  - Postfix (SMTP server)"
echo "  - OpenDKIM (Email authentication)"
echo "  - Let's Encrypt SSL"
echo "  - Fail2ban (Security)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

# Update system
echo -e "${GREEN}[1/8] Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

# Set hostname
echo -e "${GREEN}[2/8] Setting hostname...${NC}"
hostnamectl set-hostname $HOSTNAME
echo "$SERVER_IP $HOSTNAME $DOMAIN" >> /etc/hosts

# Install Postfix
echo -e "${GREEN}[3/8] Installing Postfix...${NC}"
debconf-set-selections <<< "postfix postfix/mailname string $DOMAIN"
debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Internet Site'"
apt-get install -y postfix postfix-pcre mailutils

# Backup original config
cp /etc/postfix/main.cf /etc/postfix/main.cf.backup

# Configure Postfix
echo -e "${GREEN}[4/8] Configuring Postfix...${NC}"
cat > /etc/postfix/main.cf << EOF
# Postfix Main Configuration for Noxtm Mail Server
# Generated on $(date)

# Basic Settings
myhostname = $HOSTNAME
mydomain = $DOMAIN
myorigin = \$mydomain
mydestination = \$myhostname, localhost.\$mydomain, localhost
relayhost =
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
mailbox_size_limit = 0
recipient_delimiter = +
inet_interfaces = all
inet_protocols = ipv4

# TLS Settings (will be configured with Let's Encrypt)
smtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
smtpd_tls_security_level=may
smtp_tls_security_level=may
smtpd_tls_session_cache_database = btree:\${data_directory}/smtpd_scache
smtp_tls_session_cache_database = btree:\${data_directory}/smtp_scache

# SMTP Authentication
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = \$myhostname
broken_sasl_auth_clients = yes

# Security and Anti-Spam
smtpd_helo_required = yes
smtpd_recipient_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination,
    reject_invalid_hostname,
    reject_non_fqdn_hostname,
    reject_non_fqdn_sender,
    reject_non_fqdn_recipient,
    reject_unknown_sender_domain,
    reject_unknown_recipient_domain,
    reject_rbl_client zen.spamhaus.org,
    reject_rbl_client bl.spamcop.net,
    permit

# Rate Limiting
smtpd_client_connection_rate_limit = 100
smtpd_client_message_rate_limit = 100
smtpd_error_sleep_time = 1s
smtpd_soft_error_limit = 10
smtpd_hard_error_limit = 20

# Message Size Limits
message_size_limit = 25600000
mailbox_size_limit = 0

# DKIM (OpenDKIM will be configured separately)
milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
EOF

# Configure master.cf for submission port
echo -e "${GREEN}[5/8] Configuring SMTP submission port (587)...${NC}"
cat >> /etc/postfix/master.cf << EOF

# SMTP Submission Port (587) with Authentication
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_tls_auth_only=yes
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o smtpd_helo_restrictions=
  -o smtpd_sender_restrictions=
  -o smtpd_recipient_restrictions=
  -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
EOF

# Install OpenDKIM
echo -e "${GREEN}[6/8] Installing OpenDKIM...${NC}"
apt-get install -y opendkim opendkim-tools

# Create DKIM directories
mkdir -p /etc/opendkim/keys/$DOMAIN
chown -R opendkim:opendkim /etc/opendkim
chmod 700 /etc/opendkim/keys

# Generate DKIM keys
echo -e "${GREEN}[7/8] Generating DKIM keys...${NC}"
cd /etc/opendkim/keys/$DOMAIN
opendkim-genkey -s mail -d $DOMAIN
chown opendkim:opendkim mail.private
chmod 600 mail.private

# Configure OpenDKIM
cat > /etc/opendkim.conf << EOF
# OpenDKIM Configuration for Noxtm

Syslog                  yes
SyslogSuccess           yes
LogWhy                  yes

# Socket for Postfix
Socket                  inet:8891@localhost

# Domain configuration
Domain                  $DOMAIN
KeyFile                 /etc/opendkim/keys/$DOMAIN/mail.private
Selector                mail

# Signing and verification
Mode                    sv
SubDomains              no
AutoRestart             yes
AutoRestartRate         10/1M
Background              yes
DNSTimeout              5
SignatureAlgorithm      rsa-sha256

# Trusted hosts
ExternalIgnoreList      /etc/opendkim/trusted_hosts
InternalHosts           /etc/opendkim/trusted_hosts
EOF

# Create trusted hosts file
cat > /etc/opendkim/trusted_hosts << EOF
127.0.0.1
localhost
$HOSTNAME
$DOMAIN
*.$DOMAIN
$SERVER_IP
EOF

# Install Fail2ban for security
echo -e "${GREEN}[8/8] Installing Fail2ban...${NC}"
apt-get install -y fail2ban

# Configure Fail2ban for Postfix
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[postfix-sasl]
enabled = true
port = smtp,submission
filter = postfix-sasl
logpath = /var/log/mail.log

[postfix-auth]
enabled = true
port = smtp,submission
filter = postfix-auth
logpath = /var/log/mail.log
EOF

# Restart services
echo -e "${GREEN}Restarting services...${NC}"
systemctl restart opendkim
systemctl enable opendkim
systemctl restart postfix
systemctl enable postfix
systemctl restart fail2ban
systemctl enable fail2ban

# Display DKIM public key
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Add this DKIM TXT record to Cloudflare DNS:${NC}"
echo ""
echo "Type: TXT"
echo "Name: mail._domainkey"
echo "Content:"
cat /etc/opendkim/keys/$DOMAIN/mail.txt
echo ""
echo -e "${YELLOW}Also add these DNS records:${NC}"
echo ""
echo "1. MX Record:"
echo "   Type: MX"
echo "   Name: @"
echo "   Content: $HOSTNAME"
echo "   Priority: 10"
echo ""
echo "2. A Record:"
echo "   Type: A"
echo "   Name: mail"
echo "   Content: $SERVER_IP"
echo "   Proxy: OFF (DNS only)"
echo ""
echo "3. SPF Record:"
echo "   Type: TXT"
echo "   Name: @"
echo "   Content: v=spf1 mx a ip4:$SERVER_IP ~all"
echo ""
echo "4. DMARC Record:"
echo "   Type: TXT"
echo "   Name: _dmarc"
echo "   Content: v=DMARC1; p=none; rua=mailto:$ADMIN_EMAIL"
echo ""
echo -e "${YELLOW}Contact Contabo to set reverse DNS (PTR):${NC}"
echo "  $SERVER_IP → $HOSTNAME"
echo ""
echo -e "${GREEN}Service Status:${NC}"
systemctl status postfix --no-pager | head -3
systemctl status opendkim --no-pager | head -3
systemctl status fail2ban --no-pager | head -3
echo ""
echo -e "${GREEN}Mail server is ready!${NC}"
echo "Test with: echo 'Test email' | mail -s 'Test' your-email@example.com"
echo ""
