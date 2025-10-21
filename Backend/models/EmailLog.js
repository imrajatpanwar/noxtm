const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  // Email identification
  messageId: {
    type: String,
    required: true,
    index: true
  },

  // Account information
  emailAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: true,
    index: true
  },

  emailAddress: {
    type: String,
    required: true,
    lowercase: true
  },

  domain: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },

  // Email direction
  direction: {
    type: String,
    enum: ['sent', 'received'],
    required: true,
    index: true
  },

  // Email details
  from: {
    type: String,
    required: true,
    lowercase: true
  },

  to: [{
    type: String,
    lowercase: true
  }],

  cc: [{
    type: String,
    lowercase: true
  }],

  bcc: [{
    type: String,
    lowercase: true
  }],

  subject: {
    type: String,
    default: '(No Subject)'
  },

  size: {
    type: Number,
    default: 0 // bytes
  },

  // Status
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'bounced', 'failed', 'spam', 'quarantined'],
    default: 'queued',
    index: true
  },

  // Spam detection
  spamScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },

  isSpam: {
    type: Boolean,
    default: false,
    index: true
  },

  spamReason: String,

  // Delivery information
  smtpResponse: String,
  deliveredAt: Date,
  bouncedAt: Date,
  bounceReason: String,

  // IP and authentication
  senderIp: String,
  authenticated: {
    type: Boolean,
    default: false
  },

  // Headers (stored as JSON string to save space)
  headers: {
    type: String, // JSON stringified
    default: '{}'
  },

  // Attachments info
  attachments: [{
    filename: String,
    size: Number,
    contentType: String
  }],

  hasAttachments: {
    type: Boolean,
    default: false
  },

  // Error information
  error: String,
  errorCode: String,

  // Metadata
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },

  // Processing time
  processingTime: {
    type: Number, // milliseconds
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ emailAccount: 1, createdAt: -1 });
emailLogSchema.index({ domain: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ isSpam: 1, createdAt: -1 });
emailLogSchema.index({ direction: 1, createdAt: -1 });

// TTL index - auto-delete logs older than 90 days
emailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Virtual for size in MB
emailLogSchema.virtual('sizeMB').get(function() {
  return (this.size / (1024 * 1024)).toFixed(2);
});

module.exports = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);
