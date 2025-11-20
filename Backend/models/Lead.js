const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  clientName: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  designation: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  requirements: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Cold Lead', 'Warm Lead', 'Qualified (SQL)', 'Active', 'Dead Lead'],
    default: 'Cold Lead'
  },
  followUp: {
    type: String,
    default: 'Follow-Up - 00'
  },
  social: {
    linkedin: { type: String, trim: true },
    twitter: { type: String, trim: true },
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    website: { type: String, trim: true }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  convertedToClient: {
    type: Boolean,
    default: false
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  }
}, {
  timestamps: true
});

// Index for faster queries
leadSchema.index({ userId: 1, status: 1 });
leadSchema.index({ userId: 1, email: 1 });
leadSchema.index({ companyName: 'text', clientName: 'text', email: 'text' });

module.exports = mongoose.model('LeadDirectory', leadSchema);
