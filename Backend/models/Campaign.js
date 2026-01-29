const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  // Basic Info
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

  // Email Content
  subject: {
    type: String,
    required: true,
    trim: true
  },

  body: {
    type: String,
    required: true
  },

  // Email Template Reference (optional)
  emailTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate'
  },

  // Reply-To Configuration
  replyTo: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid reply-to email format']
  },

  // Sender Configuration
  fromEmail: {
    type: String,
    default: 'rajat@mail.noxtm.com',
    lowercase: true
  },

  fromName: {
    type: String,
    default: 'Noxtm'
  },

  // Recipients
  recipients: [{
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    name: String,
    companyName: String,
    // Track variables for personalization
    variables: {
      type: Map,
      of: String
    },
    // Track individual send status
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'bounced'],
      default: 'pending'
    },
    sentAt: Date,
    error: String,
    emailLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailLog'
    },
    trackingId: String
  }],

  // Contact Lists
  contactLists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContactList'
  }],

  // Campaign Status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'failed'],
    default: 'draft',
    index: true
  },

  // Scheduling
  scheduledAt: {
    type: Date,
    index: true
  },

  sentAt: Date,

  // Tracking settings
  trackingEnabled: {
    type: Boolean,
    default: false
  },
  trackOpens: {
    type: Boolean,
    default: true
  },
  trackClicks: {
    type: Boolean,
    default: true
  },

  // Statistics
  stats: {
    totalRecipients: {
      type: Number,
      default: 0
    },
    sent: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    bounced: {
      type: Number,
      default: 0
    },
    pending: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    unsubscribed: {
      type: Number,
      default: 0
    }
  },

  // Multi-tenancy
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
campaignSchema.index({ companyId: 1, status: 1 });
campaignSchema.index({ companyId: 1, createdAt: -1 });
campaignSchema.index({ scheduledAt: 1, status: 1 }); // For scheduled campaign processing

// Update statistics before save
campaignSchema.pre('save', function(next) {
  if (this.recipients && this.recipients.length > 0) {
    this.stats.totalRecipients = this.recipients.length;
    this.stats.sent = this.recipients.filter(r => r.status === 'sent').length;
    this.stats.failed = this.recipients.filter(r => r.status === 'failed').length;
    this.stats.bounced = this.recipients.filter(r => r.status === 'bounced').length;
    this.stats.pending = this.recipients.filter(r => r.status === 'pending').length;
  }
  next();
});

// Method: Add recipients from contact list
campaignSchema.methods.addRecipientsFromList = async function(contactList) {
  const newRecipients = contactList.contacts.map(contact => ({
    email: contact.email,
    name: contact.name,
    companyName: contact.companyName,
    variables: new Map(Object.entries(contact.variables || {})),
    status: 'pending'
  }));

  // Avoid duplicates
  const existingEmails = new Set(this.recipients.map(r => r.email));
  const uniqueRecipients = newRecipients.filter(r => !existingEmails.has(r.email));

  this.recipients.push(...uniqueRecipients);
  this.contactLists.addToSet(contactList._id);
};

// Static method: Get campaigns by company with role filter
campaignSchema.statics.getByCompany = async function(companyId, filters = {}) {
  const query = { companyId };

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  return this.find(query)
    .populate('createdBy', 'fullName email')
    .populate('lastModifiedBy', 'fullName email')
    .populate('contactLists', 'name')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Campaign', campaignSchema);
