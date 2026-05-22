const mongoose = require('mongoose');

const generatedLetterSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'LetterTemplate' },
  token: { type: String, required: true, unique: true, index: true },
  templateName: { type: String, required: true },
  category: { type: String, default: 'custom' },
  subject: { type: String, trim: true },
  content: { type: String, required: true },
  values: { type: mongoose.Schema.Types.Mixed, default: {} },
  recipient: {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    department: { type: String, trim: true }
  },
  companySnapshot: {
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String, trim: true }
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

generatedLetterSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('GeneratedLetter', generatedLetterSchema);
