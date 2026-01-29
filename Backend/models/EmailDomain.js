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
      enum: ['pending', 'success', 'failed', 'temporary_failure', 'not_registered', 'PENDING', 'SUCCESS', 'FAILED', 'TEMPORARY_FAILURE', 'NOT_STARTED'],
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
  },

  // Domain Warmup Configuration
  warmup: {
    // Whether warmup is enabled for this domain
    enabled: {
      type: Boolean,
      default: false
    },

    // Warmup status: not_started, in_progress, completed, paused
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'paused'],
      default: 'not_started'
    },

    // When warmup was started
    startDate: {
      type: Date
    },

    // Current day in the warmup schedule (1-based)
    currentDay: {
      type: Number,
      default: 0
    },

    // Total days in warmup plan
    totalDays: {
      type: Number,
      default: 28 // 4 weeks default
    },

    // Daily send limit based on current warmup day
    dailyLimit: {
      type: Number,
      default: 10
    },

    // Emails sent today during warmup
    sentToday: {
      type: Number,
      default: 0
    },

    // Last reset date for sentToday counter
    lastResetDate: {
      type: Date
    },

    // Warmup schedule type: conservative (6 weeks), standard (4 weeks), aggressive (2 weeks)
    scheduleType: {
      type: String,
      enum: ['conservative', 'standard', 'aggressive'],
      default: 'standard'
    },

    // Custom schedule (array of daily limits)
    customSchedule: [{
      day: Number,
      limit: Number
    }],

    // Warmup progress history
    history: [{
      date: {
        type: Date,
        default: Date.now
      },
      day: Number,
      emailsSent: Number,
      limit: Number,
      bounceRate: Number,
      spamRate: Number
    }],

    // Warmup completion date
    completedAt: {
      type: Date
    },

    // Suggested warmup (shown for domains < 30 days old)
    suggestionDismissed: {
      type: Boolean,
      default: false
    }
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

// Get warmup schedule based on type
emailDomainSchema.methods.getWarmupSchedule = function() {
  const schedules = {
    conservative: [
      // Week 1
      { day: 1, limit: 5 }, { day: 2, limit: 5 }, { day: 3, limit: 10 }, 
      { day: 4, limit: 10 }, { day: 5, limit: 15 }, { day: 6, limit: 15 }, { day: 7, limit: 20 },
      // Week 2
      { day: 8, limit: 25 }, { day: 9, limit: 30 }, { day: 10, limit: 35 }, 
      { day: 11, limit: 40 }, { day: 12, limit: 45 }, { day: 13, limit: 50 }, { day: 14, limit: 55 },
      // Week 3
      { day: 15, limit: 60 }, { day: 16, limit: 70 }, { day: 17, limit: 80 }, 
      { day: 18, limit: 90 }, { day: 19, limit: 100 }, { day: 20, limit: 115 }, { day: 21, limit: 130 },
      // Week 4
      { day: 22, limit: 150 }, { day: 23, limit: 175 }, { day: 24, limit: 200 }, 
      { day: 25, limit: 230 }, { day: 26, limit: 260 }, { day: 27, limit: 300 }, { day: 28, limit: 350 },
      // Week 5
      { day: 29, limit: 400 }, { day: 30, limit: 450 }, { day: 31, limit: 500 }, 
      { day: 32, limit: 550 }, { day: 33, limit: 600 }, { day: 34, limit: 700 }, { day: 35, limit: 800 },
      // Week 6
      { day: 36, limit: 900 }, { day: 37, limit: 1000 }, { day: 38, limit: 1100 }, 
      { day: 39, limit: 1200 }, { day: 40, limit: 1400 }, { day: 41, limit: 1600 }, { day: 42, limit: 2000 }
    ],
    standard: [
      // Week 1
      { day: 1, limit: 10 }, { day: 2, limit: 15 }, { day: 3, limit: 20 }, 
      { day: 4, limit: 30 }, { day: 5, limit: 40 }, { day: 6, limit: 50 }, { day: 7, limit: 65 },
      // Week 2
      { day: 8, limit: 80 }, { day: 9, limit: 100 }, { day: 10, limit: 120 }, 
      { day: 11, limit: 150 }, { day: 12, limit: 180 }, { day: 13, limit: 220 }, { day: 14, limit: 270 },
      // Week 3
      { day: 15, limit: 330 }, { day: 16, limit: 400 }, { day: 17, limit: 480 }, 
      { day: 18, limit: 570 }, { day: 19, limit: 680 }, { day: 20, limit: 800 }, { day: 21, limit: 950 },
      // Week 4
      { day: 22, limit: 1100 }, { day: 23, limit: 1300 }, { day: 24, limit: 1500 }, 
      { day: 25, limit: 1750 }, { day: 26, limit: 2000 }, { day: 27, limit: 2300 }, { day: 28, limit: 2500 }
    ],
    aggressive: [
      // Week 1
      { day: 1, limit: 25 }, { day: 2, limit: 50 }, { day: 3, limit: 100 }, 
      { day: 4, limit: 150 }, { day: 5, limit: 200 }, { day: 6, limit: 300 }, { day: 7, limit: 400 },
      // Week 2
      { day: 8, limit: 500 }, { day: 9, limit: 650 }, { day: 10, limit: 800 }, 
      { day: 11, limit: 1000 }, { day: 12, limit: 1300 }, { day: 13, limit: 1600 }, { day: 14, limit: 2000 }
    ]
  };

  if (this.warmup.customSchedule && this.warmup.customSchedule.length > 0) {
    return this.warmup.customSchedule;
  }

  return schedules[this.warmup.scheduleType] || schedules.standard;
};

// Check if domain needs warmup suggestion
emailDomainSchema.methods.needsWarmupSuggestion = function() {
  // Domain is less than 30 days old
  const domainAge = Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  
  // Show suggestion if domain is new, warmup not started, and not dismissed
  return domainAge < 30 && 
         this.warmup.status === 'not_started' && 
         !this.warmup.suggestionDismissed &&
         this.verified;
};

// Get current warmup daily limit
emailDomainSchema.methods.getCurrentWarmupLimit = function() {
  if (!this.warmup.enabled || this.warmup.status !== 'in_progress') {
    return null; // No limit enforced
  }

  const schedule = this.getWarmupSchedule();
  const currentDaySchedule = schedule.find(s => s.day === this.warmup.currentDay);
  
  return currentDaySchedule ? currentDaySchedule.limit : schedule[schedule.length - 1].limit;
};

// Advance warmup to next day
emailDomainSchema.methods.advanceWarmupDay = async function() {
  if (this.warmup.status !== 'in_progress') return;

  const schedule = this.getWarmupSchedule();
  
  // Record today's stats
  this.warmup.history.push({
    date: new Date(),
    day: this.warmup.currentDay,
    emailsSent: this.warmup.sentToday,
    limit: this.warmup.dailyLimit,
    bounceRate: 0, // To be updated from email stats
    spamRate: 0
  });

  // Advance to next day
  this.warmup.currentDay += 1;
  this.warmup.sentToday = 0;
  this.warmup.lastResetDate = new Date();

  // Update daily limit
  const nextDaySchedule = schedule.find(s => s.day === this.warmup.currentDay);
  if (nextDaySchedule) {
    this.warmup.dailyLimit = nextDaySchedule.limit;
  }

  // Check if warmup is complete
  if (this.warmup.currentDay > schedule.length) {
    this.warmup.status = 'completed';
    this.warmup.completedAt = new Date();
  }

  return this.save();
};

// Start warmup
emailDomainSchema.methods.startWarmup = async function(scheduleType = 'standard') {
  this.warmup.enabled = true;
  this.warmup.status = 'in_progress';
  this.warmup.startDate = new Date();
  this.warmup.currentDay = 1;
  this.warmup.scheduleType = scheduleType;
  this.warmup.sentToday = 0;
  this.warmup.lastResetDate = new Date();

  const schedule = this.getWarmupSchedule();
  this.warmup.dailyLimit = schedule[0].limit;
  this.warmup.totalDays = schedule.length;

  return this.save();
};

module.exports = mongoose.model('EmailDomain', emailDomainSchema);
