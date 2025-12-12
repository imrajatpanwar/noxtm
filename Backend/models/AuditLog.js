const mongoose = require("mongoose");

/**
 * AuditLog Schema - Tracks permission and role changes for security auditing
 */
const auditLogSchema = new mongoose.Schema({
    // User who made the change (admin/owner)
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // User whose data was changed
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // Company context (if applicable)
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },

    // Type of action performed
    action: {
        type: String,
        required: true,
        enum: [
            'permission_update',
            'role_update',
            'status_update',
            'subscription_update',
            'user_create',
            'user_delete',
            'user_invite',
            'user_activate',
            'user_deactivate'
        ]
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

    // Request metadata
    metadata: {
        ipAddress: { type: String },
        userAgent: { type: String },
        endpoint: { type: String }
    },

    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index for efficient queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ targetUserId: 1, timestamp: -1 });
auditLogSchema.index({ companyId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

/**
 * Static method to create an audit log entry
 */
auditLogSchema.statics.logChange = async function (data) {
    const log = new this({
        userId: data.userId,
        targetUserId: data.targetUserId,
        companyId: data.companyId,
        action: data.action,
        description: data.description,
        changes: {
            before: data.before,
            after: data.after
        },
        metadata: data.metadata
    });

    return await log.save();
};

/**
 * Static method to get audit logs for a user
 */
auditLogSchema.statics.getLogsForUser = async function (userId, options = {}) {
    const query = { targetUserId: userId };
    const limit = options.limit || 50;
    const skip = options.skip || 0;

    return await this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'fullName email')
        .populate('targetUserId', 'fullName email');
};

/**
 * Static method to get audit logs for a company
 */
auditLogSchema.statics.getLogsForCompany = async function (companyId, options = {}) {
    const query = { companyId };
    const limit = options.limit || 100;
    const skip = options.skip || 0;

    return await this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('userId', 'fullName email')
        .populate('targetUserId', 'fullName email');
};

module.exports = mongoose.model("AuditLog", auditLogSchema);
