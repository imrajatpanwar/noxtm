const mongoose = require('mongoose');

const contentTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    content: {
        type: String,
        default: '',
        trim: true
    },
    platform: {
        type: String,
        enum: ['Instagram', 'LinkedIn', 'YouTube', 'X', 'Facebook', 'Reddit', 'Other'],
        default: 'Instagram'
    },
    labels: [{
        type: String,
        trim: true
    }],
    hashtags: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
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

contentTemplateSchema.index({ companyId: 1 });

module.exports = mongoose.model('ContentTemplate', contentTemplateSchema);
