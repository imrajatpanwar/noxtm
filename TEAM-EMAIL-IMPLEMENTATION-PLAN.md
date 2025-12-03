# Team Email Communication System - Complete Implementation Plan

**Date:** 2025-11-26
**Status:** Comprehensive 3-Phase Implementation Plan
**Scope:** Full team email collaboration with domain management

---

## 📋 Executive Summary

Build a complete team email system where:
- **Company Owners** configure custom email domains (@company.com)
- **Owners** create and manage email accounts for team members
- **Team members** access shared inboxes based on their role
- **Full collaboration** with email assignment, status tracking, and internal notes
- **Company-wide quota** management

---

## ✅ User Requirements (Confirmed)

1. **Domain Configuration:** Owner only (controlled)
2. **Account Creation:** Owner only (centralized)
3. **Access Model:** Role-based sharing (by company role)
4. **Account Types:** Custom domains only (@company.com)
5. **Inbox Organization:** Shared inboxes only (Team tab)
6. **Collaboration:** Full workflow (assignment, status, notes)
7. **Quota Management:** Company-level quota pool
8. **Implementation:** All 3 phases (Core → Collaboration → Advanced)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPANY OWNER                           │
│  • Add/verify custom domain (e.g., mycompany.com)          │
│  • Create email accounts (sales@, support@, hr@)           │
│  • Assign role-based access (Managers, Employees, etc.)    │
│  • Monitor company-wide quota usage                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   TEAM MEMBERS                              │
│  • Access shared inboxes based on role                     │
│  • Send/receive emails from shared accounts                │
│  • Assign emails to teammates                              │
│  • Track email status (New, In Progress, Resolved)         │
│  • Add internal notes for collaboration                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND SERVICES                          │
│  • Domain verification (DNS, DKIM, SPF, DMARC)             │
│  • Mailbox provisioning (Dovecot/Postfix)                  │
│  • IMAP/SMTP access control                                │
│  • Email assignment & status tracking                       │
│  • Company quota monitoring                                │
└─────────────────────────────────────────────────────────────┘
```

---

# 🚀 PHASE 1: CORE FUNCTIONALITY (Must Have)

**Timeline:** 2-3 weeks
**Priority:** Critical
**Dependencies:** None

---

## 1.1 Database Schema Changes

### A. Update `EmailAccount` Model

**File:** `Backend/models/EmailAccount.js`

**Add these fields:**

```javascript
{
  // NEW: Multi-tenancy support
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // NEW: Role-based access control
  roleAccess: [{
    role: {
      type: String,
      enum: ['Owner', 'Manager', 'Employee'],
      required: true
    },
    permissions: {
      canRead: { type: Boolean, default: true },
      canSend: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canManage: { type: Boolean, default: false }
    }
  }],

  // NEW: Department-based access (optional refinement)
  departmentAccess: {
    type: [String],
    enum: [
      'Management Team', 'Digital Team', 'SEO Team',
      'Graphic Design Team', 'Marketing Team', 'Sales Team',
      'Development Team', 'HR Team', 'Finance Team',
      'Support Team', 'Operations Team'
    ],
    default: []
  },

  // NEW: Account purpose/description
  purpose: {
    type: String,
    enum: ['shared', 'departmental', 'support', 'sales', 'general'],
    default: 'shared'
  },

  displayName: String,  // e.g., "Customer Support"
  description: String,   // e.g., "Main support inbox for customer inquiries"

  // Existing fields remain unchanged...
  email: String,
  accountType: String,
  domain: String,
  quota: Object,
  // etc.
}
```

**Add indexes:**
```javascript
EmailAccountSchema.index({ companyId: 1, enabled: 1 });
EmailAccountSchema.index({ companyId: 1, domain: 1 });
EmailAccountSchema.index({ 'roleAccess.role': 1 });
```

**Add methods:**
```javascript
// Check if user has access to this account
EmailAccountSchema.methods.hasAccess = function(user) {
  // Check if user's company matches
  if (!user.companyId || !user.companyId.equals(this.companyId)) {
    return false;
  }

  // Get user's role in company
  const Company = mongoose.model('Company');
  const company = await Company.findById(this.companyId);

  const member = company.members.find(m => m.user.equals(user._id));
  if (!member) return false;

  const userRole = member.roleInCompany;

  // Check role-based access
  const roleAccess = this.roleAccess.find(r => r.role === userRole);
  if (!roleAccess) return false;

  // Check department access if specified
  if (this.departmentAccess.length > 0) {
    if (!this.departmentAccess.includes(member.department)) {
      return false;
    }
  }

  return true;
};

// Get permissions for a user
EmailAccountSchema.methods.getPermissions = async function(user) {
  const Company = mongoose.model('Company');
  const company = await Company.findById(this.companyId);

  const member = company.members.find(m => m.user.equals(user._id));
  if (!member) {
    return { canRead: false, canSend: false, canDelete: false, canManage: false };
  }

  const userRole = member.roleInCompany;
  const roleAccess = this.roleAccess.find(r => r.role === userRole);

  return roleAccess ? roleAccess.permissions : {
    canRead: false,
    canSend: false,
    canDelete: false,
    canManage: false
  };
};
```

---

### B. Update `EmailDomain` Model

**File:** `Backend/models/EmailDomain.js`

**Add these fields:**

```javascript
{
  // NEW: Company-wide quota management
  companyQuota: {
    totalQuotaMB: {
      type: Number,
      default: 10240  // 10GB default for company
    },
    usedQuotaMB: {
      type: Number,
      default: 0
    },
    accountCount: {
      type: Number,
      default: 0
    },
    maxAccounts: {
      type: Number,
      default: 50  // Max 50 accounts per domain
    }
  },

  // NEW: Default permissions for new accounts
  defaultRolePermissions: {
    Owner: {
      canRead: { type: Boolean, default: true },
      canSend: { type: Boolean, default: true },
      canDelete: { type: Boolean, default: true },
      canManage: { type: Boolean, default: true }
    },
    Manager: {
      canRead: { type: Boolean, default: true },
      canSend: { type: Boolean, default: true },
      canDelete: { type: Boolean, default: false },
      canManage: { type: Boolean, default: false }
    },
    Employee: {
      canRead: { type: Boolean, default: true },
      canSend: { type: Boolean, default: false },
      canDelete: { type: Boolean, default: false },
      canManage: { type: Boolean, default: false }
    }
  },

  // Existing fields...
  domain: String,
  verified: Boolean,
  companyId: ObjectId,
  dnsRecords: Object,
  // etc.
}
```

**Add methods:**
```javascript
// Calculate total quota used across all accounts
EmailDomainSchema.methods.calculateQuotaUsage = async function() {
  const EmailAccount = mongoose.model('EmailAccount');
  const accounts = await EmailAccount.find({
    domain: this.domain,
    companyId: this.companyId
  });

  let totalUsed = 0;
  for (const account of accounts) {
    if (account.quota && account.quota.used) {
      totalUsed += account.quota.used;
    }
  }

  this.companyQuota.usedQuotaMB = totalUsed;
  this.companyQuota.accountCount = accounts.length;

  return this.save();
};

// Check if company can create new account
EmailDomainSchema.methods.canCreateAccount = function(quotaMB = 1024) {
  // Check account limit
  if (this.companyQuota.accountCount >= this.companyQuota.maxAccounts) {
    return { allowed: false, reason: 'Account limit reached' };
  }

  // Check quota limit
  const projectedUsage = this.companyQuota.usedQuotaMB + quotaMB;
  if (projectedUsage > this.companyQuota.totalQuotaMB) {
    return {
      allowed: false,
      reason: 'Company quota exceeded',
      available: this.companyQuota.totalQuotaMB - this.companyQuota.usedQuotaMB
    };
  }

  return { allowed: true };
};
```

---

### C. Update `Company` Model

**File:** `Backend/server.js` (around lines 284-374)

**Add these fields to Company schema:**

```javascript
{
  // NEW: Email configuration
  emailSettings: {
    primaryDomain: {
      type: String  // e.g., "mycompany.com"
    },
    defaultSignature: {
      type: String  // HTML signature for outgoing emails
    },
    emailQuota: {
      totalMB: {
        type: Number,
        default: 10240  // 10GB
      },
      usedMB: {
        type: Number,
        default: 0
      }
    }
  },

  // Existing fields remain...
  companyName: String,
  owner: ObjectId,
  members: Array,
  subscription: Object,
  // etc.
}
```

---

## 1.2 Backend API Endpoints

### A. Domain Management Routes (Owner Only)

**File:** `Backend/routes/email-domains.js`

---

#### Endpoint 1: Add Domain

```http
POST /api/email-domains/
Authorization: Bearer <token>
Role Required: Company Owner
```

**Request Body:**
```json
{
  "domain": "mycompany.com",
  "companyQuota": {
    "totalQuotaMB": 20480,
    "maxAccounts": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "domain": {
    "_id": "67...",
    "domain": "mycompany.com",
    "companyId": "67...",
    "verified": false,
    "verificationToken": "abc123xyz",
    "dnsRecords": {
      "mx": [{
        "priority": 10,
        "host": "mail.noxtm.com",
        "verified": false
      }],
      "spf": {
        "record": "v=spf1 mx a ip4:185.137.122.61 ~all",
        "verified": false
      },
      "dkim": {
        "selector": "default",
        "publicKey": "MIIBIjANBg...",
        "record": "v=DKIM1; k=rsa; p=MIIBIjANBg...",
        "verified": false
      },
      "dmarc": {
        "record": "v=DMARC1; p=quarantine; rua=mailto:postmaster@mycompany.com",
        "verified": false
      }
    },
    "companyQuota": {
      "totalQuotaMB": 20480,
      "usedQuotaMB": 0,
      "accountCount": 0,
      "maxAccounts": 100
    }
  },
  "setupInstructions": {
    "steps": [
      "Add MX record: mycompany.com MX 10 mail.noxtm.com",
      "Add A record: mail.mycompany.com A 185.137.122.61",
      "Add TXT record for SPF: mycompany.com TXT v=spf1 mx a ip4:185.137.122.61 ~all",
      "Add TXT record for DKIM: default._domainkey.mycompany.com TXT v=DKIM1; k=rsa; p=...",
      "Add TXT record for DMARC: _dmarc.mycompany.com TXT v=DMARC1; p=quarantine",
      "Add TXT record for verification: mycompany.com TXT noxtm-verify=abc123xyz"
    ]
  }
}
```

**Implementation Code:**
```javascript
const crypto = require('crypto');

router.post('/', authenticateToken, requireCompanyOwner, async (req, res) => {
  try {
    const { domain, companyQuota } = req.body;
    const companyId = req.user.companyId;

    // Validate domain format
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Check if domain already exists
    const existing = await EmailDomain.findOne({ domain });
    if (existing) {
      return res.status(409).json({ error: 'Domain already registered' });
    }

    // Create domain
    const emailDomain = new EmailDomain({
      domain,
      companyId,
      createdBy: req.user._id,
      verified: false,
      verificationToken: crypto.randomBytes(32).toString('hex'),
      companyQuota: companyQuota || {
        totalQuotaMB: 10240,
        maxAccounts: 50
      }
    });

    // Generate DKIM keys
    await emailDomain.generateDKIMKeys();

    // Save
    await emailDomain.save();

    // Update company primary domain
    await Company.findByIdAndUpdate(companyId, {
      'emailSettings.primaryDomain': domain
    });

    // Create audit log
    await EmailAuditLog.create({
      companyId,
      userId: req.user._id,
      action: 'domain_added',
      resourceType: 'EmailDomain',
      resourceId: emailDomain._id,
      details: { domain }
    });

    // Generate setup instructions
    const setupInstructions = {
      steps: [
        `Add MX record: ${domain} MX 10 mail.noxtm.com`,
        `Add A record: mail.${domain} A 185.137.122.61`,
        `Add TXT record for SPF: ${domain} TXT "${emailDomain.dnsRecords.spf.record}"`,
        `Add TXT record for DKIM: ${emailDomain.dnsRecords.dkim.selector}._domainkey.${domain} TXT "${emailDomain.dnsRecords.dkim.record}"`,
        `Add TXT record for DMARC: _dmarc.${domain} TXT "${emailDomain.dnsRecords.dmarc.record}"`,
        `Add TXT record for verification: ${domain} TXT "noxtm-verify=${emailDomain.verificationToken}"`
      ]
    };

    res.json({
      success: true,
      domain: emailDomain,
      setupInstructions
    });

  } catch (error) {
    console.error('Error adding domain:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

#### Endpoint 2: Verify Domain DNS

```http
POST /api/email-domains/:id/verify-dns
Authorization: Bearer <token>
Role Required: Company Owner
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "dnsRecords": {
    "mx": { "verified": true },
    "spf": { "verified": true },
    "dkim": { "verified": true },
    "dmarc": { "verified": true },
    "verification": { "verified": true }
  },
  "message": "Domain verified successfully. You can now create email accounts."
}
```

**Implementation:** (Already exists in your codebase, just ensure owner-only access)

---

#### Endpoint 3: List Company Domains

```http
GET /api/email-domains/company
Authorization: Bearer <token>
```

**Response:**
```json
{
  "domains": [
    {
      "_id": "67...",
      "domain": "mycompany.com",
      "verified": true,
      "companyQuota": {
        "totalQuotaMB": 20480,
        "usedQuotaMB": 5120,
        "accountCount": 15,
        "maxAccounts": 100,
        "percentageUsed": 25
      },
      "createdAt": "2025-11-20T...",
      "verifiedAt": "2025-11-21T..."
    }
  ]
}
```

---

### B. Team Email Account Management (Owner Only)

**File:** `Backend/routes/email-accounts.js`

---

#### Endpoint 1: Create Team Email Account

```http
POST /api/email-accounts/create-team
Authorization: Bearer <token>
Role Required: Company Owner
```

**Request Body:**
```json
{
  "username": "support",
  "domain": "mycompany.com",
  "displayName": "Customer Support",
  "description": "Main support inbox for customer inquiries",
  "purpose": "support",
  "quotaMB": 2048,
  "roleAccess": [
    {
      "role": "Owner",
      "permissions": {
        "canRead": true,
        "canSend": true,
        "canDelete": true,
        "canManage": true
      }
    },
    {
      "role": "Manager",
      "permissions": {
        "canRead": true,
        "canSend": true,
        "canDelete": false,
        "canManage": false
      }
    },
    {
      "role": "Employee",
      "permissions": {
        "canRead": false,
        "canSend": false,
        "canDelete": false,
        "canManage": false
      }
    }
  ],
  "departmentAccess": ["Support Team", "Management Team"]
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "_id": "67...",
    "email": "support@mycompany.com",
    "displayName": "Customer Support",
    "domain": "mycompany.com",
    "companyId": "67...",
    "roleAccess": [...],
    "departmentAccess": ["Support Team", "Management Team"],
    "quota": {
      "limit": 2048,
      "used": 0,
      "percentage": 0
    },
    "enabled": true,
    "createdAt": "2025-11-26T..."
  },
  "credentials": {
    "imap": {
      "host": "mail.noxtm.com",
      "port": 993,
      "username": "support@mycompany.com",
      "password": "***"
    },
    "smtp": {
      "host": "mail.noxtm.com",
      "port": 587,
      "username": "support@mycompany.com"
    }
  }
}
```

**Implementation Code:**
```javascript
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../utils/encryption');
const doveadmHelper = require('../utils/doveadmHelper');

router.post('/create-team', authenticateToken, requireCompanyOwner, async (req, res) => {
  try {
    const {
      username,
      domain,
      displayName,
      description,
      purpose,
      quotaMB,
      roleAccess,
      departmentAccess
    } = req.body;

    const companyId = req.user.companyId;

    // Validate domain ownership and verification
    const emailDomain = await EmailDomain.findOne({
      domain,
      companyId,
      verified: true
    });

    if (!emailDomain) {
      return res.status(403).json({
        error: 'Domain not found or not verified for your company'
      });
    }

    // Check quota limits
    const quotaCheck = emailDomain.canCreateAccount(quotaMB);
    if (!quotaCheck.allowed) {
      return res.status(400).json({
        error: quotaCheck.reason,
        available: quotaCheck.available
      });
    }

    // Generate secure password (16 chars, alphanumeric + symbols)
    const password = crypto.randomBytes(16).toString('hex');
    const email = `${username}@${domain}`;

    // Create mailbox on server using doveadm
    const mailboxResult = await doveadmHelper.createMailbox(
      email,
      password,
      quotaMB
    );

    if (!mailboxResult.success) {
      return res.status(500).json({
        error: 'Failed to create mailbox on server',
        details: mailboxResult.error
      });
    }

    // Create email account in database
    const emailAccount = new EmailAccount({
      email,
      displayName,
      description,
      purpose,
      domain,
      companyId,
      accountType: 'noxtm-hosted',
      password: await bcrypt.hash(password, 10),

      imap: {
        host: 'mail.noxtm.com',
        port: 993,
        secure: true,
        username: email,
        encryptedPassword: encrypt(password)
      },

      smtp: {
        host: 'mail.noxtm.com',
        port: 587,
        secure: false,
        username: email,
        encryptedPassword: encrypt(password)
      },

      quota: {
        limit: quotaMB,
        used: 0,
        percentage: 0
      },

      roleAccess: roleAccess || [
        {
          role: 'Owner',
          permissions: { canRead: true, canSend: true, canDelete: true, canManage: true }
        },
        {
          role: 'Manager',
          permissions: { canRead: true, canSend: true, canDelete: false, canManage: false }
        },
        {
          role: 'Employee',
          permissions: { canRead: false, canSend: false, canDelete: false, canManage: false }
        }
      ],

      departmentAccess: departmentAccess || [],

      enabled: true,
      createdBy: req.user._id
    });

    await emailAccount.save();

    // Update domain quota usage
    await emailDomain.calculateQuotaUsage();

    // Create audit log
    await EmailAuditLog.create({
      companyId,
      userId: req.user._id,
      action: 'create_team_account',
      resourceType: 'EmailAccount',
      resourceId: emailAccount._id,
      details: {
        email,
        purpose,
        roleAccess: roleAccess.map(r => r.role)
      }
    });

    res.json({
      success: true,
      account: emailAccount,
      credentials: {
        imap: {
          host: emailAccount.imap.host,
          port: emailAccount.imap.port,
          username: emailAccount.imap.username,
          password: '***'  // Masked for security
        },
        smtp: {
          host: emailAccount.smtp.host,
          port: emailAccount.smtp.port,
          username: emailAccount.smtp.username
        }
      }
    });

  } catch (error) {
    console.error('Error creating team account:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

#### Endpoint 2: List Team Email Accounts

```http
GET /api/email-accounts/team
Authorization: Bearer <token>
Query Parameters: ?purpose=support&domain=mycompany.com
```

**Response:**
```json
{
  "accounts": [
    {
      "_id": "67...",
      "email": "support@mycompany.com",
      "displayName": "Customer Support",
      "purpose": "support",
      "domain": "mycompany.com",
      "quota": {
        "limit": 2048,
        "used": 512,
        "percentage": 25
      },
      "roleAccess": [...],
      "departmentAccess": ["Support Team"],
      "enabled": true,
      "createdAt": "2025-11-20T..."
    }
  ],
  "summary": {
    "totalAccounts": 15,
    "totalQuotaMB": 30720,
    "usedQuotaMB": 5120,
    "availableQuotaMB": 25600
  }
}
```

**Implementation Code:**
```javascript
router.get('/team', authenticateToken, async (req, res) => {
  try {
    const { purpose, domain } = req.query;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({ error: 'User not associated with a company' });
    }

    // Build query
    const query = { companyId, enabled: true };
    if (purpose) query.purpose = purpose;
    if (domain) query.domain = domain;

    // Fetch accounts
    const accounts = await EmailAccount.find(query)
      .select('-password -imap.encryptedPassword -smtp.encryptedPassword')
      .sort({ createdAt: -1 });

    // Calculate summary
    const summary = {
      totalAccounts: accounts.length,
      totalQuotaMB: accounts.reduce((sum, acc) => sum + (acc.quota?.limit || 0), 0),
      usedQuotaMB: accounts.reduce((sum, acc) => sum + (acc.quota?.used || 0), 0)
    };
    summary.availableQuotaMB = summary.totalQuotaMB - summary.usedQuotaMB;

    res.json({ accounts, summary });

  } catch (error) {
    console.error('Error fetching team accounts:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

#### Endpoint 3: Update Role Access Permissions

```http
PUT /api/email-accounts/:id/role-access
Authorization: Bearer <token>
Role Required: Company Owner
```

**Request Body:**
```json
{
  "roleAccess": [
    {
      "role": "Manager",
      "permissions": {
        "canRead": true,
        "canSend": true,
        "canDelete": true,
        "canManage": false
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "_id": "67...",
    "email": "support@mycompany.com",
    "roleAccess": [...]
  }
}
```

---

#### Endpoint 4: Delete Team Email Account

```http
DELETE /api/email-accounts/:id
Authorization: Bearer <token>
Role Required: Company Owner
```

**Response:**
```json
{
  "success": true,
  "message": "Email account deleted successfully"
}
```

**Implementation:** Deletes mailbox via doveadm + database entry + updates domain quota

---

### C. Access Control Middleware

**File:** `Backend/middleware/emailAuth.js` (NEW FILE)

```javascript
const EmailAccount = require('../models/EmailAccount');
const Company = require('../models/Company');

// Require company owner role
exports.requireCompanyOwner = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        error: 'User not associated with any company'
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if user is owner
    if (!company.owner.equals(userId)) {
      return res.status(403).json({
        error: 'Only company owner can perform this action'
      });
    }

    req.company = company;
    next();

  } catch (error) {
    console.error('requireCompanyOwner error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Check access to email account with specific permission
exports.requireEmailAccess = (requiredPermission = 'canRead') => {
  return async (req, res, next) => {
    try {
      const accountId = req.params.id || req.params.accountId;
      const user = req.user;

      const emailAccount = await EmailAccount.findById(accountId);

      if (!emailAccount) {
        return res.status(404).json({ error: 'Email account not found' });
      }

      // Check if user has access
      const hasAccess = await emailAccount.hasAccess(user);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'You do not have access to this email account'
        });
      }

      // Check specific permission
      const permissions = await emailAccount.getPermissions(user);
      if (!permissions[requiredPermission]) {
        return res.status(403).json({
          error: `You do not have permission to ${requiredPermission.replace('can', '').toLowerCase()}`
        });
      }

      req.emailAccount = emailAccount;
      req.emailPermissions = permissions;
      next();

    } catch (error) {
      console.error('requireEmailAccess error:', error);
      res.status(500).json({ error: error.message });
    }
  };
};
```

---

### D. Team Inbox Access Endpoints

**File:** `Backend/routes/email-accounts.js`

---

#### Endpoint 1: Get My Accessible Team Accounts

```http
GET /api/email-accounts/my-team-accounts
Authorization: Bearer <token>
```

**Response:**
```json
{
  "accounts": [
    {
      "_id": "67...",
      "email": "support@mycompany.com",
      "displayName": "Customer Support",
      "description": "Main support inbox",
      "purpose": "support",
      "domain": "mycompany.com",
      "permissions": {
        "canRead": true,
        "canSend": true,
        "canDelete": false,
        "canManage": false
      },
      "unreadCount": 45,
      "quota": {
        "limit": 2048,
        "used": 512,
        "percentage": 25
      }
    }
  ]
}
```

**Implementation:**
```javascript
const imapHelper = require('../utils/imapHelper');
const { decrypt } = require('../utils/encryption');

router.get('/my-team-accounts', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const companyId = user.companyId;

    if (!companyId) {
      return res.json({ accounts: [] });
    }

    // Get all team accounts for user's company
    const allAccounts = await EmailAccount.find({
      companyId,
      enabled: true
    });

    // Filter by access and get permissions
    const accessibleAccounts = [];

    for (const account of allAccounts) {
      const hasAccess = await account.hasAccess(user);

      if (hasAccess) {
        const permissions = await account.getPermissions(user);

        // Get unread count from IMAP (cached)
        let unreadCount = 0;
        try {
          const stats = await imapHelper.getInboxStats(
            account.imap.host,
            account.imap.port,
            account.imap.username,
            decrypt(account.imap.encryptedPassword)
          );
          unreadCount = stats.unseen || 0;
        } catch (error) {
          console.error('Error fetching unread count:', error.message);
        }

        accessibleAccounts.push({
          _id: account._id,
          email: account.email,
          displayName: account.displayName,
          description: account.description,
          purpose: account.purpose,
          domain: account.domain,
          permissions,
          unreadCount,
          quota: account.quota
        });
      }
    }

    res.json({ accounts: accessibleAccounts });

  } catch (error) {
    console.error('Error fetching my team accounts:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

#### Endpoint 2: Fetch Team Inbox Emails

```http
GET /api/email-accounts/team-inbox/:accountId
Authorization: Bearer <token>
Query Parameters: ?page=1&limit=50&folder=INBOX
```

**Response:**
```json
{
  "emails": [
    {
      "uid": 12345,
      "seqno": 100,
      "from": {
        "name": "John Customer",
        "address": "john@customer.com"
      },
      "to": ["support@mycompany.com"],
      "subject": "Need help with billing",
      "date": "2025-11-26T10:30:00Z",
      "preview": "Hi, I have a question about my invoice...",
      "seen": false,
      "hasAttachments": true
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "pages": 3
  },
  "account": {
    "email": "support@mycompany.com",
    "displayName": "Customer Support"
  }
}
```

**Implementation:**
```javascript
const { requireEmailAccess } = require('../middleware/emailAuth');

router.get(
  '/team-inbox/:accountId',
  authenticateToken,
  requireEmailAccess('canRead'),
  async (req, res) => {
    try {
      const { accountId } = req.params;
      const { page = 1, limit = 50, folder = 'INBOX' } = req.query;

      const emailAccount = req.emailAccount;

      // Fetch emails via IMAP
      const result = await imapHelper.fetchEmails(
        emailAccount.imap.host,
        emailAccount.imap.port,
        emailAccount.imap.username,
        decrypt(emailAccount.imap.encryptedPassword),
        folder,
        parseInt(page),
        parseInt(limit)
      );

      res.json({
        ...result,
        account: {
          email: emailAccount.email,
          displayName: emailAccount.displayName
        }
      });

    } catch (error) {
      console.error('Error fetching team inbox:', error);
      res.status(500).json({ error: error.message });
    }
  }
);
```

---

#### Endpoint 3: Send Email from Team Account

```http
POST /api/email-accounts/team-send/:accountId
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "to": "customer@example.com",
  "cc": [],
  "bcc": [],
  "subject": "Re: Your inquiry",
  "body": "<p>Thank you for contacting us...</p>"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "<abc123@mail.noxtm.com>",
  "sentAt": "2025-11-26T11:00:00Z"
}
```

**Implementation:**
```javascript
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

router.post(
  '/team-send/:accountId',
  authenticateToken,
  requireEmailAccess('canSend'),
  async (req, res) => {
    try {
      const { to, cc, bcc, subject, body } = req.body;
      const emailAccount = req.emailAccount;
      const user = req.user;

      // Create SMTP transport
      const transporter = nodemailer.createTransport({
        host: emailAccount.smtp.host,
        port: emailAccount.smtp.port,
        secure: emailAccount.smtp.secure,
        auth: {
          user: emailAccount.smtp.username,
          pass: decrypt(emailAccount.smtp.encryptedPassword)
        }
      });

      // Send email
      const info = await transporter.sendMail({
        from: `${emailAccount.displayName} <${emailAccount.email}>`,
        to,
        cc,
        bcc,
        subject,
        html: body,
        text: body.replace(/<[^>]*>/g, '')  // Strip HTML for plain text
      });

      // Log in EmailLog
      await EmailLog.create({
        accountId: emailAccount._id,
        companyId: emailAccount.companyId,
        messageId: info.messageId,
        direction: 'sent',
        from: emailAccount.email,
        to: Array.isArray(to) ? to : [to],
        cc: cc || [],
        bcc: bcc || [],
        subject,
        status: 'sent',
        size: Buffer.byteLength(body),
        sentBy: user._id,
        sentAt: new Date()
      });

      res.json({
        success: true,
        messageId: info.messageId,
        sentAt: new Date()
      });

    } catch (error) {
      console.error('Error sending team email:', error);
      res.status(500).json({ error: error.message });
    }
  }
);
```

---

## 1.3 Frontend Components

### A. Domain Management Component

**File:** `Frontend/src/components/email/DomainManagement.js` (NEW)

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DomainManagement.css';

const DomainManagement = () => {
  const [domains, setDomains] = useState([]);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const res = await axios.get('/api/email-domains/company');
      setDomains(res.data.domains);
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="domain-management">
      <div className="header">
        <h2>Email Domains</h2>
        <button className="btn-primary" onClick={() => setShowAddDomain(true)}>
          + Add Domain
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading domains...</div>
      ) : (
        <div className="domains-grid">
          {domains.map(domain => (
            <DomainCard
              key={domain._id}
              domain={domain}
              onUpdate={fetchDomains}
            />
          ))}
        </div>
      )}

      {showAddDomain && (
        <AddDomainModal
          onClose={() => setShowAddDomain(false)}
          onAdded={fetchDomains}
        />
      )}
    </div>
  );
};

const DomainCard = ({ domain, onUpdate }) => {
  const [verifying, setVerifying] = useState(false);
  const [showDNS, setShowDNS] = useState(false);

  const verifyDomain = async () => {
    setVerifying(true);
    try {
      await axios.post(`/api/email-domains/${domain._id}/verify-dns`);
      alert('✅ Domain verified successfully!');
      onUpdate();
    } catch (error) {
      alert('❌ Verification failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setVerifying(false);
    }
  };

  const percentageUsed = (domain.companyQuota.usedQuotaMB / domain.companyQuota.totalQuotaMB) * 100;

  return (
    <div className={`domain-card ${domain.verified ? 'verified' : 'pending'}`}>
      <div className="domain-header">
        <h3>{domain.domain}</h3>
        <span className={`status-badge ${domain.verified ? 'verified' : 'pending'}`}>
          {domain.verified ? '✓ Verified' : '⚠ Pending Verification'}
        </span>
      </div>

      <div className="domain-stats">
        <div className="stat">
          <span className="label">Accounts</span>
          <span className="value">
            {domain.companyQuota.accountCount} / {domain.companyQuota.maxAccounts}
          </span>
        </div>

        <div className="stat">
          <span className="label">Storage</span>
          <span className="value">
            {domain.companyQuota.usedQuotaMB} / {domain.companyQuota.totalQuotaMB} MB
          </span>
        </div>
      </div>

      <div className="quota-bar">
        <div
          className="quota-used"
          style={{
            width: `${percentageUsed}%`,
            backgroundColor: percentageUsed > 80 ? '#e74c3c' : '#3498db'
          }}
        />
      </div>

      <div className="domain-actions">
        {!domain.verified && (
          <>
            <button className="btn-secondary" onClick={() => setShowDNS(!showDNS)}>
              {showDNS ? 'Hide DNS Setup' : 'Show DNS Setup'}
            </button>
            <button
              className="btn-primary"
              onClick={verifyDomain}
              disabled={verifying}
            >
              {verifying ? 'Verifying...' : 'Verify DNS'}
            </button>
          </>
        )}
      </div>

      {showDNS && !domain.verified && (
        <DNSInstructions domain={domain} />
      )}
    </div>
  );
};

const DNSInstructions = ({ domain }) => {
  return (
    <div className="dns-instructions">
      <h4>DNS Configuration Required</h4>
      <p>Add these records to your domain's DNS settings:</p>

      <div className="dns-record">
        <strong>MX Record:</strong>
        <code>
          {domain.domain} MX 10 mail.noxtm.com
        </code>
      </div>

      <div className="dns-record">
        <strong>A Record:</strong>
        <code>
          mail.{domain.domain} A 185.137.122.61
        </code>
      </div>

      <div className="dns-record">
        <strong>SPF (TXT):</strong>
        <code>
          {domain.domain} TXT "{domain.dnsRecords.spf.record}"
        </code>
      </div>

      <div className="dns-record">
        <strong>DKIM (TXT):</strong>
        <code>
          {domain.dnsRecords.dkim.selector}._domainkey.{domain.domain} TXT "{domain.dnsRecords.dkim.record}"
        </code>
      </div>

      <div className="dns-record">
        <strong>DMARC (TXT):</strong>
        <code>
          _dmarc.{domain.domain} TXT "{domain.dnsRecords.dmarc.record}"
        </code>
      </div>

      <div className="dns-record">
        <strong>Verification (TXT):</strong>
        <code>
          {domain.domain} TXT "noxtm-verify={domain.verificationToken}"
        </code>
      </div>
    </div>
  );
};

const AddDomainModal = ({ onClose, onAdded }) => {
  const [domain, setDomain] = useState('');
  const [quotaMB, setQuotaMB] = useState(10240);
  const [maxAccounts, setMaxAccounts] = useState(50);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/api/email-domains/', {
        domain,
        companyQuota: {
          totalQuotaMB: quotaMB,
          maxAccounts
        }
      });

      alert('✅ Domain added successfully! Please configure DNS records.');
      onAdded();
      onClose();

    } catch (error) {
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Email Domain</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Domain Name *</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="mycompany.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Total Quota (MB)</label>
            <input
              type="number"
              value={quotaMB}
              onChange={(e) => setQuotaMB(parseInt(e.target.value))}
              min="1024"
              step="1024"
            />
            <small>{(quotaMB / 1024).toFixed(1)} GB</small>
          </div>

          <div className="form-group">
            <label>Max Accounts</label>
            <input
              type="number"
              value={maxAccounts}
              onChange={(e) => setMaxAccounts(parseInt(e.target.value))}
              min="1"
              max="1000"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DomainManagement;
```

---

### B. Create Team Email Account Component

**File:** `Frontend/src/components/email/CreateTeamAccount.js` (NEW)

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CreateTeamAccount.css';

const CreateTeamAccount = ({ onCreated, onClose }) => {
  const [domains, setDomains] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    domain: '',
    displayName: '',
    description: '',
    purpose: 'shared',
    quotaMB: 2048,
    roleAccess: [
      {
        role: 'Owner',
        permissions: {
          canRead: true,
          canSend: true,
          canDelete: true,
          canManage: true
        }
      },
      {
        role: 'Manager',
        permissions: {
          canRead: true,
          canSend: true,
          canDelete: false,
          canManage: false
        }
      },
      {
        role: 'Employee',
        permissions: {
          canRead: false,
          canSend: false,
          canDelete: false,
          canManage: false
        }
      }
    ],
    departmentAccess: []
  });

  const departments = [
    'Management Team',
    'Digital Team',
    'SEO Team',
    'Graphic Design Team',
    'Marketing Team',
    'Sales Team',
    'Development Team',
    'HR Team',
    'Finance Team',
    'Support Team',
    'Operations Team'
  ];

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    const res = await axios.get('/api/email-domains/company');
    const verifiedDomains = res.data.domains.filter(d => d.verified);
    setDomains(verifiedDomains);

    if (verifiedDomains.length > 0) {
      setFormData(prev => ({ ...prev, domain: verifiedDomains[0].domain }));
    }
  };

  const createAccount = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post('/api/email-accounts/create-team', formData);
      alert(`✅ Account created: ${res.data.account.email}`);
      if (onCreated) onCreated(res.data.account);
      if (onClose) onClose();
    } catch (error) {
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    }
  };

  const updateRolePermission = (role, permission, value) => {
    setFormData(prev => ({
      ...prev,
      roleAccess: prev.roleAccess.map(ra =>
        ra.role === role
          ? {
              ...ra,
              permissions: {
                ...ra.permissions,
                [permission]: value
              }
            }
          : ra
      )
    }));
  };

  const toggleDepartment = (dept) => {
    setFormData(prev => ({
      ...prev,
      departmentAccess: prev.departmentAccess.includes(dept)
        ? prev.departmentAccess.filter(d => d !== dept)
        : [...prev.departmentAccess, dept]
    }));
  };

  if (domains.length === 0) {
    return (
      <div className="no-domains">
        <p>⚠️ No verified domains found. Please add and verify a domain first.</p>
      </div>
    );
  }

  return (
    <div className="create-team-account">
      <h2>Create Team Email Account</h2>

      <form onSubmit={createAccount}>
        {/* Basic Info */}
        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label>Email Address *</label>
            <div className="email-input">
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                placeholder="support"
                pattern="[a-z0-9._-]+"
                required
              />
              <span className="at-symbol">@</span>
              <select
                value={formData.domain}
                onChange={(e) => setFormData({...formData, domain: e.target.value})}
              >
                {domains.map(d => (
                  <option key={d._id} value={d.domain}>{d.domain}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Display Name *</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
              placeholder="Customer Support"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Main support inbox for customer inquiries"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Purpose</label>
              <select
                value={formData.purpose}
                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
              >
                <option value="shared">Shared</option>
                <option value="departmental">Departmental</option>
                <option value="support">Support</option>
                <option value="sales">Sales</option>
                <option value="general">General</option>
              </select>
            </div>

            <div className="form-group">
              <label>Quota (MB)</label>
              <input
                type="number"
                value={formData.quotaMB}
                onChange={(e) => setFormData({...formData, quotaMB: parseInt(e.target.value)})}
                min="512"
                max="10240"
                step="512"
              />
              <small>{(formData.quotaMB / 1024).toFixed(1)} GB</small>
            </div>
          </div>
        </div>

        {/* Role-Based Permissions */}
        <div className="form-section">
          <h3>Role-Based Access Control</h3>
          <p className="help-text">
            Configure which roles can access this email account and what they can do.
          </p>

          <div className="permissions-grid">
            {formData.roleAccess.map(roleAccess => (
              <div key={roleAccess.role} className="role-permissions">
                <h4>{roleAccess.role}</h4>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={roleAccess.permissions.canRead}
                    onChange={(e) => updateRolePermission(roleAccess.role, 'canRead', e.target.checked)}
                  />
                  <span>📖 Can Read Emails</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={roleAccess.permissions.canSend}
                    onChange={(e) => updateRolePermission(roleAccess.role, 'canSend', e.target.checked)}
                  />
                  <span>📤 Can Send Emails</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={roleAccess.permissions.canDelete}
                    onChange={(e) => updateRolePermission(roleAccess.role, 'canDelete', e.target.checked)}
                  />
                  <span>🗑️ Can Delete Emails</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={roleAccess.permissions.canManage}
                    onChange={(e) => updateRolePermission(roleAccess.role, 'canManage', e.target.checked)}
                  />
                  <span>⚙️ Can Manage Account</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Department Access */}
        <div className="form-section">
          <h3>Department Access (Optional)</h3>
          <p className="help-text">
            Restrict access to specific departments. Leave empty to allow all departments based on role.
          </p>

          <div className="departments-grid">
            {departments.map(dept => (
              <label key={dept} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.departmentAccess.includes(dept)}
                  onChange={() => toggleDepartment(dept)}
                />
                <span>{dept}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          {onClose && (
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary">
            Create Email Account
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeamAccount;
```

---

### C. Team Inbox Component

**File:** `Frontend/src/components/email/TeamInbox.js` (NEW)

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TeamInbox.css';

const TeamInbox = () => {
  const [teamAccounts, setTeamAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    fetchTeamAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchEmails(selectedAccount._id);
    }
  }, [selectedAccount]);

  const fetchTeamAccounts = async () => {
    try {
      const res = await axios.get('/api/email-accounts/my-team-accounts');
      setTeamAccounts(res.data.accounts);

      if (res.data.accounts.length > 0) {
        setSelectedAccount(res.data.accounts[0]);
      }
    } catch (error) {
      console.error('Error fetching team accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmails = async (accountId) => {
    try {
      const res = await axios.get(`/api/email-accounts/team-inbox/${accountId}?page=1&limit=50`);
      setEmails(res.data.emails || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  if (loading) {
    return <div className="team-inbox-loading">Loading team accounts...</div>;
  }

  if (teamAccounts.length === 0) {
    return (
      <div className="no-team-accounts">
        <h3>No Team Email Accounts</h3>
        <p>You don't have access to any team email accounts yet.</p>
        <p>Contact your company owner to get access.</p>
      </div>
    );
  }

  return (
    <div className="team-inbox">
      {/* Account Selector Sidebar */}
      <div className="account-selector">
        <h3>Team Accounts</h3>
        {teamAccounts.map(account => (
          <div
            key={account._id}
            className={`account-item ${selectedAccount?._id === account._id ? 'active' : ''}`}
            onClick={() => setSelectedAccount(account)}
          >
            <div className="account-info">
              <strong>{account.displayName}</strong>
              <span className="account-email">{account.email}</span>
            </div>

            {account.unreadCount > 0 && (
              <span className="unread-badge">{account.unreadCount}</span>
            )}

            <div className="permissions-icons">
              {account.permissions.canSend && (
                <span title="Can Send" className="icon">📤</span>
              )}
              {account.permissions.canDelete && (
                <span title="Can Delete" className="icon">🗑️</span>
              )}
              {account.permissions.canManage && (
                <span title="Can Manage" className="icon">⚙️</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Email List */}
      <div className="email-list">
        {selectedAccount && (
          <>
            <div className="inbox-header">
              <div>
                <h2>{selectedAccount.displayName}</h2>
                <p className="account-description">{selectedAccount.description}</p>
              </div>

              {selectedAccount.permissions.canSend && (
                <button
                  className="btn-primary"
                  onClick={() => setShowCompose(true)}
                >
                  ✉️ Compose
                </button>
              )}
            </div>

            <div className="emails-container">
              {emails.map(email => (
                <div
                  key={email.uid}
                  className={`email-item ${!email.seen ? 'unread' : ''} ${selectedEmail?.uid === email.uid ? 'selected' : ''}`}
                  onClick={() => setSelectedEmail(email)}
                >
                  <div className="email-from">
                    {email.from.name || email.from.address}
                  </div>
                  <div className="email-subject">{email.subject}</div>
                  <div className="email-preview">{email.preview}</div>
                  <div className="email-meta">
                    <span className="email-date">{formatDate(email.date)}</span>
                    {email.hasAttachments && <span className="attachment-icon">📎</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Email Detail Panel */}
      <div className="email-detail">
        {selectedEmail ? (
          <EmailDetailView
            email={selectedEmail}
            account={selectedAccount}
            onReply={() => setShowCompose(true)}
          />
        ) : (
          <div className="no-selection">
            <p>Select an email to view</p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeEmailModal
          account={selectedAccount}
          replyTo={selectedEmail}
          onClose={() => setShowCompose(false)}
          onSent={() => {
            setShowCompose(false);
            fetchEmails(selectedAccount._id);
          }}
        />
      )}
    </div>
  );
};

const EmailDetailView = ({ email, account, onReply }) => {
  const [emailBody, setEmailBody] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmailBody();
  }, [email.uid]);

  const fetchEmailBody = async () => {
    try {
      const res = await axios.get(
        `/api/email-accounts/fetch-email-body?accountId=${account._id}&uid=${email.uid}`
      );
      setEmailBody(res.data);
    } catch (error) {
      console.error('Error fetching email body:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading email...</div>;
  }

  return (
    <div className="email-detail-content">
      <div className="email-header">
        <h3>{emailBody.subject}</h3>

        <div className="email-from">
          <strong>From:</strong> {emailBody.from.name} &lt;{emailBody.from.address}&gt;
        </div>

        <div className="email-to">
          <strong>To:</strong> {emailBody.to.join(', ')}
        </div>

        <div className="email-date">
          {new Date(emailBody.date).toLocaleString()}
        </div>
      </div>

      {account.permissions.canSend && (
        <div className="email-actions">
          <button onClick={onReply} className="btn-secondary">
            ↩️ Reply
          </button>
        </div>
      )}

      <div className="email-body">
        {emailBody.html ? (
          <iframe
            srcDoc={emailBody.html}
            sandbox="allow-same-origin"
            title="Email content"
          />
        ) : (
          <pre>{emailBody.text}</pre>
        )}
      </div>

      {emailBody.attachments && emailBody.attachments.length > 0 && (
        <div className="attachments">
          <h4>Attachments</h4>
          {emailBody.attachments.map((att, idx) => (
            <div key={idx} className="attachment-item">
              📎 {att.filename} ({formatBytes(att.size)})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ComposeEmailModal = ({ account, replyTo, onClose, onSent }) => {
  const [to, setTo] = useState(replyTo ? replyTo.from.address : '');
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      await axios.post(`/api/email-accounts/team-send/${account._id}`, {
        to,
        subject,
        body
      });

      alert('✅ Email sent successfully!');
      onSent();
    } catch (error) {
      alert('❌ Error sending email: ' + (error.response?.data?.error || error.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="compose-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Compose Email</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSend}>
          <div className="form-group">
            <label>From:</label>
            <div className="from-display">
              {account.displayName} &lt;{account.email}&gt;
            </div>
          </div>

          <div className="form-group">
            <label>To:</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Subject:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Message:</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows="10"
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={sending}>
              {sending ? 'Sending...' : '📤 Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Helper functions
function formatDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;

  if (diff < 86400000) { // Less than 24 hours
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diff < 604800000) { // Less than 7 days
    return d.toLocaleDateString([], { weekday: 'short' });
  } else {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default TeamInbox;
```

---

### D. Update MainstreamInbox Component

**File:** `Frontend/src/components/MainstreamInbox.js`

**Modify the Team tab to use the new TeamInbox component:**

```jsx
import TeamInbox from './email/TeamInbox';

// In the renderContent function (around line 348-365):
const renderContent = () => {
  switch (activeTab) {
    case 'mainstream':
      return <PersonalInbox />;  // Existing

    case 'team':
      return <TeamInbox />;  // NEW: Use TeamInbox component

    case 'settings':
      return <InboxSettings />;  // Existing

    default:
      return <PersonalInbox />;
  }
};
```

---

## 1.4 Testing Checklist for Phase 1

### Unit Tests (Backend)

```javascript
// Test EmailAccount.hasAccess()
describe('EmailAccount.hasAccess', () => {
  it('should allow Owner access', async () => {
    // Create mock user with Owner role
    // Create email account with Owner in roleAccess
    // Assert hasAccess returns true
  });

  it('should deny Employee without permission', async () => {
    // Create mock user with Employee role
    // Create email account with Employee.canRead = false
    // Assert hasAccess returns false
  });

  it('should check department access', async () => {
    // Create email account with departmentAccess = ['Sales Team']
    // Create user in Marketing Team
    // Assert hasAccess returns false
  });
});

// Test EmailDomain.canCreateAccount()
describe('EmailDomain.canCreateAccount', () => {
  it('should reject if quota exceeded', () => {
    // Create domain with usedQuotaMB = 10000, totalQuotaMB = 10240
    // Try to create account with 500MB
    // Assert returns { allowed: false, reason: 'Company quota exceeded' }
  });

  it('should reject if account limit reached', () => {
    // Create domain with accountCount = 50, maxAccounts = 50
    // Try to create account
    // Assert returns { allowed: false, reason: 'Account limit reached' }
  });
});
```

### Integration Tests (API)

```javascript
describe('Domain Management API', () => {
  it('should create domain with DKIM keys', async () => {
    const res = await request(app)
      .post('/api/email-domains/')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ domain: 'test.com' });

    expect(res.status).toBe(200);
    expect(res.body.domain.dnsRecords.dkim.publicKey).toBeDefined();
  });

  it('should verify DNS records', async () => {
    // Mock DNS resolution
    // Call verify endpoint
    // Assert domain.verified = true
  });
});

describe('Team Accounts API', () => {
  it('should create team account with role permissions', async () => {
    const res = await request(app)
      .post('/api/email-accounts/create-team')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        username: 'support',
        domain: 'test.com',
        roleAccess: [...]
      });

    expect(res.status).toBe(200);
    expect(res.body.account.email).toBe('support@test.com');
  });

  it('should enforce quota limits', async () => {
    // Set domain quota to nearly full
    // Try to create account exceeding quota
    // Assert returns 400 error
  });
});
```

### Manual Testing Steps

1. **Domain Setup Flow**
   - [ ] Owner logs in
   - [ ] Adds domain "testcompany.com"
   - [ ] Receives DNS instructions
   - [ ] (Mock) Verifies DNS
   - [ ] Domain status changes to "Verified"

2. **Team Account Creation**
   - [ ] Owner creates "support@testcompany.com"
   - [ ] Sets Manager canRead=true, canSend=true
   - [ ] Sets Employee canRead=false
   - [ ] Account created successfully
   - [ ] Mailbox created on server (check via doveadm)

3. **Team Member Access**
   - [ ] Manager logs in
   - [ ] Sees "support@testcompany.com" in Team Accounts
   - [ ] Can read emails
   - [ ] Can send emails
   - [ ] Cannot delete emails (permission check)

4. **Employee Restrictions**
   - [ ] Employee logs in
   - [ ] Does NOT see "support@testcompany.com" (no access)
   - [ ] Team tab shows "No team accounts"

5. **Quota Management**
   - [ ] Owner creates 5 accounts with 2GB each
   - [ ] Domain quota shows correct usage
   - [ ] Try to create account exceeding quota
   - [ ] Should fail with error message

6. **Email Operations**
   - [ ] Manager opens team inbox
   - [ ] Receives external email
   - [ ] Reads email
   - [ ] Composes reply
   - [ ] Sends from team account
   - [ ] Email appears in sent folder

---

**(Continuing to Phase 2 in next section...)**

---

# 🤝 PHASE 2: COLLABORATION FEATURES (Nice to Have)

**Timeline:** 2-3 weeks
**Priority:** High
**Dependencies:** Phase 1 complete

---

## 2.1 Email Assignment System

### A. Database Schema

**Create:** `Backend/models/EmailAssignment.js` (NEW FILE)

```javascript
const mongoose = require('mongoose');

const EmailAssignmentSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: true,
    index: true
  },

  messageId: {
    type: String,  // IMAP UID or Message-ID header
    required: true
  },

  emailSubject: String,
  emailFrom: String,
  emailDate: Date,

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed'],
    default: 'new',
    index: true
  },

  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  internalNotes: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  tags: [String],

  dueDate: Date,

  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes
EmailAssignmentSchema.index({ companyId: 1, assignedTo: 1, status: 1 });
EmailAssignmentSchema.index({ accountId: 1, messageId: 1 }, { unique: true });
EmailAssignmentSchema.index({ companyId: 1, status: 1, createdAt: -1 });

// Update timestamp on save
EmailAssignmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('EmailAssignment', EmailAssignmentSchema);
```

---

### B. Assignment API Endpoints

**Create:** `Backend/routes/email-assignments.js` (NEW FILE)

```javascript
const express = require('express');
const router = express.Router();
const EmailAssignment = require('../models/EmailAssignment');
const EmailAccount = require('../models/EmailAccount');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailAccess } = require('../middleware/emailAuth');

// 1. Assign Email
router.post('/assign', authenticateToken, async (req, res) => {
  try {
    const {
      accountId,
      messageId,
      assignTo,
      priority,
      dueDate,
      note,
      emailSubject,
      emailFrom,
      emailDate
    } = req.body;

    const companyId = req.user.companyId;

    // Verify account access
    const account = await EmailAccount.findById(accountId);
    if (!account || !account.companyId.equals(companyId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if already assigned
    const existing = await EmailAssignment.findOne({
      accountId,
      messageId
    });

    if (existing) {
      return res.status(409).json({
        error: 'Email already assigned',
        assignment: existing
      });
    }

    // Create assignment
    const assignment = new EmailAssignment({
      companyId,
      accountId,
      messageId,
      emailSubject,
      emailFrom,
      emailDate,
      assignedTo: assignTo,
      assignedBy: req.user._id,
      status: 'new',
      priority: priority || 'normal',
      dueDate: dueDate || null,
      internalNotes: note ? [{
        author: req.user._id,
        content: note,
        createdAt: new Date()
      }] : []
    });

    await assignment.save();

    // Populate user details
    await assignment.populate('assignedTo', 'fullName email');
    await assignment.populate('assignedBy', 'fullName email');

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error assigning email:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Get My Assignments
router.get('/my-assignments', authenticateToken, async (req, res) => {
  try {
    const { status, accountId } = req.query;
    const userId = req.user._id;
    const companyId = req.user.companyId;

    const query = {
      companyId,
      assignedTo: userId
    };

    if (status) query.status = status;
    if (accountId) query.accountId = accountId;

    const assignments = await EmailAssignment.find(query)
      .populate('assignedBy', 'fullName email')
      .populate('accountId', 'email displayName')
      .sort({ createdAt: -1 })
      .limit(100);

    // Calculate summary
    const summary = {
      new: await EmailAssignment.countDocuments({ ...query, status: 'new' }),
      in_progress: await EmailAssignment.countDocuments({ ...query, status: 'in_progress' }),
      resolved: await EmailAssignment.countDocuments({ ...query, status: 'resolved' })
    };

    res.json({
      assignments,
      summary
    });

  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Update Assignment Status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user._id;

    const assignment = await EmailAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Verify user is assigned or is owner/manager
    if (!assignment.assignedTo.equals(userId)) {
      // TODO: Check if user is owner/manager
      return res.status(403).json({ error: 'Not authorized' });
    }

    assignment.status = status;

    if (status === 'resolved' || status === 'closed') {
      assignment.resolvedAt = new Date();
      assignment.resolvedBy = userId;
    }

    await assignment.save();

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Add Internal Note
router.post('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const assignment = await EmailAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    assignment.internalNotes.push({
      author: userId,
      content,
      createdAt: new Date()
    });

    await assignment.save();
    await assignment.populate('internalNotes.author', 'fullName email');

    const newNote = assignment.internalNotes[assignment.internalNotes.length - 1];

    res.json({
      success: true,
      note: newNote
    });

  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Get Assignment Details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await EmailAssignment.findById(id)
      .populate('assignedTo', 'fullName email')
      .populate('assignedBy', 'fullName email')
      .populate('resolvedBy', 'fullName email')
      .populate('accountId', 'email displayName')
      .populate('internalNotes.author', 'fullName email');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ assignment });

  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Resolve Assignment
router.post('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const assignment = await EmailAssignment.findById(id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    assignment.status = 'resolved';
    assignment.resolvedAt = new Date();
    assignment.resolvedBy = userId;

    await assignment.save();

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error resolving assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Register routes in `Backend/server.js`:**
```javascript
const emailAssignmentRoutes = require('./routes/email-assignments');
app.use('/api/email-assignments', emailAssignmentRoutes);
```

---

### C. Frontend Assignment Components

**File:** `Frontend/src/components/email/EmailAssignment.js` (NEW)

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmailAssignmentPanel = ({ email, accountId, onAssigned }) => {
  const [assignTo, setAssignTo] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const res = await axios.get('/api/company/members');
      setTeamMembers(res.data.members || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleAssign = async () => {
    if (!assignTo) {
      alert('Please select a team member');
      return;
    }

    setLoading(true);

    try {
      await axios.post('/api/email-assignments/assign', {
        accountId,
        messageId: email.uid.toString(),
        assignTo,
        priority,
        dueDate: dueDate || null,
        note,
        emailSubject: email.subject,
        emailFrom: email.from.address,
        emailDate: email.date
      });

      alert('✅ Email assigned successfully!');
      if (onAssigned) onAssigned();

      // Reset form
      setAssignTo('');
      setPriority('normal');
      setDueDate('');
      setNote('');

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      alert('❌ Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-assignment-panel">
      <h4>Assign Email</h4>

      <div className="form-group">
        <label>Assign To *</label>
        <select
          value={assignTo}
          onChange={(e) => setAssignTo(e.target.value)}
          className="form-control"
        >
          <option value="">Select team member...</option>
          {teamMembers.map(member => (
            <option key={member.user._id} value={member.user._id}>
              {member.user.fullName} ({member.roleInCompany} - {member.department})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="form-control"
        >
          <option value="low">🟢 Low</option>
          <option value="normal">🟡 Normal</option>
          <option value="high">🟠 High</option>
          <option value="urgent">🔴 Urgent</option>
        </select>
      </div>

      <div className="form-group">
        <label>Due Date</label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="form-control"
        />
      </div>

      <div className="form-group">
        <label>Note (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add assignment note..."
          rows="3"
          className="form-control"
        />
      </div>

      <button
        onClick={handleAssign}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Assigning...' : 'Assign Email'}
      </button>
    </div>
  );
};

export default EmailAssignmentPanel;
```

---

**File:** `Frontend/src/components/email/MyAssignments.js` (NEW)

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MyAssignments.css';

const MyAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState('new');
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignments();
  }, [filter]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/email-assignments/my-assignments?status=${filter}`);
      setAssignments(res.data.assignments || []);
      setSummary(res.data.summary || {});
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (assignmentId, newStatus) => {
    try {
      await axios.put(`/api/email-assignments/${assignmentId}/status`, {
        status: newStatus
      });
      fetchAssignments();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  return (
    <div className="my-assignments">
      <div className="header">
        <h2>My Email Assignments</h2>
      </div>

      <div className="filters">
        <button
          className={`filter-btn ${filter === 'new' ? 'active' : ''}`}
          onClick={() => setFilter('new')}
        >
          🆕 New ({summary.new || 0})
        </button>
        <button
          className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilter('in_progress')}
        >
          🔄 In Progress ({summary.in_progress || 0})
        </button>
        <button
          className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`}
          onClick={() => setFilter('resolved')}
        >
          ✅ Resolved ({summary.resolved || 0})
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading assignments...</div>
      ) : (
        <div className="assignments-list">
          {assignments.length === 0 ? (
            <div className="no-assignments">
              No {filter} assignments
            </div>
          ) : (
            assignments.map(assignment => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                onStatusUpdate={updateStatus}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const AssignmentCard = ({ assignment, onStatusUpdate }) => {
  const priorityEmoji = {
    low: '🟢',
    normal: '🟡',
    high: '🟠',
    urgent: '🔴'
  };

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

  return (
    <div className={`assignment-card ${isOverdue ? 'overdue' : ''}`}>
      <div className="assignment-header">
        <span className={`priority priority-${assignment.priority}`}>
          {priorityEmoji[assignment.priority]} {assignment.priority}
        </span>
        <span className="account-name">
          {assignment.accountId.displayName}
        </span>
      </div>

      <div className="assignment-subject">
        <strong>{assignment.emailSubject}</strong>
      </div>

      <div className="assignment-from">
        From: {assignment.emailFrom}
      </div>

      <div className="assignment-meta">
        <span>
          Assigned by: {assignment.assignedBy.fullName}
        </span>
        {assignment.dueDate && (
          <span className={isOverdue ? 'overdue-label' : ''}>
            Due: {new Date(assignment.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {assignment.internalNotes.length > 0 && (
        <div className="assignment-notes">
          📝 {assignment.internalNotes.length} note(s)
        </div>
      )}

      <div className="assignment-actions">
        {assignment.status === 'new' && (
          <button
            className="btn-secondary"
            onClick={() => onStatusUpdate(assignment._id, 'in_progress')}
          >
            Start Working
          </button>
        )}

        {assignment.status === 'in_progress' && (
          <button
            className="btn-primary"
            onClick={() => onStatusUpdate(assignment._id, 'resolved')}
          >
            Mark Resolved
          </button>
        )}

        <button className="btn-link">View Email →</button>
      </div>
    </div>
  );
};

export default MyAssignments;
```

---

## 2.2 Internal Notes System

**Implementation already included in EmailAssignment model above**

**File:** `Frontend/src/components/email/InternalNotes.js` (NEW)

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InternalNotes = ({ assignmentId }) => {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [assignmentId]);

  const fetchNotes = async () => {
    try {
      const res = await axios.get(`/api/email-assignments/${assignmentId}`);
      setNotes(res.data.assignment.internalNotes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) {
      alert('Please enter a note');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`/api/email-assignments/${assignmentId}/notes`, {
        content: newNote
      });

      setNewNote('');
      fetchNotes();
    } catch (error) {
      alert('Error adding note: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="internal-notes">
      <h4>Internal Notes</h4>
      <p className="help-text">
        These notes are only visible to your team members, not to the customer.
      </p>

      <div className="notes-list">
        {notes.map((note, idx) => (
          <div key={idx} className="note-item">
            <div className="note-header">
              <strong>{note.author.fullName}</strong>
              <span className="note-date">
                {new Date(note.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="note-content">{note.content}</div>
          </div>
        ))}
      </div>

      <div className="add-note">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add internal note (not visible to customer)..."
          rows="3"
        />
        <button onClick={addNote} disabled={loading}>
          {loading ? 'Adding...' : 'Add Note'}
        </button>
      </div>
    </div>
  );
};

export default InternalNotes;
```

---

## 2.3 Email Activity History

**Create:** `Backend/models/EmailActivity.js` (NEW FILE)

```javascript
const mongoose = require('mongoose');

const EmailActivitySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: true,
    index: true
  },

  messageId: String,

  activityType: {
    type: String,
    enum: [
      'email_sent',
      'email_received',
      'email_read',
      'email_assigned',
      'status_changed',
      'note_added',
      'email_forwarded',
      'email_replied'
    ],
    required: true
  },

  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  details: mongoose.Schema.Types.Mixed,

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

EmailActivitySchema.index({ companyId: 1, accountId: 1, timestamp: -1 });
EmailActivitySchema.index({ messageId: 1, timestamp: -1 });

module.exports = mongoose.model('EmailActivity', EmailActivitySchema);
```

**API Endpoint:**
```javascript
// GET /api/email-activity/:accountId?messageId=...&limit=50
router.get('/:accountId', authenticateToken, async (req, res) => {
  const { messageId, limit = 50 } = req.query;
  const query = { accountId: req.params.accountId };
  if (messageId) query.messageId = messageId;

  const activities = await EmailActivity.find(query)
    .populate('performedBy', 'fullName email')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));

  res.json({ activities });
});
```

---

## 2.4 Testing Checklist for Phase 2

### Manual Testing

- [ ] Assign email to team member
- [ ] Check assignment appears in "My Assignments"
- [ ] Update status from new → in_progress → resolved
- [ ] Add internal note to assignment
- [ ] View note in assignment details
- [ ] Check activity log shows all actions
- [ ] Test overdue assignments (due date in past)
- [ ] Test priority levels (low, normal, high, urgent)

---

**(Phase 3 continues in next section...)**

---

# 🚀 PHASE 3: ADVANCED FEATURES (Future)

**Timeline:** 3-4 weeks
**Priority:** Medium
**Dependencies:** Phases 1 & 2 complete

---

## 3.1 Auto-Assignment Rules

**Create:** `Backend/models/AssignmentRule.js` (NEW)

```javascript
const AssignmentRuleSchema = new mongoose.Schema({
  companyId: { type: ObjectId, required: true },
  accountId: { type: ObjectId, required: true },

  name: String,  // "Auto-assign sales emails"
  enabled: Boolean,
  priority: Number,  // Higher priority rules run first

  conditions: {
    fromContains: [String],  // ["@bigclient.com"]
    subjectContains: [String],
    toContains: [String],
    hasAttachment: Boolean,
    keywords: [String]
  },

  actions: {
    assignTo: ObjectId,  // User ID
    setStatus: String,
    setPriority: String,
    addTags: [String],
    sendNotification: Boolean
  },

  stats: {
    timesTriggered: Number,
    lastTriggered: Date
  }
});
```

**Implementation:**
- Run rules on email receive (webhook or polling)
- Match conditions against incoming emails
- Auto-assign based on rules
- Track effectiveness metrics

---

## 3.2 Email Templates per Team

**Extend:** `Backend/models/EmailTemplate.js`

```javascript
{
  teamVisibility: {
    type: String,
    enum: ['company', 'department', 'account'],
    default: 'company'
  },

  accountId: ObjectId,  // If account-specific
  departmentId: String,  // If department-specific

  variables: [
    { name: '{{customerName}}', required: true },
    { name: '{{ticketNumber}}', required: false }
  ]
}
```

**UI Component:**
- Template library in Team Inbox
- Insert template while composing
- Auto-fill variables
- Version control for templates

---

## 3.3 Analytics & Reports

**Create:** `Backend/models/EmailAnalytics.js` (NEW)

```javascript
{
  companyId: ObjectId,
  accountId: ObjectId,

  period: {
    start: Date,
    end: Date,
    type: 'daily' | 'weekly' | 'monthly'
  },

  metrics: {
    totalReceived: Number,
    totalSent: Number,
    averageResponseTime: Number,  // Minutes
    assignmentsCreated: Number,
    assignmentsResolved: Number,
    unreadCount: Number,

    byUser: [{
      userId: ObjectId,
      emailsSent: Number,
      assignmentsCompleted: Number,
      avgResponseTime: Number
    }],

    byStatus: {
      new: Number,
      in_progress: Number,
      resolved: Number
    }
  }
}
```

**Dashboard Features:**
- Team email volume charts
- Response time trends
- Individual performance metrics
- Department-wise breakdown
- Export to CSV/PDF

---

## 3.4 Notification System

**Real-time notifications via Socket.IO:**

```javascript
// When email assigned:
io.to(userId).emit('email_assigned', {
  assignmentId,
  subject,
  priority,
  assignedBy
});

// When status changed:
io.to(userId).emit('assignment_updated', {
  assignmentId,
  newStatus
});
```

**Browser notifications:**
```javascript
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('New Email Assignment', {
    body: `You have been assigned: ${subject}`,
    icon: '/icon.png'
  });
}
```

---

# 📊 IMPLEMENTATION ROADMAP

## Week 1-2: Phase 1 Core (Backend)
- [ ] Update EmailAccount model with companyId, roleAccess
- [ ] Update EmailDomain model with companyQuota
- [ ] Create requireCompanyOwner middleware
- [ ] Create requireEmailAccess middleware
- [ ] Implement domain management endpoints
- [ ] Implement team account creation endpoint
- [ ] Implement team inbox access endpoints
- [ ] Test domain verification flow
- [ ] Test account creation with doveadm

## Week 3: Phase 1 Core (Frontend)
- [ ] Build DomainManagement component
- [ ] Build CreateTeamAccount component
- [ ] Build TeamInbox component
- [ ] Update MainstreamInbox Team tab
- [ ] Add CSS styling
- [ ] Test end-to-end user flow

## Week 4-5: Phase 2 Collaboration (Backend)
- [ ] Create EmailAssignment model
- [ ] Create email-assignments routes
- [ ] Implement assignment endpoints
- [ ] Create EmailActivity model
- [ ] Implement activity tracking
- [ ] Test assignment workflow

## Week 6: Phase 2 Collaboration (Frontend)
- [ ] Build EmailAssignmentPanel component
- [ ] Build MyAssignments dashboard
- [ ] Build InternalNotes component
- [ ] Integrate with TeamInbox
- [ ] Test collaboration features

## Week 7-9: Phase 3 Advanced
- [ ] Build AssignmentRule model
- [ ] Implement auto-assignment logic
- [ ] Build email templates system
- [ ] Create analytics dashboard
- [ ] Performance optimization

## Week 10: Testing & Deployment
- [ ] Integration testing
- [ ] Load testing
- [ ] Security audit
- [ ] Production deployment
- [ ] User training documentation

---

# 📁 CRITICAL FILES SUMMARY

## Backend Files to Create/Modify

### Models
- ✏️ `Backend/models/EmailAccount.js` - ADD companyId, roleAccess, departmentAccess
- ✏️ `Backend/models/EmailDomain.js` - ADD companyQuota, defaultRolePermissions
- ✏️ `Backend/server.js` (Company schema) - ADD emailSettings
- ✨ `Backend/models/EmailAssignment.js` - CREATE
- ✨ `Backend/models/EmailActivity.js` - CREATE
- ✨ `Backend/models/AssignmentRule.js` - CREATE (Phase 3)

### Routes
- ✏️ `Backend/routes/email-domains.js` - UPDATE for owner-only access
- ✏️ `Backend/routes/email-accounts.js` - ADD team account endpoints
- ✨ `Backend/routes/email-assignments.js` - CREATE
- ✨ `Backend/routes/email-activity.js` - CREATE

### Middleware
- ✨ `Backend/middleware/emailAuth.js` - CREATE (requireCompanyOwner, requireEmailAccess)

## Frontend Files to Create/Modify

### New Components
- ✨ `Frontend/src/components/email/DomainManagement.js`
- ✨ `Frontend/src/components/email/CreateTeamAccount.js`
- ✨ `Frontend/src/components/email/TeamInbox.js`
- ✨ `Frontend/src/components/email/EmailAssignmentPanel.js`
- ✨ `Frontend/src/components/email/MyAssignments.js`
- ✨ `Frontend/src/components/email/InternalNotes.js`

### Update Existing
- ✏️ `Frontend/src/components/MainstreamInbox.js` - UPDATE Team tab

### Styles
- ✨ `Frontend/src/styles/DomainManagement.css`
- ✨ `Frontend/src/styles/CreateTeamAccount.css`
- ✨ `Frontend/src/styles/TeamInbox.css`
- ✨ `Frontend/src/styles/MyAssignments.css`

---

# 🔐 SECURITY CHECKLIST

## Access Control
- ✅ Role-based permissions (Owner, Manager, Employee)
- ✅ Company-level isolation (companyId check on all queries)
- ✅ Email account access validation before operations
- ✅ IMAP/SMTP credential encryption (AES-256)
- ✅ Audit logging for all sensitive actions

## Data Protection
- ✅ Encrypted passwords (bcrypt for account passwords)
- ✅ Encrypted IMAP/SMTP credentials (AES-256-CBC)
- ✅ JWT authentication with expiry
- ✅ HTTPS only in production
- ✅ Rate limiting on API endpoints
- ✅ Input validation and sanitization

## Email Security
- ✅ DKIM signing per domain
- ✅ SPF records validation
- ✅ DMARC policies
- ✅ TLS/SSL for IMAP/SMTP connections
- ✅ Spam filtering

---

# ✅ TESTING STRATEGY

## Unit Tests
```javascript
describe('EmailAccount', () => {
  test('hasAccess() allows Owner', () => {});
  test('hasAccess() denies Employee without permission', () => {});
  test('getPermissions() returns correct permissions', () => {});
});

describe('EmailDomain', () => {
  test('canCreateAccount() rejects if quota exceeded', () => {});
  test('canCreateAccount() rejects if account limit reached', () => {});
  test('calculateQuotaUsage() correctly sums usage', () => {});
});
```

## Integration Tests
```javascript
describe('Domain Management API', () => {
  test('POST /api/email-domains/ creates domain with DKIM', async () => {});
  test('POST /api/email-domains/:id/verify-dns verifies records', async () => {});
});

describe('Team Accounts API', () => {
  test('POST /api/email-accounts/create-team creates account', async () => {});
  test('GET /api/email-accounts/my-team-accounts filters by access', async () => {});
  test('POST /api/email-accounts/team-send enforces permissions', async () => {});
});
```

## End-to-End Tests
1. Owner workflow: Add domain → Verify → Create accounts
2. Manager workflow: Access shared inbox → Send email
3. Employee workflow: Limited access based on permissions
4. Assignment workflow: Assign → Update → Resolve

---

# 🚀 DEPLOYMENT CHECKLIST

## Pre-Deployment
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Database migration scripts ready
- [ ] Environment variables configured
- [ ] DNS documentation prepared for customers
- [ ] Backup strategy verified

## Deployment Steps
1. [ ] Backup production database
2. [ ] Deploy backend code (models, routes, middleware)
3. [ ] Run database migrations
4. [ ] Deploy frontend code (components, styles)
5. [ ] Restart PM2 services (`pm2 restart noxtm-backend`)
6. [ ] Clear frontend build cache
7. [ ] Test domain creation flow
8. [ ] Test email sending/receiving
9. [ ] Monitor logs for errors

## Post-Deployment
- [ ] Monitor server performance (CPU, memory)
- [ ] Check email delivery rates
- [ ] Verify DKIM signing works for custom domains
- [ ] Test with pilot company
- [ ] Gather user feedback
- [ ] Create user documentation (PDF/video)

---

# 📚 DOCUMENTATION REQUIRED

## User Documentation

### 1. Company Owner Guide
- How to add and verify a custom domain
- Step-by-step DNS configuration
- Creating team email accounts
- Setting role-based permissions
- Managing company quota
- Troubleshooting DNS issues

### 2. Team Member Guide
- Accessing shared inboxes
- Sending from team accounts
- Email assignment workflow
- Using internal notes
- Managing assignments dashboard

### 3. DNS Setup Guide (Technical)
- MX records configuration
- SPF record setup
- DKIM public key installation
- DMARC policy configuration
- Verification TXT record

## Technical Documentation

### 1. API Reference
- All endpoints with request/response examples
- Authentication requirements
- Error codes and handling
- Rate limiting information

### 2. Architecture Guide
- Multi-tenancy design
- Role-based access control flow
- Mail server integration
- Quota management system
- Database schema diagrams

---

# 📈 SUCCESS METRICS

## Phase 1 Goals
- [ ] 100% of company owners can add and verify domains
- [ ] 0 critical bugs in team account creation
- [ ] < 5 seconds domain verification time
- [ ] 100% DKIM signing success rate

## Phase 2 Goals
- [ ] 80% assignment adoption rate
- [ ] Average response time reduction by 30%
- [ ] 90% user satisfaction with collaboration features
- [ ] < 1% assignment data loss

## Phase 3 Goals
- [ ] 50% of companies using auto-assignment rules
- [ ] 70% of teams using email templates
- [ ] Analytics dashboard used weekly by 60% of owners

---

# 💰 COST & RESOURCE ESTIMATES

## Development Team
- **Backend Developer:** 1 FTE for 8 weeks
- **Frontend Developer:** 1 FTE for 6 weeks
- **QA Engineer:** 0.5 FTE for 4 weeks

## Infrastructure
- **Mail Server:** Already provisioned (mail.noxtm.com)
- **Database Storage:** +20GB for email metadata
- **Redis:** Already provisioned for caching

## Total Estimated Cost
- **Development:** 14 person-weeks × $X/week
- **Infrastructure:** $0 (using existing)
- **Testing/QA:** 2 person-weeks × $X/week

---

**Plan Status:** ✅ COMPREHENSIVE - READY FOR IMPLEMENTATION
**Total Estimated Time:** 10 weeks (2.5 months)
**Team Size Recommended:** 2-3 developers
**Risk Level:** Medium (mail server integration complexity)

**Next Step:** ✅ Review plan with stakeholders → Begin Phase 1 implementation

---

**Generated:** 2025-11-26
**Version:** 1.0
**Document Type:** Implementation Plan
