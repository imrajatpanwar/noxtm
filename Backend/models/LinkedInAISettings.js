const mongoose = require('mongoose');

const linkedInAISettingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    commentTone: {
        type: String,
        enum: ['professional', 'casual', 'thoughtful', 'witty', 'supportive'],
        default: 'professional'
    },
    commentMaxLength: {
        type: Number,
        default: 200,
        min: 50,
        max: 500
    },
    commentLanguage: {
        type: String,
        default: 'English'
    },
    autoGenerate: {
        type: Boolean,
        default: false
    },
    customInstructions: {
        type: String,
        default: '',
        maxLength: 500
    },
    dailyLimit: {
        type: Number,
        default: 50
    },
    commentsToday: {
        type: Number,
        default: 0
    },
    lastResetDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('LinkedInAISettings', linkedInAISettingsSchema);
