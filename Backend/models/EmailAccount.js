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
    enum: ['shared', 'departmental', 'support', 'sales', 'general', 'personal'],
    default: 'personal'
  },

  description: {
    type: String,
    trim: true,
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

// NEW: Method to check if user has access to this account
emailAccountSchema.methods.hasAccess = async function(user) {
  // If no company ID, it's a personal account (backward compatibility)
  if (!this.companyId) {
    return this.createdBy && this.createdBy.equals(user._id);
  }

  // Check if user's company matches
  if (!user.companyId || !user.companyId.equals(this.companyId)) {
    return false;
  }

  // Get user's role in company
  const Company = mongoose.model('Company');
  const company = await Company.findById(this.companyId);

  if (!company) return false;

  const member = company.members.find(m => m.user.equals(user._id));
  if (!member) return false;

  const userRole = member.roleInCompany;

  // Check if role has access
  const roleAccess = this.roleAccess.find(r => r.role === userRole);
  if (!roleAccess) return false;

  // Check department access if specified
  if (this.departmentAccess && this.departmentAccess.length > 0) {
    if (!this.departmentAccess.includes(member.department)) {
      return false;
    }
  }

  return true;
};

// NEW: Method to get permissions for a user
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

  const userRole = member.roleInCompany;

  // Get role permissions
  const roleAccess = this.roleAccess.find(r => r.role === userRole);
  if (!roleAccess) return noPermissions;

  // Check department access
  if (this.departmentAccess && this.departmentAccess.length > 0) {
    if (!this.departmentAccess.includes(member.department)) {
      return noPermissions;
    }
  }

  return roleAccess.permissions;
};

module.exports = mongoose.model('EmailAccount', emailAccountSchema);
