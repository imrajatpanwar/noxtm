const mongoose = require('mongoose');

const whatsAppQuickReplySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  shortcut: {
    type: String,
    required: true,
    trim: true,
    // keyword user types after "/", e.g. "hello", "price", "thanks"
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

whatsAppQuickReplySchema.index({ companyId: 1, shortcut: 1 }, { unique: true });

module.exports = mongoose.model('WhatsAppQuickReply', whatsAppQuickReplySchema);
