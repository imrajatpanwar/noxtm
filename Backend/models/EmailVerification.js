const mongoose = require('mongoose');

// Check if model already exists (defined in server.js)
module.exports = mongoose.models.EmailVerification || mongoose.model('EmailVerification', new mongoose.Schema({
  fullName: { type: String },
  email: { type: String, required: true, lowercase: true, index: true },
  password: { type: String },
  code: { type: String, required: true },
  userData: {
    fullName: String,
    email: String,
    password: String,
    role: String
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 10 * 60 * 1000), index: true }
}));
