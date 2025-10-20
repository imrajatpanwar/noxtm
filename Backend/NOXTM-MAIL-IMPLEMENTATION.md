# Noxtm Mail MVP - Implementation Guide

## Overview

Complete email management system with account management, domain configuration, SMTP/IMAP support, and monitoring.

## Database Models Created ✅

All models are in `Backend/models/`:

1. **EmailAccount.js** - Email account management
   - Email address, password (bcrypt hashed)
   - Display name, enabled/disabled status
   - Quota and storage tracking
   - IMAP/SMTP/POP3 enable/disable
   - Aliases and forwarding configuration
   - Spam filtering settings
   - Statistics (sent, received, spam blocked)

2. **EmailDomain.js** - Domain configuration
   - Domain verification status
   - DNS records (MX, SPF, DKIM, DMARC)
   - DKIM key generation
   - SMTP/IMAP/POP3 server settings
   - Account limits and quotas
   - Webmail configuration
   - Domain-wide spam settings

3. **EmailLog.js** - Email sending/receiving logs
   - Message ID and direction (sent/received)
   - From/To/CC/BCC addresses
   - Subject, size, attachments
   - Status (queued, sent, delivered, bounced, failed, spam)
   - Spam score and detection
   - SMTP response and delivery info
   - Auto-delete after 90 days (TTL index)

4. **EmailAuditLog.js** - Audit trail
   - Action tracking (created, updated, deleted, etc.)
   - Resource type and ID
   - Performer information
   - Before/After values
   - IP address and user agent
   - Auto-delete after 1 year (TTL index)

5. **EmailTemplate.js** - Transactional email templates
   - Name, slug, type, category
   - Subject and body (HTML + text)
   - Variable placeholders
   - Template rendering with variables
   - Send statistics

## API Routes Created ✅

### 1. Email Accounts API (`routes/email-accounts.js`)

```
GET    /api/email-accounts              - List accounts (pagination, search, filters)
GET    /api/email-accounts/:id          - Get single account
POST   /api/email-accounts              - Create account
PUT    /api/email-accounts/:id          - Update account
DELETE /api/email-accounts/:id          - Delete account
POST   /api/email-accounts/:id/reset-password - Reset password
GET    /api/email-accounts/:id/credentials    - Get SMTP/IMAP credentials
GET    /api/email-accounts/:id/logs     - Get account email logs
```

### 2. Email Domains API (`routes/email-domains.js`)

```
GET    /api/email-domains                    - List domains
GET    /api/email-domains/:id                - Get single domain
POST   /api/email-domains                    - Add new domain
PUT    /api/email-domains/:id                - Update domain settings
DELETE /api/email-domains/:id                - Delete domain
GET    /api/email-domains/:id/dns-instructions - Get DNS setup guide
POST   /api/email-domains/:id/verify-dns     - Verify DNS configuration
```

### 3. Existing Mail Server API (`routes/noxtm-mail.js`)

Already exists with:
- Mail server status
- Email logs
- Queue management
- Test email sending
- Statistics
- DNS checks

## Features Implemented

### ✅ Core Features (Completed)

1. **Email Account Management**
   - Create accounts with email + password
   - Edit account (display name, quota, enabled/disabled)
   - Reset password
   - Delete account
   - View SMTP/IMAP/POP3 credentials

2. **Domain Management**
   - Add/remove domains
   - DNS verification
   - DKIM/SPF/DMARC generation
   - DNS setup instructions
   - Domain settings

3. **Audit Trail**
   - Track all account/domain changes
   - Record who/when/what changed
   - IP address and user agent logging

4. **Email Logging**
   - Track sent/received emails
   - Status monitoring
   - Spam detection tracking
   - Delivery status

5. **Alias & Forwarding**
   - Multiple aliases per account
   - Forward to multiple addresses
   - Keep copy option

6. **Quota Management**
   - Per-account storage quotas
   - Domain-wide quotas
   - Storage usage tracking
   - Quota exceeded detection

7. **Templates System**
   - Transactional email templates
   - Variable placeholders
   - Template rendering
   - Send tracking

### 🔨 Next Steps to Complete

#### 1. Email Templates Routes (routes/email-templates.js)

```javascript
GET    /api/email-templates              - List templates
GET    /api/email-templates/:slug        - Get template by slug
POST   /api/email-templates              - Create template
PUT    /api/email-templates/:id          - Update template
DELETE /api/email-templates/:id          - Delete template
POST   /api/email-templates/:id/send     - Send email using template
POST   /api/email-templates/:id/preview  - Preview template with test data
```

#### 2. Email Logs & Statistics Routes (routes/email-logs.js)

```javascript
GET    /api/email-logs                   - List all email logs
GET    /api/email-logs/:id               - Get single log
GET    /api/email-logs/stats             - Email statistics
GET    /api/email-logs/spam              - Spam quarantine
POST   /api/email-logs/:id/mark-spam     - Mark as spam
POST   /api/email-logs/:id/not-spam      - Mark as not spam
```

#### 3. Audit Logs Routes (routes/audit-logs.js)

```javascript
GET    /api/audit-logs                   - List audit logs
GET    /api/audit-logs/account/:id       - Logs for specific account
GET    /api/audit-logs/domain/:id        - Logs for specific domain
GET    /api/audit-logs/user/:id          - Logs by user
```

#### 4. Frontend UI Components

Create in `Frontend/src/components/`:

- **NoxtmMail.js** - Main dashboard
- **EmailAccounts.js** - Account management list
- **EmailAccountForm.js** - Create/edit account
- **EmailDomains.js** - Domain list
- **EmailDomainForm.js** - Add/edit domain
- **DNSSetup.js** - DNS configuration wizard
- **EmailLogs.js** - Email log viewer
- **EmailTemplates.js** - Template manager
- **SpamQuarantine.js** - Spam management
- **AuditLogs.js** - Audit trail viewer
- **CredentialsView.js** - SMTP/IMAP credentials display

#### 5. Integration with server.js

Add to `Backend/server.js`:

```javascript
const emailAccountsRoutes = require('./routes/email-accounts');
const emailDomainsRoutes = require('./routes/email-domains');
const emailTemplatesRoutes = require('./routes/email-templates');
const emailLogsRoutes = require('./routes/email-logs');
const auditLogsRoutes = require('./routes/audit-logs');

// Email Management Routes
app.use('/api/email-accounts', emailAccountsRoutes);
app.use('/api/email-domains', emailDomainsRoutes);
app.use('/api/email-templates', emailTemplatesRoutes);
app.use('/api/email-logs', emailLogsRoutes);
app.use('/api/audit-logs', auditLogsRoutes);
```

#### 6. Spam Filtering Integration

Integrate with SpamAssassin or implement basic spam scoring:

```javascript
const { spamCheck } = require('./utils/spam-checker');

// In email receiving logic:
const spamScore = await spamCheck(emailContent);
if (spamScore > account.spamThreshold) {
  // Quarantine email
  await EmailLog.create({
    ...emailData,
    isSpam: true,
    spamScore,
    status: 'quarantined'
  });
}
```

#### 7. Webmail Client Options

**Option A: Integrate Roundcube**
- Install Roundcube on mail server
- Provide webmail URL in domain settings
- SSO integration

**Option B: Simple Custom Client**
- Create React-based webmail
- Use IMAP library (imap-simple)
- Basic inbox, compose, folders

**Option C: Just Provide Credentials**
- Display SMTP/IMAP settings
- Users use Outlook/Thunderbird/Mail app

#### 8. SMTP Relay Integration

Create email sending service:

```javascript
// utils/email-sender.js
const sendEmail = async (accountId, emailData) => {
  const account = await EmailAccount.findById(accountId);
  const domain = await EmailDomain.findOne({ domain: account.domain });

  const transporter = nodemailer.createTransport({
    host: domain.smtpHost,
    port: domain.smtpPort,
    secure: domain.smtpSecure,
    auth: {
      user: account.email,
      pass: decryptPassword(account.password)
    }
  });

  const info = await transporter.sendMail(emailData);

  // Log the email
  await EmailLog.create({
    emailAccount: account._id,
    messageId: info.messageId,
    direction: 'sent',
    ...emailData,
    status: 'sent'
  });

  return info;
};
```

## Database Setup

Run migrations to create initial data:

```javascript
// scripts/seed-email-system.js
const seedEmailSystem = async () => {
  // Create default domain
  const domain = await EmailDomain.create({
    domain: 'noxtm.com',
    verified: true,
    verifiedAt: new Date(),
    createdBy: adminUser._id,
    dnsRecords: {
      mx: [{ priority: 10, host: 'mail.noxtm.com', verified: true }],
      spf: { record: 'v=spf1 ip4:185.137.122.61 ~all', verified: true },
      dmarc: { record: 'v=DMARC1; p=quarantine', verified: true }
    }
  });

  // Generate DKIM
  await domain.generateDKIMKeys();
  await domain.save();

  // Create default templates
  await EmailTemplate.create([
    {
      slug: 'welcome',
      name: 'Welcome Email',
      category: 'welcome',
      subject: 'Welcome to {{company_name}}!',
      htmlBody: '<h1>Welcome {{user_name}}!</h1>...',
      createdBy: adminUser._id
    },
    {
      slug: 'password-reset',
      name: 'Password Reset',
      category: 'password_reset',
      subject: 'Reset Your Password',
      htmlBody: '<h1>Password Reset</h1>...',
      createdBy: adminUser._id
    }
  ]);
};
```

## Testing Checklist

- [ ] Create email account
- [ ] Update account settings
- [ ] Reset account password
- [ ] Delete account
- [ ] Add domain
- [ ] Verify DNS records
- [ ] Generate DKIM keys
- [ ] View SMTP/IMAP credentials
- [ ] Send test email
- [ ] View email logs
- [ ] Check spam filtering
- [ ] View audit trail
- [ ] Use email templates
- [ ] Check quota limits
- [ ] Test aliases
- [ ] Test forwarding

## Security Considerations

1. **Password Storage**
   - ✅ Bcrypt hashing (10 rounds)
   - ✅ Never return password in API responses

2. **Authentication**
   - ✅ Require authentication for all endpoints
   - ✅ Admin-only for sensitive operations

3. **Authorization**
   - ✅ Company-based isolation
   - ✅ Audit logging for all changes

4. **Rate Limiting**
   - [ ] Add rate limits for account creation
   - [ ] Add rate limits for password resets
   - [ ] Add rate limits for email sending

5. **SMTP Security**
   - [ ] Enforce TLS/SSL
   - [ ] Implement SPF/DKIM/DMARC
   - [ ] Monitor for abuse

## Performance Optimizations

1. **Database Indexes** ✅
   - Email, domain, enabled status
   - Created date for sorting
   - TTL indexes for auto-deletion

2. **Caching**
   - [ ] Cache DNS verification results
   - [ ] Cache domain settings
   - [ ] Cache templates

3. **Pagination** ✅
   - All list endpoints support pagination
   - Configurable page size

## Documentation Needed

- [ ] API documentation (Swagger/OpenAPI)
- [ ] User guide for email setup
- [ ] DNS configuration tutorial
- [ ] Webmail setup guide
- [ ] SMTP/IMAP client configuration examples

## Deployment

1. **Environment Variables**

```env
# Email Server
EMAIL_HOST=185.137.122.61
EMAIL_PORT=25
EMAIL_FROM=noreply@noxtm.com

# IMAP Server
IMAP_HOST=185.137.122.61
IMAP_PORT=993

# POP3 Server
POP_HOST=185.137.122.61
POP_PORT=995

# Webmail (optional)
WEBMAIL_URL=https://webmail.noxtm.com
```

2. **Mail Server Setup**
   - Install Postfix + Dovecot
   - Configure SASL authentication
   - Setup DKIM with OpenDKIM
   - Configure spam filtering (SpamAssassin)
   - Setup SSL certificates

3. **DNS Configuration**
   - MX record pointing to mail server
   - A record for mail subdomain
   - SPF TXT record
   - DKIM TXT record
   - DMARC TXT record
   - PTR record (reverse DNS)

## Status Summary

**✅ Completed:**
- Database models (5/5)
- Account management API
- Domain management API
- Audit logging
- DNS verification
- DKIM generation
- Credentials API

**🔨 In Progress:**
- Email templates API
- Email logs API
- Spam filtering
- Frontend UI

**📋 Remaining:**
- Webmail integration
- Rate limiting
- Documentation
- Testing
- Deployment scripts

## Next Actions

1. Create remaining API routes (templates, logs, audit)
2. Integrate routes with server.js
3. Build frontend dashboard UI
4. Implement spam filtering
5. Setup webmail or credentials view
6. Write tests
7. Create documentation
8. Deploy to production

---

**Total Time Estimate:** 2-3 days for full MVP implementation
**Priority:** High - Core business feature
**Dependencies:** MongoDB, Nodemailer, DNS utilities
