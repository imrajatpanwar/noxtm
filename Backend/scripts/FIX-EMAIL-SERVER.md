# Fix Email Server - Complete Guide

## Problem
Your verification emails are failing because the mail server at `185.137.122.61` is not accepting connections on port 25.

**Error:** `ECONNREFUSED 185.137.122.61:25`

## Quick Fix (Copy & Paste)

### Step 1: Copy the fix scripts to your mail server

```bash
# From your Windows machine, upload the scripts to your mail server
scp Backend/scripts/diagnose-mail-server.sh root@185.137.122.61:/root/
scp Backend/scripts/fix-mail-server.sh root@185.137.122.61:/root/
```

### Step 2: SSH into your mail server

```bash
ssh root@185.137.122.61
```

### Step 3: Run the diagnostic script (optional)

```bash
cd /root
chmod +x diagnose-mail-server.sh
sudo bash diagnose-mail-server.sh
```

This will show you what's wrong.

### Step 4: Run the FIX script

```bash
cd /root
chmod +x fix-mail-server.sh
sudo bash fix-mail-server.sh
```

This will automatically:
- ✅ Install Postfix (if missing)
- ✅ Configure Postfix to listen on port 25
- ✅ Start Postfix service
- ✅ Open firewall port 25
- ✅ Test the configuration

### Step 5: Verify it's working

```bash
# Test from the mail server itself
telnet localhost 25
# You should see: 220 mail.noxtm.com ESMTP Postfix
# Type: QUIT and press Enter

# Check if port 25 is listening
netstat -tulpn | grep :25
# Should show: tcp 0 0 0.0.0.0:25 0.0.0.0:* LISTEN

# Check Postfix status
systemctl status postfix
# Should show: Active: active (running)
```

### Step 6: Test from your backend server

After the fix is applied, test from your backend:

```bash
# On Windows (from your project directory)
cd Backend
node -e "const nodemailer = require('nodemailer'); const transporter = nodemailer.createTransport({host: '185.137.122.61', port: 25, secure: false, tls: {rejectUnauthorized: false}}); transporter.verify((err, success) => {if(err) console.log('ERROR:', err.message); else console.log('✅ SMTP server is ready!');})"
```

You should see: `✅ SMTP server is ready!`

---

## Manual Fix (If scripts don't work)

### 1. Check Postfix status
```bash
systemctl status postfix
```

### 2. Start Postfix
```bash
systemctl start postfix
systemctl enable postfix
```

### 3. Configure Postfix
```bash
nano /etc/postfix/main.cf
```

Make sure these lines are set:
```
inet_interfaces = all
inet_protocols = all
mynetworks = 127.0.0.0/8, [::1]/128, 185.137.122.0/24
```

Save and restart:
```bash
systemctl restart postfix
```

### 4. Open firewall

**For firewalld:**
```bash
firewall-cmd --permanent --add-service=smtp
firewall-cmd --permanent --add-port=25/tcp
firewall-cmd --reload
```

**For UFW:**
```bash
ufw allow 25/tcp
ufw reload
```

**For iptables:**
```bash
iptables -I INPUT -p tcp --dport 25 -j ACCEPT
iptables-save > /etc/sysconfig/iptables
```

### 5. Test
```bash
telnet localhost 25
netstat -tulpn | grep :25
```

---

## Troubleshooting

### Problem: Postfix won't start
Check logs:
```bash
journalctl -u postfix -n 50
# or
tail -f /var/log/maillog
```

### Problem: Port 25 still blocked
Check your hosting provider's firewall/security group settings. Some providers block port 25 by default.

### Problem: Emails go to spam
You need to configure SPF, DKIM, and DMARC DNS records for noxtm.com

---

## Test Your Signup Flow

After fixing the mail server:

1. Go to: http://noxtm.com/signup
2. Fill in the signup form
3. Click "Send Verification Code"
4. Check your email for the 6-digit code
5. Enter the code and complete signup

---

## Files Created

- `Backend/scripts/diagnose-mail-server.sh` - Diagnostic script
- `Backend/scripts/fix-mail-server.sh` - Automated fix script
- This README

## Need Help?

If the automated fix doesn't work, check:
1. Postfix logs: `journalctl -u postfix -f`
2. Mail logs: `tail -f /var/log/maillog`
3. Firewall rules: `firewall-cmd --list-all`
4. Port 25 listener: `netstat -tulpn | grep :25`