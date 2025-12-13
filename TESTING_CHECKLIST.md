# BYOD Email Platform - Testing Checklist

## Overview

This document provides a comprehensive testing checklist for the BYOD (Bring Your Own Domain) email platform transformation.

---

## Pre-Testing Setup

### Server Status
- [ ] Backend running (PM2 process online)
- [ ] Frontend running (PM2 process online)
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] No critical errors in logs

### AWS SES Configuration
- [ ] `AWS_SDK_ACCESS_KEY_ID` configured in .env
- [ ] `AWS_SDK_SECRET_ACCESS_KEY` configured in .env
- [ ] `AWS_SDK_REGION` set to eu-north-1
- [ ] IAM user has SES permissions
- [ ] AWS SES moved out of sandbox mode (for production testing)

### Test Accounts
- [ ] Regular user account (non-admin)
- [ ] Admin user account
- [ ] Test domain available (for registration)

---

## 1. Backend API Testing

### 1.1 Email Domains Endpoint

**Test: GET /api/email-domains (Unauthenticated)**
```bash
curl -s https://noxtm.com/api/email-domains
```
- [ ] Returns: `{"message":"Access token required"}`
- [ ] Status code: 401

**Test: POST /api/email-domains (Create Domain)**
```bash
curl -X POST https://noxtm.com/api/email-domains \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"domain": "testcompany.com", "maxAccounts": 50}'
```
Expected response:
- [ ] `success: true`
- [ ] `awsSes.registered: true` (if AWS configured)
- [ ] `awsSes.dkimTokens` array with 3 tokens
- [ ] `message` includes "AWS SES"

**Test: GET /api/email-domains/:id/dns-instructions**
```bash
curl https://noxtm.com/api/email-domains/DOMAIN_ID/dns-instructions \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected response:
- [ ] MX record included
- [ ] SPF record included
- [ ] DKIM record included
- [ ] DMARC record included
- [ ] Verification TXT record included
- [ ] AWS SES DKIM CNAME records if registered

**Test: POST /api/email-domains/:id/verify-dns**
```bash
curl -X POST https://noxtm.com/api/email-domains/DOMAIN_ID/verify-dns \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected response:
- [ ] `results` object with verification status
- [ ] `results.awsSesVerified` field present
- [ ] `awsSes` object with verification details
- [ ] `nextSteps` array with guidance

### 1.2 Email Accounts Endpoint

**Test: POST /api/email-accounts (Reserved Domain - Non-Admin)**
```bash
curl -X POST https://noxtm.com/api/email-accounts \
  -H "Authorization: Bearer NON_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@noxtm.com",
    "password": "SecurePass123",
    "domain": "noxtm.com"
  }'
```
Expected response:
- [ ] Status: 403 Forbidden
- [ ] `code: "DOMAIN_RESERVED"`
- [ ] Helpful error message
- [ ] `redirectTo: "/domains/setup"`

**Test: POST /api/email-accounts (Reserved Domain - Admin)**
```bash
curl -X POST https://noxtm.com/api/email-accounts \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "system@noxtm.com",
    "password": "SecurePass123",
    "domain": "noxtm.com"
  }'
```
Expected response:
- [ ] Status: 201 Created
- [ ] Account created successfully
- [ ] Admin bypasses domain restriction

**Test: POST /api/email-accounts (Unverified Domain)**
```bash
curl -X POST https://noxtm.com/api/email-accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@testdomain.com",
    "password": "SecurePass123",
    "domain": "testdomain.com"
  }'
```
Expected response:
- [ ] Status: 403 Forbidden
- [ ] `code: "DOMAIN_NOT_VERIFIED"`
- [ ] Message indicates verification needed

---

## 2. Frontend Testing

### 2.1 Domain Setup Wizard (Non-Admin User)

**Test: Initial Load**
- [ ] Navigate to https://mail.noxtm.com
- [ ] Login with non-admin account
- [ ] Wizard appears automatically
- [ ] No access to inbox until domain added

**Test: Step 1 - Domain Entry**
- [ ] Progress bar shows Step 1/4 active
- [ ] Input field accepts domain name
- [ ] Validation: rejects invalid formats
- [ ] Validation: rejects reserved domains (noxtm.com)
- [ ] Error messages clear and helpful
- [ ] "Continue" button works

**Test: Step 2 - DNS Records Display**
- [ ] All DNS records displayed:
  - [ ] MX record
  - [ ] SPF record
  - [ ] 3 DKIM CNAME records (if AWS SES configured)
  - [ ] Verification TXT record
  - [ ] DMARC record
- [ ] Copy buttons (📋) work for each record
- [ ] Records formatted correctly
- [ ] AWS SES status badge shows (if registered)
- [ ] Setup instructions clear
- [ ] "Back" button works
- [ ] "Verify DNS Configuration" button present

**Test: Step 3 - DNS Verification**
- [ ] Click "Verify DNS Configuration"
- [ ] Loading state shown during verification
- [ ] Error handling if verification fails
- [ ] Partial verification shows "Waiting for AWS SES"
- [ ] Status indicators show:
  - [ ] Verification Token (✓/✗)
  - [ ] MX Records (✓/✗)
  - [ ] SPF Records (✓/✗)
  - [ ] AWS SES DKIM (✓/⏳)

**Test: Step 3.5 - Partial Verification**
- [ ] Shows when DNS verified but AWS SES pending
- [ ] Clear message about waiting for AWS
- [ ] "Check Verification Status" button works
- [ ] "Back to DNS Records" button works
- [ ] No timeout or infinite loading

**Test: Step 4 - Success Screen**
- [ ] Shows when full verification complete
- [ ] Success icon and message
- [ ] "What's Next" section clear
- [ ] "Get Started" button works
- [ ] Redirects to domain management

### 2.2 Admin Bypass

**Test: Admin User Flow**
- [ ] Login with Admin account
- [ ] Wizard does NOT appear
- [ ] Direct access to inbox
- [ ] Can create @noxtm.com emails
- [ ] Can access all sections

### 2.3 Existing Domain User

**Test: User with Verified Domain**
- [ ] User already has verified domain
- [ ] Wizard does NOT appear
- [ ] Direct access to inbox
- [ ] Normal functionality

---

## 3. AWS SES Integration Testing

### 3.1 Domain Registration

**Test: Auto-Registration**
- [ ] Create domain via wizard
- [ ] Check backend logs for:
  ```
  [EMAIL_DOMAIN] Registering domain with AWS SES: testdomain.com
  [AWS SES] Domain registered successfully
  [AWS SES] DKIM Tokens: [...]
  ```
- [ ] Verify in AWS Console:
  - [ ] Domain appears in SES Identities
  - [ ] Status shows "Pending verification"
  - [ ] DKIM tokens match backend

**Test: Already Registered Domain**
- [ ] Try adding domain already in AWS SES
- [ ] System fetches existing identity
- [ ] No error thrown
- [ ] Existing DKIM tokens used

### 3.2 Verification Tracking

**Test: Verification Status Updates**
- [ ] Add DNS records to test domain
- [ ] Click "Verify DNS" in wizard
- [ ] Backend calls `checkAWSSESVerification()`
- [ ] Database updated with:
  - [ ] `awsSes.verificationStatus`
  - [ ] `awsSes.lastVerificationCheck`
  - [ ] `verificationHistory` entry added

**Test: Full Verification**
- [ ] Wait for AWS SES to verify DKIM
- [ ] Run verification again
- [ ] `awsSes.verifiedForSending` = true
- [ ] `awsSes.verifiedAt` timestamp set
- [ ] `domain.verified` = true
- [ ] Audit log created

---

## 4. Security & Access Control Testing

### 4.1 Reserved Domain Protection

**Test Cases:**
| User Type | Action | Domain | Expected Result |
|-----------|--------|--------|-----------------|
| Non-Admin | Create email | noxtm.com | ❌ 403 Forbidden |
| Non-Admin | Create email | mail.noxtm.com | ❌ 403 Forbidden |
| Admin | Create email | noxtm.com | ✅ 201 Created |
| Non-Admin | Add domain | noxtm.com | ❌ Validation error |

### 4.2 Domain Ownership

**Test: Cross-Company Access**
- [ ] User A adds domain A
- [ ] User B (different company) tries to:
  - [ ] Create email on domain A → ❌ Denied
  - [ ] Verify domain A → ❌ Denied
  - [ ] View domain A details → ❌ Denied

**Test: Company-Level Access**
- [ ] User A (Company 1) adds domain A
- [ ] User B (Company 1, same company) can:
  - [ ] View domain A → ✅ Allowed
  - [ ] Create email on domain A → ✅ Allowed (if verified)
  - [ ] Verify domain A → ✅ Allowed

### 4.3 Middleware Enforcement

**Test: Email Account Creation Middleware**
- [ ] POST /api/email-accounts triggers `requireOwnedVerifiedDomain`
- [ ] Middleware checks:
  - [ ] Reserved domain blocking
  - [ ] Domain exists
  - [ ] Domain verified
  - [ ] User owns domain
  - [ ] Account limit not exceeded

---

## 5. Data Model Testing

### 5.1 EmailDomain Model

**Test: awsSes Subdocument**
```javascript
{
  registered: true,
  verificationStatus: 'pending',
  dkimTokens: ['token1', 'token2', 'token3'],
  identityArn: 'arn:aws:ses:...',
  verifiedForSending: false,
  registeredAt: Date,
  lastVerificationCheck: Date
}
```
- [ ] All fields save correctly
- [ ] Default values work
- [ ] Updates persist

**Test: verificationHistory Array**
```javascript
[{
  attemptedAt: Date,
  status: 'partial',
  dnsRecords: {
    hasVerificationToken: true,
    hasMxRecord: true,
    hasSpf: true,
    awsSesVerified: false
  }
}]
```
- [ ] Entries added on each verification attempt
- [ ] History preserved across attempts
- [ ] Queryable for debugging

**Test: Lifecycle Milestones**
- [ ] `setupCompletedAt` set when fully verified
- [ ] `firstEmailCreatedAt` set when first email created
- [ ] Timestamps accurate

---

## 6. Error Handling Testing

### 6.1 AWS SES Errors

**Test: Invalid AWS Credentials**
- [ ] Configure invalid credentials
- [ ] Try creating domain
- [ ] `awsSes.registered: false`
- [ ] `awsSes.lastError` contains error message
- [ ] User sees graceful error message

**Test: AWS SES Network Error**
- [ ] Simulate network failure
- [ ] Error caught and logged
- [ ] User gets helpful error message
- [ ] System doesn't crash

### 6.2 DNS Verification Errors

**Test: DNS Records Not Found**
- [ ] Try verifying domain without DNS records
- [ ] All checks return false
- [ ] Clear error message
- [ ] "Next Steps" guidance provided

**Test: Partial DNS Configuration**
- [ ] Add only MX record
- [ ] Verify
- [ ] Partial status shown
- [ ] Missing records highlighted

---

## 7. Performance Testing

### 7.1 Load Times

- [ ] Frontend bundle size < 300KB (gzipped)
- [ ] Initial page load < 3 seconds
- [ ] Wizard step transitions smooth
- [ ] DNS verification completes < 5 seconds

### 7.2 Concurrent Users

- [ ] 10 users add domains simultaneously
- [ ] No race conditions
- [ ] All AWS SES calls succeed
- [ ] Database updates atomic

---

## 8. User Experience Testing

### 8.1 Wizard Usability

- [ ] Clear progress indication
- [ ] Can navigate backwards
- [ ] Copy buttons intuitive
- [ ] Error messages helpful
- [ ] Success states celebratory
- [ ] Mobile responsive

### 8.2 Error Recovery

- [ ] User can retry after failure
- [ ] Previous inputs preserved
- [ ] Clear guidance on fixing errors
- [ ] No dead ends

---

## 9. Deployment Testing

### 9.1 Backend Deployment

- [ ] Git pull successful
- [ ] PM2 restart successful
- [ ] No startup errors in logs
- [ ] All routes accessible
- [ ] Database migrations (if any) applied

### 9.2 Frontend Deployment

- [ ] npm install successful
- [ ] npm run build successful
- [ ] Files deployed to /var/www/mail-noxtm/
- [ ] https://mail.noxtm.com accessible
- [ ] No 404 errors for routes

---

## 10. Regression Testing

### 10.1 Existing Functionality

- [ ] User login/logout works
- [ ] Personal inbox loads
- [ ] Team inbox works
- [ ] Email sending works
- [ ] Email templates work
- [ ] Analytics dashboard works

### 10.2 Admin Functions

- [ ] Can view all domains
- [ ] Can manage user permissions
- [ ] Can create system emails
- [ ] Dashboard statistics accurate

---

## Testing Results Template

```markdown
## Testing Session: [Date]
**Tester**: [Name]
**Environment**: Production / Staging
**AWS SES**: Configured / Not Configured

### Backend API Tests
- Email Domains Endpoint: ✅/❌
- Email Accounts Endpoint: ✅/❌
- Middleware Protection: ✅/❌

### Frontend Tests
- Wizard Step 1: ✅/❌
- Wizard Step 2: ✅/❌
- Wizard Step 3: ✅/❌
- Admin Bypass: ✅/❌

### AWS SES Tests
- Auto-Registration: ✅/❌ / N/A
- Verification Tracking: ✅/❌ / N/A

### Issues Found
1. [Issue description]
   - Severity: Critical / High / Medium / Low
   - Steps to reproduce: ...
   - Expected: ...
   - Actual: ...

### Overall Status
- [ ] All critical tests passed
- [ ] Ready for production
- [ ] Issues need resolution
```

---

**Last Updated**: December 13, 2025
**Version**: 1.0
**Platform**: BYOD Email (mail.noxtm.com)
