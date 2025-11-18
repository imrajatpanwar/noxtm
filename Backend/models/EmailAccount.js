const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const emailAccountSchema = new mongoose.Schema({
  // Account identification
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },

  // Account type: 'noxtm-hosted' (created on this server) or 'external-imap' (existing email added)
  accountType: {
    type: String,
    enum: ['noxtm-hosted', 'external-imap'],
    default: 'noxtm-hosted'
  },

  // Account credentials
  password: {
    type: String,
    required: true,
    minlength: 8
  },

  // For external IMAP accounts - encrypted credentials
  imapSettings: {
    host: String,
    port: Number,
    secure: Boolean, // true for SSL/TLS
    username: String,
    encryptedPassword: String // Encrypted IMAP password
  },

  smtpSettings: {
    host: String,
    port: Number,
    secure: Boolean,
    username: String,
    encryptedPassword: String // Encrypted SMTP password
  },

  // Connection status for external accounts
  isVerified: {
    type: Boolean,
    default: false
  },

  lastConnectionTest: Date,
  connectionError: String,

  // Account settings
  displayName: {
    type: String,
    default: '',
    trim: true
  },

  enabled: {
    type: Boolean,
    default: true
  },

  // Domain reference
  domain: {
    type: String,
    required: true,
    lowercase: true
  },

  // Storage settings
  quota: {
    type: Number,
    default: 1024, // MB
    min: 0
  },

  usedStorage: {
    type: Number,
    default: 0 // MB
  },

  // Inbox statistics (for external IMAP accounts)
  inboxStats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    unreadMessages: {
      type: Number,
      default: 0
    },
    lastSyncedAt: Date
  },

  // IMAP/SMTP credentials
  imapEnabled: {
    type: Boolean,
    default: true
  },

  smtpEnabled: {
    type: Boolean,
    default: true
  },

  popEnabled: {
    type: Boolean,
    default: false
  },

  // Aliases (alternative email addresses)
  aliases: [{
    type: String,
    lowercase: true,
    trim: true
  }],

  // Forwarding settings
  forwardTo: [{
    type: String,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid forward email format']
  }],

  forwardEnabled: {
    type: Boolean,
    default: false
  },

  keepCopy: {
    type: Boolean,
    default: true // Keep copy when forwarding
  },

  // Spam filtering
  spamFilterEnabled: {
    type: Boolean,
    default: true
  },

  spamThreshold: {
    type: Number,
    default: 5.0, // Spam score threshold
    min: 0,
    max: 10
  },

  // Password reset
  resetToken: String,
  resetTokenExpiry: Date,

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for imported accounts
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  lastLoginAt: Date,

  // Stats
  emailsSent: {
    type: Number,
    default: 0
  },

  emailsReceived: {
    type: Number,
    default: 0
  },

  spamBlocked: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster lookups
emailAccountSchema.index({ email: 1 });
emailAccountSchema.index({ domain: 1 });
emailAccountSchema.index({ enabled: 1 });
emailAccountSchema.index({ createdBy: 1 });

// Hash password before saving
emailAccountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
emailAccountSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate reset token
emailAccountSchema.methods.generateResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');

  this.resetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetTokenExpiry = Date.now() + 3600000; // 1 hour

  return token;
};

// Virtual for storage percentage
emailAccountSchema.virtual('storagePercentage').get(function() {
  if (this.quota === 0) return 0;
  return Math.round((this.usedStorage / this.quota) * 100);
});

// Virtual for is quota exceeded
emailAccountSchema.virtual('isQuotaExceeded').get(function() {
  return this.usedStorage >= this.quota;
});

module.exports = mongoose.model('EmailAccount', emailAccountSchema);
