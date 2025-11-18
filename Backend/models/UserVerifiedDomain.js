const mongoose = require('mongoose');

/**
 * UserVerifiedDomain Model
 * Separate from EmailDomain - this is for SaaS "Bring Your Own Domain" feature
 * Tracks domains verified in AWS SES for sending emails through the dashboard
 */
const userVerifiedDomainSchema = new mongoose.Schema({
  // Domain identification
  domain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/, 'Invalid domain format']
  },

  // Ownership
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },

  // AWS SES Verification Status
  verificationStatus: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'TEMPORARY_FAILURE', 'NOT_STARTED'],
    default: 'NOT_STARTED'
  },

  // AWS SES Identity Type
  identityType: {
    type: String,
    enum: ['DOMAIN', 'EMAIL_ADDRESS'],
    default: 'DOMAIN'
  },

  // DKIM Configuration (from AWS SES)
  dkimTokens: [{
    type: String
  }],

  dkimVerificationStatus: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'TEMPORARY_FAILURE', 'NOT_STARTED'],
    default: 'NOT_STARTED'
  },

  // DNS Records to display to user
  dnsRecords: [{
    type: {
      type: String,
      enum: ['CNAME', 'TXT', 'MX']
    },
    name: String,
    value: String,
    verified: {
      type: Boolean,
      default: false
    }
  }],

  // AWS SES Configuration
  awsSesRegion: {
    type: String,
    default: 'eu-north-1'
  },

  // Last verification check
  lastVerificationCheck: Date,

  verifiedAt: Date,

  // Usage statistics
  stats: {
    emailsSent: {
      type: Number,
      default: 0
    },
    lastEmailSent: Date,
    totalBounces: {
      type: Number,
      default: 0
    },
    totalComplaints: {
      type: Number,
      default: 0
    }
  },

  // Security and limits
  enabled: {
    type: Boolean,
    default: true
  },

  dailyQuota: {
    type: Number,
    default: 1000 // Emails per day per domain
  },

  // Admin notes
  notes: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
userVerifiedDomainSchema.index({ userId: 1, verificationStatus: 1 });
userVerifiedDomainSchema.index({ companyId: 1, verificationStatus: 1 });
userVerifiedDomainSchema.index({ verificationStatus: 1, enabled: 1 });
userVerifiedDomainSchema.index({ domain: 1, userId: 1 }, { unique: true });

// Static method: Check domain limit per user
userVerifiedDomainSchema.statics.checkDomainLimit = async function(userId, limit = 1) {
  const count = await this.countDocuments({ 
    userId,
    verificationStatus: { $in: ['PENDING', 'SUCCESS'] }
  });
  
  return {
    count,
    limit,
    canAddMore: count < limit,
    remaining: Math.max(0, limit - count)
  };
};

// Static method: Get user's verified domains
userVerifiedDomainSchema.statics.getVerifiedDomains = async function(userId) {
  return this.find({
    userId,
    verificationStatus: 'SUCCESS',
    enabled: true
  }).select('domain verifiedAt stats');
};

// Instance method: Check if domain can send (verified and enabled)
userVerifiedDomainSchema.methods.canSend = function() {
  return this.verificationStatus === 'SUCCESS' && this.enabled;
};

// Instance method: Increment sent counter
userVerifiedDomainSchema.methods.incrementSentCount = async function() {
  this.stats.emailsSent += 1;
  this.stats.lastEmailSent = new Date();
  await this.save();
};

// Instance method: Record bounce
userVerifiedDomainSchema.methods.recordBounce = async function() {
  this.stats.totalBounces += 1;
  await this.save();
};

// Instance method: Record complaint
userVerifiedDomainSchema.methods.recordComplaint = async function() {
  this.stats.totalComplaints += 1;
  await this.save();
};

// Pre-save hook: Update updatedAt
userVerifiedDomainSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('UserVerifiedDomain', userVerifiedDomainSchema);
