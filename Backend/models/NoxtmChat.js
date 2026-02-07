const mongoose = require('mongoose');

// NoxtmChat Message Schema — stores all messages between users and the Noxtm chatbot
const noxtmChatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 5000 },
  metadata: {
    contextUsed: { type: Boolean, default: false },
    model: { type: String },
    tokensUsed: { type: Number }
  },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index for fetching user conversations efficiently
noxtmChatMessageSchema.index({ userId: 1, createdAt: -1 });
noxtmChatMessageSchema.index({ companyId: 1, createdAt: -1 });

const NoxtmChatMessage = mongoose.model('NoxtmChatMessage', noxtmChatMessageSchema);

// NoxtmChat Config Schema — stores per-company Noxtm chatbot settings (admin-managed)
const noxtmChatConfigSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, unique: true },
  enabled: { type: Boolean, default: true },
  welcomeMessage: { type: String, default: 'Hi! I\'m Noxtm, your AI assistant. I can help you with your dashboard, projects, campaigns, and more. Ask me anything!' },
  systemPromptOverride: { type: String, default: '' },
  maxMessagesPerDay: { type: Number, default: 100 },
  allowedRoles: [{ type: String }], // empty = all roles allowed
  // Bot Appearance
  botName: { type: String, default: 'Navraj Panwar' },
  botTitle: { type: String, default: 'Founder' },
  botProfilePicture: { type: String, default: '' }, // base64 encoded image
  showVerifiedBadge: { type: Boolean, default: true },
  // === Response Controls ===
  // Personality / Identity
  botIdentity: { type: String, default: '' }, // How the bot introduces itself e.g. "I am Navraj, the founder of Noxtm"
  personality: { type: String, enum: ['professional', 'friendly', 'casual', 'formal', 'witty', 'empathetic', 'motivational', 'strict'], default: 'professional' },
  // Emotional Controls
  emotionalScale: { type: Number, min: 0, max: 10, default: 5 }, // 0=robotic, 10=very emotional
  angerState: { type: String, enum: ['calm', 'assertive', 'stern', 'angry', 'furious'], default: 'calm' },
  humorLevel: { type: Number, min: 0, max: 10, default: 3 }, // 0=no humor, 10=very humorous
  empathyLevel: { type: Number, min: 0, max: 10, default: 5 }, // 0=cold, 10=deeply empathetic
  // Response Format Controls
  maxWordCount: { type: Number, min: 10, max: 2000, default: 200 },
  responseLanguage: { type: String, default: 'English' },
  formality: { type: Number, min: 0, max: 10, default: 6 }, // 0=very casual, 10=ultra formal
  useEmojis: { type: Boolean, default: false },
  // Behavior Controls
  creativityLevel: { type: Number, min: 0, max: 10, default: 5 }, // 0=factual only, 10=very creative
  confidenceLevel: { type: Number, min: 0, max: 10, default: 7 }, // 0=always hedging, 10=very confident
  proactiveness: { type: Number, min: 0, max: 10, default: 5 }, // 0=only answer asked, 10=suggest & recommend
  // Forbidden / Allowed Topics
  forbiddenTopics: { type: String, default: '' }, // comma-separated topics the bot should never discuss
  focusTopics: { type: String, default: '' }, // comma-separated topics the bot should focus on
  // Custom Instructions
  customInstructions: { type: String, default: '' }, // freeform custom instructions
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
});

noxtmChatConfigSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const NoxtmChatConfig = mongoose.model('NoxtmChatConfig', noxtmChatConfigSchema);

module.exports = { NoxtmChatMessage, NoxtmChatConfig };
