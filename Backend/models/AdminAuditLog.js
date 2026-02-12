const mongoose = require("mongoose");

/**
 * AdminAuditLog Schema - Tracks all super-admin actions for accountability
 */
const adminAuditLogSchema = new mongoose.Schema({
  // Admin who performed the action
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // Type of action performed
  action: {
    type: String,
    required: true,
    enum: [
      'plan_change',
      'credit_adjustment',
      'role_change',
      'status_change',
      'user_delete',
      'permission_change',
      'company_update',
      'user_update'
    ]
  },

  // Target entity type
  targetType: {
    type: String,
    required: true,
    enum: ['User', 'Company']
  },

  // Target entity ID
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },

  // Human-readable target name for display (so we don't need to populate every time)
  targetName: {
    type: String,
    default: ''
  },

  // Description of what changed
  description: {
    type: String,
    required: true
  },

  // Before and after values
  changes: {
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed }
  },

  // Optional reason provided by admin
  reason: {
    type: String,
    default: ''
  },

  // Request metadata
  ipAddress: {
    type: String,
    default: ''
  },

  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
adminAuditLogSchema.index({ adminId: 1, timestamp: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, timestamp: -1 });
adminAuditLogSchema.index({ action: 1, timestamp: -1 });
adminAuditLogSchema.index({ timestamp: -1 });

/**
 * Static method to log an admin action
 */
adminAuditLogSchema.statics.logAction = async function (data) {
  const log = new this({
    adminId: data.adminId,
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId,
    targetName: data.targetName || '',
    description: data.description,
    changes: {
      before: data.before || null,
      after: data.after || null
    },
    reason: data.reason || '',
    ipAddress: data.ipAddress || ''
  });
  return await log.save();
};

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);
