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
  website: {
    type: String,
    trim: true
  },
  options: {
    type: String,
    trim: true
  },
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
