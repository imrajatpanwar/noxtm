const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    type: {
        type: String,
        enum: ['national', 'company', 'optional', 'restricted'],
        default: 'company'
    },
    description: { type: String, trim: true },
    isRecurring: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

holidaySchema.index({ companyId: 1, date: 1 });

holidaySchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Holiday', holidaySchema);
