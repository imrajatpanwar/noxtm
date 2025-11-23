#!/bin/bash
# Script to create email accounts for Dovecot/Postfix
# Usage: ./create-email-account.sh email@domain.com password

EMAIL=$1
PASSWORD=$2

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: $0 email@domain.com password"
    exit 1
fi

echo "Creating email account: $EMAIL"

# Create mail directory
MAIL_DIR="/var/mail/vhosts/noxtm.com/${EMAIL}"
mkdir -p "$MAIL_DIR"

# Generate password hash
PASS_HASH=$(doveadm pw -s SHA512-CRYPT -p "$PASSWORD")

# Add user to virtual users file (or update if exists)
USERS_FILE="/etc/dovecot/users"

if grep -q "^${EMAIL}:" "$USERS_FILE" 2>/dev/null; then
    # Update existing user
    sed -i "s|^${EMAIL}:.*|${EMAIL}:${PASS_HASH}:::::::|" "$USERS_FILE"
    echo "Updated existing user: $EMAIL"
else
    # Add new user
    echo "${EMAIL}:${PASS_HASH}:::::::" >> "$USERS_FILE"
    echo "Created new user: $EMAIL"
fi

# Set correct permissions
chown -R vmail:vmail "/var/mail/vhosts/noxtm.com"
chmod -R 770 "/var/mail/vhosts/noxtm.com"

# Reload Dovecot
doveadm reload

echo "✅ Email account $EMAIL created successfully!"
echo "Password: $PASSWORD"
