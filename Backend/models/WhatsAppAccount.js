const mongoose = require('mongoose');

const whatsAppAccountSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  phoneNumber: {
    type: String,
    trim: true
  },

  displayName: {
    type: String,
    trim: true
  },

  profilePicture: {
    type: String
  },

  status: {
    type: String,
    enum: ['connecting', 'connected', 'disconnected', 'banned', 'removed'],
    default: 'connecting',
    index: true
  },

  sessionFolder: {
    type: String,
    required: true
  },

  isDefault: {
    type: Boolean,
    default: false
  },

  lastConnected: {
    type: Date
  },

  lastDisconnected: {
    type: Date
  },

  // Daily message tracking for anti-ban
  dailyMessageCount: {
    type: Number,
    default: 0
  },

  dailyMessageDate: {
    type: String // YYYY-MM-DD format
  },

  settings: {
    dailyLimit: { type: Number, default: 500 },
    delayMin: { type: Number, default: 3 },   // seconds
    delayMax: { type: Number, default: 8 },    // seconds
    sendHoursStart: { type: Number, default: 8 },  // 8 AM
    sendHoursEnd: { type: Number, default: 22 },    // 10 PM
    typingSimulation: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Compound index: one phone per company
whatsAppAccountSchema.index({ companyId: 1, phoneNumber: 1 }, { unique: true, sparse: true });
whatsAppAccountSchema.index({ companyId: 1, status: 1 });

// Reset daily count if date changed
whatsAppAccountSchema.methods.checkDailyLimit = function() {
  const today = new Date().toISOString().split('T')[0];
  if (this.dailyMessageDate !== today) {
    this.dailyMessageCount = 0;
    this.dailyMessageDate = today;
  }
  return this.dailyMessageCount < this.settings.dailyLimit;
};

whatsAppAccountSchema.methods.incrementDailyCount = function() {
  const today = new Date().toISOString().split('T')[0];
  if (this.dailyMessageDate !== today) {
    this.dailyMessageCount = 1;
    this.dailyMessageDate = today;
  } else {
    this.dailyMessageCount++;
  }
};

module.exports = mongoose.model('WhatsAppAccount', whatsAppAccountSchema);
