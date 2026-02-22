const mongoose = require('mongoose');

const exhibitorSchema = new mongoose.Schema({
  tradeShowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradeShow',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  boothNo: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  companyEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  website: {
    type: String,
    trim: true
  },
  options: {
    type: String,
    trim: true
  },
  contacts: [{
    fullName: {
      type: String,
      trim: true
    },
    designation: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    socialLinks: [{
      type: String,
      trim: true
    }],
    location: {
      type: String,
      trim: true
    },
    sameAsCompany: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['Cold Lead', 'Warm Lead', 'Qualified (SQL)', 'Active', 'Dead Lead'],
      default: 'Cold Lead'
    },
    followUp: {
      type: String,
      trim: true
    },
    isImportant: {
      type: Boolean,
      default: false
    },
    labels: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ContactLabel'
    }]
  }],
  extractedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
exhibitorSchema.index({ tradeShowId: 1, companyId: 1 });

module.exports = mongoose.model('Exhibitor', exhibitorSchema);
