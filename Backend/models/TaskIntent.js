const mongoose = require('mongoose');

/**
 * TaskIntent — tracks in-progress task creation via chat conversation.
 * When a user says "create task" in Noxtm Chat, a TaskIntent is created
 * and the bot walks them through collecting details step by step.
 * Auto-expires after 10 minutes of inactivity.
 */
const taskIntentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: String },
  status: {
    type: String,
    enum: ['collecting', 'confirming', 'completed', 'cancelled'],
    default: 'collecting'
  },
  currentStep: {
    type: String,
    enum: ['title', 'description', 'priority', 'dueDate', 'assignee', 'project', 'confirm'],
    default: 'title'
  },
  collectedData: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent', ''], default: '' },
    dueDate: { type: String, default: '' },
    assigneeEmail: { type: String, default: '' },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    projectName: { type: String, default: '' }
  },
  createdTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

taskIntentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Auto-expire incomplete intents after 10 minutes
taskIntentSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 600 });

module.exports = mongoose.model('TaskIntent', taskIntentSchema);
