# AWS SES Configuration Guide for BYOD Email Platform

## Overview

The BYOD (Bring Your Own Domain) email platform automatically registers user domains with AWS SES for email deliverability. This guide explains how to set up AWS SES credentials and monitor domain registrations.

---

## Prerequisites

- AWS Account with SES access
- IAM user with SES permissions
- Access to server environment variables

---

## Step 1: Create AWS IAM User for SES

### 1.1 Login to AWS Console
- Navigate to: https://console.aws.amazon.com/iam/

### 1.2 Create IAM User
```bash
User name: noxtm-mail-ses
Access type: Programmatic access (API)
```

### 1.3 Attach SES Permissions
Create a custom policy or use these managed policies:
- `AmazonSESFullAccess` (for full control)
- Or create custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:CreateEmailIdentity",
        "ses:GetEmailIdentity",
        "ses:DeleteEmailIdentity",
        "ses:PutEmailIdentityDkimAttributes",
        "ses:GetAccount",
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

### 1.4 Save Credentials
After creating the user, save:
- Access Key ID: `AKIA...`
- Secret Access Key: `wJalr...`

⚠️ **IMPORTANT**: Save these credentials securely. You cannot retrieve the secret key later.

---

## Step 2: Configure Server Environment Variables

### 2.1 SSH to Production Server
```bash
ssh root@185.137.122.61
```

### 2.2 Edit Environment File
```bash
cd /root/noxtm/Backend
nano .env
```

### 2.3 Add/Update AWS SES Configuration
```bash
# AWS SES Configuration
AWS_SDK_REGION=eu-north-1
AWS_SDK_ACCESS_KEY_ID=AKIA...your-key-here...
AWS_SDK_SECRET_ACCESS_KEY=wJalr...your-secret-here...

# AWS SES Features
AWS_SES_AUTO_REGISTER=true
AWS_SES_ENABLE_SENDING=true
```

### 2.4 Save and Restart Backend
```bash
# Save the file (Ctrl+O, Enter, Ctrl+X in nano)
pm2 restart noxtm-backend
pm2 save
```

---

## Step 3: Move AWS SES Out of Sandbox Mode

By default, AWS SES is in **sandbox mode**, which limits:
- You can only send to verified email addresses
- Daily sending quota: 200 emails
- Sending rate: 1 email/second

### 3.1 Request Production Access
1. Go to AWS SES Console: https://console.aws.amazon.com/ses/
2. Select your region (eu-north-1)
3. Click **"Account dashboard"** → **"Request production access"**
4. Fill out the form:
   - **Mail Type**: Transactional
   - **Website URL**: https://mail.noxtm.com
   - **Use Case Description**:
     ```
     Multi-tenant email platform where businesses add their own domains
     to send professional emails. Users verify domain ownership via DNS
     and send transactional emails (password resets, notifications) and
     marketing campaigns to their customers.
     ```
   - **Compliance**: Confirm you have opt-out mechanism
   - **Bounces/Complaints**: Describe your bounce handling

5. Submit and wait for approval (usually 24-48 hours)

---

## Step 4: Verify AWS SES Configuration

### 4.1 Check Backend Logs
```bash
pm2 logs noxtm-backend --lines 50 | grep "AWS SES"
```

Expected output:
```
[AWS SES] Registering domain: example.com
[AWS SES] Domain registered successfully: example.com
[AWS SES] DKIM Tokens: [...]
```

### 4.2 Test Domain Registration (Manual)
```bash
curl -X POST https://noxtm.com/api/email-domains \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "testdomain.com",
    "maxAccounts": 50
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Domain added and registered with AWS SES...",
  "awsSes": {
    "registered": true,
    "dkimTokens": ["token1._domainkey.testdomain.com", ...]
  }
}
```

### 4.3 Verify in AWS Console
1. Go to: https://console.aws.amazon.com/ses/
2. Click **"Identities"** in left sidebar
3. You should see registered domains
4. Check DKIM status: Should be **"Pending"** → **"Success"** after DNS is configured

---

## Step 5: Monitor Domain Registrations

### 5.1 View All Registered Domains
AWS Console → SES → Identities

### 5.2 Check DKIM Verification Status
For each domain:
- Status: Pending/Success/Failed
- DKIM Tokens: 3 CNAME records to add to DNS
- Verification timestamp

### 5.3 Backend Tracking
Domains are also tracked in MongoDB:
```javascript
{
  domain: "example.com",
  awsSes: {
    registered: true,
    verificationStatus: "pending",
    dkimTokens: [...],
    verifiedForSending: false,
    registeredAt: "2025-12-13T...",
    lastVerificationCheck: "2025-12-13T..."
  }
}
```

---

## Troubleshooting

### Error: "Resolved credential object is not valid"
**Cause**: AWS credentials not configured or invalid
**Solution**:
1. Check `.env` file has correct `AWS_SDK_ACCESS_KEY_ID` and `AWS_SDK_SECRET_ACCESS_KEY`
2. Verify IAM user has SES permissions
3. Restart backend: `pm2 restart noxtm-backend`

### Error: "AccessDeniedException"
**Cause**: IAM user lacks SES permissions
**Solution**: Add `AmazonSESFullAccess` policy to IAM user

### Error: "InvalidParameterValue: Domain already exists"
**Cause**: Domain already registered with AWS SES
**Solution**: This is handled automatically - backend fetches existing identity

### Domain stuck in "Pending" verification
**Cause**: DNS CNAME records not added or not propagated
**Solution**:
1. Verify user added all 3 DKIM CNAME records
2. Check DNS propagation: `dig CNAME _domainkey.example.com`
3. Wait up to 72 hours for AWS verification

### No DKIM tokens returned
**Cause**: AWS SES registration failed
**Solution**: Check backend logs for error details

---

## Best Practices

### 1. Sending Limits
Monitor your sending quota:
```bash
curl https://noxtm.com/api/aws-ses/quota \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Bounce and Complaint Handling
Set up SNS topics for bounces/complaints:
- AWS SES → Configuration Sets → Create configuration set
- Add SNS topic for bounce/complaint notifications

### 3. DMARC Monitoring
Monitor DMARC reports sent to `dmarc@noxtm.com`:
```bash
DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc@noxtm.com
```

### 4. Regular Monitoring
- Check AWS CloudWatch for SES metrics
- Monitor bounce rate (keep below 5%)
- Monitor complaint rate (keep below 0.1%)

---

## AWS SES Pricing (as of 2025)

- First 62,000 emails/month: **FREE** (when sent from EC2)
- After that: $0.10 per 1,000 emails
- Data transfer: Standard EC2 rates

---

## Support

If you encounter issues:
1. Check backend logs: `pm2 logs noxtm-backend`
2. Verify AWS credentials in `.env`
3. Check AWS SES console for domain status
4. Review this guide's troubleshooting section

---

## Quick Reference

### Environment Variables
```bash
AWS_SDK_REGION=eu-north-1
AWS_SDK_ACCESS_KEY_ID=AKIA...
AWS_SDK_SECRET_ACCESS_KEY=wJalr...
AWS_SES_AUTO_REGISTER=true
AWS_SES_ENABLE_SENDING=true
```

### Important AWS Links
- SES Console: https://console.aws.amazon.com/ses/
- IAM Console: https://console.aws.amazon.com/iam/
- Production Access: https://console.aws.amazon.com/ses/ → Request production access

### Backend Logs to Monitor
```bash
pm2 logs noxtm-backend --lines 100 | grep -E "AWS SES|EMAIL_DOMAIN"
```

---

**Last Updated**: December 13, 2025
**Maintainer**: BYOD Email Platform Team
