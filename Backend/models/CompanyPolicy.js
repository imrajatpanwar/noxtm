const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  content: { type: String, required: true },
  date: { type: Date, default: Date.now }
}, { _id: false });

const companyPolicySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'Company Policy',
    trim: true,
    maxlength: 200
  },
  // Growing document blocks — each append adds a new block with its timestamp
  blocks: [blockSchema],
  acknowledgments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signatureImage: {
      type: String,
      default: ''
    },
    acknowledgedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ownerSignatureImage: { type: String, default: '' },
  ownerSignedAt: { type: Date },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

companyPolicySchema.index({ companyId: 1 });

module.exports = mongoose.model('CompanyPolicy', companyPolicySchema);
