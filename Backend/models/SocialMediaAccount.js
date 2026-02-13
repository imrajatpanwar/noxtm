const mongoose = require('mongoose');

const hashtagGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    hashtags: {
        type: String,
        default: ''
    }
}, { _id: true });

const socialMediaAccountSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },
    platform: {
        type: String,
        required: true,
        enum: ['Instagram', 'LinkedIn', 'YouTube', 'X', 'Facebook', 'Reddit', 'Other']
    },
    handle: {
        type: String,
        trim: true,
        default: ''
    },
    color: {
        type: String,
        default: '#6366f1'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    hashtagGroups: [hashtagGroupSchema],
    defaultLabels: [{
        type: String,
        trim: true
    }],
    isActive: {
        type: Boolean,
        default: true
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

// Indexes
socialMediaAccountSchema.index({ companyId: 1, isActive: 1 });
socialMediaAccountSchema.index({ companyId: 1, platform: 1 });
socialMediaAccountSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('SocialMediaAccount', socialMediaAccountSchema);
