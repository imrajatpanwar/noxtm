const mongoose = require('mongoose');

// Comment schema with threading support
const commentSchema = new mongoose.Schema({
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
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null // null means top-level comment, otherwise it's a reply
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

// Activity log schema for tracking changes
const activitySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: ['created', 'updated', 'status_changed', 'assigned', 'unassigned', 'commented', 'priority_changed']
    },
    details: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 200
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    status: {
        type: String,
        enum: ['Todo', 'In Progress', 'In Review', 'Done'],
        default: 'Todo'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dueDate: {
        type: Date
    },
    labels: [{
        type: String,
        trim: true
    }],
    comments: [commentSchema],
    activity: [activitySchema],
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
taskSchema.index({ companyId: 1, status: 1 });
taskSchema.index({ companyId: 1, createdAt: -1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ title: 'text', description: 'text' });

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function () {
    if (this.status === 'Done') return false;
    if (!this.dueDate) return false;
    return new Date() > new Date(this.dueDate);
});

// Pre-save middleware to track activity
taskSchema.pre('save', function (next) {
    // Activity tracking is handled in the routes for more control
    next();
});

module.exports = mongoose.model('Task', taskSchema);
