const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    enum: [
      'office-supplies', 'travel', 'utilities', 'rent', 'software',
      'hardware', 'marketing', 'meals', 'transportation', 'insurance',
      'maintenance', 'professional-services', 'training', 'miscellaneous'
    ],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'],
    default: 'USD'
  },
  date: {
    type: Date,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit-card', 'debit-card', 'bank-transfer', 'upi', 'cheque', 'other'],
    default: 'bank-transfer'
  },
  vendor: {
    type: String,
    trim: true,
    default: ''
  },
  receiptUrl: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'reimbursed'],
    default: 'approved'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringInterval: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  tags: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

expenseSchema.index({ company: 1, date: -1 });
expenseSchema.index({ company: 1, category: 1 });
expenseSchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
