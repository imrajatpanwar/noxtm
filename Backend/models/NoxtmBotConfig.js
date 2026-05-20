const mongoose = require('mongoose');

const noxtmBotConfigSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  enabled: { type: Boolean, default: true },
  botGreeting: { type: String, default: "Hey! I'm Noxtm Bot, your setup assistant. Ready to get your workspace rolling?" },
  personality: { type: String, enum: ['friendly', 'professional', 'casual', 'formal'], default: 'friendly' },
  // Bot Identity
  botName: { type: String, default: 'Noxtm' },
  botTitle: { type: String, default: 'AI Assistant' },
  botIdentity: { type: String, default: '' },
  maxWordCount: { type: Number, default: 80 },
  responseLanguage: { type: String, default: 'English' },
  customInstructions: { type: String, default: '' },
  // AI Model configuration
  aiModel: { type: String, default: 'claude-haiku-4-5-20251001', enum: [
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-6',
    'claude-opus-4-7',
    'claude-opus-4-6',
  ]},
  // API Key management (admin can provide their own key)
  apiKeySource: { type: String, enum: ['platform', 'custom'], default: 'platform' },
  customApiKey: { type: String, default: '' },
  // Skills system
  skills: [{
    name: { type: String },
    description: { type: String },
    enabled: { type: Boolean, default: true },
    isBuiltIn: { type: Boolean, default: false }
  }],
  showGoogleSignup: { type: Boolean, default: true },
  enabledPlans: [{ type: String, enum: ['Starter', 'Pro+', 'Advance'], default: ['Starter', 'Pro+', 'Advance'] }],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Pre-save: ensure built-in skills always exist
noxtmBotConfigSchema.pre('save', function(next) {
  const builtInSkills = [
    { name: 'Signup & Onboarding', description: 'Guide users through account creation, email verification, plan selection, and company setup', enabled: true, isBuiltIn: true },
    { name: 'API Management', description: 'Help users understand and manage API keys, usage, and integrations', enabled: true, isBuiltIn: true },
    { name: 'Chat Assistant', description: 'Professional conversational assistant for workspace support and general queries. No emojis, formal tone, direct answers.', enabled: true, isBuiltIn: true },
  ];

  if (!this.skills || this.skills.length === 0) {
    this.skills = builtInSkills;
  } else {
    // Ensure built-in skills exist
    for (const builtIn of builtInSkills) {
      const exists = this.skills.find(s => s.name === builtIn.name && s.isBuiltIn);
      if (!exists) {
        this.skills.push(builtIn);
      }
    }
  }
  next();
});

module.exports = mongoose.model('NoxtmBotConfig', noxtmBotConfigSchema);
