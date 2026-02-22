const mongoose = require('mongoose');

const whatsAppKeypointSchema = new mongoose.Schema({
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
    required: true,
    index: true
  },

  // The keypoint text extracted from conversation
  text: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },

  // Category for quick filtering
  category: {
    type: String,
    enum: ['info', 'interest', 'request', 'issue', 'followup', 'general'],
    default: 'general'
  },

  // If this keypoint generated a scheduled follow-up
  scheduledMsgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppScheduledMsg'
  },

  // Was this auto-extracted by AI or manually added
  source: {
    type: String,
    enum: ['ai', 'manual'],
    default: 'ai'
  }
}, {
  timestamps: true
});

whatsAppKeypointSchema.index({ contactId: 1, createdAt: -1 });
whatsAppKeypointSchema.index({ companyId: 1, category: 1 });

module.exports = mongoose.model('WhatsAppKeypoint', whatsAppKeypointSchema);
