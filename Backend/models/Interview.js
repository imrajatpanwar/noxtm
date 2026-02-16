const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  // Candidate Information
  candidateName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  candidateEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  candidatePhone: {
    type: String,
    trim: true
  },
  candidateResume: {
    type: String, // URL to resume file
    trim: true
  },
  candidateLinkedIn: {
    type: String,
    trim: true
  },
  
  // Position Information
  position: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  department: {
    type: String,
    trim: true,
    maxlength: 100
  },
  jobDescription: {
    type: String,
    trim: true
  },
  requiredSkills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: String,
    trim: true
  },
  
  // Interview Details
  interviewType: {
    type: String,
    enum: ['phone', 'video', 'onsite', 'technical', 'behavioral', 'panel', 'final'],
    default: 'video'
  },
  interviewRound: {
    type: Number,
    default: 1
  },
  totalRounds: {
    type: Number,
    default: 1
  },
  
  // Scheduling
  scheduledAt: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    default: 60
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  meetingLink: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  
  // Interviewers
  interviewers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending'
    },
    feedbackSubmitted: {
      type: Boolean,
      default: false
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Primary interviewer (for notifications)
  primaryInterviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show', 'rescheduled'],
    default: 'scheduled'
  },
  
  // Evaluation & Feedback
  feedback: [{
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    technicalSkills: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    problemSolving: {
      type: Number,
      min: 1,
      max: 5
    },
    culturalFit: {
      type: Number,
      min: 1,
      max: 5
    },
    strengths: {
      type: String,
      trim: true
    },
    weaknesses: {
      type: String,
      trim: true
    },
    comments: {
      type: String,
      trim: true
    },
    recommendation: {
      type: String,
      enum: ['strong-yes', 'yes', 'neutral', 'no', 'strong-no'],
      default: 'neutral'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Overall evaluation
  overallRating: {
    type: Number,
    min: 1,
    max: 5
  },
  overallRecommendation: {
    type: String,
    enum: ['strong-yes', 'yes', 'neutral', 'no', 'strong-no'],
    default: 'neutral'
  },
  decision: {
    type: String,
    enum: ['pending', 'hired', 'rejected', 'hold'],
    default: 'pending'
  },
  decisionReason: {
    type: String,
    trim: true
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  },
  internalNotes: {
    type: String,
    trim: true
  },
  
  // Reminders
  reminderSent: {
    type: Boolean,
    default: false
  },
  reminder24h: {
    type: Boolean,
    default: false
  },
  
  // Source
  source: {
    type: String,
    enum: ['direct', 'referral', 'linkedin', 'job-portal', 'agency', 'other'],
    default: 'direct'
  },
  
  // Owner (who created this interview)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Company
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  
  // Legacy fields
  statusHistory: [{
    status: String,
    changedAt: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }]
}, {
  timestamps: true
});

// Compound indexes for fast queries
interviewSchema.index({ owner: 1, scheduledAt: -1 });
interviewSchema.index({ companyId: 1, status: 1 });
interviewSchema.index({ 'interviewers.userId': 1, scheduledAt: -1 });
interviewSchema.index({ candidateEmail: 1 });
interviewSchema.index({ position: 1, status: 1 });
interviewSchema.index({ scheduledAt: 1, status: 1 });

// Virtual for checking if interview is upcoming
interviewSchema.virtual('isUpcoming').get(function() {
  return new Date(this.scheduledAt) > new Date();
});

// Virtual for checking if feedback is pending
interviewSchema.virtual('feedbackPending').get(function() {
  if (!this.interviewers || this.interviewers.length === 0) return false;
  return this.interviewers.some(i => !i.feedbackSubmitted);
});

// Method to add status history
interviewSchema.methods.addStatusHistory = async function(status, userId, notes = '') {
  this.statusHistory.push({
    status,
    changedAt: new Date(),
    changedBy: userId,
    notes
  });
  await this.save();
};

// Calculate overall rating from feedback
interviewSchema.methods.calculateOverallRating = function() {
  if (!this.feedback || this.feedback.length === 0) return null;
  
  const sum = this.feedback.reduce((acc, f) => acc + (f.rating || 0), 0);
  this.overallRating = Math.round((sum / this.feedback.length) * 10) / 10;
  
  return this.overallRating;
};

interviewSchema.set('toJSON', { virtuals: true });
interviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Interview', interviewSchema);
