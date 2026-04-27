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
        enum: ['created', 'updated', 'status_changed', 'assigned', 'unassigned', 'commented', 'priority_changed', 'assignment_requested', 'assignment_accepted', 'assignment_rejected']
    },
    details: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const assignmentRequestSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    requestComment: {
        type: String,
        default: '',
        trim: true
    },
    responseComment: {
        type: String,
        default: '',
        trim: true
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    respondedAt: {
        type: Date,
        default: null
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
    taskType: {
        type: String,
        enum: ['One Time', 'Daily', 'Calendar', 'Recurring', 'Milestone', 'Sprint'],
        default: 'One Time'
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
    // Daily task specific
    target: {
        type: Number,
        default: null,
        min: 0
    },
    dailyProgress: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 0 },
        date: { type: String } // 'YYYY-MM-DD'
    }],
    // Calendar / Recurring task
    calendarDate: { type: Date },
    recurrence: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', null],
        default: null
    },
    // Source module that created this task
    source: {
        type: String,
        enum: ['Manual', 'Data Center', 'Calendar', 'CRM', 'HR'],
        default: 'Manual'
    },
    // Real-time: track who is currently active on this task
    activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    assignees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    assignmentRequests: [assignmentRequestSchema],
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
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

taskSchema.virtual('todayProgress').get(function () {
    const today = new Date().toISOString().slice(0, 10);
    return (this.dailyProgress || [])
        .filter(progress => progress.date === today)
        .reduce((sum, progress) => sum + (Number(progress.count) || 0), 0);
});

taskSchema.virtual('progressTarget').get(function () {
    return Number(this.target) > 0 ? Number(this.target) : 100;
});

taskSchema.virtual('progressPercent').get(function () {
    const target = Number(this.target) > 0 ? Number(this.target) : 100;
    const today = new Date().toISOString().slice(0, 10);
    const progress = (this.dailyProgress || [])
        .filter(entry => entry.date === today)
        .reduce((sum, entry) => sum + (Number(entry.count) || 0), 0);
    return Math.min(100, Math.round((progress / target) * 100));
});

taskSchema.virtual('commentCount').get(function () {
    return (this.comments || []).length;
});

taskSchema.virtual('assigneeCount').get(function () {
    return (this.assignees || []).length;
});

// Pre-save middleware to track activity
taskSchema.pre('save', function (next) {
    // Activity tracking is handled in the routes for more control
    next();
});

module.exports = mongoose.model('Task', taskSchema);
