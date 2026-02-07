const mongoose = require('mongoose');

// === Core Memory — about the main user (one per user) ===
const coreMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  profilePicture: { type: String, default: '' }, // base64 encoded image
  name: { type: String, default: '' },
  role: { type: String, default: '' },
  communicationStyle: { type: String, default: '' },
  expertiseAreas: { type: String, default: '' },
  preferences: { type: String, default: '' },
  commonPhrases: { type: String, default: '' },
  workContext: { type: String, default: '' },
  goals: { type: String, default: '' },
  additionalNotes: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

coreMemorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const CoreMemory = mongoose.model('CoreMemory', coreMemorySchema);

// === Context Memory — how to interact when helping specific user types ===
const contextMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  label: { type: String, required: true, maxlength: 100 }, // e.g. "Technical Colleagues"
  background: { type: String, default: '' },
  preferredStyle: { type: String, default: '' },
  commonTopics: { type: String, default: '' },
  tone: { type: String, default: '' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

contextMemorySchema.index({ userId: 1, label: 1 }, { unique: true });

contextMemorySchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const ContextMemory = mongoose.model('ContextMemory', contextMemorySchema);

// === Learned Memory — auto-captured insights from conversations ===
const learnedMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', index: true },
  category: { type: String, enum: ['preference', 'correction', 'fact', 'style', 'other'], default: 'other' },
  content: { type: String, required: true, maxlength: 500 },
  source: { type: String, default: 'conversation' }, // 'conversation' or 'manual'
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

learnedMemorySchema.index({ userId: 1, active: 1 });

const LearnedMemory = mongoose.model('LearnedMemory', learnedMemorySchema);

module.exports = { CoreMemory, ContextMemory, LearnedMemory };
