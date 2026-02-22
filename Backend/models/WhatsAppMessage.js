const mongoose = require('mongoose');

const whatsAppMessageSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppAccount',
    required: true,
    index: true
  },

  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppContact',
    required: true,
    index: true
  },

  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },

  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact', 'reaction'],
    default: 'text'
  },

  // Text content
  content: {
    type: String
  },

  // Media
  mediaUrl: {
    type: String
  },

  mediaType: {
    type: String // mime type
  },

  mediaFilename: {
    type: String
  },

  // WhatsApp message ID for tracking
  whatsappMessageId: {
    type: String,
    index: true
  },

  // Message status (outbound only)
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },

  // If sent as part of a campaign
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppCampaign'
  },

  // If sent by chatbot
  isAutomated: {
    type: Boolean,
    default: false
  },

  // Was chatbot automated reply
  chatbotReply: {
    type: Boolean,
    default: false
  },

  // Quoted/reply-to message
  quotedMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppMessage'
  },

  error: {
    type: String
  },

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for chat history
whatsAppMessageSchema.index({ accountId: 1, contactId: 1, timestamp: -1 });
whatsAppMessageSchema.index({ campaignId: 1, status: 1 });
whatsAppMessageSchema.index({ companyId: 1, timestamp: -1 });

module.exports = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
