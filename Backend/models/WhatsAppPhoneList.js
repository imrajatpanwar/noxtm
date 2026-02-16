const mongoose = require('mongoose');

const phoneEntrySchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        trim: true,
        default: ''
    }
}, { _id: false });

const whatsAppPhoneListSchema = new mongoose.Schema({
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

    description: {
        type: String,
        trim: true,
        maxLength: 500
    },

    phones: {
        type: [phoneEntrySchema],
        default: []
    },

    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

whatsAppPhoneListSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('WhatsAppPhoneList', whatsAppPhoneListSchema);
