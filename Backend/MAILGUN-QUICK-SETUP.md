# Mailgun Quick Setup (5 Minutes)

## Why Mailgun?

Your current mail server (185.137.122.61) is queuing emails but they might not be delivered to Gmail/Outlook due to:
- Missing DKIM signatures
- New sender reputation
- Spam filters blocking unknown servers

**Mailgun solves this:**
- ✅ 99.9% delivery rate
- ✅ 5,000 FREE emails/month
- ✅ Instant delivery (no delays)
- ✅ Detailed logs and analytics
- ✅ No server maintenance needed

---

## Quick Setup (5 Steps)

### Step 1: Sign Up (2 minutes)

1. Go to: https://signup.mailgun.com/new/signup
2. Enter your details
3. Verify your email
4. Add credit card (required but **won't be charged** on free tier)

### Step 2: Add Domain (1 minute)

1. In Mailgun dashboard → **Sending** → **Domains**
2. Click **Add New Domain**
3. Enter: `mg.noxtm.com` (recommended subdomain)
4. Click **Add Domain**

### Step 3: Update DNS (2 minutes)

Go to your domain registrar (where you bought noxtm.com) and add these DNS records:

Mailgun will show you the exact values - copy them to your DNS:

```
Type: TXT
Name: mg.noxtm.com
Value: v=spf1 include:mailgun.org ~all

Type: TXT
Name: k1._domainkey.mg.noxtm.com
Value: [COPY FROM MAILGUN - starts with "k=rsa;"]

Type: CNAME
Name: email.mg.noxtm.com
Value: mailgun.org

Type: MX
Name: mg.noxtm.com
Value: mxa.mailgun.org
Priority: 10

Type: MX
Name: mg.noxtm.com
Value: mxb.mailgun.org
Priority: 10
```

**Wait 5-10 minutes** for DNS to propagate. Mailgun will show green checkmarks when verified.

### Step 4: Get SMTP Credentials (30 seconds)

1. Go to: **Sending** → **Domain settings** → **SMTP credentials**
2. Click **Reset password** (generates new password)
3. Copy the credentials:
   - Login: `postmaster@mg.noxtm.com`
   - Password: [the generated password]

### Step 5: Update .env (30 seconds)

Edit `Backend/.env`:

```env
# ACTIVE: Mailgun SMTP (Reliable & Free)
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@mg.noxtm.com
EMAIL_PASS=YOUR_MAILGUN_PASSWORD_HERE
EMAIL_FROM=noreply@noxtm.com
```

**Note:** Keep `EMAIL_FROM=noreply@noxtm.com` (your main domain). Mailgun will send from your domain!

---

## Test It!

```bash
cd Backend
node test-email.js imrajatpanwar@gmail.com
```

Email should arrive in **under 10 seconds**!

---

## Troubleshooting

### DNS not verifying?

- Wait 30 minutes (DNS can be slow)
- Check with: https://dnschecker.org
- Make sure no trailing dots in DNS values
- Remove any duplicate DNS records

### Still not working?

Run the test script:

```bash
cd Backend
node test-email-interactive.js
```

Choose option 1 (Mailgun) and enter your credentials.

---

## Free Tier Limits

✅ **5,000 emails/month FREE**
- Perfect for password resets, notifications, etc.
- That's ~166 emails per day
- If you exceed, first 1000 emails cost $0.50

✅ **No credit card required** after free trial
- You already verified with card during signup
- Won't be charged unless you upgrade

---

## Alternative: Keep Using Your Server

If emails ARE arriving from your server (185.137.122.61), you can keep using it!

Just make sure:
1. Check Gmail spam folder first
2. If in spam, add DMARC record to improve reputation:

```
Type: TXT
Name: _dmarc.noxtm.com
Value: v=DMARC1; p=none; rua=mailto:postmaster@noxtm.com
```

---

## What to Use?

**Your Server (185.137.122.61):**
- ✅ Free (no limits)
- ✅ You control everything
- ❌ Might go to spam
- ❌ Requires maintenance
- ❌ No delivery analytics

**Mailgun:**
- ✅ 99.9% delivery (inbox, not spam)
- ✅ Detailed analytics
- ✅ No maintenance
- ✅ Scales automatically
- ❌ 5,000/month limit (but that's plenty!)

---

## My Recommendation

**Use Mailgun** - It's free, reliable, and takes 5 minutes to set up. Your users will actually receive emails!

Your current server setup is good as a backup, but Mailgun guarantees delivery.

---

## Need Help?

If you get stuck:
1. Check DNS propagation: https://dnschecker.org
2. Run diagnostic: `node Backend/test-email-interactive.js`
3. Check Mailgun logs: Dashboard → Sending → Logs

The setup literally takes 5 minutes and solves all email delivery issues forever!
