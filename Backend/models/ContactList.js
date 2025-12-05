const mongoose = require('mongoose');

const contactListSchema = new mongoose.Schema({
  // List Identification
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

  // Contacts
  contacts: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
    },
    name: String,
    companyName: String,
    phone: String,
    designation: String,
    location: String,
    // Custom variables for email personalization
    variables: {
      type: Map,
      of: String
    },
    // Source tracking
    sourceType: {
      type: String,
      enum: ['manual', 'lead', 'tradeshow', 'csv', 'other']
    },
    sourceId: String, // Reference to source (Lead ID, TradeShow ID, etc.)
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Source Information
  source: {
    type: {
      type: String,
      enum: ['manual', 'csv', 'leads', 'tradeshow', 'custom'],
      required: true
    },
    details: String, // e.g., "Imported from Q4_prospects.csv" or "Trade Show: CES 2024"
    importedAt: Date
  },

  // Statistics
  contactCount: {
    type: Number,
    default: 0
  },

  // Multi-tenancy & Role Access
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Access Control - Only Manager and Owner can view
  roleAccess: {
    type: [String],
    enum: ['Owner', 'Manager'],
    default: ['Owner', 'Manager']
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Usage tracking
  usedInCampaigns: {
    type: Number,
    default: 0
  },

  lastUsedAt: Date
}, {
  timestamps: true
});

// Indexes
contactListSchema.index({ companyId: 1, createdAt: -1 });
contactListSchema.index({ 'contacts.email': 1 });

// Update contact count before save
contactListSchema.pre('save', function(next) {
  this.contactCount = this.contacts.length;
  next();
});

// Method: Add contact (with duplicate check)
contactListSchema.methods.addContact = function(contact) {
  const existingIndex = this.contacts.findIndex(c => c.email === contact.email);

  if (existingIndex === -1) {
    this.contacts.push({
      ...contact,
      addedAt: new Date()
    });
    return true;
  }
  return false; // Contact already exists
};

// Method: Add multiple contacts (bulk import)
contactListSchema.methods.addContacts = function(contacts) {
  const existingEmails = new Set(this.contacts.map(c => c.email));
  const newContacts = contacts.filter(c => !existingEmails.has(c.email));

  newContacts.forEach(contact => {
    this.contacts.push({
      ...contact,
      addedAt: new Date()
    });
  });

  return newContacts.length;
};

// Method: Remove contact by email
contactListSchema.methods.removeContact = function(email) {
  const initialLength = this.contacts.length;
  this.contacts = this.contacts.filter(c => c.email !== email);
  return this.contacts.length < initialLength;
};

// Static method: Get lists by company (with role check)
contactListSchema.statics.getByCompany = async function(companyId, userRole, filters = {}) {
  // Only Manager and Owner can access
  if (!['Owner', 'Manager'].includes(userRole)) {
    return [];
  }

  const query = { companyId };

  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  if (filters.sourceType) {
    query['source.type'] = filters.sourceType;
  }

  return this.find(query)
    .populate('createdBy', 'fullName email')
    .populate('lastModifiedBy', 'fullName email')
    .sort({ createdAt: -1 });
};

// Method: Record usage
contactListSchema.methods.recordUsage = async function() {
  this.usedInCampaigns += 1;
  this.lastUsedAt = new Date();
  await this.save();
};

module.exports = mongoose.model('ContactList', contactListSchema);
