const mongoose = require('mongoose');

const whatsAppTemplateSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200
    },

    category: {
        type: String,
        enum: ['marketing', 'utility', 'transactional'],
        default: 'marketing'
    },

    language: {
        type: String,
        default: 'en',
        trim: true
    },

    // Body (supports {{1}}, {{name}} etc.)
    body: {
        type: String,
        required: true
    },

    // Variable names used in the template
    variables: [{
        type: String,
        trim: true
    }],

    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

whatsAppTemplateSchema.index({ companyId: 1, createdAt: -1 });
whatsAppTemplateSchema.index({ companyId: 1, category: 1 });

module.exports = mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema);
