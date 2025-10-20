# Fix Your Own Mail Server (185.137.122.61)

## Current Status

✅ **DNS Configuration is CORRECT:**
- SPF Record: `v=spf1 mx a ip4:185.137.122.61 include:_spf.mx.cloudflare.net ~all`
- MX Record: `mail.noxtm.com` → `185.137.122.61`
- Reverse DNS: Working

✅ **SMTP Connection: Working**
- Server accepts connections on port 587
- Emails are being queued successfully

❌ **Problem: Emails not delivered to recipients**
- Port 587 typically requires SMTP authentication
- Your .env has empty EMAIL_USER and EMAIL_PASS
- Need to configure Postfix with SASL authentication

---

## Solution: Configure SMTP Authentication

### Option 1: SSH into Your Server and Configure Postfix (Recommended)

You need to configure Postfix to accept authenticated connections on port 587.

#### Step 1: Connect to your server

```bash
ssh root@185.137.122.61
# or
ssh your-username@185.137.122.61
```

#### Step 2: Check Postfix configuration

```bash
# Check if Postfix is running
systemctl status postfix

# View main configuration
cat /etc/postfix/main.cf | grep submission
```

#### Step 3: Enable SASL Authentication

Add/update these lines in `/etc/postfix/main.cf`:

```bash
# Edit Postfix config
nano /etc/postfix/main.cf

# Add these lines:
smtpd_sasl_auth_enable = yes
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = $myhostname
broken_sasl_auth_clients = yes

smtpd_recipient_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination
```

#### Step 4: Create SMTP User Account

```bash
# Create a system user for SMTP
useradd -m -s /usr/sbin/nologin noreply
passwd noreply
# Enter a secure password (you'll use this in .env)

# Add to Postfix SASL database
echo "noreply:YOUR_SECURE_PASSWORD" >> /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd*
```

#### Step 5: Configure Submission Port (587)

Edit `/etc/postfix/master.cf`:

```bash
nano /etc/postfix/master.cf

# Find the submission section and uncomment/add:
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_sasl_type=dovecot
  -o smtpd_sasl_path=private/auth
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
```

#### Step 6: Restart Postfix

```bash
systemctl restart postfix
systemctl status postfix

# Test configuration
postfix check
```

#### Step 7: Test Authentication

```bash
# Install swaks for testing
apt-get install swaks  # Debian/Ubuntu
yum install swaks      # CentOS/RHEL

# Test SMTP auth
swaks --to test@gmail.com \
      --from noreply@noxtm.com \
      --server 185.137.122.61:587 \
      --auth LOGIN \
      --auth-user noreply \
      --auth-password YOUR_PASSWORD \
      --tls
```

#### Step 8: Update Backend .env

```env
EMAIL_HOST=185.137.122.61
EMAIL_PORT=587
EMAIL_USER=noreply
EMAIL_PASS=YOUR_SECURE_PASSWORD
EMAIL_FROM=noreply@noxtm.com
```

---

### Option 2: Use Port 25 Without Authentication (Simple but Less Secure)

If you control the entire server and trust your application, you can use port 25 without authentication:

#### Update .env:

```env
EMAIL_HOST=185.137.122.61
EMAIL_PORT=25
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@noxtm.com
```

#### Configure Postfix to relay from your app server:

```bash
# SSH into 185.137.122.61
nano /etc/postfix/main.cf

# Add your app server IP to trusted networks
mynetworks = 127.0.0.0/8 [::1]/128 YOUR_APP_SERVER_IP/32

# Restart Postfix
systemctl restart postfix
```

**⚠️ Security Warning**: This allows anyone from YOUR_APP_SERVER_IP to send emails without authentication.

---

### Option 3: Test Current Configuration

Your current setup might actually work! Let's test with a real email:

```bash
cd c:\exe\noxtm\Backend
node test-email.js your-real-email@gmail.com
```

Then check:
1. Your inbox (wait 1-2 minutes)
2. Spam folder
3. Server logs on 185.137.122.61:

```bash
ssh root@185.137.122.61
tail -f /var/log/mail.log
# or
tail -f /var/log/maillog
```

Look for:
- ✅ **"status=sent"** = Email delivered successfully
- ❌ **"status=deferred"** = Temporary failure, will retry
- ❌ **"status=bounced"** = Permanent failure

---

## Quick Diagnostic Script

I've created a script to help you diagnose the issue. Run this:

```bash
cd Backend
node test-email.js your-email@gmail.com
```

Then check your mail server logs:

```bash
# SSH to your server
ssh root@185.137.122.61

# Check recent mail logs
tail -100 /var/log/mail.log | grep noreply
# or
journalctl -u postfix -n 100 --no-pager | grep noreply
```

---

## Common Issues and Solutions

### Issue 1: "Relay access denied"
**Solution**: Add your application server IP to `mynetworks` in Postfix

### Issue 2: "Authentication failed"
**Solution**:
- Create SASL user account
- Update .env with correct credentials
- Make sure SASL is enabled in Postfix

### Issue 3: Emails going to spam
**Solutions**:
- Check DKIM configuration: `nslookup -type=TXT default._domainkey.noxtm.com`
- Add DMARC record: `v=DMARC1; p=quarantine; rua=mailto:postmaster@noxtm.com`
- Check IP reputation: https://www.mail-tester.com

### Issue 4: "Connection timeout"
**Solution**: Check firewall allows port 587/25:
```bash
ufw status  # Ubuntu
firewall-cmd --list-all  # CentOS
```

---

## Recommended Approach

1. **First**: Try Option 3 (test current setup) - might already work!
2. **If fails**: Check server logs to see the actual error
3. **Then**: Based on error, implement Option 1 (SMTP auth) or Option 2 (port 25)

---

## Need Help?

If you need help SSH'ing into your server or configuring Postfix, let me know:
- What OS is running on 185.137.122.61? (Ubuntu, CentOS, Debian, etc.)
- Do you have root/sudo access?
- What mail server software is installed? (Postfix, Exim, Sendmail?)

I can create a complete setup script for you!
