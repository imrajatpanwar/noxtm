const express = require('express');
const router = express.Router();
const EmailMetric = require('../models/EmailMetric');
const EmailAssignment = require('../models/EmailAssignment');
const { authenticateToken } = require('../middleware/auth');
const { requireCompanyAccess } = require('../middleware/emailAuth');

// All routes require authentication and company access
router.use(authenticateToken);
router.use(requireCompanyAccess);

/**
 * GET /api/analytics/dashboard
 * Get dashboard summary with key metrics
 */
router.get('/dashboard', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { days = 30 } = req.query;

    const summary = await EmailMetric.getDashboardSummary(companyId, parseInt(days));

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/metrics
 * Get metrics for a specific time range
 */
router.get('/metrics', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { startDate, endDate, period = 'daily', emailAccountId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let metrics;
    if (emailAccountId) {
      metrics = await EmailMetric.find({
        companyId,
        emailAccountId,
        period,
        periodStart: { $gte: start, $lte: end }
      }).sort({ periodStart: 1 });
    } else {
      metrics = await EmailMetric.getMetricsForRange(companyId, start, end, period);
    }

    res.json({
      success: true,
      metrics,
      total: metrics.length
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/analytics/calculate
 * Manually trigger metrics calculation for a period
 */
router.post('/calculate', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { periodStart, periodEnd, period = 'daily', emailAccountId } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'periodStart and periodEnd are required' });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    const metric = await EmailMetric.calculateMetrics(
      companyId,
      start,
      end,
      period,
      emailAccountId || null
    );

    res.json({
      success: true,
      metric
    });

  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/trends
 * Get trend data for charts
 */
router.get('/trends', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { days = 30, metric = 'volume' } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const metrics = await EmailMetric.find({
      companyId,
      period: 'daily',
      periodStart: { $gte: startDate, $lte: endDate }
    }).sort({ periodStart: 1 });

    let trendData;
    switch (metric) {
      case 'volume':
        trendData = metrics.map(m => ({
          date: m.periodStart,
          received: m.totalReceived || 0,
          sent: m.totalSent || 0,
          resolved: m.totalResolved || 0
        }));
        break;

      case 'response-time':
        trendData = metrics.map(m => ({
          date: m.periodStart,
          avgResponseTime: m.avgResponseTimeMinutes || 0,
          medianResponseTime: m.medianResponseTimeMinutes || 0
        }));
        break;

      case 'priority':
        trendData = metrics.map(m => ({
          date: m.periodStart,
          ...m.priorityBreakdown
        }));
        break;

      case 'status':
        trendData = metrics.map(m => ({
          date: m.periodStart,
          ...m.statusBreakdown
        }));
        break;

      default:
        trendData = metrics.map(m => ({
          date: m.periodStart,
          received: m.totalReceived || 0
        }));
    }

    res.json({
      success: true,
      trend: trendData
    });

  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/team-performance
 * Get team performance metrics
 */
router.get('/team-performance', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { days = 30 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const metrics = await EmailMetric.find({
      companyId,
      period: 'daily',
      periodStart: { $gte: startDate, $lte: endDate }
    });

    // Aggregate top performers across all periods
    const performerMap = {};
    metrics.forEach(metric => {
      if (metric.topPerformers) {
        metric.topPerformers.forEach(p => {
          const userId = p.userId.toString();
          if (!performerMap[userId]) {
            performerMap[userId] = {
              userId: p.userId,
              emailsResolved: 0,
              totalResponseTime: 0,
              responseCount: 0
            };
          }
          performerMap[userId].emailsResolved += p.emailsResolved || 0;
          if (p.avgResponseTime) {
            performerMap[userId].totalResponseTime += p.avgResponseTime;
            performerMap[userId].responseCount++;
          }
        });
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

    // Populate user details
    await EmailMetric.populate(topPerformers, {
      path: 'userId',
      select: 'name email department'
    });

    res.json({
      success: true,
      topPerformers
    });

  } catch (error) {
    console.error('Error fetching team performance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/tags
 * Get tag usage statistics
 */
router.get('/tags', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { days = 30 } = req.query;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const metrics = await EmailMetric.find({
      companyId,
      period: 'daily',
      periodStart: { $gte: startDate, $lte: endDate }
    });

    // Aggregate tags across all periods
    const tagMap = {};
    metrics.forEach(metric => {
      if (metric.topTags) {
        metric.topTags.forEach(t => {
          tagMap[t.tag] = (tagMap[t.tag] || 0) + t.count;
        });
      }
    });

    const tags = Object.entries(tagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      tags,
      total: tags.length
    });

  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/real-time
 * Get real-time statistics (current day)
 */
router.get('/real-time', async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Get today's data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assignments = await EmailAssignment.find({
      companyId,
      createdAt: { $gte: today }
    });

    const stats = {
      todayReceived: assignments.length,
      todayAssigned: assignments.filter(a => a.assignedTo).length,
      todayResolved: assignments.filter(a => a.status === 'resolved' || a.status === 'closed').length,
      todayUnassigned: assignments.filter(a => !a.assignedTo).length,
      currentlyOpen: assignments.filter(a => a.status !== 'closed' && a.status !== 'resolved').length,
      priorityBreakdown: {
        urgent: assignments.filter(a => a.priority === 'urgent').length,
        high: assignments.filter(a => a.priority === 'high').length,
        normal: assignments.filter(a => a.priority === 'normal').length,
        low: assignments.filter(a => a.priority === 'low').length
      }
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching real-time stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
