# AWS SES DNS Records for mail.noxtm.com

## Quick Reference Guide

After creating the domain identity in AWS SES Console, you'll receive DNS records to add to Cloudflare.

---

## DNS Records to Add to Cloudflare

### 1. DKIM Records (3 CNAME Records)

⚠️ **IMPORTANT**: AWS will provide you with 3 unique CNAME records. The values below are **examples only**. Use the actual values from your AWS SES Console!

**How to get the values**:
1. AWS SES Console → Verified identities → mail.noxtm.com
2. Copy the 3 CNAME records from the "DomainKeys Identified Mail (DKIM)" section

**Add to Cloudflare** (repeat 3 times):

| Type | Name | Target | Proxy | TTL |
|------|------|--------|-------|-----|
| CNAME | `abc123._domainkey.mail` | `abc123.dkim.amazonses.com` | DNS only | Auto |
| CNAME | `def456._domainkey.mail` | `def456.dkim.amazonses.com` | DNS only | Auto |
| CNAME | `ghi789._domainkey.mail` | `ghi789.dkim.amazonses.com` | DNS only | Auto |

**Steps for each record**:
1. Cloudflare → noxtm.com → DNS → Add record
2. Type: `CNAME`
3. Name: Copy from AWS (remove `.noxtm.com` at the end)
4. Target: Copy from AWS
5. Proxy status: **DNS only** (gray cloud)
6. TTL: Auto
7. Save

---

### 2. SPF Record (1 TXT Record)

**Add to Cloudflare**:

| Type | Name | Content | TTL |
|------|------|---------|-----|
| TXT | `mail` | `v=spf1 include:amazonses.com ~all` | Auto |

**If you already have an SPF record**:
- Don't create a new one
- Edit the existing record
- Add `include:amazonses.com` to the existing value
- Example: `v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com ~all`

**Steps**:
1. Cloudflare → DNS → Add record
2. Type: `TXT`
3. Name: `mail`
4. Content: `v=spf1 include:amazonses.com ~all`
5. TTL: Auto
6. Save

---

### 3. DMARC Record (1 TXT Record)

**Add to Cloudflare**:

| Type | Name | Content | TTL |
|------|------|---------|-----|
| TXT | `_dmarc.mail` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@noxtm.com; ruf=mailto:dmarc@noxtm.com; fo=1` | Auto |

**Steps**:
1. Cloudflare → DNS → Add record
2. Type: `TXT`
3. Name: `_dmarc.mail`
4. Content: `v=DMARC1; p=quarantine; rua=mailto:dmarc@noxtm.com; ruf=mailto:dmarc@noxtm.com; fo=1`
5. TTL: Auto
6. Save

---

## Complete DNS Records Summary

After adding all records, your Cloudflare DNS should have:

| Type | Name | Value/Target | Purpose |
|------|------|--------------|---------|
| A | `mail` | `185.137.122.61` | Main domain (already exists) |
| CNAME | `abc123._domainkey.mail` | `abc123.dkim.amazonses.com` | DKIM 1/3 |
| CNAME | `def456._domainkey.mail` | `def456.dkim.amazonses.com` | DKIM 2/3 |
| CNAME | `ghi789._domainkey.mail` | `ghi789.dkim.amazonses.com` | DKIM 3/3 |
| TXT | `mail` | `v=spf1 include:amazonses.com ~all` | SPF |
| TXT | `_dmarc.mail` | `v=DMARC1; p=quarantine; rua=...` | DMARC |

---

## Verification Checklist

After adding DNS records:

- [ ] All 3 DKIM CNAME records added to Cloudflare
- [ ] Proxy status for DKIM records is "DNS only" (gray cloud)
- [ ] SPF TXT record added (or existing record updated)
- [ ] DMARC TXT record added
- [ ] Waited 5-30 minutes for DNS propagation
- [ ] Checked verification status in AWS SES Console
- [ ] DKIM status shows "Successful" ✅
- [ ] Domain verification status shows "Verified" ✅

---

## How to Verify DNS Records

### Option 1: Run verification script
```bash
verify-dns-records.bat
```

### Option 2: Manual commands

**Check A Record**:
```bash
nslookup mail.noxtm.com
```
Expected: `185.137.122.61`

**Check SPF Record**:
```bash
nslookup -type=txt mail.noxtm.com
```
Expected: Should show `v=spf1 include:amazonses.com ~all`

**Check DMARC Record**:
```bash
nslookup -type=txt _dmarc.mail.noxtm.com
```
Expected: Should show `v=DMARC1; p=quarantine...`

**Check DKIM Records** (replace abc123 with actual value):
```bash
nslookup -type=cname abc123._domainkey.mail.noxtm.com
```
Expected: Should point to `abc123.dkim.amazonses.com`

### Option 3: Online Tools

1. **DNS Checker**: https://dnschecker.org
   - Check propagation globally

2. **MX Toolbox**: https://mxtoolbox.com/SuperTool.aspx
   - Check SPF, DKIM, DMARC records

3. **DKIM Validator**: https://dkimvalidator.com
   - Validate DKIM configuration

---

## Common Issues & Solutions

### Issue: DKIM Not Verifying

**Cause**: DNS records not propagated or incorrect

**Solution**:
1. Wait 30 minutes for DNS propagation
2. Verify CNAME records are "DNS only" (not proxied)
3. Check Name field doesn't have full domain (should be `abc123._domainkey.mail`, not `abc123._domainkey.mail.noxtm.com`)
4. Verify Target matches exactly from AWS

### Issue: SPF Record Not Found

**Cause**: TXT record not added or incorrect name

**Solution**:
1. Verify Name is `mail` (not `mail.noxtm.com`)
2. Check Content starts with `v=spf1`
3. If already have SPF, edit existing record (don't create duplicate)

### Issue: AWS Shows "Pending Verification"

**Cause**: DNS not propagated yet

**Solution**:
1. Wait 5-30 minutes
2. Refresh AWS SES Console page
3. Check DNS records with `nslookup`
4. If still pending after 1 hour, check DNS records are correct

---

## Next Steps After Verification

1. ✅ Domain verified in AWS SES
2. ⏳ Request production access (exit sandbox mode)
3. ⏳ Wait for approval (24-48 hours)
4. ⏳ Test email sending with test script
5. ⏳ Configure bounce/complaint handling (optional)

---

## Test Email Sending

Once domain is verified:

```bash
# Edit test-ses-email.js and change TEST_EMAIL to your email
node test-ses-email.js
```

Expected output:
```
✅ Email sent successfully!
📧 Message ID: 01020...
📬 Check your inbox at: your-email@example.com
```

---

**Quick Start Steps**:
1. Create domain identity in AWS SES Console (eu-north-1)
2. Copy 3 DKIM CNAME records from AWS
3. Add all DNS records to Cloudflare (3 CNAME + 1 SPF + 1 DMARC)
4. Wait 5-30 minutes for propagation
5. Check verification status in AWS SES Console
6. Request production access
7. Test email sending

**Total Time**: 30-60 minutes (including DNS propagation)
