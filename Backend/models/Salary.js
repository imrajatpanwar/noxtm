const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: {
    type: String,
    required: true,
    trim: true
  },
  employeeEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  designation: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  // Earnings
  basicSalary: {
    type: Number,
    required: true,
    min: 0
  },
  hra: {
    type: Number,
    default: 0,
    min: 0
  },
  allowances: {
    type: Number,
    default: 0,
    min: 0
  },
  bonus: {
    type: Number,
    default: 0,
    min: 0
  },
  overtime: {
    type: Number,
    default: 0,
    min: 0
  },
  otherEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  // Incentive (auto-pulled from Incentive model)
  incentiveAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  incentiveDetails: [{
    title: String,
    amount: Number,
    type: String,
    incentiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incentive' }
  }],
  // Deductions
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  providentFund: {
    type: Number,
    default: 0,
    min: 0
  },
  insurance: {
    type: Number,
    default: 0,
    min: 0
  },
  loanDeduction: {
    type: Number,
    default: 0,
    min: 0
  },
  otherDeductions: {
    type: Number,
    default: 0,
    min: 0
  },
  // Attendance-based deductions (auto-computed from attendance data)
  attendanceDeduction: {
    type: Number,
    default: 0,
    min: 0
  },
  attendanceBreakdown: {
    paidLeaveDays: { type: Number, default: 0 },
    halfDayCount: { type: Number, default: 0 },
    lateCount: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    paidLeaveDeduction: { type: Number, default: 0 },
    halfDayDeduction: { type: Number, default: 0 },
    lateDeduction: { type: Number, default: 0 },
    totalWorkingDays: { type: Number, default: 0 },
    daysPresent: { type: Number, default: 0 }
  },
  // Computed
  grossEarnings: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'],
    default: 'USD'
  },
  payPeriod: {
    type: String,
    enum: ['monthly', 'bi-weekly', 'weekly'],
    default: 'monthly'
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['bank-transfer', 'cheque', 'cash', 'upi', 'other'],
    default: 'bank-transfer'
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'on-hold', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Pre-save: compute totals (incentive added to earnings, attendance deduction added to deductions)
salarySchema.pre('save', function (next) {
  this.grossEarnings = (this.basicSalary || 0) + (this.hra || 0) + (this.allowances || 0) + (this.bonus || 0) + (this.overtime || 0) + (this.otherEarnings || 0) + (this.incentiveAmount || 0);
  this.totalDeductions = (this.tax || 0) + (this.providentFund || 0) + (this.insurance || 0) + (this.loanDeduction || 0) + (this.otherDeductions || 0) + (this.attendanceDeduction || 0);
  this.netSalary = this.grossEarnings - this.totalDeductions;
  next();
});

salarySchema.index({ company: 1, employee: 1, month: 1, year: 1 });
salarySchema.index({ company: 1, status: 1 });

module.exports = mongoose.model('Salary', salarySchema);
