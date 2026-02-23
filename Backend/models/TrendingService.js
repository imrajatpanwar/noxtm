const mongoose = require('mongoose');

const trendingServiceSchema = new mongoose.Schema({
  serviceName: {
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
  location: {
    type: String,
    required: true,
    trim: true
  },
  industry: {
    type: String,
    trim: true,
    default: ''
  },
  serviceLogo: {
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
  serviceAccessPeople: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  serviceLeadsAccessPeople: [{
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
trendingServiceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const TrendingService = mongoose.model('TrendingService', trendingServiceSchema);

module.exports = TrendingService;
