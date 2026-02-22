const mongoose = require('mongoose');

const contactLabelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50
  },
  color: {
    type: String,
    default: '#6b7280',
    trim: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

contactLabelSchema.index({ companyId: 1 });
contactLabelSchema.index({ companyId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('ContactLabel', contactLabelSchema);
