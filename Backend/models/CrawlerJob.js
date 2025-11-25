const mongoose = require('mongoose');

const crawlerJobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  scriptName: {
    type: String,
    required: true,
    trim: true
  },
  tradeShowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TradeShow',
    required: false // Will be populated after trade show is created/found
  },
  tradeShowName: {
    type: String,
    required: true,
    trim: true
  },
  tradeShowLocation: {
    type: String,
    trim: true
  },
  tradeShowDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'stopped'],
    default: 'pending'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currentPage: {
    type: Number,
    default: 0
  },
  totalPages: {
    type: Number,
    default: 0
  },
  recordsExtracted: {
    type: Number,
    default: 0
  },
  recordsSaved: {
    type: Number,
    default: 0
  },
  recordsMerged: {
    type: Number,
    default: 0
  },
  errorCount: {
    type: Number,
    default: 0
  },
  errors: [{
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    page: Number
  }],
  logs: [{
    message: String,
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      default: 'info'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  pausedAt: {
    type: Date
  },
  stoppedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for faster queries
crawlerJobSchema.index({ companyId: 1, status: 1, createdAt: -1 });
crawlerJobSchema.index({ jobId: 1 });

// Add method to log events
crawlerJobSchema.methods.addLog = function(message, level = 'info') {
  this.logs.push({ message, level, timestamp: new Date() });
  return this.save();
};

// Add method to add error
crawlerJobSchema.methods.addError = function(message, page = null) {
  this.errors.push({ message, page, timestamp: new Date() });
  this.errorCount += 1;
  return this.save();
};

// Add method to update progress
crawlerJobSchema.methods.updateProgress = function(progress, currentPage = null, recordsExtracted = null) {
  this.progress = Math.min(100, Math.max(0, progress));
  if (currentPage !== null) this.currentPage = currentPage;
  if (recordsExtracted !== null) this.recordsExtracted = recordsExtracted;
  return this.save();
};

module.exports = mongoose.model('CrawlerJob', crawlerJobSchema);
