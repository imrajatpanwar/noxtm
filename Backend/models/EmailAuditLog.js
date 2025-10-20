const mongoose = require('mongoose');

const emailAuditLogSchema = new mongoose.Schema({
  // Action information
  action: {
    type: String,
    required: true,
    enum: [
      // Account actions
      'account_created',
      'account_updated',
      'account_deleted',
      'account_enabled',
      'account_disabled',
      'password_reset',
      'password_changed',

      // Domain actions
      'domain_added',
      'domain_updated',
      'domain_deleted',
      'domain_verified',

      // Alias/Forward actions
      'alias_added',
      'alias_removed',
      'forward_added',
      'forward_removed',
      'forward_enabled',
      'forward_disabled',

      // Settings actions
      'quota_changed',
      'spam_settings_changed',
      'smtp_settings_changed',
      'imap_settings_changed',

      // Security actions
      'login_success',
      'login_failed',
      'token_generated',

      // Admin actions
      'admin_access',
      'bulk_action'
    ],
    index: true
  },

  // Resource information
  resourceType: {
    type: String,
    enum: ['email_account', 'email_domain', 'email_log', 'system'],
    required: true
  },

  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },

  resourceIdentifier: String, // email address or domain name

  // Actor (who performed the action)
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  performedByEmail: String,
  performedByName: String,

  // Details of the change
  changes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Before/After values
  oldValues: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  newValues: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  // Additional context
  description: String,

  // Request metadata
  ipAddress: String,
  userAgent: String,

  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },

  errorMessage: String,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
emailAuditLogSchema.index({ createdAt: -1 });
emailAuditLogSchema.index({ action: 1, createdAt: -1 });
emailAuditLogSchema.index({ performedBy: 1, createdAt: -1 });
emailAuditLogSchema.index({ resourceType: 1, resourceId: 1 });
emailAuditLogSchema.index({ companyId: 1, createdAt: -1 });

// TTL index - auto-delete audit logs older than 1 year
emailAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 }); // 365 days

// Static method to create audit log
emailAuditLogSchema.statics.log = async function(data) {
  try {
    const auditLog = new this(data);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error - audit logging should not break the main flow
  }
};

module.exports = mongoose.model('EmailAuditLog', emailAuditLogSchema);
