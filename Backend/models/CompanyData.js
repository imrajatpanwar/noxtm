const mongoose = require('mongoose');

const companyDataSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  companyEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  companyPhone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  linkedin: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  notes: {
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
    status: {
      type: String,
      enum: ['new', 'active', 'followup', 'converted', 'dead', 'Cold Lead', 'Warm Lead', 'Qualified (SQL)', 'Active', 'Dead Lead'],
      default: 'new'
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
  source: {
    type: String,
    enum: ['extension', 'dashboard', 'import'],
    default: 'dashboard'
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

companyDataSchema.index({ companyId: 1 });

module.exports = mongoose.model('CompanyData', companyDataSchema);
