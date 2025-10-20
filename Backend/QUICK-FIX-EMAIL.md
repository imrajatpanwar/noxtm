# Quick Fix: Email Not Arriving

## Current Situation

✅ **What's Working:**
- SMTP connection to your server (185.137.122.61) is successful
- Emails are being **queued** on the server (Response: `250 2.0.0 Ok: queued`)
- DNS records (SPF, MX) are properly configured

❓ **Unknown:**
- Are emails actually **leaving** the queue and being **delivered**?
- Are they stuck in the queue?
- Are they being sent but marked as spam?

## Quickest Solution: Test with Gmail

Let's test if emails are actually arriving by using a **real Gmail address**:

### Step 1: Send Test to Gmail

```bash
cd c:\exe\noxtm\Backend
node test-email.js your-actual-email@gmail.com
```

Replace `your-actual-email@gmail.com` with your real Gmail address.

### Step 2: Wait 2-3 Minutes

Check:
1. ✉️ Gmail Inbox
2. 📁 Spam/Junk folder
3. 📋 Gmail "All Mail" folder

### Step 3: Check Mail Server Logs

#### Option A: Using PowerShell (Windows)

```powershell
# Run the diagnostic script
powershell -ExecutionPolicy Bypass .\Backend\scripts\check-mail-logs.ps1
```

Then manually SSH:
```bash
ssh root@185.137.122.61

# Once connected, check logs:
tail -100 /var/log/mail.log | grep noreply
# or
journalctl -u postfix -n 100 | grep noreply

# Check mail queue
mailq
```

#### Option B: Direct SSH

```bash
ssh root@185.137.122.61
tail -100 /var/log/mail.log | grep -E "noreply|noxtm|status="
mailq
```

---

## Interpreting the Results

### Scenario 1: Email Arrived in Gmail ✅

**Action**: Your email server is working! Just needs proper authentication for the app.

Update [Backend/.env](Backend/.env):

```env
# Keep using your own server - it works!
EMAIL_HOST=185.137.122.61
EMAIL_PORT=25
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@noxtm.com
```

Change port from `587` to `25` since you're not using authentication.

Then restart backend:
```bash
cd Backend
node server.js
```

### Scenario 2: Email in Spam Folder ⚠️

**Action**: Email is delivering but needs better sender reputation.

#### Quick Fix:
Add DMARC record to your DNS:

```
Type: TXT
Name: _dmarc.noxtm.com
Value: v=DMARC1; p=none; rua=mailto:postmaster@noxtm.com
```

#### Medium-term Fix:
1. Send fewer emails initially to build reputation
2. Ask recipients to mark as "Not Spam"
3. Monitor with https://www.mail-tester.com

### Scenario 3: Email Not Arriving ❌

Check server logs for error messages:

#### Error: "Relay access denied"

**Fix**: Your app server IP needs to be whitelisted.

SSH to mail server:
```bash
ssh root@185.137.122.61
nano /etc/postfix/main.cf

# Add your app server IP to mynetworks
mynetworks = 127.0.0.0/8 [::1]/128 YOUR_APP_SERVER_IP/32

# Restart
systemctl restart postfix
```

#### Error: "Connection timed out" or "Network unreachable"

**Fix**: Port 25 might be blocked by ISP.

Use port 587 with authentication instead. Create SMTP user:

```bash
ssh root@185.137.122.61

# Create user
useradd -m -s /usr/sbin/nologin noreply
echo "noreply:SecurePassword123!" | chpasswd

# Add to SASL
echo "noreply:SecurePassword123!" > /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd*

# Restart Postfix
systemctl restart postfix
```

Update [Backend/.env](Backend/.env):
```env
EMAIL_HOST=185.137.122.61
EMAIL_PORT=587
EMAIL_USER=noreply
EMAIL_PASS=SecurePassword123!
EMAIL_FROM=noreply@noxtm.com
```

#### Error: "Sender address rejected"

**Fix**: Configure Postfix to allow sending from noreply@noxtm.com

```bash
ssh root@185.137.122.61
nano /etc/postfix/main.cf

# Add these lines:
myhostname = mail.noxtm.com
mydomain = noxtm.com
myorigin = $mydomain

# Restart
systemctl restart postfix
```

### Scenario 4: Stuck in Queue 📬

If `mailq` shows messages stuck:

```bash
ssh root@185.137.122.61
mailq

# Force queue processing
postqueue -f

# Check why they're stuck
tail -100 /var/log/mail.log
```

---

## Most Likely Fix (90% of cases)

Based on your setup, the **most likely issue** is that port 587 expects authentication but you're not providing credentials.

### **Recommended Fix**:

#### 1. Update `.env` to use port 25 (no auth needed):

```env
EMAIL_HOST=185.137.122.61
EMAIL_PORT=25
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@noxtm.com
```

#### 2. Restart backend:

```bash
# Stop current server (Ctrl+C)
cd Backend
node server.js
```

#### 3. Test forgot password:

1. Go to your Noxtm app
2. Click "Forgot Password"
3. Enter your Gmail address
4. Check if code arrives (within 30 seconds)

---

## Alternative: Use Port 587 with Auth

If port 25 doesn't work (ISP blocking), configure authentication:

### On Mail Server (185.137.122.61):

```bash
ssh root@185.137.122.61

# Install SASL
apt-get install libsasl2-modules postfix-pcre  # Ubuntu/Debian
# or
yum install cyrus-sasl-plain postfix           # CentOS

# Create SMTP user
useradd -m -s /usr/sbin/nologin smtp_relay
echo "smtp_relay:MySecurePass2025!" | chpasswd

# Configure SASL
echo "smtp_relay:MySecurePass2025!" > /etc/postfix/sasl_passwd
postmap /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd*

# Enable SASL in Postfix
nano /etc/postfix/main.cf
# Add:
smtpd_sasl_auth_enable = yes
smtpd_sasl_type = cyrus
smtpd_sasl_path = smtpd
broken_sasl_auth_clients = yes
smtpd_recipient_restrictions = permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination

# Restart
systemctl restart postfix
```

### In Backend `.env`:

```env
EMAIL_HOST=185.137.122.61
EMAIL_PORT=587
EMAIL_USER=smtp_relay
EMAIL_PASS=MySecurePass2025!
EMAIL_FROM=noreply@noxtm.com
```

---

## Test End-to-End

After making changes:

### 1. Test email sending:

```bash
cd Backend
node test-email.js your-real-email@gmail.com
```

### 2. Test forgot password flow:

1. Open Noxtm app: http://localhost:3000
2. Click "Forgot Password"
3. Enter email address
4. Check email for 6-digit code
5. Enter code and new password

### 3. Monitor logs:

```bash
# On mail server
ssh root@185.137.122.61
tail -f /var/log/mail.log
```

Keep this running while testing to see real-time delivery status.

---

## Summary: What to Do Right Now

1. **Test with real email**: `node test-email.js your@gmail.com`
2. **Check if it arrives** (inbox or spam)
3. **If arrives**: Change port to 25 in `.env` and restart
4. **If doesn't arrive**: SSH to server and check logs
5. **Based on logs**: Apply specific fix from scenarios above

---

## Need More Help?

If you're still stuck, provide me with:

1. **Email arrival status**: Did test email arrive? (inbox/spam/not at all)
2. **Server logs**: Output of `tail -100 /var/log/mail.log | grep noreply`
3. **Mail queue**: Output of `mailq`
4. **Postfix status**: Output of `systemctl status postfix`

I'll give you the exact commands to fix it!
