const mongoose = require('mongoose');

const zynthrConfigSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  enabled: { type: Boolean, default: true },
  botGreeting: { type: String, default: "Hey! I'm Zynthr, your setup assistant at Noxtm. Ready to get your workspace rolling? 🚀" },
  personality: { type: String, enum: ['friendly', 'professional', 'casual', 'formal'], default: 'friendly' },
  maxWordCount: { type: Number, default: 80 },
  responseLanguage: { type: String, default: 'English' },
  customInstructions: { type: String, default: '' },
  skills: [{
    name: { type: String },
    description: { type: String },
    enabled: { type: Boolean, default: true }
  }],
  showGoogleSignup: { type: Boolean, default: true },
  enabledPlans: [{ type: String, enum: ['Starter', 'Pro+', 'Advance'], default: ['Starter', 'Pro+', 'Advance'] }],
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ZynthrConfig', zynthrConfigSchema);
