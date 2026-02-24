const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  fingerprint: {
    type: String,
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ip: {
    type: String,
    default: 'Unknown'
  },
  userAgent: {
    type: String,
    default: ''
  },
  browser: {
    name: { type: String, default: 'Unknown' },
    version: { type: String, default: '' }
  },
  os: {
    name: { type: String, default: 'Unknown' },
    version: { type: String, default: '' }
  },
  device: {
    type: { type: String, default: 'Desktop' }, // Desktop, Mobile, Tablet
    vendor: { type: String, default: '' },
    model: { type: String, default: '' }
  },
  location: {
    country: { type: String, default: 'Unknown' },
    region: { type: String, default: '' },
    city: { type: String, default: '' },
    timezone: { type: String, default: '' }
  },
  isBot: {
    type: Boolean,
    default: false
  },
  botReason: {
    type: String,
    default: ''
  },
  screenResolution: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: ''
  },
  platform: {
    type: String,
    default: ''
  },
  referrer: {
    type: String,
    default: ''
  },
  pageUrl: {
    type: String,
    default: ''
  },
  sessionCount: {
    type: Number,
    default: 1
  },
  lastSeenAt: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
visitorSchema.index({ companyId: 1, fingerprint: 1 });
visitorSchema.index({ companyId: 1, lastSeenAt: -1 });
visitorSchema.index({ companyId: 1, isOnline: 1 });

module.exports = mongoose.model('Visitor', visitorSchema);
