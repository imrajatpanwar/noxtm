const mongoose = require('mongoose');

// Per-field extraction stats
const fieldStatSchema = new mongoose.Schema({
  fieldPath: { type: String, required: true },
  totalAnswered: { type: Number, default: 0 },
  totalSkipped: { type: Number, default: 0 },
  totalRetries: { type: Number, default: 0 },
  avgConfidence: { type: Number, default: 0 },
  extractionMethods: {
    regex: { type: Number, default: 0 },
    direct: { type: Number, default: 0 },
    llm: { type: Number, default: 0 },
    bulk: { type: Number, default: 0 },
    enrich: { type: Number, default: 0 },
    followup: { type: Number, default: 0 },
    defer: { type: Number, default: 0 },
  },
}, { _id: false });

const skillAnalyticsSchema = new mongoose.Schema({
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'NoxtmSkill', required: true, index: true },
  slug: { type: String, required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },

  // Aggregate counters
  totalSessions: { type: Number, default: 0 },
  completedSessions: { type: Number, default: 0 },
  abandonedSessions: { type: Number, default: 0 },
  resumedSessions: { type: Number, default: 0 },

  // Timing
  totalTurns: { type: Number, default: 0 },
  totalDurationMs: { type: Number, default: 0 },
  avgTurns: { type: Number, default: 0 },
  avgDurationMs: { type: Number, default: 0 },

  // Confidence
  avgConfidence: { type: Number, default: 0 },
  highConfidenceCount: { type: Number, default: 0 },
  medConfidenceCount: { type: Number, default: 0 },
  lowConfidenceCount: { type: Number, default: 0 },

  // Bulk extraction
  bulkExtractionCount: { type: Number, default: 0 },
  bulkFieldsSaved: { type: Number, default: 0 },

  // Per-field breakdown
  fieldStats: [fieldStatSchema],

  // Daily snapshots for trend charts (last 30 days)
  dailyStats: [{
    date: { type: String },
    sessions: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    avgConfidence: { type: Number, default: 0 },
  }],

  lastUpdated: { type: Date, default: Date.now },
}, { timestamps: true });

skillAnalyticsSchema.index({ skillId: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('SkillAnalytics', skillAnalyticsSchema);
