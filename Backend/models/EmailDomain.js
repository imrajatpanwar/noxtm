const mongoose = require('mongoose');

const emailDomainSchema = new mongoose.Schema({
  // Domain identification
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/, 'Invalid domain format']
  },

  // Verification status
  verified: {
    type: Boolean,
    default: false
  },

  verificationToken: {
    type: String
  },

  verifiedAt: Date,

  // DNS verification status (separate from full verification)
  dnsVerified: {
    type: Boolean,
    default: false
  },

  dnsVerifiedAt: Date,

  // AWS SES verification status (separate tracking)
  awsSesVerified: {
    type: Boolean,
    default: false
  },

  awsSesVerifiedAt: Date,

  // DNS records
  dnsRecords: {
    // MX records
    mx: [{
      priority: Number,
      host: String,
      verified: Boolean
    }],

    // SPF record
    spf: {
      record: String,
      verified: Boolean
    },

    // DKIM records
    dkim: {
      selector: {
        type: String,
        default: 'default'
      },
      publicKey: String,
      privateKey: String,
      record: String,
      verified: Boolean
    },

    // DMARC record
    dmarc: {
      record: String,
      verified: Boolean
    },

    // Domain verification TXT
    verification: {
      record: String,
      verified: Boolean
    }
  },

  // Domain settings
  enabled: {
    type: Boolean,
    default: true
  },

  // SMTP settings
  smtpHost: {
    type: String,
    default: function() {
      const mailConfig = require('../config/mailConfig');
      return mailConfig.mailServer.smtp.host;
    }
  },

  smtpPort: {
    type: Number,
    default: 587
  },

  smtpSecure: {
    type: Boolean,
    default: false
  },

  // IMAP settings
  imapHost: {
    type: String,
    default: function() {
      const mailConfig = require('../config/mailConfig');
      return mailConfig.mailServer.imap.host;
    }
  },

  imapPort: {
    type: Number,
    default: 993
  },

  imapSecure: {
    type: Boolean,
    default: true
  },

  // POP3 settings
  popHost: {
    type: String,
    default: function() {
      const mailConfig = require('../config/mailConfig');
      return mailConfig.mailServer.pop3.host;
    }
  },

  popPort: {
    type: Number,
    default: 995
  },

  popSecure: {
    type: Boolean,
    default: true
  },

  // Webmail settings
  webmailUrl: {
    type: String,
    default: ''
  },

  webmailEnabled: {
    type: Boolean,
    default: false
  },

  // Storage limits
  defaultQuota: {
    type: Number,
    default: 1024 // MB per account
  },

  totalQuota: {
    type: Number,
    default: 10240 // MB total for domain
  },

  usedStorage: {
    type: Number,
    default: 0
  },

  // Account limits
  maxAccounts: {
    type: Number,
    default: 100
  },

  accountCount: {
    type: Number,
    default: 0
  },

  // Spam settings
  spamFilterEnabled: {
    type: Boolean,
    default: true
  },

  defaultSpamThreshold: {
    type: Number,
    default: 5.0
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },

  // NEW: Default permissions for new team accounts
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

  // AWS SES Integration
  awsSes: {
    // Whether domain is registered with AWS SES
    registered: {
      type: Boolean,
      default: false
    },

    // AWS SES verification status
    verificationStatus: {
      type: String,
      enum: ['pending', 'success', 'failed', 'temporary_failure', 'not_registered'],
      default: 'not_registered'
    },

    // Verification token from AWS SES
    verificationToken: {
      type: String
    },

    // DKIM tokens for AWS SES CNAME records
    dkimTokens: [{
      type: String
    }],

    // AWS SES Identity ARN (after successful verification)
    identityArn: {
      type: String
    },

    // Whether domain is verified for sending via AWS SES
    verifiedForSending: {
      type: Boolean,
      default: false
    },

    // Last verification attempt
    lastVerificationCheck: {
      type: Date
    },

    // Registration metadata
    registeredAt: {
      type: Date
    },

    verifiedAt: {
      type: Date
    }
  },

  // Verification tracking
  verificationAttempts: {
    type: Number,
    default: 0
  },

  lastVerificationAttempt: {
    type: Date
  },

  verificationHistory: [{
    attemptedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['success', 'partial', 'failed', 'error']
    },
    dnsRecords: {
      hasVerificationToken: Boolean,
      hasMxRecord: Boolean,
      hasSpf: Boolean,
      hasDkim: Boolean,
      hasDmarc: Boolean,
      awsSesVerified: Boolean,
      mxRecords: [String],
      txtRecords: [String]
    },
    error: String
  }],

  // Lifecycle milestones
  setupCompletedAt: {
    type: Date
  },

  firstEmailCreatedAt: {
    type: Date
  },

  // Stats
  totalEmailsSent: {
    type: Number,
    default: 0
  },

  totalEmailsReceived: {
    type: Number,
    default: 0
  },

  totalSpamBlocked: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
emailDomainSchema.index({ domain: 1 });
emailDomainSchema.index({ verified: 1 });
emailDomainSchema.index({ enabled: 1 });
emailDomainSchema.index({ companyId: 1 });

// Generate DKIM keys
emailDomainSchema.methods.generateDKIMKeys = async function() {
  const crypto = require('crypto');

  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        reject(err);
      } else {
        // Format public key for DNS
        const dnsKey = publicKey
          .replace(/-----BEGIN PUBLIC KEY-----/, '')
          .replace(/-----END PUBLIC KEY-----/, '')
          .replace(/\n/g, '');

        this.dnsRecords.dkim.publicKey = publicKey;
        this.dnsRecords.dkim.privateKey = privateKey;
        this.dnsRecords.dkim.record = `v=DKIM1; k=rsa; p=${dnsKey}`;

        resolve({ publicKey, privateKey });
      }
    });
  });
};

// Generate verification token
emailDomainSchema.methods.generateVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(16).toString('hex');
  this.verificationToken = token;
  this.dnsRecords.verification.record = `noxtm-verify=${token}`;
  return token;
};

// Virtual for storage percentage
emailDomainSchema.virtual('storagePercentage').get(function() {
  if (this.totalQuota === 0) return 0;
  return Math.round((this.usedStorage / this.totalQuota) * 100);
});

// NEW: Calculate total quota used across all accounts
emailDomainSchema.methods.calculateQuotaUsage = async function() {
  const EmailAccount = mongoose.model('EmailAccount');
  const accounts = await EmailAccount.find({
    domain: this.domain,
    companyId: this.companyId
  });

  let totalUsed = 0;
  for (const account of accounts) {
    if (account.usedStorage) {
      totalUsed += account.usedStorage;
    }
  }

  this.usedStorage = totalUsed;
  this.accountCount = accounts.length;

  return this.save();
};

// NEW: Check if company can create new account
emailDomainSchema.methods.canCreateAccount = function(quotaMB = 1024) {
  // Check account limit
  if (this.accountCount >= this.maxAccounts) {
    return {
      allowed: false,
      reason: 'Account limit reached',
      maxAccounts: this.maxAccounts
    };
  }

  // Check quota limit
  const projectedUsage = this.usedStorage + quotaMB;
  if (projectedUsage > this.totalQuota) {
    return {
      allowed: false,
      reason: 'Company quota exceeded',
      available: this.totalQuota - this.usedStorage,
      requested: quotaMB
    };
  }

  return { allowed: true };
};

module.exports = mongoose.model('EmailDomain', emailDomainSchema);
