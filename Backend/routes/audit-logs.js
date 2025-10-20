const express = require('express');
const router = express.Router();
const EmailAuditLog = require('../models/EmailAuditLog');

// Middleware
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Get all audit logs
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resourceType,
      performedBy,
      status,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;
    if (performedBy) query.performedBy = performedBy;
    if (status) query.status = status;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'fullName email'),
      EmailAuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
  }
});

// Get audit logs for specific account
router.get('/account/:id', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const query = {
      resourceType: 'email_account',
      resourceId: req.params.id
    };

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'fullName email'),
      EmailAuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching account audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch account audit logs', error: error.message });
  }
});

// Get audit logs for specific domain
router.get('/domain/:id', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const query = {
      resourceType: 'email_domain',
      resourceId: req.params.id
    };

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'fullName email'),
      EmailAuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching domain audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch domain audit logs', error: error.message });
  }
});

// Get audit logs by user
router.get('/user/:id', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const query = {
      performedBy: req.params.id
    };

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('performedBy', 'fullName email'),
      EmailAuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ message: 'Failed to fetch user audit logs', error: error.message });
  }
});

// Get audit statistics
router.get('/stats/summary', isAuthenticated, async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case '24h':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const query = { createdAt: { $gte: startDate } };

    const [
      totalActions,
      accountActions,
      domainActions,
      successfulActions,
      failedActions,
      topActions,
      topUsers
    ] = await Promise.all([
      EmailAuditLog.countDocuments(query),
      EmailAuditLog.countDocuments({ ...query, resourceType: 'email_account' }),
      EmailAuditLog.countDocuments({ ...query, resourceType: 'email_domain' }),
      EmailAuditLog.countDocuments({ ...query, status: 'success' }),
      EmailAuditLog.countDocuments({ ...query, status: 'failed' }),
      EmailAuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      EmailAuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$performedBy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            name: '$user.fullName',
            email: '$user.email',
            count: 1
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        totals: {
          all: totalActions,
          accounts: accountActions,
          domains: domainActions,
          successful: successfulActions,
          failed: failedActions
        },
        topActions,
        topUsers
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ message: 'Failed to fetch audit statistics', error: error.message });
  }
});

module.exports = router;
