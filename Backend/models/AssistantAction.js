const mongoose = require('mongoose');

// Scheduled actions created by the Noxtm Assistant
// Supports: sending messages, creating tasks, and other automated actions
const assistantActionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Action type determines what gets executed
  actionType: {
    type: String,
    enum: ['send_whatsapp', 'send_team_message', 'create_task', 'reminder', 'ask_update'],
    required: true
  },
  // Flexible payload for different action types
  payload: {
    // For send_whatsapp
    contactName: String,
    contactPhone: String,
    whatsappAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppAccount' },
    jid: String,
    // For send_team_message
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recipientName: String,
    // For create_task
    taskTitle: String,
    taskDescription: String,
    taskAssignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    taskPriority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'] },
    taskDueDate: Date,
    // For ask_update
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    taskTitle: String,
    // Common
    message: String
  },
  // When to execute
  scheduledAt: {
    type: Date,
    required: true,
    index: true
  },
  // Human-readable description of what this action does
  description: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  error: String,
  executedAt: Date
}, {
  timestamps: true
});

assistantActionSchema.index({ status: 1, scheduledAt: 1 });
assistantActionSchema.index({ companyId: 1, status: 1, scheduledAt: -1 });

module.exports = mongoose.model('AssistantAction', assistantActionSchema);
