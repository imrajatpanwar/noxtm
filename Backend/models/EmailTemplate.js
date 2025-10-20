const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  // Template identification
  name: {
    type: String,
    required: true,
    trim: true
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },

  // Template type
  type: {
    type: String,
    enum: [
      'transactional',
      'marketing',
      'system',
      'notification'
    ],
    default: 'transactional'
  },

  // Category
  category: {
    type: String,
    enum: [
      'welcome',
      'password_reset',
      'email_verification',
      'account_notification',
      'billing',
      'security_alert',
      'custom'
    ],
    default: 'custom'
  },

  // Email content
  subject: {
    type: String,
    required: true
  },

  htmlBody: {
    type: String,
    required: true
  },

  textBody: {
    type: String,
    default: ''
  },

  // Variables (placeholders)
  variables: [{
    name: String,
    description: String,
    defaultValue: String,
    required: Boolean
  }],

  // Sender information
  fromName: {
    type: String,
    default: 'Noxtm'
  },

  fromEmail: {
    type: String,
    default: function() {
      return process.env.EMAIL_FROM || 'noreply@noxtm.com';
    }
  },

  replyTo: String,

  // Template settings
  enabled: {
    type: Boolean,
    default: true
  },

  isDefault: {
    type: Boolean,
    default: false
  },

  // Preview
  previewText: String,

  // Attachments
  attachments: [{
    filename: String,
    path: String,
    contentType: String
  }],

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Stats
  sendCount: {
    type: Number,
    default: 0
  },

  lastSentAt: Date,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  }
}, {
  timestamps: true
});

// Indexes
emailTemplateSchema.index({ slug: 1 });
emailTemplateSchema.index({ type: 1 });
emailTemplateSchema.index({ category: 1 });
emailTemplateSchema.index({ enabled: 1 });
emailTemplateSchema.index({ companyId: 1 });

// Method to render template with variables
emailTemplateSchema.methods.render = function(variables = {}) {
  let subject = this.subject;
  let htmlBody = this.htmlBody;
  let textBody = this.textBody;

  // Replace variables in subject and body
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    const value = variables[key] || '';

    subject = subject.replace(regex, value);
    htmlBody = htmlBody.replace(regex, value);
    textBody = textBody.replace(regex, value);
  });

  return {
    subject,
    html: htmlBody,
    text: textBody,
    from: `"${this.fromName}" <${this.fromEmail}>`,
    replyTo: this.replyTo
  };
};

// Static method to get template by slug
emailTemplateSchema.statics.getBySlug = async function(slug) {
  return await this.findOne({ slug, enabled: true });
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
