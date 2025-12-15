# DNS Configuration Guide for BYOD (Bring Your Own Domain) Email

This guide explains how to configure DNS records for companies using the NOXTM mail platform with their own domain.

## Overview

When a company wants to use their domain (e.g., `example.com`) for email through NOXTM's mail platform, they need to add specific DNS records to their domain registrar.

## Required DNS Records

### 1. Verification Token (TXT Record)
**Purpose**: Proves domain ownership

- **Type**: TXT
- **Name/Host**: `@` or your root domain
- **Value**: Provided by NOXTM platform (unique verification token)
- **Example**: `noxtm-verify=abc123def456`

### 2. MX Record (Mail Exchange)
**Purpose**: Routes incoming emails to NOXTM's mail servers

- **Type**: MX
- **Name/Host**: `@` or your root domain
- **Value**: `mail.noxtm.com`
- **Priority**: `10`

### 3. SPF Record (TXT)
**Purpose**: Prevents email spoofing, authorizes NOXTM servers to send email

- **Type**: TXT
- **Name/Host**: `@` or your root domain
- **Value**: `v=spf1 include:mail.noxtm.com ~all`

### 4. DKIM Records (CNAME - provided by AWS SES)
**Purpose**: Email authentication to prevent tampering

You'll receive 3 DKIM CNAME records from NOXTM. Example format:

- **Type**: CNAME ⚠️ **IMPORTANT: Must be CNAME, NOT A record**
- **Name/Host**: `abc123._domainkey.example.com`
- **Value**: `abc123.dkim.amazonses.com`

**Repeat for all 3 DKIM records provided**

### 5. DMARC Record (TXT)
**Purpose**: Email authentication policy

- **Type**: TXT
- **Name/Host**: `_dmarc`
- **Value**: `v=DMARC1; p=quarantine; rua=mailto:dmarc@noxtm.com`

## Common DNS Providers

### Cloudflare
1. Log in to Cloudflare dashboard
2. Select your domain
3. Click "DNS" in the left menu
4. Click "Add record"
5. Select the record type from the dropdown
6. Enter the Name/Host and Value exactly as shown
7. For MX records, enter Priority
8. Click "Save"

**⚠️ CRITICAL CLOUDFLARE ISSUE:**
- When adding DKIM records, make sure you select **CNAME** type, NOT **A** record
- If you see error "Valid IPv4 address is required", you're using A record instead of CNAME
- A records require IP addresses (like 192.0.2.1)
- CNAME records point to hostnames (like abc123.dkim.amazonses.com)

### GoDaddy
1. Log in to GoDaddy account
2. Go to "My Products" → "DNS"
3. Click "Manage DNS" for your domain
4. Click "Add" to add new records
5. Select record type and fill in details
6. Save changes

### Namecheap
1. Log in to Namecheap account
2. Go to "Domain List" → Click "Manage" next to your domain
3. Click "Advanced DNS" tab
4. Click "Add New Record"
5. Select type and enter details
6. Click the checkmark to save

## Step-by-Step Setup Process

### Step 1: Add Domain in NOXTM Platform
1. Log in to your company account at `https://noxtm.com`
2. Navigate to Mail Settings → Domain Management
3. Click "Add Domain"
4. Enter your domain name
5. Platform generates verification token and DNS records

### Step 2: Configure DNS at Your Registrar
1. Copy the verification token from NOXTM platform
2. Log in to your domain registrar (Cloudflare, GoDaddy, etc.)
3. Add all DNS records as shown in the platform
4. **Important**: Use exact record types (TXT, MX, CNAME)
5. Double-check all values match exactly

### Step 3: Verify DNS Configuration
1. Wait 10-30 minutes for DNS propagation
2. Return to NOXTM platform
3. Click "Verify DNS Configuration"
4. Platform will check all records

### Step 4: Wait for AWS SES Verification
- DNS verification completes immediately if records are correct
- AWS SES DKIM verification happens automatically in background
- Usually completes within 24 hours (can take up to 72 hours)
- You'll receive email notification when fully verified
- You can start using email after DNS verification (don't need to wait for AWS)

## Common Mistakes to Avoid

### 1. Wrong Record Type for DKIM
❌ **WRONG**: Using A record for DKIM pointing to `abc123.dkim.amazonses.com`
✅ **CORRECT**: Using CNAME record for DKIM

**Error you'll see**: "Valid IPv4 address is required"

**Why it's wrong**: A records require IP addresses, not hostnames. AWS SES DKIM records must use CNAME type.

### 2. Incorrect SPF Syntax
❌ **WRONG**: `v=spf1 include:mail.noxtm.com all`
✅ **CORRECT**: `v=spf1 include:mail.noxtm.com ~all`

Note the `~` before `all` - this is important!

### 3. Missing Priority on MX Record
MX records REQUIRE a priority number (usually 10)

### 4. Typos in Values
- Copy-paste values instead of typing manually
- Check for extra spaces at beginning/end
- Verify exact spelling of hostnames

### 5. Adding Records to Wrong Domain/Subdomain
- Most records should be on root domain (`@` or blank)
- DKIM records have specific subdomain names
- Don't add records to `www` subdomain

## DNS Propagation Time

- **Minimum**: 10 minutes
- **Typical**: 30 minutes to 2 hours
- **Maximum**: 24-48 hours

You can check DNS propagation status at: https://www.whatsmydns.net/

## Verification Timeline

1. **Immediate**: Add DNS records at your registrar
2. **10-30 minutes**: DNS propagates globally
3. **After propagation**: Click "Verify DNS" in NOXTM platform
4. **Immediate**: DNS verification completes (if records correct)
5. **1-72 hours**: AWS SES DKIM verification (automatic, background)
6. **Automatic**: Full verification completes, email notification sent

## Troubleshooting

### "DNS lookup timeout" Error
- DNS server not responding
- Wait a few minutes and try again
- Check if records actually added at registrar

### "Verification token not found"
- TXT record not added or wrong value
- Check for typos in verification token
- Ensure TXT record is on root domain (`@`)

### "MX record not found"
- MX record not added
- Wrong priority value
- Wrong hostname (should be `mail.noxtm.com`)

### "SPF record invalid"
- Check syntax: must start with `v=spf1`
- Ensure includes `include:mail.noxtm.com`
- Must end with `~all` or `-all`

### "DKIM records not found"
- Using A record instead of CNAME
- Wrong subdomain name
- Value pointing to wrong AWS SES hostname

### Still Pending After 72 Hours
- Contact NOXTM support at support@noxtm.com
- Provide domain name and error details
- May need to re-verify or troubleshoot AWS SES

## Support

If you need assistance:
- Email: support@noxtm.com
- Documentation: https://docs.noxtm.com
- Live chat available in platform (Mon-Fri 9am-6pm)

## Security Best Practices

1. **Use DMARC**: Protects against email spoofing
2. **Monitor DMARC reports**: Check email sent to `dmarc@noxtm.com`
3. **Keep DNS records updated**: Don't delete NOXTM records while using service
4. **Use strong DNS provider**: Prefer providers like Cloudflare with DDoS protection
5. **Enable DNSSEC**: If supported by your registrar

## Example Complete Configuration

For domain: `example.com`

```
Type    Name/Host                              Value                                    Priority
TXT     @                                      noxtm-verify=abc123xyz789                -
MX      @                                      mail.noxtm.com                           10
TXT     @                                      v=spf1 include:mail.noxtm.com ~all       -
CNAME   dkim1._domainkey.example.com          dkim1.dkim.amazonses.com                 -
CNAME   dkim2._domainkey.example.com          dkim2.dkim.amazonses.com                 -
CNAME   dkim3._domainkey.example.com          dkim3.dkim.amazonses.com                 -
TXT     _dmarc                                 v=DMARC1; p=quarantine; rua=mailto:...   -
```

## FAQ

**Q: Can I use my domain with multiple email providers?**
A: No, MX records can only point to one email provider at a time.

**Q: Will this affect my existing website?**
A: No, DNS records for email (MX, TXT) don't affect website (A, CNAME for www).

**Q: How long does full setup take?**
A: DNS verification: 10-30 minutes. Full verification with AWS SES: 1-72 hours.

**Q: Can I use a subdomain like mail.example.com?**
A: Yes, just enter the subdomain when adding domain in platform.

**Q: What happens if I delete DNS records later?**
A: Email will stop working immediately. Keep records as long as using NOXTM.
