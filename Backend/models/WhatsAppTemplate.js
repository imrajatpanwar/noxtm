const mongoose = require('mongoose');

const buttonSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['quick_reply', 'call_to_action'],
        required: true
    },
    text: {
        type: String,
        required: true,
        maxLength: 25
    },
    actionType: {
        type: String,
        enum: ['url', 'phone', null]
    },
    actionValue: {
        type: String
    }
}, { _id: false });

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

    // Header
    headerType: {
        type: String,
        enum: ['none', 'text', 'image', 'video', 'document'],
        default: 'none'
    },

    headerContent: {
        type: String,
        trim: true
    },

    // Body (supports {{1}}, {{name}} etc.)
    body: {
        type: String,
        required: true
    },

    // Footer
    footerText: {
        type: String,
        trim: true,
        maxLength: 60
    },

    // Interactive buttons (max 3)
    buttons: {
        type: [buttonSchema],
        validate: [arr => arr.length <= 3, 'Maximum 3 buttons allowed']
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
