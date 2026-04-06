const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  prompt: { type: String, required: true },
  fieldPath: { type: String, required: true },
  type: { type: String, enum: ['text', 'email', 'phone', 'url', 'number', 'select', 'multiselect', 'textarea', 'file', 'image'], default: 'text' },
  required: { type: Boolean, default: true },
  skippable: { type: Boolean, default: false },
  deferrable: { type: Boolean, default: false },
  options: [{ type: String }],
  placeholder: { type: String, default: '' },
  validator: { type: String, default: '' },
  extractionHint: { type: String, default: '' },
  retryPrompt: { type: String, default: '' },
  condition: { type: String, default: '' },
  uiAction: { type: String, default: '' },
  // LLM follow-up: if true, bot may ask a clarifying question before accepting
  allowFollowUp: { type: Boolean, default: false },
  followUpHint: { type: String, default: '' },
  // Auto-enrich trigger: when this field is answered, try domain enrichment
  triggerEnrich: { type: Boolean, default: false },
}, { _id: false });

const noxtmSkillSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
  slug: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  isBuiltIn: { type: Boolean, default: false },
  trigger: { type: String, enum: ['company-setup', 'signup', 'post-signup', 'on-demand', 'always'], default: 'on-demand' },
  priority: { type: Number, default: 100 },
  targetModel: { type: String, enum: ['Company', 'User', 'Workspace', 'Custom'], default: 'Company' },
  systemPrompt: { type: String, default: '' },
  questions: [questionSchema],
  onComplete: {
    action: { type: String, enum: ['createCompany', 'updateCompany', 'updateUser', 'redirect', 'none'], default: 'none' },
    redirect: { type: String, default: '' },
    message: { type: String, default: '' },
    // Skill composition: run another skill after this one completes
    nextSkill: { type: String, default: '' },
    // Workspace memory: seed NoxtmMemory with collected data
    seedMemory: { type: Boolean, default: false },
  },
  // Role-aware: restrict skill to certain roles
  requiredRole: { type: String, enum: ['any', 'Owner', 'Admin', 'Member'], default: 'any' },
  // A/B testing
  variantOf: { type: mongoose.Schema.Types.ObjectId, ref: 'NoxtmSkill', default: null, index: true },
  variantName: { type: String, default: '' },
  trafficPercent: { type: Number, default: 100, min: 0, max: 100 },
  // Marketplace
  isPublished: { type: Boolean, default: false },
  author: { type: String, default: '' },
  tags: [{ type: String }],
  downloads: { type: Number, default: 0 },
  // Progressive profiling: allow deferring optional fields to later
  allowDefer: { type: Boolean, default: false },
  // Auto-enrich: attempt domain enrichment when email/website is collected
  autoEnrich: { type: Boolean, default: true },

  version: { type: Number, default: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

noxtmSkillSchema.index({ companyId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('NoxtmSkill', noxtmSkillSchema);
