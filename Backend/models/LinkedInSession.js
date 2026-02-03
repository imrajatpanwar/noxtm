const mongoose = require('mongoose');

const linkedInSessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    accountName: {
        type: String,
        default: 'LinkedIn Account'
    },
    profileName: {
        type: String,
        required: true
    },
    liAtCookie: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'expired', 'unknown'],
        default: 'active'
    },
    lastUsed: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for fast lookup by user
linkedInSessionSchema.index({ userId: 1 });

// Update lastUsed when accessed
linkedInSessionSchema.methods.markUsed = function () {
    this.lastUsed = new Date();
    return this.save();
};

module.exports = mongoose.model('LinkedInSession', linkedInSessionSchema);
