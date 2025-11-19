const express = require('express');
const router = express.Router();
const EmailLog = require('../models/EmailLog');
const EmailAccount = require('../models/EmailAccount');

// Middleware
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Get all email logs
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      direction,
      status,
      isSpam,
      accountId,
      domain,
      startDate,
      endDate
    } = req.query;

    const query = {};

    // Filter by search (from, to, subject)
    if (search) {
      query.$or = [
        { from: { $regex: search, $options: 'i' } },
        { to: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by direction
    if (direction) query.direction = direction;

    // Filter by status
    if (status) query.status = status;

    // Filter by spam
    if (isSpam !== undefined) query.isSpam = isSpam === 'true';

    // Filter by account
    if (accountId) query.emailAccount = accountId;

    // Filter by domain
    if (domain) query.domain = domain.toLowerCase();

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EmailLog.countDocuments(query)
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
    console.error('Error fetching email logs:', error);
    res.status(500).json({ message: 'Failed to fetch email logs', error: error.message });
  }
});

// Get single email log
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id)
      .lean();

    if (!log) {
      return res.status(404).json({ message: 'Email log not found' });
    }

    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    console.error('Error fetching email log:', error);
    res.status(500).json({ message: 'Failed to fetch email log', error: error.message });
  }
});

// Get email statistics
router.get('/stats/summary', isAuthenticated, async (req, res) => {
  try {
    const { period = '7d', domain, accountId } = req.query;

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
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    const query = { createdAt: { $gte: startDate } };

    if (domain) query.domain = domain.toLowerCase();
    if (accountId) query.emailAccount = accountId;

    const [
      totalSent,
      totalReceived,
      totalDelivered,
      totalBounced,
      totalFailed,
      totalSpam,
      totalQuarantined
    ] = await Promise.all([
      EmailLog.countDocuments({ ...query, direction: 'sent' }),
      EmailLog.countDocuments({ ...query, direction: 'received' }),
      EmailLog.countDocuments({ ...query, status: 'delivered' }),
      EmailLog.countDocuments({ ...query, status: 'bounced' }),
      EmailLog.countDocuments({ ...query, status: 'failed' }),
      EmailLog.countDocuments({ ...query, isSpam: true }),
      EmailLog.countDocuments({ ...query, status: 'quarantined' })
    ]);

    const total = totalSent + totalReceived;
    const successRate = total > 0 ? ((totalDelivered / total) * 100).toFixed(2) : 0;
    const bounceRate = totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(2) : 0;
    const spamRate = totalReceived > 0 ? ((totalSpam / totalReceived) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        period,
        startDate,
        endDate: now,
        total,
        sent: totalSent,
        received: totalReceived,
        delivered: totalDelivered,
        bounced: totalBounced,
        failed: totalFailed,
        spam: totalSpam,
        quarantined: totalQuarantined,
        rates: {
          success: parseFloat(successRate),
          bounce: parseFloat(bounceRate),
          spam: parseFloat(spamRate)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics', error: error.message });
  }
});

// Get spam quarantine
router.get('/spam/quarantine', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 50, domain, accountId } = req.query;

    const query = { isSpam: true };

    if (domain) query.domain = domain.toLowerCase();
    if (accountId) query.emailAccount = accountId;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      EmailLog.countDocuments(query)
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
    console.error('Error fetching spam quarantine:', error);
    res.status(500).json({ message: 'Failed to fetch spam quarantine', error: error.message });
  }
});

// Mark email as spam
router.post('/:id/mark-spam', isAuthenticated, async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Email log not found' });
    }

    log.isSpam = true;
    log.status = 'quarantined';
    log.spamReason = req.body.reason || 'Manually marked as spam';

    await log.save();

    // Update account spam count
    if (log.emailAccount) {
      await EmailAccount.findByIdAndUpdate(
        log.emailAccount,
        { $inc: { spamBlocked: 1 } }
      );
    }

    res.json({
      success: true,
      message: 'Email marked as spam'
    });
  } catch (error) {
    console.error('Error marking as spam:', error);
    res.status(500).json({ message: 'Failed to mark as spam', error: error.message });
  }
});

// Mark email as not spam
router.post('/:id/not-spam', isAuthenticated, async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Email log not found' });
    }

    const wasSpam = log.isSpam;

    log.isSpam = false;
    log.status = 'delivered';
    log.spamReason = null;

    await log.save();

    // Update account spam count
    if (wasSpam && log.emailAccount) {
      await EmailAccount.findByIdAndUpdate(
        log.emailAccount,
        { $inc: { spamBlocked: -1 } }
      );
    }

    res.json({
      success: true,
      message: 'Email marked as not spam'
    });
  } catch (error) {
    console.error('Error marking as not spam:', error);
    res.status(500).json({ message: 'Failed to mark as not spam', error: error.message });
  }
});

// Delete email log
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Email log not found' });
    }

    await log.deleteOne();

    res.json({
      success: true,
      message: 'Email log deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email log:', error);
    res.status(500).json({ message: 'Failed to delete email log', error: error.message });
  }
});

// Bulk delete email logs
router.post('/bulk-delete', isAuthenticated, async (req, res) => {
  try {
    const { ids, filter } = req.body;

    let result;

    if (ids && ids.length > 0) {
      // Delete by IDs
      result = await EmailLog.deleteMany({ _id: { $in: ids } });
    } else if (filter) {
      // Delete by filter
      const query = {};

      if (filter.olderThan) {
        query.createdAt = { $lt: new Date(filter.olderThan) };
      }

      if (filter.status) {
        query.status = filter.status;
      }

      if (filter.isSpam !== undefined) {
        query.isSpam = filter.isSpam;
      }

      result = await EmailLog.deleteMany(query);
    } else {
      return res.status(400).json({ message: 'Either ids or filter is required' });
    }

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} email logs`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error bulk deleting logs:', error);
    res.status(500).json({ message: 'Failed to bulk delete logs', error: error.message });
  }
});

module.exports = router;
