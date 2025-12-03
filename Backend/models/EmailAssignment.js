const mongoose = require('mongoose');

const emailAssignmentSchema = new mongoose.Schema({
  // Email identification
  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: true,
    index: true
  },

  emailUid: {
    type: String,
    required: true
  },

  emailSubject: String,
  emailFrom: String,
  emailDate: Date,
  emailMessageId: String, // For tracking replies

  // Assignment details
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  assignedAt: {
    type: Date,
    default: Date.now
  },

  // Status tracking
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed', 'reopened'],
    default: 'new',
    index: true
  },

  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },

  dueDate: Date,

  // Resolution details
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  resolutionNote: String,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Tags for categorization
  tags: {
    type: [String],
    default: []
  },

  // Internal notes count (for quick reference)
  notesCount: {
    type: Number,
    default: 0
  },

  // Last activity timestamp
  lastActivityAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
emailAssignmentSchema.index({ companyId: 1, status: 1 });
emailAssignmentSchema.index({ assignedTo: 1, status: 1 });
emailAssignmentSchema.index({ emailAccountId: 1, emailUid: 1 }, { unique: true });
emailAssignmentSchema.index({ companyId: 1, assignedTo: 1, status: 1 });
emailAssignmentSchema.index({ dueDate: 1, status: 1 });

// Method: Update assignment status
emailAssignmentSchema.methods.updateStatus = async function(newStatus, userId, note) {
  const EmailActivity = mongoose.model('EmailActivity');
  const oldStatus = this.status;

  this.status = newStatus;
  this.lastActivityAt = new Date();

  if (newStatus === 'resolved' || newStatus === 'closed') {
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
    if (note) this.resolutionNote = note;
  }

  await this.save();

  // Create activity log
  await EmailActivity.create({
    assignmentId: this._id,
    userId,
    action: 'status_changed',
    details: { from: oldStatus, to: newStatus, note },
    companyId: this.companyId
  });

  return this;
};

// Method: Reassign to another user
emailAssignmentSchema.methods.reassign = async function(newAssignedTo, reassignedBy, note) {
  const EmailActivity = mongoose.model('EmailActivity');
  const oldAssignedTo = this.assignedTo;

  this.assignedTo = newAssignedTo;
  this.assignedBy = reassignedBy;
  this.lastActivityAt = new Date();

  await this.save();

  // Create activity log
  await EmailActivity.create({
    assignmentId: this._id,
    userId: reassignedBy,
    action: 'reassigned',
    details: {
      from: oldAssignedTo,
      to: newAssignedTo,
      note
    },
    companyId: this.companyId
  });

  return this;
};

// Method: Update priority
emailAssignmentSchema.methods.updatePriority = async function(newPriority, userId) {
  const EmailActivity = mongoose.model('EmailActivity');
  const oldPriority = this.priority;

  this.priority = newPriority;
  this.lastActivityAt = new Date();

  await this.save();

  // Create activity log
  await EmailActivity.create({
    assignmentId: this._id,
    userId,
    action: 'priority_changed',
    details: { from: oldPriority, to: newPriority },
    companyId: this.companyId
  });

  return this;
};

// Method: Set due date
emailAssignmentSchema.methods.setDueDate = async function(dueDate, userId) {
  const EmailActivity = mongoose.model('EmailActivity');
  const oldDueDate = this.dueDate;

  this.dueDate = dueDate;
  this.lastActivityAt = new Date();

  await this.save();

  // Create activity log
  await EmailActivity.create({
    assignmentId: this._id,
    userId,
    action: 'due_date_set',
    details: { from: oldDueDate, to: dueDate },
    companyId: this.companyId
  });

  return this;
};

// Method: Add tags
emailAssignmentSchema.methods.addTags = async function(newTags, userId) {
  const EmailActivity = mongoose.model('EmailActivity');

  const tagsToAdd = newTags.filter(tag => !this.tags.includes(tag));

  if (tagsToAdd.length > 0) {
    this.tags.push(...tagsToAdd);
    this.lastActivityAt = new Date();
    await this.save();

    // Create activity log
    await EmailActivity.create({
      assignmentId: this._id,
      userId,
      action: 'tag_added',
      details: { tags: tagsToAdd },
      companyId: this.companyId
    });
  }

  return this;
};

// Method: Remove tags
emailAssignmentSchema.methods.removeTags = async function(tagsToRemove, userId) {
  const EmailActivity = mongoose.model('EmailActivity');

  const removed = this.tags.filter(tag => tagsToRemove.includes(tag));

  if (removed.length > 0) {
    this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
    this.lastActivityAt = new Date();
    await this.save();

    // Create activity log
    await EmailActivity.create({
      assignmentId: this._id,
      userId,
      action: 'tag_removed',
      details: { tags: removed },
      companyId: this.companyId
    });
  }

  return this;
};

// Static method: Get assignments by user
emailAssignmentSchema.statics.getByUser = async function(userId, filters = {}) {
  const query = { assignedTo: userId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.priority) {
    query.priority = filters.priority;
  }

  if (filters.overdue) {
    query.dueDate = { $lt: new Date() };
    query.status = { $nin: ['resolved', 'closed'] };
  }

  return this.find(query)
    .populate('assignedBy', 'name email')
    .populate('emailAccountId', 'email displayName')
    .sort({ lastActivityAt: -1 })
    .limit(filters.limit || 50);
};

// Static method: Get team assignments
emailAssignmentSchema.statics.getTeamAssignments = async function(companyId, filters = {}) {
  const query = { companyId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.emailAccountId) {
    query.emailAccountId = filters.emailAccountId;
  }

  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }

  return this.find(query)
    .populate('assignedTo', 'name email department')
    .populate('assignedBy', 'name email')
    .populate('emailAccountId', 'email displayName')
    .sort({ lastActivityAt: -1 })
    .limit(filters.limit || 100);
};

// Static method: Get assignment stats
emailAssignmentSchema.statics.getStats = async function(companyId, emailAccountId = null) {
  const query = { companyId };

  if (emailAccountId) {
    query.emailAccountId = emailAccountId;
  }

  const stats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    total: 0,
    new: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    reopened: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  // Get overdue count
  const overdueCount = await this.countDocuments({
    ...query,
    dueDate: { $lt: new Date() },
    status: { $nin: ['resolved', 'closed'] }
  });

  result.overdue = overdueCount;

  return result;
};

module.exports = mongoose.model('EmailAssignment', emailAssignmentSchema);
