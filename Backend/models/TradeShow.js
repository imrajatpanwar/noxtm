const mongoose = require('mongoose');

const tradeShowSchema = new mongoose.Schema({
  shortName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  showDate: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  exhibitors: {
    type: String,
    trim: true
  },
  attendees: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    enum: ['Technology', 'Healthcare', 'Manufacturing', 'Retail', 'Other', ''],
    default: ''
  },
  eacDeadline: {
    type: Date
  },
  earlyBirdDeadline: {
    type: Date
  },
  showLogo: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  floorPlan: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  showAccessPeople: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  showLeadsAccessPeople: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
tradeShowSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const TradeShow = mongoose.model('TradeShow', tradeShowSchema);

module.exports = TradeShow;
