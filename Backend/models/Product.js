const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  sku: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  costPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    default: 'pcs',
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'out-of-stock'],
    default: 'active'
  },
  tags: [{
    type: String,
    trim: true
  }],
  images: [{
    url: String,
    name: String
  }],
  specifications: [{
    key: { type: String, trim: true },
    value: { type: String, trim: true }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for unique SKU per company
productSchema.index({ company: 1, sku: 1 }, { unique: true, sparse: true });
// Text search
productSchema.index({ name: 'text', description: 'text', sku: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
