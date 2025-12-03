const mongoose = require('mongoose');

const emailActivitySchema = new mongoose.Schema({
  // Assignment reference
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAssignment',
    required: true,
    index: true
  },

  // Activity details
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  action: {
    type: String,
    enum: [
      'assigned',
      'reassigned',
      'status_changed',
      'priority_changed',
      'note_added',
      'due_date_set',
      'tag_added',
      'tag_removed',
      'email_replied',
      'email_forwarded'
    ],
    required: true,
    index: true
  },

  // Additional details (flexible structure)
  details: mongoose.Schema.Types.Mixed,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
emailActivitySchema.index({ assignmentId: 1, createdAt: -1 });
emailActivitySchema.index({ companyId: 1, createdAt: -1 });
emailActivitySchema.index({ userId: 1, createdAt: -1 });

// Static method: Get activity log for assignment
emailActivitySchema.statics.getByAssignment = async function(assignmentId, limit = 50) {
  return this.find({ assignmentId })
    .populate('userId', 'name email emailAvatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method: Get recent company activity
emailActivitySchema.statics.getRecentActivity = async function(companyId, limit = 20) {
  return this.find({ companyId })
    .populate('userId', 'name email emailAvatar')
    .populate('assignmentId', 'emailSubject emailFrom')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method: Get user activity
emailActivitySchema.statics.getUserActivity = async function(userId, limit = 50) {
  return this.find({ userId })
    .populate('assignmentId', 'emailSubject emailFrom status')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Virtual: Human-readable description
emailActivitySchema.virtual('description').get(function() {
  const actionDescriptions = {
    assigned: 'assigned this email',
    reassigned: 'reassigned this email',
    status_changed: `changed status from ${this.details?.from} to ${this.details?.to}`,
    priority_changed: `changed priority from ${this.details?.from} to ${this.details?.to}`,
    note_added: 'added a note',
    due_date_set: 'set due date',
    tag_added: 'added tags',
    tag_removed: 'removed tags',
    email_replied: 'replied to this email',
    email_forwarded: 'forwarded this email'
  };

  return actionDescriptions[this.action] || this.action;
});

// Ensure virtual fields are serialized
emailActivitySchema.set('toJSON', { virtuals: true });
emailActivitySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('EmailActivity', emailActivitySchema);
