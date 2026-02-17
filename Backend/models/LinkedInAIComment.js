const mongoose = require('mongoose');

const linkedInAICommentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    postAuthor: {
        type: String,
        default: 'Unknown'
    },
    postTextSnippet: {
        type: String,
        maxLength: 500
    },
    generatedComment: {
        type: String,
        required: true
    },
    tone: {
        type: String,
        default: 'professional'
    },
    wasPosted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Index for efficient queries
linkedInAICommentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('LinkedInAIComment', linkedInAICommentSchema);
