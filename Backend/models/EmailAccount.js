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

  // NEW: Multi-tenancy support for team email
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },

  // Role-based access control (simplified: Owner/Member)
  // Personal Inbox: all company members have access
  // Email Marketing: only those with marketing permission
  roleAccess: [{
    role: {
      type: String,
      enum: ['Owner', 'Member'],
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
    enum: ['shared', 'departmental', 'support', 'sales', 'general', 'personal'],
    default: 'personal'
  },

  description: {
    type: String,
    trim: true,
    default: ''
  },

  // Email signature (HTML supported)
  signature: {
    type: String,
    default: ''
  },

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
// NEW: Team email indexes
emailAccountSchema.index({ companyId: 1, enabled: 1 });
emailAccountSchema.index({ companyId: 1, domain: 1 });
emailAccountSchema.index({ 'roleAccess.role': 1 });

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

// Method to check if user has access to this account
// Simplified: same company = personal inbox access for all members
emailAccountSchema.methods.hasAccess = async function(user) {
  // If no company ID, it's a personal account (backward compatibility)
  if (!this.companyId) {
    return this.createdBy && this.createdBy.equals(user._id);
  }

  // Check if user's company matches - all company members have inbox access
  if (!user.companyId || !user.companyId.equals(this.companyId)) {
    return false;
  }

  // Get user's membership in company
  const Company = mongoose.model('Company');
  const company = await Company.findById(this.companyId);

  if (!company) return false;

  const member = company.members.find(m => m.user.equals(user._id));
  if (!member) return false;

  // All company members have access to personal inbox
  // Department access check only if specified
  if (this.departmentAccess && this.departmentAccess.length > 0) {
    if (!this.departmentAccess.includes(member.department)) {
      return false;
    }
  }

  return true;
};

// Method to get permissions for a user
// Owner gets full permissions, Member gets read/send
emailAccountSchema.methods.getPermissions = async function(user) {
  // Default no permissions
  const noPermissions = {
    canRead: false,
    canSend: false,
    canDelete: false,
    canManage: false
  };

  // If no company ID, check if user is creator
  if (!this.companyId) {
    if (this.createdBy && this.createdBy.equals(user._id)) {
      return {
        canRead: true,
        canSend: true,
        canDelete: true,
        canManage: true
      };
    }
    return noPermissions;
  }

  // Check company membership
  if (!user.companyId || !user.companyId.equals(this.companyId)) {
    return noPermissions;
  }

  const Company = mongoose.model('Company');
  const company = await Company.findById(this.companyId);

  if (!company) return noPermissions;

  const member = company.members.find(m => m.user.equals(user._id));
  if (!member) return noPermissions;

  // Check department access
  if (this.departmentAccess && this.departmentAccess.length > 0) {
    if (!this.departmentAccess.includes(member.department)) {
      return noPermissions;
    }
  }

  // Owner gets full permissions
  if (member.roleInCompany === 'Owner') {
    return {
      canRead: true,
      canSend: true,
      canDelete: true,
      canManage: true
    };
  }

  // Member gets read and send permissions for personal inbox
  return {
    canRead: true,
    canSend: true,
    canDelete: false,
    canManage: false
  };
};

module.exports = mongoose.model('EmailAccount', emailAccountSchema);
