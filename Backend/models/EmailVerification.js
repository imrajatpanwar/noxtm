const mongoose = require('mongoose');

// Check if model already exists (defined in server.js)
module.exports = mongoose.models.EmailVerification || mongoose.model('EmailVerification', new mongoose.Schema({
  fullName: { type: String },
  email: { type: String, required: true, lowercase: true },
  password: { type: String },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }
}));
