const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    dueDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed'],
        default: 'Pending'
    },
    completedAt: {
        type: Date
    }
}, { _id: true });

const deliverableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    fileUrl: {
        type: String,
        default: ''
    },
    deliveredAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const noteSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const clientInfoSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    companyName: {
        type: String,
        trim: true,
        default: ''
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    address: {
        type: String,
        trim: true,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    }
}, { _id: false });

const projectSchema = new mongoose.Schema({
    projectName: {
        type: String,
        required: true,
        trim: true
    },
    client: {
        type: clientInfoSchema,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        enum: [
            'Web Development',
            'Mobile App',
            'Branding',
            'Marketing',
            'UI/UX Design',
            'Consulting',
            'E-commerce',
            'SEO',
            'Content Creation',
            'Social Media',
            'Software Development',
            'Other'
        ],
        default: 'Other'
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
        default: 'Not Started'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent'],
        default: 'Medium'
    },
    budget: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'USD'
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    completedDate: {
        type: Date
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    team: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    milestones: [milestoneSchema],
    deliverables: [deliverableSchema],
    notes: [noteSchema],
    tags: [{
        type: String,
        trim: true
    }],
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company'
    }
}, {
    timestamps: true
});

// Index for faster queries
projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ companyId: 1, status: 1 });
projectSchema.index({ projectName: 'text', 'client.name': 'text', 'client.companyName': 'text' });

// Virtual for checking if project is overdue
projectSchema.virtual('isOverdue').get(function () {
    if (this.status === 'Completed' || this.status === 'Cancelled') return false;
    if (!this.endDate) return false;
    return new Date() > new Date(this.endDate);
});

// Pre-save middleware to auto-update progress based on milestones
projectSchema.pre('save', function (next) {
    if (this.milestones && this.milestones.length > 0) {
        const completedMilestones = this.milestones.filter(m => m.status === 'Completed').length;
        const autoProgress = Math.round((completedMilestones / this.milestones.length) * 100);
        // Only auto-update if not manually set
        if (this.isModified('milestones') && !this.isModified('progress')) {
            this.progress = autoProgress;
        }
    }

    // Auto-set completedDate when status changes to Completed
    if (this.isModified('status') && this.status === 'Completed' && !this.completedDate) {
        this.completedDate = new Date();
        this.progress = 100;
    }

    next();
});

module.exports = mongoose.model('Project', projectSchema);
