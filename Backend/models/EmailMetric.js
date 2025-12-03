const mongoose = require('mongoose');

const emailMetricSchema = new mongoose.Schema({
  // Company/Account association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    index: true
  },

  // Time period
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true
  },

  periodStart: {
    type: Date,
    required: true,
    index: true
  },

  periodEnd: {
    type: Date,
    required: true
  },

  // Email volume metrics
  totalReceived: { type: Number, default: 0 },
  totalSent: { type: Number, default: 0 },
  totalAssigned: { type: Number, default: 0 },
  totalResolved: { type: Number, default: 0 },
  totalClosed: { type: Number, default: 0 },

  // Response metrics (in minutes)
  avgResponseTimeMinutes: Number,
  medianResponseTimeMinutes: Number,
  firstResponseTimeMinutes: Number,
  avgResolutionTimeMinutes: Number,

  // Resolution metrics
  resolvedWithinSLA: { type: Number, default: 0 },
  resolvedOutsideSLA: { type: Number, default: 0 },
  slaComplianceRate: Number, // Percentage

  // Assignment metrics
  avgAssignmentsPerAgent: Number,
  totalUnassigned: { type: Number, default: 0 },

  // Priority breakdown
  priorityBreakdown: {
    low: { type: Number, default: 0 },
    normal: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    urgent: { type: Number, default: 0 }
  },

  // Status breakdown
  statusBreakdown: {
    new: { type: Number, default: 0 },
    in_progress: { type: Number, default: 0 },
    resolved: { type: Number, default: 0 },
    closed: { type: Number, default: 0 },
    reopened: { type: Number, default: 0 }
  },

  // Team performance
  topPerformers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emailsResolved: Number,
    avgResponseTime: Number
  }],

  // Tag usage
  topTags: [{
    tag: String,
    count: Number
  }]
}, {
  timestamps: true
});

// Indexes
emailMetricSchema.index({ companyId: 1, period: 1, periodStart: 1 });
emailMetricSchema.index({ emailAccountId: 1, periodStart: 1 });

// Static method: Get metrics for a time range
emailMetricSchema.statics.getMetricsForRange = async function(companyId, startDate, endDate, period = 'daily') {
  return this.find({
    companyId: new mongoose.Types.ObjectId(companyId),
    period,
    periodStart: { $gte: startDate, $lte: endDate }
  }).sort({ periodStart: 1 });
};

// Static method: Calculate metrics for a period
emailMetricSchema.statics.calculateMetrics = async function(companyId, periodStart, periodEnd, period, emailAccountId = null) {
  const EmailAssignment = mongoose.model('EmailAssignment');

  const query = {
    companyId: new mongoose.Types.ObjectId(companyId),
    createdAt: { $gte: periodStart, $lte: periodEnd }
  };

  if (emailAccountId) {
    query.emailAccountId = new mongoose.Types.ObjectId(emailAccountId);
  }

  // Get all assignments in period
  const assignments = await EmailAssignment.find(query);

  // Calculate volume metrics
  const totalReceived = assignments.length;
  const totalAssigned = assignments.filter(a => a.assignedTo).length;
  const totalResolved = assignments.filter(a => a.status === 'resolved' || a.status === 'closed').length;
  const totalClosed = assignments.filter(a => a.status === 'closed').length;

  // Calculate response times
  const responseTimes = [];
  assignments.forEach(assignment => {
    if (assignment.firstResponseAt && assignment.createdAt) {
      const responseTime = (assignment.firstResponseAt - assignment.createdAt) / (1000 * 60); // minutes
      responseTimes.push(responseTime);
    }
  });

  const avgResponseTimeMinutes = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : null;

  const medianResponseTimeMinutes = responseTimes.length > 0
    ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
    : null;

  // Calculate resolution times
  const resolutionTimes = [];
  assignments.forEach(assignment => {
    if (assignment.resolvedAt && assignment.createdAt) {
      const resolutionTime = (assignment.resolvedAt - assignment.createdAt) / (1000 * 60); // minutes
      resolutionTimes.push(resolutionTime);
    }
  });

  const avgResolutionTimeMinutes = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : null;

  // Priority breakdown
  const priorityBreakdown = {
    low: assignments.filter(a => a.priority === 'low').length,
    normal: assignments.filter(a => a.priority === 'normal').length,
    high: assignments.filter(a => a.priority === 'high').length,
    urgent: assignments.filter(a => a.priority === 'urgent').length
  };

  // Status breakdown
  const statusBreakdown = {
    new: assignments.filter(a => a.status === 'new').length,
    in_progress: assignments.filter(a => a.status === 'in_progress').length,
    resolved: assignments.filter(a => a.status === 'resolved').length,
    closed: assignments.filter(a => a.status === 'closed').length,
    reopened: assignments.filter(a => a.status === 'reopened').length
  };

  // Top performers
  const performerMap = {};
  assignments.forEach(assignment => {
    if (assignment.assignedTo && assignment.status === 'resolved') {
      const userId = assignment.assignedTo.toString();
      if (!performerMap[userId]) {
        performerMap[userId] = {
          userId: assignment.assignedTo,
          emailsResolved: 0,
          totalResponseTime: 0,
          responseCount: 0
        };
      }
      performerMap[userId].emailsResolved++;

      if (assignment.firstResponseAt && assignment.createdAt) {
        const responseTime = (assignment.firstResponseAt - assignment.createdAt) / (1000 * 60);
        performerMap[userId].totalResponseTime += responseTime;
        performerMap[userId].responseCount++;
      }
    }
  });

  const topPerformers = Object.values(performerMap)
    .map(p => ({
      userId: p.userId,
      emailsResolved: p.emailsResolved,
      avgResponseTime: p.responseCount > 0 ? p.totalResponseTime / p.responseCount : null
    }))
    .sort((a, b) => b.emailsResolved - a.emailsResolved)
    .slice(0, 10);

  // Top tags
  const tagMap = {};
  assignments.forEach(assignment => {
    if (assignment.tags && assignment.tags.length > 0) {
      assignment.tags.forEach(tag => {
        tagMap[tag] = (tagMap[tag] || 0) + 1;
      });
    }
  });

  const topTags = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Create or update metric
  const metric = await this.findOneAndUpdate(
    {
      companyId: new mongoose.Types.ObjectId(companyId),
      emailAccountId: emailAccountId ? new mongoose.Types.ObjectId(emailAccountId) : null,
      period,
      periodStart
    },
    {
      $set: {
        periodEnd,
        totalReceived,
        totalAssigned,
        totalResolved,
        totalClosed,
        avgResponseTimeMinutes,
        medianResponseTimeMinutes,
        avgResolutionTimeMinutes,
        priorityBreakdown,
        statusBreakdown,
        topPerformers,
        topTags
      }
    },
    { upsert: true, new: true }
  );

  return metric;
};

// Static method: Get dashboard summary
emailMetricSchema.statics.getDashboardSummary = async function(companyId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const metrics = await this.find({
    companyId: new mongoose.Types.ObjectId(companyId),
    period: 'daily',
    periodStart: { $gte: startDate, $lte: endDate }
  }).sort({ periodStart: 1 });

  if (metrics.length === 0) {
    return {
      totalReceived: 0,
      totalResolved: 0,
      avgResponseTime: null,
      slaCompliance: null,
      trend: []
    };
  }

  // Aggregate totals
  const totals = metrics.reduce((acc, m) => ({
    totalReceived: acc.totalReceived + (m.totalReceived || 0),
    totalResolved: acc.totalResolved + (m.totalResolved || 0),
    totalResponseTime: acc.totalResponseTime + (m.avgResponseTimeMinutes || 0),
    responseCount: acc.responseCount + (m.avgResponseTimeMinutes ? 1 : 0)
  }), { totalReceived: 0, totalResolved: 0, totalResponseTime: 0, responseCount: 0 });

  return {
    totalReceived: totals.totalReceived,
    totalResolved: totals.totalResolved,
    avgResponseTime: totals.responseCount > 0 ? totals.totalResponseTime / totals.responseCount : null,
    trend: metrics.map(m => ({
      date: m.periodStart,
      received: m.totalReceived,
      resolved: m.totalResolved,
      avgResponseTime: m.avgResponseTimeMinutes
    }))
  };
};

module.exports = mongoose.model('EmailMetric', emailMetricSchema);
