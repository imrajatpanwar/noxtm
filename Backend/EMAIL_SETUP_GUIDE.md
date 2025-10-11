# Email Configuration Setup Guide

## Problem
You're seeing the error: **"Failed to send verification code. Please try again."**

This happens because your email credentials in the `.env` file are not configured properly.

## Solution

You need to set up one of the email services below. **SendGrid is recommended** for production.

---

## Option 1: SendGrid (RECOMMENDED) ⭐

**Best for:** Production use, transactional emails, reliable delivery

**Free Tier:** 100 emails per day

### Setup Steps:

1. **Sign up for SendGrid**
   - Go to: https://sendgrid.com
   - Create a free account

2. **Verify Your Domain** (Important!)
   - Go to: Settings > Sender Authentication > Verify a Single Sender
   - Add `noreply@noxtm.com` and verify it
   - OR set up domain authentication for better deliverability

3. **Create an API Key**
   - Go to: Settings > API Keys
   - Click "Create API Key"
   - Name it (e.g., "Noxtm Email Service")
   - Choose "Full Access" or "Restricted Access" (with mail send permissions)
   - Copy the API key (you won't see it again!)

4. **Update your `.env` file**
   ```env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Your actual API key
   EMAIL_FROM=noreply@noxtm.com
   ```

5. **Restart your server**
   ```bash
   # Stop your server (Ctrl+C) and restart it
   npm start
   ```

---

## Option 2: Google Workspace

**Best for:** If you already have Google Workspace for noxtm.com

### Setup Steps:

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Enable 2FA

2. **Generate App Password**
   - Go to: Security > App passwords
   - Create a new app password for "Mail"
   - Copy the 16-character password

3. **Update your `.env` file**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=noreply@noxtm.com
   EMAIL_PASS=xxxx xxxx xxxx xxxx  # Your 16-char app password
   EMAIL_FROM=noreply@noxtm.com
   ```

4. **Restart your server**

---

## Option 3: Zoho Mail

**Best for:** Custom domain email, good free tier

**Free Tier:** 5 users, 5GB storage per user

### Setup Steps:

1. **Sign up for Zoho Mail**
   - Go to: https://www.zoho.com/mail/
   - Add your domain (noxtm.com)

2. **Create email account**
   - Create `noreply@noxtm.com` account
   - Set a strong password

3. **Update DNS records** (if needed)
   - Follow Zoho's instructions to verify domain

4. **Update your `.env` file**
   ```env
   EMAIL_HOST=smtp.zoho.com
   EMAIL_PORT=587
   EMAIL_USER=noreply@noxtm.com
   EMAIL_PASS=your_zoho_password
   EMAIL_FROM=noreply@noxtm.com
   ```

5. **Restart your server**

---

## Option 4: Mailgun

**Best for:** High volume, good API

**Free Tier:** 5,000 emails per month

### Setup Steps:

1. **Sign up for Mailgun**
   - Go to: https://www.mailgun.com
   - Create account

2. **Add and verify your domain**
   - Add noxtm.com
   - Update DNS records as instructed

3. **Get SMTP credentials**
   - Go to: Sending > Domain settings > SMTP credentials
   - Note your SMTP login and password

4. **Update your `.env` file**
   ```env
   EMAIL_HOST=smtp.mailgun.org
   EMAIL_PORT=587
   EMAIL_USER=postmaster@mg.noxtm.com  # Or your domain
   EMAIL_PASS=your_mailgun_password
   EMAIL_FROM=noreply@noxtm.com
   ```

5. **Restart your server**

---

## Testing Your Configuration

After setting up, test the email by:

1. **Restart your backend server**
   ```bash
   cd Backend
   npm start
   ```

2. **Try signing up with a test account**
   - Go to your signup page
   - Enter test details
   - Click "Send Verification Code"

3. **Check server logs**
   - Look for: `✅ SMTP connection verified successfully`
   - Or error messages with specific details

4. **Check your email inbox**
   - Look for the verification code email
   - Check spam folder if not in inbox

---

## Troubleshooting

### Error: "Email service not configured"
- Your `.env` file still has placeholder values
- Update `EMAIL_PASS` with actual credentials

### Error: "SMTP verification failed"
- Check your credentials are correct
- Verify SMTP host and port are correct
- Check if your email service requires additional setup (domain verification, etc.)

### Error: "Email authentication failed" (EAUTH)
- Wrong password or API key
- For Gmail: Make sure you're using App Password, not regular password
- For SendGrid: Make sure API key has mail send permissions

### Email not received
- Check spam folder
- Verify sender email is authenticated/verified in your email service
- Check email service logs for delivery status

---

## Security Notes

- ⚠️ **Never commit your `.env` file to Git** - It contains sensitive credentials
- ✅ The `.env` file is already in `.gitignore`
- ✅ Use `.env.example` for documentation only
- ✅ For production, use environment variables instead of `.env` file

---

## Support

If you continue to have issues:

1. Check server logs for specific error messages
2. Verify your email service dashboard for any errors
3. Test SMTP credentials using online tools
4. Make sure firewall isn't blocking port 587

---

## Recommended Setup

For noxtm.com, I recommend:

1. **Production:** SendGrid (most reliable, great deliverability)
2. **Budget:** Zoho Mail (good free tier)
3. **Already using Google:** Google Workspace

Choose SendGrid if you want the best email deliverability and don't want to manage email infrastructure.
