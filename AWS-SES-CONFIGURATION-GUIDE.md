# AWS SES Configuration for mail.noxtm.com

## Overview
Configure Amazon SES (Simple Email Service) to send emails from mail.noxtm.com with proper authentication and deliverability.

**Purpose**: Enable mail.noxtm.com to send transactional emails with high deliverability rates.

---

## Prerequisites

✅ **AWS Account** - Access to AWS Console
✅ **DNS Access** - Ability to add DNS records to noxtm.com
✅ **Domain Ownership** - mail.noxtm.com must be accessible
✅ **AWS SES Already Configured** - Region: eu-north-1

**Current AWS SES Credentials** (from Backend/.env):
```
AWS_SDK_REGION=eu-north-1
AWS_SDK_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SDK_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
```

---

## Step 1: Verify mail.noxtm.com Domain in AWS SES

### 1.1 Access AWS SES Console

1. Login to AWS Console: https://console.aws.amazon.com
2. Navigate to **SES** (Simple Email Service)
3. **IMPORTANT**: Select region **eu-north-1** (Stockholm) - match your credentials!
4. Click **Verified identities** in left sidebar

### 1.2 Create New Domain Identity

1. Click **Create identity** button
2. Select **Identity type**: **Domain**
3. Enter **Domain**: `mail.noxtm.com`
4. **Advanced DKIM settings**:
   - Select **Easy DKIM**
   - Signing key length: **2048-bit** (recommended)
   - DKIM signing key: **Enabled**
5. **Custom MAIL FROM domain** (optional):
   - Keep default or set: `bounce.mail.noxtm.com`
6. **Tags** (optional):
   - Key: `Environment`, Value: `Production`
   - Key: `Application`, Value: `MailApp`
7. Click **Create identity**

---

## Step 2: Add DNS Records for Domain Verification

After creating the domain identity, AWS will provide DNS records to add.

### 2.1 CNAME Records for DKIM (3 records)

AWS SES will generate 3 CNAME records like this:

**Example** (your values will be different):
```
Name: abc123._domainkey.mail.noxtm.com
Value: abc123.dkim.amazonses.com

Name: def456._domainkey.mail.noxtm.com
Value: def456.dkim.amazonses.com

Name: ghi789._domainkey.mail.noxtm.com
Value: ghi789.dkim.amazonses.com
```

### 2.2 Add Records to Cloudflare DNS

For each CNAME record:

1. Go to Cloudflare → **noxtm.com** → **DNS**
2. Click **Add record**
3. Configure:
   - **Type**: `CNAME`
   - **Name**: `abc123._domainkey.mail` (copy from AWS, remove `.noxtm.com`)
   - **Target**: `abc123.dkim.amazonses.com` (copy from AWS)
   - **Proxy status**: **DNS only** (gray cloud)
   - **TTL**: Auto
4. Click **Save**
5. **Repeat** for all 3 CNAME records

### 2.3 MX Record (Optional - for receiving emails)

If you want to receive emails via SES:

**AWS provides**:
```
Type: MX
Name: mail.noxtm.com
Value: 10 inbound-smtp.eu-north-1.amazonaws.com
```

**Add to Cloudflare**:
1. Type: `MX`
2. Name: `mail`
3. Mail server: `inbound-smtp.eu-north-1.amazonaws.com`
4. Priority: `10`
5. **Important**: May conflict with existing Postfix MX record!

---

## Step 3: Wait for Verification

### 3.1 DNS Propagation Time
- **Cloudflare**: Usually 5-30 minutes
- **Global**: Can take up to 72 hours

### 3.2 Check Verification Status

1. AWS SES Console → **Verified identities**
2. Click on **mail.noxtm.com**
3. **DomainKeys Identified Mail (DKIM)** section:
   - Status should show: **Successful** (green checkmark)
4. **Verification status**:
   - Should show: **Verified**

**Refresh** the page every few minutes to check status.

---

## Step 4: Add SPF Record

SPF (Sender Policy Framework) prevents email spoofing.

### 4.1 SPF Record Configuration

**Type**: TXT
**Name**: `mail` (or `mail.noxtm.com`)
**Value**:
```
v=spf1 include:amazonses.com include:_spf.mx.cloudflare.net ~all
```

Or if you're only using SES:
```
v=spf1 include:amazonses.com ~all
```

### 4.2 Add to Cloudflare

1. Go to Cloudflare → **DNS**
2. Click **Add record**
3. Configure:
   - **Type**: `TXT`
   - **Name**: `mail`
   - **Content**: `v=spf1 include:amazonses.com ~all`
   - **TTL**: Auto
4. Click **Save**

**Note**: If you already have an SPF record for mail.noxtm.com, **edit** it to add `include:amazonses.com` instead of creating a new one.

---

## Step 5: Add DMARC Record

DMARC (Domain-based Message Authentication) provides email authentication policy.

### 5.1 DMARC Record Configuration

**Type**: TXT
**Name**: `_dmarc.mail` (or `_dmarc.mail.noxtm.com`)
**Value**:
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@noxtm.com; ruf=mailto:dmarc@noxtm.com; fo=1
```

**Breakdown**:
- `v=DMARC1` - Protocol version
- `p=quarantine` - Policy (quarantine suspicious emails)
- `rua=mailto:dmarc@noxtm.com` - Aggregate reports email
- `ruf=mailto:dmarc@noxtm.com` - Forensic reports email
- `fo=1` - Failure reporting option

### 5.2 Add to Cloudflare

1. Click **Add record**
2. Configure:
   - **Type**: `TXT`
   - **Name**: `_dmarc.mail`
   - **Content**: (paste DMARC value above)
   - **TTL**: Auto
3. Click **Save**

---

## Step 6: Request Production Access (Remove Sandbox)

By default, AWS SES is in **Sandbox mode** - you can only send to verified email addresses.

### 6.1 Check Current Status

1. AWS SES Console
2. Look at top banner - if it says "Your account is in the Amazon SES sandbox", you're in sandbox mode

### 6.2 Request Production Access

1. AWS SES Console → **Account dashboard** (left sidebar)
2. Scroll to **Sending statistics**
3. Click **Request production access** button
4. Fill out the form:
   - **Mail type**: Transactional
   - **Website URL**: https://mail.noxtm.com
   - **Use case description**:
     ```
     We operate a B2B email management platform at mail.noxtm.com.
     We need to send transactional emails including:
     - Email notifications for team collaboration
     - SLA alerts and monitoring notifications
     - Assignment notifications
     - System alerts

     We have proper opt-in mechanisms and handle bounces/complaints
     through AWS SES feedback notifications.

     Expected volume: 1,000-5,000 emails per month
     ```
   - **Compliance**: Confirm you comply with policies
5. Click **Submit request**

**Approval time**: Usually 24-48 hours

---

## Step 7: Configure Bounce & Complaint Handling

### 7.1 Set Up SNS Topics (Recommended)

1. Go to **SNS** (Simple Notification Service)
2. Create topics:
   - **Bounces**: `ses-bounces-mail-noxtm`
   - **Complaints**: `ses-complaints-mail-noxtm`

### 7.2 Configure SES Notifications

1. AWS SES Console → **Verified identities**
2. Click **mail.noxtm.com**
3. **Notifications** tab
4. Click **Edit** in **Feedback notifications**
5. Configure:
   - **Bounce feedback**: Select SNS topic
   - **Complaint feedback**: Select SNS topic
6. Click **Save changes**

---

## Step 8: Test Email Sending

### 8.1 Test from Backend

SSH to server and test:

```bash
ssh root@185.137.122.61
cd /exe/noxtm/Backend
node -e "
const { sendEmailViaSES } = require('./utils/awsSesHelper');
sendEmailViaSES({
  from: 'noreply@mail.noxtm.com',
  to: 'your-email@example.com',
  subject: 'Test from mail.noxtm.com',
  html: '<h1>Success!</h1><p>AWS SES is working.</p>',
  text: 'AWS SES is working.'
}).then(() => console.log('✓ Email sent'))
  .catch(err => console.error('✗ Failed:', err));
"
```

### 8.2 Check for Errors

**Common errors**:

1. **"Email address is not verified"**
   - You're still in sandbox mode
   - Verify the recipient email in SES, or request production access

2. **"Could not send email"**
   - Check AWS credentials in .env
   - Verify region is correct (eu-north-1)

3. **"Domain not verified"**
   - DNS records not propagated yet
   - Wait longer or check DNS records

---

## DNS Records Summary

After complete configuration, you should have these DNS records:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | mail | 185.137.122.61 | Domain resolution |
| CNAME | abc123._domainkey.mail | abc123.dkim.amazonses.com | DKIM 1/3 |
| CNAME | def456._domainkey.mail | def456.dkim.amazonses.com | DKIM 2/3 |
| CNAME | ghi789._domainkey.mail | ghi789.dkim.amazonses.com | DKIM 3/3 |
| TXT | mail | v=spf1 include:amazonses.com ~all | SPF |
| TXT | _dmarc.mail | v=DMARC1; p=quarantine; rua=... | DMARC |
| MX | mail | 10 inbound-smtp.eu-north-1.amazonaws.com | Receiving (optional) |

---

## Verification Checklist

- [ ] Domain verified in AWS SES
- [ ] 3 DKIM CNAME records added to DNS
- [ ] SPF TXT record added
- [ ] DMARC TXT record added
- [ ] DNS records propagated (check with `nslookup`)
- [ ] DKIM status shows "Successful" in AWS
- [ ] Requested production access (if needed)
- [ ] Test email sent successfully
- [ ] Email received in inbox (not spam)

---

## Monitoring & Maintenance

### Check Sending Statistics

1. AWS SES Console → **Account dashboard**
2. View:
   - **Sent**: Total emails sent
   - **Bounces**: Failed deliveries
   - **Complaints**: Spam reports

### Monitor Reputation

1. AWS SES Console → **Reputation metrics**
2. Keep:
   - **Bounce rate** < 5%
   - **Complaint rate** < 0.1%

### Handle Bounces

If bounce rate is high:
1. Review bounce notifications
2. Remove invalid email addresses from lists
3. Implement proper email validation

---

## Troubleshooting

### Issue: DKIM Not Verifying

**Solution**:
1. Check CNAME records in Cloudflare
2. Ensure **Proxy status** is **DNS only** (not proxied)
3. Wait 30 minutes for DNS propagation
4. Use `dig` to verify:
   ```bash
   dig abc123._domainkey.mail.noxtm.com CNAME
   ```

### Issue: Emails Going to Spam

**Solutions**:
1. Verify DKIM, SPF, DMARC are configured
2. Check sending reputation in AWS SES
3. Add proper email headers (Reply-To, List-Unsubscribe)
4. Ensure content isn't spammy
5. Warm up the domain (start with small volumes)

### Issue: Can't Send to Gmail/Yahoo

**Cause**: Still in sandbox mode

**Solution**: Request production access (Step 6)

---

## Cost Estimation

**AWS SES Pricing** (eu-north-1):
- First 62,000 emails/month: **$0** (Free Tier)
- After free tier: **$0.10 per 1,000 emails**

**Example**:
- 5,000 emails/month = **FREE**
- 100,000 emails/month = **$3.80/month**

**Very cost-effective** compared to alternatives!

---

## Security Best Practices

✅ **Use IAM Roles** - Don't embed AWS keys in code
✅ **Rotate Credentials** - Change AWS keys every 90 days
✅ **Monitor Usage** - Set up CloudWatch alarms
✅ **Implement Rate Limiting** - Prevent abuse
✅ **Handle Bounces** - Remove bad emails from lists
✅ **Use HTTPS** - Encrypt email content in transit

---

## Next Steps After Configuration

1. **Test Thoroughly** - Send test emails to Gmail, Yahoo, Outlook
2. **Monitor Deliverability** - Check spam rates
3. **Implement Webhooks** - Handle bounces/complaints automatically
4. **Set Up Alerts** - CloudWatch alarms for high bounce rates
5. **Document** - Keep DNS records documented

---

## Support & Resources

**AWS SES Documentation**:
- https://docs.aws.amazon.com/ses/

**DNS Tools**:
- DNS Checker: https://dnschecker.org
- MX Toolbox: https://mxtoolbox.com
- DKIM Validator: https://dkimvalidator.com

**Email Testing**:
- Mail Tester: https://www.mail-tester.com
- Send test email and get spam score

---

**Status**: Ready for implementation
**Estimated Time**: 30-60 minutes
**Difficulty**: Medium
**Cost**: Free (within limits)
