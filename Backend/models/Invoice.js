const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'],
    default: 'USD'
  },
  items: {
    type: [invoiceItemSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Invoice must have at least one item'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0.1,
    min: 0,
    max: 1
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentTerms: {
    type: String,
    enum: ['due-on-receipt', 'net-15', 'net-30', 'net-60', 'net-90', 'custom'],
    default: 'net-30'
  },
  recurring: {
    type: Boolean,
    default: false
  },
  recurringInterval: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue', 'cancelled'],
    default: 'pending'
  },
  dueDate: {
    type: Date,
    required: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  paidAt: {
    type: Date,
    default: null
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ email: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ companyName: 'text', clientName: 'text', invoiceNumber: 'text' });

// Pre-save middleware to auto-calculate totals
invoiceSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);

    // Apply discount
    let discountAmount = 0;
    if (this.discount > 0) {
      discountAmount = this.discountType === 'percentage'
        ? this.subtotal * (this.discount / 100)
        : this.discount;
    }

    const afterDiscount = this.subtotal - discountAmount;
    this.tax = afterDiscount * (this.taxRate || 0.1);
    this.total = afterDiscount + this.tax;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Static method to generate unique invoice number
invoiceSchema.statics.generateInvoiceNumber = async function() {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  
  // Find the last invoice number for this year
  const lastInvoice = await this.findOne({
    invoiceNumber: new RegExp(`^${prefix}`)
  }).sort({ createdAt: -1 });
  
  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-').pop());
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

// Method to check if invoice is overdue
invoiceSchema.methods.isOverdue = function() {
  return this.status === 'pending' && new Date() > new Date(this.dueDate);
};

// Static method to update overdue invoices
invoiceSchema.statics.updateOverdueInvoices = async function() {
  const result = await this.updateMany(
    {
      status: 'pending',
      dueDate: { $lt: new Date() }
    },
    {
      $set: { status: 'overdue' }
    }
  );
  return result;
};

module.exports = mongoose.model('Invoice', invoiceSchema);
