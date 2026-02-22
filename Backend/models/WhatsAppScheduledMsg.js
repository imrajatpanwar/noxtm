const mongoose = require('mongoose');

const whatsAppScheduledMsgSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppAccount',
    required: true
  },

  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppContact',
    required: true
  },

  // The JID to send to
  jid: {
    type: String,
    required: true
  },

  // Message content to send
  content: {
    type: String,
    required: true,
    maxLength: 2000
  },

  // When to send
  scheduledAt: {
    type: Date,
    required: true,
    index: true
  },

  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },

  // Reason / context for the scheduled message
  reason: {
    type: String,
    maxLength: 500
  },

  // Error info if failed
  error: {
    type: String
  },

  sentAt: {
    type: Date
  }
}, {
  timestamps: true
});

whatsAppScheduledMsgSchema.index({ status: 1, scheduledAt: 1 });
whatsAppScheduledMsgSchema.index({ contactId: 1, status: 1 });

module.exports = mongoose.model('WhatsAppScheduledMsg', whatsAppScheduledMsgSchema);
