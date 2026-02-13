const mongoose = require('mongoose');

// Comment schema for post collaboration
const postCommentSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

// Activity log schema
const postActivitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['created', 'updated', 'status_changed', 'assigned', 'file_uploaded', 'file_removed', 'commented', 'approved', 'rejected']
    },
    details: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

// Media file schema
const mediaFileSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String
    },
    mimeType: {
        type: String
    },
    size: {
        type: Number
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const socialMediaPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200
    },
    content: {
        type: String,
        default: '',
        trim: true
    },
    postDate: {
        type: Date,
        required: true
    },
    postTime: {
        type: String,
        default: '10:00 AM'
    },
    status: {
        type: String,
        enum: ['Draft', 'Pending Review', 'Approved', 'Scheduled', 'Published', 'Rejected'],
        default: 'Draft'
    },
    platform: {
        type: String,
        enum: ['Instagram', 'LinkedIn', 'YouTube', 'X', 'Facebook', 'Reddit', 'Other'],
        required: true
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    socialMediaAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SocialMediaAccount'
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    recurringPattern: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', null],
        default: null
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ContentTemplate',
        default: null
    },
    mediaFiles: [mediaFileSchema],
    labels: [{
        type: String,
        trim: true
    }],
    notes: {
        type: String,
        default: '',
        trim: true
    },
    comments: [postCommentSchema],
    activity: [postActivitySchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    }
}, {
    timestamps: true
});

// Indexes for performance
socialMediaPostSchema.index({ companyId: 1, postDate: 1 });
socialMediaPostSchema.index({ companyId: 1, socialMediaAccount: 1, postDate: 1 });
socialMediaPostSchema.index({ companyId: 1, status: 1 });
socialMediaPostSchema.index({ companyId: 1, priority: 1 });
socialMediaPostSchema.index({ createdBy: 1 });
socialMediaPostSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('SocialMediaPost', socialMediaPostSchema);
