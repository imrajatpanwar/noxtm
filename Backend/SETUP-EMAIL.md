# Email Setup Guide for Noxtm

## Current Issue
Emails are being queued on your mail server (185.137.122.61) but **not delivered** to external email addresses. This is because:
- Missing SPF/DKIM/DMARC DNS records
- Poor IP reputation
- External servers rejecting unverified emails

## Recommended Solution: Mailgun (FREE)

Mailgun offers **5,000 free emails per month** which is perfect for your app.

### Step 1: Sign Up for Mailgun

1. Go to: https://signup.mailgun.com/new/signup
2. Create a free account
3. Verify your email address

### Step 2: Add Your Domain

1. In Mailgun dashboard, go to **Sending** → **Domains**
2. Click **Add New Domain**
3. Enter: `mg.noxtm.com` (recommended subdomain approach)
4. Click **Add Domain**

### Step 3: Configure DNS Records

Mailgun will show you DNS records to add. Go to your DNS provider (where noxtm.com is registered) and add these records:

```
# TXT Record (SPF)
Type: TXT
Host: mg.noxtm.com
Value: v=spf1 include:mailgun.org ~all

# TXT Record (DKIM)
Type: TXT
Host: mailo._domainkey.mg.noxtm.com
Value: [Mailgun will provide this - copy exactly as shown]

# TXT Record (Domain Verification)
Type: TXT
Host: mg.noxtm.com
Value: [Mailgun will provide this - copy exactly as shown]

# CNAME Record (Tracking - Optional)
Type: CNAME
Host: email.mg.noxtm.com
Value: mailgun.org

# MX Records (for receiving - optional)
Type: MX
Host: mg.noxtm.com
Value: mxa.mailgun.org
Priority: 10

Type: MX
Host: mg.noxtm.com
Value: mxb.mailgun.org
Priority: 10
```

### Step 4: Get SMTP Credentials

1. In Mailgun dashboard, go to **Sending** → **Domain settings** → **SMTP credentials**
2. Click **Reset password** to generate SMTP password
3. Copy the credentials:
   - **Username**: `postmaster@mg.noxtm.com`
   - **Password**: [generated password]
   - **SMTP Host**: `smtp.mailgun.org`
   - **Port**: `587`

### Step 5: Update Backend .env File

```env
# Email Configuration - Mailgun
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@mg.noxtm.com
EMAIL_PASS=your-mailgun-smtp-password-here
EMAIL_FROM=noreply@noxtm.com
```

**Important**: Make sure to use `EMAIL_FROM=noreply@noxtm.com` (your main domain), not the mg.noxtm.com subdomain. Mailgun will handle sending from your main domain.

### Step 6: Verify Setup

After updating .env, test the email:

```bash
cd Backend
node test-email.js your-real-email@gmail.com
```

You should receive the test email within seconds!

### Step 7: Restart Backend Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
node server.js
```

Now try the forgot password feature - emails should arrive instantly!

---

## Alternative: Use Existing Server (NOT Recommended)

If you still want to use your own mail server (185.137.122.61), you need to:

1. **Add SPF Record** to noxtm.com DNS:
   ```
   Type: TXT
   Host: @
   Value: v=spf1 ip4:185.137.122.61 ~all
   ```

2. **Configure DKIM** on your Postfix server
   - Install opendkim
   - Generate DKIM keys
   - Add public key to DNS

3. **Add DMARC Record**:
   ```
   Type: TXT
   Host: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@noxtm.com
   ```

4. **Setup Reverse DNS (PTR)** for 185.137.122.61 → mail.noxtm.com
   - Contact your VPS provider to set this up

5. **Configure Postfix properly** with authentication on port 587

This is **much more complex** and time-consuming. **Mailgun is highly recommended** for reliable email delivery.

---

## Why Mailgun?

- **Free tier**: 5,000 emails/month
- **Instant delivery**: Emails arrive in seconds
- **High deliverability**: 99%+ delivery rate
- **Easy setup**: Just update 4 DNS records
- **Detailed analytics**: Track opens, clicks, bounces
- **No maintenance**: They handle all server infrastructure
- **Spam protection**: Built-in authentication and reputation management

## Troubleshooting

**DNS records not verified?**
- DNS propagation can take up to 48 hours (usually 1-2 hours)
- Use https://mxtoolbox.com to check if records are live
- Make sure there are no trailing dots in DNS values

**Still not receiving emails?**
- Check spam folder
- Verify SMTP password is correct (no extra spaces)
- Test with: `node Backend/test-email.js your-email@gmail.com`
- Check Mailgun logs for delivery status

**Want to send from noreply@noxtm.com (not mg.noxtm.com)?**
- You can! Just use `EMAIL_FROM=noreply@noxtm.com` in .env
- Mailgun will send from your main domain as long as DNS is configured
- Recipients will see: "From: noreply@noxtm.com"
