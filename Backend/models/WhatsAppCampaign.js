const mongoose = require('mongoose');

const whatsAppCampaignSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppAccount',
    required: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },

  description: {
    type: String,
    trim: true
  },

  // Optional reference to a message template
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppTemplate'
  },

  // Message content with variable support: {{name}}, {{phone}}, {{custom}}
  message: {
    type: String,
    required: true
  },

  // Optional media attachment
  mediaUrl: {
    type: String
  },

  mediaType: {
    type: String,
    enum: ['image', 'video', 'document', 'audio', null]
  },

  mediaFilename: {
    type: String
  },

  // Recipients
  recipients: [{
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppContact'
    },
    whatsappId: {
      type: String,
      required: true
    },
    name: String,
    phone: String,
    variables: {
      type: Map,
      of: String
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'skipped'],
      default: 'pending'
    },
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    error: String,
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppMessage'
    }
  }],

  // Filter by tags (used when adding recipients)
  targetTags: [{
    type: String
  }],

  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'paused', 'completed', 'failed'],
    default: 'draft',
    index: true
  },

  scheduledAt: {
    type: Date
  },

  startedAt: {
    type: Date
  },

  completedAt: {
    type: Date
  },

  // Throttle settings
  settings: {
    delayMin: { type: Number, default: 10 },    // seconds between messages (random range)
    delayMax: { type: Number, default: 45 },
    dailyLimit: { type: Number, default: 100 },  // Day 1 limit (doubles daily, unlimited from Day 5)
    batchSize: { type: Number, default: 10 },
    randomDelayEnabled: { type: Boolean, default: true }
  },

  // Auto-computed stats
  stats: {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    pending: { type: Number, default: 0 }
  },

  // Track where we paused (index into recipients array)
  resumeIndex: {
    type: Number,
    default: 0
  },

  // Ramp-up day tracking
  dayNumber: { type: Number, default: 1 },
  dailySentCount: { type: Number, default: 0 },
  lastSendDate: { type: String }
}, {
  timestamps: true
});

// Indexes
whatsAppCampaignSchema.index({ companyId: 1, status: 1 });
whatsAppCampaignSchema.index({ companyId: 1, createdAt: -1 });
whatsAppCampaignSchema.index({ scheduledAt: 1, status: 1 });

// Update stats before save
whatsAppCampaignSchema.pre('save', function (next) {
  if (this.recipients && this.recipients.length > 0) {
    this.stats.total = this.recipients.length;
    this.stats.sent = this.recipients.filter(r => r.status === 'sent').length;
    this.stats.delivered = this.recipients.filter(r => r.status === 'delivered').length;
    this.stats.read = this.recipients.filter(r => r.status === 'read').length;
    this.stats.failed = this.recipients.filter(r => r.status === 'failed').length;
    this.stats.pending = this.recipients.filter(r => r.status === 'pending').length;
  }
  next();
});

module.exports = mongoose.model('WhatsAppCampaign', whatsAppCampaignSchema);
