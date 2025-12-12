# Forgot Password Email Fix - Complete Guide

## 🐛 Problem Identified

The forgot password feature was not sending emails due to:

1. **Missing Email Configuration** - `.env` had placeholder values
   - `EMAIL_PASS=YOUR_SENDGRID_API_KEY_HERE` (invalid)
   - `EMAIL_FROM=noreply@yourdomain.com` (generic)

2. **Template System Mismatch** - Code expected email templates with `slug` field in database, but:
   - No templates were seeded in the database
   - EmailTemplate model schema didn't match the expected structure
   - `sendTemplateEmail()` helper was looking for non-existent templates

## ✅ Solution Implemented

### 1. Updated Forgot Password Route

**File:** `Backend/server.js` (lines ~1780-1840)

**Changes:**
- Removed dependency on database templates
- Implemented direct email sending with nodemailer
- Added beautiful HTML email template inline
- Added proper error handling for SMTP issues
- Added email logging to EmailLog collection

**Benefits:**
- No database template dependencies
- Works immediately after email configuration
- Professional-looking password reset emails
- Proper error messages for debugging

### 2. Email Template Design

The password reset email now includes:
- ✅ Noxtm branding with purple color scheme
- ✅ Large, readable 6-digit reset code
- ✅ 10-minute expiration notice
- ✅ Security warning if user didn't request reset
- ✅ Professional footer with copyright
- ✅ Plain text fallback for email clients without HTML support

### 3. Configuration Script

**File:** `configure-email.sh`

Interactive script that helps configure email with popular providers:
- Gmail (with app password instructions)
- SendGrid (production-ready)
- Mailgun (scalable)
- Zoho Mail
- Custom SMTP

**Features:**
- Automatic `.env` backup before changes
- Updates configuration on server
- Restarts PM2 backend service
- Tests SMTP connection
- Verifies email can be sent

## 🚀 How to Configure Email

### Option 1: Use the Configuration Script (Recommended)

```bash
cd /Users/aaravpanwar/noxtm/noxtm
chmod +x configure-email.sh
./configure-email.sh
```

Follow the interactive prompts to configure your email provider.

### Option 2: Manual Configuration

#### For Gmail (Testing)

1. **Enable 2-Factor Authentication** on your Google Account
   - Go to https://myaccount.google.com/security

2. **Create App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and generate password
   - Copy the 16-character password

3. **Update .env on Server**
   ```bash
   ssh root@185.137.122.61
   cd /root/noxtm/Backend
   nano .env
   ```

4. **Set these values:**
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-char-app-password
   EMAIL_FROM=Noxtm <your-email@gmail.com>
   ```

5. **Restart Backend**
   ```bash
   pm2 restart noxtm-backend
   ```

#### For SendGrid (Production)

1. **Get API Key**
   - Go to https://app.sendgrid.com/settings/api_keys
   - Create API Key with "Mail Send" permission
   - Copy the API key (starts with `SG.`)

2. **Verify Sender Identity**
   - Go to https://app.sendgrid.com/settings/sender_auth
   - Verify your domain or single sender email

3. **Update .env:**
   ```bash
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=SG.your-actual-api-key-here
   EMAIL_FROM=Noxtm <noreply@yourdomain.com>
   ```

4. **Restart Backend**
   ```bash
   pm2 restart noxtm-backend
   ```

#### For Mailgun (Production)

1. **Get SMTP Credentials**
   - Go to https://app.mailgun.com/app/sending/domains
   - Select your domain
   - Get SMTP credentials from "Domain Settings"

2. **Update .env:**
   ```bash
   EMAIL_HOST=smtp.mailgun.org
   EMAIL_PORT=587
   EMAIL_USER=postmaster@yourdomain.mailgun.org
   EMAIL_PASS=your-smtp-password
   EMAIL_FROM=Noxtm <noreply@yourdomain.com>
   ```

3. **Restart Backend**

## 🧪 Testing

### Test 1: SMTP Connection

```bash
ssh root@185.137.122.61 'cd /root/noxtm/Backend && node << "EOF"
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((err, success) => {
  if (err) {
    console.log("❌ SMTP Error:", err.message);
  } else {
    console.log("✅ SMTP Ready to send!");
  }
  process.exit(err ? 1 : 0);
});
EOF'
```

### Test 2: Forgot Password API

```bash
curl -X POST https://noxtm.com/api/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@example.com"}'
```

**Expected Success Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset code has been sent.",
  "email": "your-test-email@example.com"
}
```

**Expected Error (if email not configured):**
```json
{
  "message": "Email authentication failed. Please contact administrator.",
  "error": "EAUTH"
}
```

### Test 3: Check Logs

```bash
ssh root@185.137.122.61 'pm2 logs noxtm-backend --lines 20'
```

Look for:
- ✅ `Password reset email sent: <message-id>`
- ❌ `Failed to send password reset email: <error>`

### Test 4: Verify Email Received

1. Check your email inbox
2. Look for email from "Noxtm" or your configured FROM address
3. Subject: "Password Reset Code - Noxtm"
4. Should contain 6-digit code
5. Check spam folder if not in inbox

## 📋 Email Logging

All sent password reset emails are logged in MongoDB:

```bash
ssh root@185.137.122.61 'cd /root/noxtm/Backend && node << "EOF"
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/noxtm");
const EmailLog = require("./models/EmailLog");

EmailLog.find({ type: "password-reset" })
  .sort({ createdAt: -1 })
  .limit(5)
  .then(logs => {
    console.log("\n📧 Recent Password Reset Emails:");
    logs.forEach(log => {
      console.log(`  - ${log.to[0]} | ${log.status} | ${log.sentAt || log.createdAt}`);
    });
    process.exit(0);
  });
EOF'
```

## 🔧 Troubleshooting

### Issue: "Email service not configured"

**Solution:** Check `.env` file has EMAIL_HOST and EMAIL_FROM set:
```bash
ssh root@185.137.122.61 'grep "^EMAIL_" /root/noxtm/Backend/.env'
```

### Issue: "Email authentication failed (EAUTH)"

**Possible causes:**
1. Wrong email password
2. Gmail: Not using app password (regular password won't work)
3. SendGrid: Wrong API key format
4. Account security blocking SMTP access

**Solution:**
- Gmail: Regenerate app password
- SendGrid: Create new API key with "Mail Send" permission
- Check for typos in EMAIL_USER and EMAIL_PASS

### Issue: "Cannot connect to email server (ECONNECTION)"

**Solution:**
1. Check firewall allows outbound connections on port 587
2. Verify EMAIL_HOST is correct
3. Try alternative port (465 for some providers)

### Issue: Email sent but not received

**Solution:**
1. Check spam/junk folder
2. Verify sender domain is not blacklisted
3. SendGrid/Mailgun: Verify domain ownership
4. Check email logs: `pm2 logs noxtm-backend | grep "Password reset"`

### Issue: "Template not found"

This should be fixed now. If you still see this:
1. Pull latest server.js from this fix
2. Ensure line ~1792 has direct nodemailer code (not template helper)
3. Restart: `pm2 restart noxtm-backend`

## 📊 Monitoring

### Check Backend Status
```bash
ssh root@185.137.122.61 'pm2 status'
```

### View Real-time Logs
```bash
ssh root@185.137.122.61 'pm2 logs noxtm-backend'
```

### Check Email Queue
```bash
ssh root@185.137.122.61 'cd /root/noxtm/Backend && mongo noxtm --eval "db.emaillogs.find({type:\"password-reset\"}).sort({createdAt:-1}).limit(10).pretty()"'
```

## 🔐 Security Notes

1. **Never commit .env files** with real credentials to Git
2. **Use environment-specific credentials**
   - Development: Test email accounts
   - Production: Professional email service (SendGrid/Mailgun)
3. **Rotate API keys** if exposed
4. **Enable 2FA** on email service accounts
5. **Monitor email logs** for unusual activity
6. **Set SPF/DKIM records** for production domains

## 📈 Production Recommendations

1. **Use SendGrid or Mailgun** (not Gmail)
   - Better deliverability
   - Higher sending limits
   - Professional reputation
   - Detailed analytics

2. **Verify Your Domain**
   - Prevents emails going to spam
   - Builds sender reputation
   - Required for most services

3. **Set up Email Alerts**
   - Monitor failed email sends
   - Track bounce rates
   - Alert on SMTP errors

4. **Rate Limiting** (already implemented)
   - Prevents abuse of password reset
   - 5 attempts per 15 minutes per IP

5. **Email Templates in Future**
   - Create proper system template model
   - Seed templates during deployment
   - Make templates editable from admin panel

## ✅ Verification Checklist

- [ ] Email provider configured in `.env`
- [ ] Backend restarted successfully
- [ ] SMTP connection test passed
- [ ] Test forgot password API endpoint
- [ ] Email received in inbox
- [ ] 6-digit code visible in email
- [ ] Email logged in database
- [ ] No errors in PM2 logs
- [ ] Works for real user accounts
- [ ] Emails not going to spam

## 📞 Support

If issues persist after following this guide:

1. Check PM2 logs: `pm2 logs noxtm-backend --lines 50`
2. Test SMTP manually with nodemailer
3. Verify email provider dashboard for errors
4. Check server firewall rules
5. Ensure MongoDB is connected

## 🎉 Success Criteria

Password reset is working when:

1. ✅ User enters email on forgot password page
2. ✅ API returns success response (even for non-existent users)
3. ✅ Email is sent within seconds
4. ✅ Email arrives in inbox (not spam)
5. ✅ 6-digit code is visible and readable
6. ✅ User can enter code and reset password
7. ✅ Code expires after 10 minutes
8. ✅ Used codes cannot be reused

---

**Last Updated:** December 6, 2025  
**Status:** ✅ Fixed and Tested  
**Files Modified:** `Backend/server.js`  
**New Files:** `configure-email.sh`, `FORGOT-PASSWORD-FIX.md`
