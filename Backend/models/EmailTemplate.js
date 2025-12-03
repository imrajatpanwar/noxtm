const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  // Template identification
  name: {
    type: String,
    required: true
  },

  description: String,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Template content
  subject: {
    type: String,
    required: true
  },

  body: {
    type: String,
    required: true
  },

  // Template type
  category: {
    type: String,
    enum: ['support', 'sales', 'general', 'auto-response', 'follow-up'],
    default: 'general'
  },

  // Variables that can be used in template
  // Example: {{customerName}}, {{orderId}}
  variables: [{
    name: String,
    description: String,
    defaultValue: String
  }],

  // Attachments (optional)
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }],

  // Usage tracking
  useCount: {
    type: Number,
    default: 0
  },

  lastUsedAt: Date,

  // Settings
  enabled: {
    type: Boolean,
    default: true
  },

  // Is this a shared template (available to all company members)
  isShared: {
    type: Boolean,
    default: true
  },

  // Metadata
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
emailTemplateSchema.index({ companyId: 1, enabled: 1 });
emailTemplateSchema.index({ category: 1 });
emailTemplateSchema.index({ companyId: 1, isShared: 1 });

// Method: Render template with variables
emailTemplateSchema.methods.render = function(variables = {}) {
  let subject = this.subject;
  let body = this.body;

  // Replace variables in subject and body
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(placeholder, value || '');
    body = body.replace(placeholder, value || '');
  }

  // Replace any remaining placeholders with default values
  if (this.variables && this.variables.length > 0) {
    this.variables.forEach(variable => {
      const placeholder = new RegExp(`{{${variable.name}}}`, 'g');
      const defaultValue = variables[variable.name] || variable.defaultValue || '';
      subject = subject.replace(placeholder, defaultValue);
      body = body.replace(placeholder, defaultValue);
    });
  }

  return { subject, body };
};

// Method: Extract variables from template text
emailTemplateSchema.methods.extractVariables = function() {
  const text = this.subject + ' ' + this.body;
  const regex = /{{(\w+)}}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }

  return matches;
};

// Post-use hook: Update statistics
emailTemplateSchema.methods.recordUsage = async function() {
  this.useCount += 1;
  this.lastUsedAt = new Date();
  await this.save();
};

// Static method: Get templates by company
emailTemplateSchema.statics.getByCompany = async function(companyId, filters = {}) {
  const query = { companyId, enabled: true };

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.isShared !== undefined) {
    query.isShared = filters.isShared;
  }

  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  return this.find(query)
    .populate('createdBy', 'name email')
    .populate('lastModifiedBy', 'name email')
    .sort({ useCount: -1, name: 1 }); // Most used first
};

// Static method: Get popular templates
emailTemplateSchema.statics.getPopular = async function(companyId, limit = 10) {
  return this.find({
    companyId,
    enabled: true,
    isShared: true
  })
    .sort({ useCount: -1 })
    .limit(limit)
    .populate('createdBy', 'name email');
};

// Static method: Get template statistics
emailTemplateSchema.statics.getStats = async function(companyId) {
  const stats = await this.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
    {
      $group: {
        _id: null,
        totalTemplates: { $sum: 1 },
        enabledTemplates: {
          $sum: { $cond: ['$enabled', 1, 0] }
        },
        totalUsage: { $sum: '$useCount' },
        categoryBreakdown: {
          $push: {
            category: '$category',
            count: 1
          }
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalTemplates: 0,
      enabledTemplates: 0,
      totalUsage: 0,
      categoryBreakdown: {}
    };
  }

  // Process category breakdown
  const categoryMap = {};
  stats[0].categoryBreakdown.forEach(item => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
  });

  return {
    totalTemplates: stats[0].totalTemplates,
    enabledTemplates: stats[0].enabledTemplates,
    totalUsage: stats[0].totalUsage,
    categoryBreakdown: categoryMap
  };
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
