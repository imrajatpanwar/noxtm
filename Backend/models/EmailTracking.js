const mongoose = require('mongoose');

const emailTrackingSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true
  },
  recipientEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  trackingId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Open tracking
  opened: {
    type: Boolean,
    default: false
  },
  openedAt: Date,
  openCount: {
    type: Number,
    default: 0
  },
  openEvents: [{
    timestamp: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
    device: String,
    browser: String,
    os: String,
    location: {
      country: String,
      city: String,
      region: String
    }
  }],
  // Click tracking
  clicked: {
    type: Boolean,
    default: false
  },
  clickedAt: Date,
  clickCount: {
    type: Number,
    default: 0
  },
  clickEvents: [{
    timestamp: { type: Date, default: Date.now },
    url: String,
    ip: String,
    userAgent: String
  }],
  // Delivery status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed', 'failed'],
    default: 'pending',
    index: true
  },
  sentAt: Date,
  deliveredAt: Date,
  bouncedAt: Date,
  bounceReason: String,
  // Unsubscribe
  unsubscribed: {
    type: Boolean,
    default: false
  },
  unsubscribedAt: Date,
  // Company reference for multi-tenancy
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for fast queries
emailTrackingSchema.index({ campaignId: 1, recipientEmail: 1 });
emailTrackingSchema.index({ campaignId: 1, opened: 1 });
emailTrackingSchema.index({ campaignId: 1, clicked: 1 });
emailTrackingSchema.index({ campaignId: 1, status: 1 });
emailTrackingSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('EmailTracking', emailTrackingSchema);
