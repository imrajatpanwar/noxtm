const mongoose = require('mongoose');

const leaveApplicationSchema = new mongoose.Schema({
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    startDate:   { type: String, required: true },  // YYYY-MM-DD
    endDate:     { type: String, required: true },  // YYYY-MM-DD
    days:        { type: Number, required: true },
    leaveType:   { type: String, enum: ['casual', 'sick', 'earned', 'unpaid', 'other'], default: 'casual' },
    reason:      { type: String, default: '' },
    status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNote:  { type: String, default: '' },
    createdAt:   { type: Date, default: Date.now },
    updatedAt:   { type: Date, default: Date.now }
});

leaveApplicationSchema.index({ companyId: 1, status: 1 });
leaveApplicationSchema.index({ userId: 1, startDate: 1 });

leaveApplicationSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('LeaveApplication', leaveApplicationSchema);
