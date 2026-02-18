const mongoose = require('mongoose');

const letterTemplateSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true },
    category: {
        type: String,
        enum: ['offer', 'employment', 'termination', 'warning', 'experience', 'promotion', 'custom'],
        default: 'custom'
    },
    subject: { type: String, trim: true },
    content: { type: String, required: true }, // HTML/text with {{variable}} placeholders
    variables: [{ type: String }], // Supported variable names like employeeName, department, etc.
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

letterTemplateSchema.index({ companyId: 1, category: 1 });

letterTemplateSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('LetterTemplate', letterTemplateSchema);
