const mongoose = require('mongoose');

const assignmentRuleSchema = new mongoose.Schema({
  // Rule identification
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

  // Email account this rule applies to
  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: true,
    index: true
  },

  // Rule conditions (ALL must match)
  conditions: {
    // Subject contains
    subjectContains: {
      type: [String],
      default: []
    },

    // From email/domain
    fromEmail: {
      type: [String],
      default: []
    },

    fromDomain: {
      type: [String],
      default: []
    },

    // Body contains keywords
    bodyContains: {
      type: [String],
      default: []
    },

    // Has specific tags
    hasTags: {
      type: [String],
      default: []
    },

    // Priority level
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent', null]
    },

    // Time-based (business hours, weekends, etc.)
    timeCondition: {
      businessHoursOnly: {
        type: Boolean,
        default: false
      },
      daysOfWeek: {
        type: [Number], // 0=Sunday, 6=Saturday
        default: []
      }
    }
  },

  // Actions to perform
  actions: {
    // Auto-assign to user
    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Or assign based on department
    assignToDepartment: String,

    // Or round-robin within team
    roundRobin: {
      enabled: {
        type: Boolean,
        default: false
      },
      teamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      currentIndex: {
        type: Number,
        default: 0
      }
    },

    // Set priority
    setPriority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent', null]
    },

    // Set due date (days from now)
    setDueDateDays: Number,

    // Add tags
    addTags: {
      type: [String],
      default: []
    },

    // Send template response
    sendTemplateResponse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailTemplate'
    }
  },

  // Rule settings
  enabled: {
    type: Boolean,
    default: true
  },

  priority: {
    type: Number,
    default: 100 // Lower number = higher priority
  },

  // Stop processing more rules if this matches
  stopOnMatch: {
    type: Boolean,
    default: false
  },

  // Statistics
  matchCount: {
    type: Number,
    default: 0
  },

  lastMatchedAt: Date,

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
assignmentRuleSchema.index({ companyId: 1, enabled: 1, priority: 1 });
assignmentRuleSchema.index({ emailAccountId: 1, enabled: 1 });

// Method: Check if email matches this rule
assignmentRuleSchema.methods.matches = function(email) {
  const { conditions } = this;

  // Subject contains
  if (conditions.subjectContains && conditions.subjectContains.length > 0) {
    const subject = (email.subject || '').toLowerCase();
    const matches = conditions.subjectContains.some(keyword =>
      subject.includes(keyword.toLowerCase())
    );
    if (!matches) return false;
  }

  // From email
  if (conditions.fromEmail && conditions.fromEmail.length > 0) {
    const fromEmail = (email.from?.address || '').toLowerCase();
    const matches = conditions.fromEmail.some(email =>
      fromEmail === email.toLowerCase()
    );
    if (!matches) return false;
  }

  // From domain
  if (conditions.fromDomain && conditions.fromDomain.length > 0) {
    const fromEmail = (email.from?.address || '').toLowerCase();
    const domain = fromEmail.split('@')[1];
    if (!domain) return false;

    const matches = conditions.fromDomain.some(d =>
      domain === d.toLowerCase()
    );
    if (!matches) return false;
  }

  // Body contains
  if (conditions.bodyContains && conditions.bodyContains.length > 0) {
    const body = (email.text || email.html || '').toLowerCase();
    const matches = conditions.bodyContains.some(keyword =>
      body.includes(keyword.toLowerCase())
    );
    if (!matches) return false;
  }

  // Time conditions
  if (conditions.timeCondition) {
    const now = new Date();

    if (conditions.timeCondition.businessHoursOnly) {
      const hour = now.getHours();
      if (hour < 9 || hour >= 17) return false;
    }

    if (conditions.timeCondition.daysOfWeek && conditions.timeCondition.daysOfWeek.length > 0) {
      const day = now.getDay();
      if (!conditions.timeCondition.daysOfWeek.includes(day)) return false;
    }
  }

  return true;
};

// Method: Execute rule actions
assignmentRuleSchema.methods.execute = async function(email, emailAccountId, createdByUserId) {
  const EmailAssignment = mongoose.model('EmailAssignment');
  const User = mongoose.model('User');
  const { actions } = this;

  let assignedTo = null;

  // Determine assignee
  if (actions.assignTo) {
    assignedTo = actions.assignTo;
  } else if (actions.assignToDepartment) {
    // Find first available user in department
    const user = await User.findOne({
      companyId: this.companyId,
      department: actions.assignToDepartment
    });
    if (user) assignedTo = user._id;
  } else if (actions.roundRobin && actions.roundRobin.enabled) {
    // Round-robin assignment
    const teamMembers = actions.roundRobin.teamMembers;
    if (teamMembers && teamMembers.length > 0) {
      const index = actions.roundRobin.currentIndex % teamMembers.length;
      assignedTo = teamMembers[index];

      // Update index for next assignment
      this.actions.roundRobin.currentIndex = index + 1;
      await this.save();
    }
  }

  if (!assignedTo) {
    return null; // No assignee determined
  }

  // Check if assignment already exists
  const existingAssignment = await EmailAssignment.findOne({
    emailAccountId,
    emailUid: email.uid
  });

  if (existingAssignment) {
    return existingAssignment; // Already assigned
  }

  // Create assignment
  const assignment = await EmailAssignment.create({
    emailAccountId,
    emailUid: email.uid,
    emailSubject: email.subject || '(No Subject)',
    emailFrom: email.from?.address || email.from?.text || 'Unknown',
    emailDate: email.date || new Date(),
    emailMessageId: email.messageId,
    assignedTo,
    assignedBy: createdByUserId || this.createdBy,
    companyId: this.companyId,
    priority: actions.setPriority || 'normal',
    dueDate: actions.setDueDateDays ?
      new Date(Date.now() + actions.setDueDateDays * 24 * 60 * 60 * 1000) : null,
    tags: actions.addTags || []
  });

  // Update statistics
  this.matchCount += 1;
  this.lastMatchedAt = new Date();
  await this.save();

  return assignment;
};

// Static method: Process email through all rules
assignmentRuleSchema.statics.processEmail = async function(email, emailAccountId, companyId) {
  const rules = await this.find({
    companyId,
    emailAccountId,
    enabled: true
  }).sort({ priority: 1 }); // Lower priority number = higher priority

  let assignment = null;

  for (const rule of rules) {
    if (rule.matches(email)) {
      assignment = await rule.execute(email, emailAccountId);

      if (assignment && rule.stopOnMatch) {
        break; // Stop processing more rules
      }
    }
  }

  return assignment;
};

// Static method: Get rules by account
assignmentRuleSchema.statics.getByAccount = async function(emailAccountId, companyId) {
  return this.find({
    emailAccountId,
    companyId
  })
    .populate('createdBy', 'name email')
    .populate('actions.assignTo', 'name email department')
    .populate('actions.roundRobin.teamMembers', 'name email')
    .sort({ priority: 1 });
};

// Static method: Get rule statistics
assignmentRuleSchema.statics.getStats = async function(companyId) {
  const stats = await this.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    {
      $group: {
        _id: null,
        totalRules: { $sum: 1 },
        enabledRules: {
          $sum: { $cond: ['$enabled', 1, 0] }
        },
        totalMatches: { $sum: '$matchCount' }
      }
    }
  ]);

  return stats[0] || { totalRules: 0, enabledRules: 0, totalMatches: 0 };
};

module.exports = mongoose.model('AssignmentRule', assignmentRuleSchema);
