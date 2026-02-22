const mongoose = require('mongoose');

const whatsAppChatbotSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true,
    unique: true
  },

  // Bot identity
  botName: {
    type: String,
    default: 'botgit',
    trim: true,
    maxLength: 50
  },

  botPersonality: {
    type: String,
    default: 'You are a helpful, professional business assistant. Be concise, friendly, and accurate.',
    maxLength: 2000
  },

  // Master toggle
  enabled: {
    type: Boolean,
    default: false
  },

  // Which WhatsApp accounts to auto-reply on (empty = all)
  accountIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppAccount'
  }],

  // AI Provider configuration
  provider: {
    type: String,
    enum: ['openrouter', 'openai', 'anthropic', 'groq', 'together', 'custom'],
    default: 'openrouter'
  },

  apiKey: {
    type: String,
    default: ''
  },

  model: {
    type: String,
    default: 'google/gemini-2.0-flash-001'
  },

  // Custom endpoint for 'custom' provider
  customEndpoint: {
    type: String,
    default: ''
  },

  // AI settings
  maxTokens: {
    type: Number,
    default: 300,
    min: 50,
    max: 4000
  },

  temperature: {
    type: Number,
    default: 0.7,
    min: 0,
    max: 2
  },

  // Notes access - bot can use company notes as knowledge base
  notesAccess: {
    type: Boolean,
    default: false
  },

  // Cooldown per contact (minutes) to avoid spamming
  cooldownMinutes: {
    type: Number,
    default: 0,
    min: 0
  },

  // Max words per message — long replies get split into multiple messages
  maxWordsPerMsg: {
    type: Number,
    default: 0,
    min: 0
  },

  // Stats
  totalReplies: {
    type: Number,
    default: 0
  },
  lastReplyAt: {
    type: Date
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WhatsAppChatbot', whatsAppChatbotSchema);
