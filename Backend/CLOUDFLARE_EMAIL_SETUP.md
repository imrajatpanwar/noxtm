# Email Setup Guide for noxtm.com (Cloudflare DNS)

Since you're using Cloudflare DNS and want to manage email from your own server, here are your options:

---

## 🌟 RECOMMENDED: Zoho Mail (Free + Easy)

**Best choice because:**
- ✅ Completely FREE (5 users, 5GB per user)
- ✅ Works perfectly with Cloudflare
- ✅ Professional email service
- ✅ No credit card required
- ✅ Simple SMTP setup
- ✅ Good deliverability

### Setup Steps:

#### 1. Sign up for Zoho Mail
- Go to: https://www.zoho.com/mail/zohomail-pricing.html
- Click "Get Started" under **Forever Free** plan
- Sign up with your details

#### 2. Add Your Domain (noxtm.com)
- During signup, select "I have a domain"
- Enter: `noxtm.com`
- Verify domain ownership

#### 3. Update DNS Records in Cloudflare
Zoho will ask you to add these DNS records:

**MX Records** (Replace existing ones):
```
Type: MX | Name: @ | Content: mx.zoho.com | Priority: 10
Type: MX | Name: @ | Content: mx2.zoho.com | Priority: 20
Type: MX | Name: @ | Content: mx3.zoho.com | Priority: 50
```

**TXT Records** (For verification):
```
Type: TXT | Name: @ | Content: zoho-verification=xxxxx.zmverify.zoho.com
```

**SPF Record** (Already exists, but verify):
```
Type: TXT | Name: @ | Content: v=spf1 include:zoho.com ~all
```

**DKIM Record**:
```
Type: TXT | Name: zoho._domainkey | Content: [Provided by Zoho]
```

#### 4. Create Email Account
- In Zoho admin panel, create user: `noreply@noxtm.com`
- Set a strong password
- Save this password for later

#### 5. Enable SMTP in Zoho
- Go to: https://mail.zoho.com
- Settings > Mail Accounts > SMTP Settings
- Enable "Allow access for less secure apps" if needed
- OR generate App-Specific Password (recommended)

#### 6. Update Your `.env` File
```env
EMAIL_HOST=smtp.zoho.com
EMAIL_PORT=587
EMAIL_USER=noreply@noxtm.com
EMAIL_PASS=your_actual_zoho_password
EMAIL_FROM=noreply@noxtm.com
```

#### 7. Restart Your Server
```bash
cd Backend
npm restart
```

#### 8. Test Signup
- Try registering a new account
- Check if verification email arrives
- Check server logs for success/errors

---

## 🚀 Alternative: Mailgun (5000 emails/month FREE)

**Good for:** More emails, better API, detailed analytics

### Setup Steps:

#### 1. Sign Up
- Go to: https://www.mailgun.com
- Create free account (no credit card for first 3 months)

#### 2. Add Domain
- Add domain: `mg.noxtm.com` (recommended subdomain approach)
- OR use: `noxtm.com` directly

#### 3. Update Cloudflare DNS
Mailgun will provide these records:

**TXT Records**:
```
Type: TXT | Name: @ | Content: v=spf1 include:mailgun.org ~all
Type: TXT | Name: mg | Content: v=spf1 include:mailgun.org ~all
```

**DKIM Records**:
```
Type: TXT | Name: k1._domainkey.mg | Content: [Provided by Mailgun]
```

**CNAME Records**:
```
Type: CNAME | Name: email.mg | Content: mailgun.org
```

**MX Records** (if using mg.noxtm.com):
```
Type: MX | Name: mg | Content: mxa.mailgun.org | Priority: 10
Type: MX | Name: mg | Content: mxb.mailgun.org | Priority: 10
```

#### 4. Wait for Verification
- Mailgun will verify DNS records (takes 24-48 hours)
- Check domain status in Mailgun dashboard

#### 5. Get SMTP Credentials
- Go to: Sending > Domain settings > SMTP credentials
- Note your SMTP login and password

#### 6. Update Your `.env` File
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@mg.noxtm.com
EMAIL_PASS=your_mailgun_smtp_password
EMAIL_FROM=noreply@noxtm.com
```

#### 7. Restart and Test

---

## ⚡ Advanced: Cloudflare Email Workers (100% Free)

**Best for:** Unlimited emails, serverless, completely free

**Note:** This requires code changes (no SMTP, uses HTTP API)

### Setup Steps:

#### 1. Enable Cloudflare Email Routing
- You already have this set up (I can see your MX records)
- Go to Cloudflare Dashboard > Email Routing
- Verify it's active

#### 2. Set Up Email Worker
- Create a Cloudflare Worker
- Use MailChannels API (free for Cloudflare)
- No SMTP needed - sends via HTTP API

#### 3. Code Changes Required
I can help you modify the backend to use Cloudflare Workers instead of SMTP. Would you like me to do this?

The changes involve:
- Replacing `nodemailer` with HTTP fetch to MailChannels API
- Setting up Cloudflare Worker endpoint
- Updating email sending logic

---

## 🔧 DNS Records You Already Have

Based on your screenshot:

| Type | Name | Content | Status |
|------|------|---------|--------|
| A | gifting | 185.137.122.61 | ✅ Proxied |
| A | mail | 185.137.122.61 | ⚠️ DNS only (Warning) |
| A | noxtm.com | 185.137.122.61 | ✅ Proxied |
| A | www | 185.137.122.61 | ✅ Proxied |
| MX | noxtm.com | route[1-3].mx.cloudflare.net | ✅ Cloudflare Email Routing |

**Issues to Fix:**
1. ⚠️ The `mail` subdomain has a warning - what's the issue?
2. Your MX records point to Cloudflare Email Routing - are you using it?

---

## 🚫 Why NOT Direct Server SMTP?

Sending email directly from your server (185.137.122.61) is **NOT recommended** because:

1. **Port 25 Blocked**: Most ISPs block outbound port 25
2. **Spam Filters**: Your IP needs reputation (takes months)
3. **Reverse DNS**: Need PTR records (requires ISP cooperation)
4. **Maintenance**: Requires managing Postfix/Exim
5. **Deliverability**: High chance emails go to spam
6. **Blacklists**: Easy to get blacklisted
7. **Security**: Mail servers are common attack targets

**If you still want to try:**
- You'll need to install Postfix or Exim on your Linux server
- Configure SPF, DKIM, DMARC properly
- Set up reverse DNS (PTR record)
- Monitor blacklists daily
- Handle bounce management
- This is a full-time job for production systems

---

## 📊 Comparison

| Service | Free Emails | Setup Time | Deliverability | Maintenance |
|---------|-------------|------------|----------------|-------------|
| **Zoho Mail** | Unlimited (5 users) | 10 mins | ⭐⭐⭐⭐⭐ | None |
| **Mailgun** | 5,000/month | 15 mins | ⭐⭐⭐⭐⭐ | None |
| **Cloudflare Workers** | Unlimited | 30 mins | ⭐⭐⭐⭐ | None |
| **Direct SMTP** | Unlimited | 2-3 hours | ⭐⭐ | High |

---

## 🎯 My Recommendation

**For noxtm.com, use Zoho Mail:**

1. ✅ Completely free
2. ✅ Professional service
3. ✅ 10-minute setup
4. ✅ Works perfectly with Cloudflare
5. ✅ Excellent deliverability
6. ✅ No maintenance required
7. ✅ Can receive emails too (Cloudflare forwards to Zoho)

**Setup time:** 10 minutes
**Cost:** $0
**Deliverability:** Excellent

---

## 🆘 Need Help?

Let me know which option you'd like to use:

1. **Zoho Mail** - I'll guide you through the DNS setup
2. **Mailgun** - I'll help with domain verification
3. **Cloudflare Workers** - I'll modify your code to use HTTP API
4. **Direct SMTP** - I'll create a complete mail server setup script (not recommended)

Which one would you prefer?
