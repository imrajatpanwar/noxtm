const mongoose = require('mongoose');

// Per-company memory system — stores knowledge the AI assistant learns about the company
// Each company has its own isolated memory that persists across all user conversations
const companyMemorySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['fact', 'preference', 'process', 'decision', 'contact', 'goal', 'other'],
    default: 'fact'
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  // Who triggered this memory (which user's conversation)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  source: {
    type: String,
    enum: ['conversation', 'manual', 'system'],
    default: 'conversation'
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

companyMemorySchema.index({ companyId: 1, active: 1, category: 1 });
companyMemorySchema.index({ companyId: 1, content: 'text' });

module.exports = mongoose.model('CompanyMemory', companyMemorySchema);
