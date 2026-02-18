const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Recipient
    type: {
        type: String,
        enum: ['bonus', 'recognition', 'reward', 'commission', 'other'],
        default: 'bonus'
    },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    reason: { type: String, trim: true },
    awardedDate: { type: Date, default: Date.now },
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending', 'approved', 'paid', 'rejected'],
        default: 'pending'
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    notes: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

incentiveSchema.index({ companyId: 1, userId: 1 });
incentiveSchema.index({ companyId: 1, status: 1 });
incentiveSchema.index({ companyId: 1, awardedDate: -1 });

incentiveSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Incentive', incentiveSchema);
