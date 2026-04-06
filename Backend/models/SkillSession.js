const mongoose = require('mongoose');

const auditEntrySchema = new mongoose.Schema({
  turn: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  questionId: { type: String, default: null },
  fieldPath: { type: String, default: null },
  userMessage: { type: String, default: '' },
  extractedValue: { type: mongoose.Schema.Types.Mixed, default: null },
  confidence: { type: Number, default: 0 },
  method: { type: String, enum: ['regex', 'direct', 'llm', 'bulk', 'skip', 'retry', 'init', 'defer', 'enrich', 'followup'], default: 'direct' },
  valid: { type: Boolean, default: true },
  retryReason: { type: String, default: '' },
}, { _id: false });

const skillSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  slug: { type: String, required: true },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'NoxtmSkill' },
  collected: { type: mongoose.Schema.Types.Mixed, default: {} },
  skipped: [{ type: String }],
  deferred: [{ type: String }],
  currentQuestionId: { type: String, default: null },
  turnCount: { type: Number, default: 0 },
  complete: { type: Boolean, default: false },
  resumed: { type: Boolean, default: false },
  audit: [auditEntrySchema],
  avgConfidence: { type: Number, default: 0 },
  lastActiveAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

// TTL: auto-expire stale sessions after 24 hours of inactivity
skillSessionSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });
// For analytics queries
skillSessionSchema.index({ slug: 1, complete: 1 });

module.exports = mongoose.model('SkillSession', skillSessionSchema);
