const mongoose = require('mongoose');

const userEmailConnectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  // Reference to encrypted password (avoid duplicating encryption)
  encryptedPassword: String,
  lastConnectedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Composite index for unique user-account pairs
userEmailConnectionSchema.index({ userId: 1, emailAccountId: 1 }, { unique: true });

module.exports = mongoose.model('UserEmailConnection', userEmailConnectionSchema);
