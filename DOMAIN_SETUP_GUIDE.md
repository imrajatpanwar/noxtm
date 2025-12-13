# Domain Setup Guide - BYOD Email Platform

## Welcome to Your Email Platform! 🎉

This guide will help you set up your own domain for professional email hosting.

---

## Why Do I Need My Own Domain?

Instead of using @noxtm.com emails, you'll create professional emails from your own domain:

✅ **Professional**: info@yourcompany.com (instead of info@noxtm.com)
✅ **Brand Identity**: All emails come from your domain
✅ **Trust**: Better deliverability and customer trust
✅ **Control**: Full ownership of your email infrastructure

---

## The Setup Process (5 Easy Steps)

### Step 1: Enter Your Domain Name
**What you'll do**: Enter your company domain (e.g., yourcompany.com)

**Important**:
- Don't include "www" or "http://"
- Use the root domain you own
- Examples: `mycompany.com`, `startup.io`, `business.co.uk`

**Reserved Domains** (cannot be used):
- noxtm.com
- mail.noxtm.com
- localhost

### Step 2: View DNS Records
**What happens**: The system shows you DNS records to add

**You'll see**:
- MX Record (mail server)
- SPF Record (sender verification)
- DKIM CNAME Records (email authentication - 3 records)
- Verification TXT Record (domain ownership)

**Copy buttons provided**: Click 📋 to copy each record

### Step 3: Add DNS Records to Your Domain
**Where to go**: Your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)

**How to add**:

#### 3.1 Log in to Your Domain Registrar
- GoDaddy: https://dcc.godaddy.com/
- Namecheap: https://www.namecheap.com/myaccount/
- Cloudflare: https://dash.cloudflare.com/

#### 3.2 Find DNS Management
Usually labeled as:
- "DNS Management"
- "DNS Settings"
- "Manage DNS"
- "DNS Zone Editor"

#### 3.3 Add Each Record

**Example for MX Record**:
```
Type: MX
Name: @ (or leave blank)
Value: mail.yourcompany.com
Priority: 10
TTL: 3600 (or Auto)
```

**Example for SPF Record**:
```
Type: TXT
Name: @ (or leave blank)
Value: v=spf1 mx a ip4:185.137.122.61 ~all
TTL: 3600
```

**Example for DKIM CNAME Records** (3 total):
```
Type: CNAME
Name: token1._domainkey
Value: token1.dkim.amazonses.com
TTL: 3600

(Repeat for token2 and token3)
```

**Example for Verification TXT**:
```
Type: TXT
Name: @ (or leave blank)
Value: noxtm-verify=abc123...
TTL: 3600
```

#### 3.4 Save Changes
- Click "Save" or "Add Record"
- Wait 10-30 minutes for DNS propagation

### Step 4: Verify DNS Configuration
**What you'll do**: Click "Verify DNS Configuration" button

**What happens**:
1. System checks your DNS records
2. Verifies MX, SPF, and verification token
3. Sends verification request to AWS SES for DKIM

**Possible outcomes**:

**✅ Full Verification (All Green)**:
- All DNS records configured correctly
- AWS SES DKIM verification complete
- You can now create email accounts!

**⏳ Partial Verification (Some Yellow)**:
- DNS records configured correctly
- Waiting for AWS SES to verify DKIM (can take up to 72 hours)
- You'll be notified when complete

**❌ Failed Verification (Red)**:
- Some DNS records missing or incorrect
- Check each record and try again
- Use "Next Steps" guidance provided

### Step 5: Start Creating Emails!
**What you can do**:
- Create unlimited email accounts (within your plan limits)
- Examples: info@yourcompany.com, support@yourcompany.com
- Send and receive emails immediately

---

## Common Issues & Solutions

### Issue 1: "Domain is reserved"
**Symptom**: Can't add noxtm.com or mail.noxtm.com
**Solution**: These domains are reserved for platform use. Use your own domain.

### Issue 2: "Verification failed - TXT record not found"
**Causes**:
- DNS not propagated yet (wait 30-60 minutes)
- Wrong TXT record value
- Added to subdomain instead of root domain

**Solution**:
1. Double-check you added TXT record to root domain (@)
2. Verify the value matches exactly (copy from wizard)
3. Wait for DNS propagation
4. Try verification again

### Issue 3: "Waiting for AWS SES verification"
**Symptom**: DNS verified but DKIM pending
**Explanation**: This is normal! AWS SES verification can take up to 72 hours
**What to do**: Wait and check back later. You'll be notified when complete.

### Issue 4: Can't find DNS management
**Solution**:
- **GoDaddy**: Domain Settings → Manage DNS
- **Namecheap**: Domain List → Manage → Advanced DNS
- **Cloudflare**: DNS tab
- **Other**: Search "DNS" or "DNS management" in your registrar's dashboard

### Issue 5: CNAME record not accepted
**Cause**: Some registrars automatically add domain name
**Solution**:
- If record is `token._domainkey.yourcompany.com`, enter just `token._domainkey`
- Registrar will add `.yourcompany.com` automatically

---

## DNS Record Reference

### MX Record (Mail Server)
**Purpose**: Tells email where to deliver messages
```
Type: MX
Name: @ or yourcompany.com
Value: mail.yourcompany.com
Priority: 10
```

### SPF Record (Sender Verification)
**Purpose**: Authorizes our servers to send email from your domain
```
Type: TXT
Name: @ or yourcompany.com
Value: v=spf1 mx a ip4:185.137.122.61 ~all
```

### DKIM CNAME Records (Email Authentication)
**Purpose**: Cryptographic signature for email authenticity
```
Type: CNAME (3 records)
Name: [token]._domainkey
Value: [token].dkim.amazonses.com
```

### Verification TXT Record
**Purpose**: Proves you own the domain
```
Type: TXT
Name: @ or yourcompany.com
Value: noxtm-verify=[your-unique-token]
```

### DMARC Record (Optional but Recommended)
**Purpose**: Email policy and reporting
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:postmaster@yourcompany.com
```

---

## Time Expectations

| Step | Expected Time |
|------|---------------|
| Enter domain name | 1 minute |
| Add DNS records | 10-15 minutes |
| DNS propagation | 10-60 minutes |
| AWS SES DKIM verification | 30 minutes - 72 hours |
| **Total** | **~1 hour - 3 days** |

💡 **Tip**: You can start adding DNS records while reading this guide!

---

## Verification Checklist

Before clicking "Verify DNS":

- [ ] Logged into domain registrar
- [ ] Found DNS management section
- [ ] Added MX record with correct priority
- [ ] Added SPF TXT record
- [ ] Added all 3 DKIM CNAME records
- [ ] Added verification TXT record
- [ ] Saved all changes
- [ ] Waited at least 15 minutes

---

## After Setup Complete

### Create Your First Email Account
1. Click "Get Started" after verification
2. Navigate to email accounts section
3. Enter email address: `info@yourcompany.com`
4. Set strong password
5. Click "Create Account"

### Configure Your Email Client
Once created, use these settings:

**Incoming (IMAP)**:
- Server: mail.noxtm.com
- Port: 993
- Security: SSL/TLS
- Username: your full email address
- Password: your account password

**Outgoing (SMTP)**:
- Server: mail.noxtm.com
- Port: 587
- Security: STARTTLS
- Username: your full email address
- Password: your account password

---

## Need Help?

### Support Resources
- **Documentation**: Check this guide's troubleshooting section
- **Backend Logs**: Admins can check PM2 logs for issues
- **AWS Console**: Verify domain registration at console.aws.amazon.com/ses/

### Common Questions

**Q: How long does verification take?**
A: DNS records: 10-60 minutes. AWS SES DKIM: up to 72 hours.

**Q: Can I skip verification?**
A: No, verification is required for security and deliverability. Admins can still use reserved domains.

**Q: What happens if I delete DNS records later?**
A: Email will stop working. Keep all DNS records in place.

**Q: Can I add multiple domains?**
A: Yes! Each domain goes through the same verification process.

**Q: Do I need technical knowledge?**
A: Basic understanding of DNS helps, but this guide provides step-by-step instructions.

---

## Quick Start Checklist

For the impatient:

1. ✅ Enter your domain in wizard
2. ✅ Copy all DNS records (use 📋 buttons)
3. ✅ Log into domain registrar
4. ✅ Add all records to DNS
5. ✅ Wait 30 minutes
6. ✅ Click "Verify DNS"
7. ✅ Wait for AWS SES (check back in 24 hours)
8. ✅ Create email accounts!

---

**Last Updated**: December 13, 2025
**Platform**: BYOD Email (mail.noxtm.com)
