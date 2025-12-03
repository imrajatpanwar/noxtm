const mongoose = require('mongoose');

const emailNoteSchema = new mongoose.Schema({
  // Assignment reference
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAssignment',
    required: true,
    index: true
  },

  // Note details
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Visibility
  isInternal: {
    type: Boolean,
    default: true // Internal notes only visible to team
  },

  // Mentions (for @mentions functionality)
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  // Soft delete
  deleted: {
    type: Boolean,
    default: false,
    index: true
  },

  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Edit tracking
  edited: {
    type: Boolean,
    default: false
  },

  lastEditedAt: Date
}, {
  timestamps: true
});

// Indexes
emailNoteSchema.index({ assignmentId: 1, deleted: 1, createdAt: -1 });
emailNoteSchema.index({ companyId: 1, createdAt: -1 });
emailNoteSchema.index({ author: 1, deleted: 1 });

// Method: Soft delete
emailNoteSchema.methods.softDelete = async function(userId) {
  const EmailAssignment = mongoose.model('EmailAssignment');

  this.deleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;

  await this.save();

  // Decrement notes count on assignment
  await EmailAssignment.updateOne(
    { _id: this.assignmentId },
    { $inc: { notesCount: -1 } }
  );

  return this;
};

// Method: Update note content
emailNoteSchema.methods.updateContent = async function(newContent) {
  this.content = newContent;
  this.edited = true;
  this.lastEditedAt = new Date();

  await this.save();

  return this;
};

// Post-save hook: Update assignment notes count
emailNoteSchema.post('save', async function(doc) {
  if (this.isNew && !this.deleted) {
    const EmailAssignment = mongoose.model('EmailAssignment');
    const EmailActivity = mongoose.model('EmailActivity');

    // Increment notes count
    await EmailAssignment.updateOne(
      { _id: doc.assignmentId },
      {
        $inc: { notesCount: 1 },
        $set: { lastActivityAt: new Date() }
      }
    );

    // Create activity log
    await EmailActivity.create({
      assignmentId: doc.assignmentId,
      userId: doc.author,
      action: 'note_added',
      details: {
        noteId: doc._id,
        preview: doc.content.substring(0, 100)
      },
      companyId: doc.companyId
    });
  }
});

// Static method: Get notes for assignment
emailNoteSchema.statics.getByAssignment = async function(assignmentId) {
  return this.find({
    assignmentId,
    deleted: false
  })
    .populate('author', 'name email emailAvatar')
    .populate('mentions', 'name email')
    .sort({ createdAt: 1 }); // Chronological order
};

// Static method: Extract mentions from content
emailNoteSchema.statics.extractMentions = function(content) {
  // Match @username or @name patterns
  const mentionRegex = /@(\w+)/g;
  const matches = content.match(mentionRegex);

  if (!matches) return [];

  return matches.map(match => match.substring(1)); // Remove @ symbol
};

module.exports = mongoose.model('EmailNote', emailNoteSchema);
