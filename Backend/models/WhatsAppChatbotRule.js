const mongoose = require('mongoose');

const whatsAppChatbotRuleSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Null = applies to all accounts
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppAccount',
    default: null
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 100
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // Lower = higher priority, evaluated first
  priority: {
    type: Number,
    default: 0
  },

  // Trigger configuration
  triggerType: {
    type: String,
    enum: ['keyword', 'contains', 'regex', 'starts-with', 'ai-fallback'],
    required: true
  },

  triggerValue: {
    type: String,
    trim: true
    // Not required for ai-fallback
  },

  // Response configuration
  responseType: {
    type: String,
    enum: ['text', 'image', 'document', 'ai'],
    default: 'text'
  },

  responseContent: {
    type: String // Text message or template
  },

  responseMediaUrl: {
    type: String
  },

  // AI-specific settings
  aiPrompt: {
    type: String,
    default: 'You are a helpful business assistant. Answer the customer\'s question concisely and professionally.'
  },

  aiModel: {
    type: String,
    default: 'gpt-4o-mini'
  },

  aiMaxTokens: {
    type: Number,
    default: 300
  },

  // Don't re-trigger for same contact within N minutes
  cooldownMinutes: {
    type: Number,
    default: 5
  },

  // Stats
  stats: {
    triggered: { type: Number, default: 0 },
    responded: { type: Number, default: 0 }
  },

  // Track last trigger per contact to enforce cooldown
  // Not stored here — managed in memory or a separate lightweight collection
}, {
  timestamps: true
});

// Indexes
whatsAppChatbotRuleSchema.index({ companyId: 1, isActive: 1, priority: 1 });
whatsAppChatbotRuleSchema.index({ companyId: 1, accountId: 1 });

module.exports = mongoose.model('WhatsAppChatbotRule', whatsAppChatbotRuleSchema);
