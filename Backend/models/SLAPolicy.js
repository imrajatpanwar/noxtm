const mongoose = require('mongoose');

const slaPolicySchema = new mongoose.Schema({
  // Policy identification
  name: {
    type: String,
    required: true
  },

  description: String,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Email account (optional - null means applies to all)
  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    index: true
  },

  // SLA targets (in minutes)
  targets: {
    // First response time
    firstResponseTime: {
      urgent: Number,    // e.g., 15 minutes
      high: Number,      // e.g., 60 minutes
      normal: Number,    // e.g., 240 minutes (4 hours)
      low: Number        // e.g., 1440 minutes (24 hours)
    },

    // Resolution time
    resolutionTime: {
      urgent: Number,    // e.g., 120 minutes (2 hours)
      high: Number,      // e.g., 480 minutes (8 hours)
      normal: Number,    // e.g., 1440 minutes (24 hours)
      low: Number        // e.g., 4320 minutes (72 hours)
    }
  },

  // Business hours configuration
  businessHours: {
    enabled: {
      type: Boolean,
      default: false
    },

    timezone: {
      type: String,
      default: 'UTC'
    },

    // Days of week (0 = Sunday, 6 = Saturday)
    workDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5] // Monday to Friday
    },

    // Hours
    startTime: {
      type: String,  // "09:00"
      default: '09:00'
    },

    endTime: {
      type: String,  // "17:00"
      default: '17:00'
    }
  },

  // Escalation rules
  escalation: {
    enabled: {
      type: Boolean,
      default: false
    },

    // Escalate after X% of SLA time elapsed
    escalateAtPercent: {
      type: Number,
      default: 75
    },

    // Who to escalate to
    escalateTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    // Notification method
    notificationMethod: {
      type: String,
      enum: ['email', 'slack', 'both'],
      default: 'email'
    }
  },

  // Conditions (when this SLA applies)
  conditions: {
    // Specific tags
    tags: [String],

    // Specific customers/domains
    fromDomains: [String],

    // Department
    department: String
  },

  // Settings
  enabled: {
    type: Boolean,
    default: true
  },

  priority: {
    type: Number,
    default: 100
  },

  // Statistics
  totalViolations: {
    type: Number,
    default: 0
  },

  totalCompliance: {
    type: Number,
    default: 0
  },

  complianceRate: Number,

  lastViolationAt: Date,

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
slaPolicySchema.index({ companyId: 1, enabled: 1 });
slaPolicySchema.index({ emailAccountId: 1 });
slaPolicySchema.index({ priority: 1 });

// Method: Check if assignment violates SLA
slaPolicySchema.methods.checkViolation = function(assignment) {
  const now = new Date();
  const createdAt = assignment.createdAt;
  const priority = assignment.priority || 'normal';

  // Calculate elapsed time in minutes
  const elapsedMinutes = (now - createdAt) / (1000 * 60);

  // Check first response SLA
  const firstResponseTarget = this.targets.firstResponseTime[priority];
  const firstResponseViolation = !assignment.firstResponseAt && elapsedMinutes > firstResponseTarget;

  // Check resolution SLA
  const resolutionTarget = this.targets.resolutionTime[priority];
  const resolutionViolation = !assignment.resolvedAt && elapsedMinutes > resolutionTarget;

  return {
    firstResponseViolation,
    resolutionViolation,
    elapsedMinutes,
    firstResponseTarget,
    resolutionTarget,
    firstResponsePercentElapsed: (elapsedMinutes / firstResponseTarget) * 100,
    resolutionPercentElapsed: (elapsedMinutes / resolutionTarget) * 100
  };
};

// Method: Check if escalation needed
slaPolicySchema.methods.needsEscalation = function(assignment) {
  if (!this.escalation.enabled) {
    return false;
  }

  const violation = this.checkViolation(assignment);
  const escalateThreshold = this.escalation.escalateAtPercent;

  return (
    violation.firstResponsePercentElapsed >= escalateThreshold ||
    violation.resolutionPercentElapsed >= escalateThreshold
  );
};

// Method: Calculate business hours between two dates
slaPolicySchema.methods.calculateBusinessMinutes = function(startDate, endDate) {
  if (!this.businessHours.enabled) {
    return (endDate - startDate) / (1000 * 60);
  }

  // TODO: Implement business hours calculation
  // For now, return simple elapsed time
  return (endDate - startDate) / (1000 * 60);
};

// Static method: Find applicable SLA for assignment
slaPolicySchema.statics.findApplicable = async function(assignment) {
  const query = {
    companyId: assignment.companyId,
    enabled: true
  };

  // Find all matching policies
  const policies = await this.find(query).sort({ priority: 1 });

  // Filter by conditions
  for (const policy of policies) {
    let matches = true;

    // Check email account
    if (policy.emailAccountId && policy.emailAccountId.toString() !== assignment.emailAccountId.toString()) {
      matches = false;
    }

    // Check tags
    if (policy.conditions.tags && policy.conditions.tags.length > 0) {
      const hasMatchingTag = policy.conditions.tags.some(tag =>
        assignment.tags && assignment.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        matches = false;
      }
    }

    // Check department
    if (policy.conditions.department && assignment.assignedToDepartment !== policy.conditions.department) {
      matches = false;
    }

    if (matches) {
      return policy;
    }
  }

  return null;
};

// Static method: Get SLA statistics
slaPolicySchema.statics.getStats = async function(companyId) {
  const stats = await this.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    {
      $group: {
        _id: null,
        totalPolicies: { $sum: 1 },
        enabledPolicies: {
          $sum: { $cond: ['$enabled', 1, 0] }
        },
        totalViolations: { $sum: '$totalViolations' },
        totalCompliance: { $sum: '$totalCompliance' },
        avgComplianceRate: { $avg: '$complianceRate' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalPolicies: 0,
      enabledPolicies: 0,
      totalViolations: 0,
      totalCompliance: 0,
      avgComplianceRate: null
    };
  }

  return stats[0];
};

// Static method: Update policy statistics
slaPolicySchema.statics.updateStats = async function(policyId, wasCompliant) {
  const update = wasCompliant
    ? { $inc: { totalCompliance: 1 } }
    : { $inc: { totalViolations: 1 }, $set: { lastViolationAt: new Date() } };

  const policy = await this.findByIdAndUpdate(policyId, update, { new: true });

  if (policy) {
    const total = policy.totalCompliance + policy.totalViolations;
    policy.complianceRate = total > 0 ? (policy.totalCompliance / total) * 100 : null;
    await policy.save();
  }

  return policy;
};

module.exports = mongoose.model('SLAPolicy', slaPolicySchema);
