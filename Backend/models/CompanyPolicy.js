const mongoose = require('mongoose');

const companyPolicySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['hr', 'security', 'operations', 'compliance', 'finance', 'it', 'general'],
    default: 'general'
  },
  content: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  version: {
    type: String,
    default: '1.0'
  },
  effectiveDate: {
    type: Date,
    default: null
  },
  reviewDate: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  // Who must acknowledge this policy
  requiresAcknowledgment: {
    type: Boolean,
    default: false
  },
  acknowledgments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

companyPolicySchema.index({ companyId: 1, category: 1 });
companyPolicySchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('CompanyPolicy', companyPolicySchema);
