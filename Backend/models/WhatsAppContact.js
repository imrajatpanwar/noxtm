const mongoose = require('mongoose');

const whatsAppContactSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhatsAppAccount',
    required: true,
    index: true
  },

  // WhatsApp JID (e.g. 919876543210@s.whatsapp.net)
  whatsappId: {
    type: String,
    required: true,
    trim: true
  },

  phoneNumber: {
    type: String,
    trim: true
  },

  pushName: {
    type: String,
    trim: true
  },

  profilePicture: {
    type: String
  },

  // Optional link to existing Client/CRM record
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },

  tags: [{
    type: String,
    trim: true
  }],

  isBlocked: {
    type: Boolean,
    default: false
  },

  optedOut: {
    type: Boolean,
    default: false
  },

  lastMessageAt: {
    type: Date
  },

  unreadCount: {
    type: Number,
    default: 0
  },

  // Last message preview for chat list
  lastMessagePreview: {
    type: String,
    maxLength: 150
  },

  lastMessageDirection: {
    type: String,
    enum: ['inbound', 'outbound']
  },

  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index: one contact per account per JID
whatsAppContactSchema.index({ accountId: 1, whatsappId: 1 }, { unique: true });
whatsAppContactSchema.index({ companyId: 1, tags: 1 });
whatsAppContactSchema.index({ accountId: 1, lastMessageAt: -1 }); // For chat list sorting
whatsAppContactSchema.index({ companyId: 1, phoneNumber: 1 });

module.exports = mongoose.model('WhatsAppContact', whatsAppContactSchema);
