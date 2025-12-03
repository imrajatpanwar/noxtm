const express = require('express');
const router = express.Router();
const EmailActivity = require('../models/EmailActivity');
const EmailAssignment = require('../models/EmailAssignment');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/email-activity/:assignmentId
 * Get activity log for a specific assignment
 */
router.get('/:assignmentId', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const companyId = req.user.companyId;
    const { limit = 50 } = req.query;

    // Verify assignment exists and belongs to user's company
    const assignment = await EmailAssignment.findOne({
      _id: assignmentId,
      companyId
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const activities = await EmailActivity.getByAssignment(
      assignmentId,
      parseInt(limit)
    );

    res.json({
      activities,
      total: activities.length
    });

  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-activity/company/recent
 * Get recent company-wide activity
 */
router.get('/company/recent', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { limit = 20 } = req.query;

    const activities = await EmailActivity.getRecentActivity(
      companyId,
      parseInt(limit)
    );

    res.json({
      activities,
      total: activities.length
    });

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-activity/user/history
 * Get current user's activity history
 */
router.get('/user/history', async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50 } = req.query;

    const activities = await EmailActivity.getUserActivity(
      userId,
      parseInt(limit)
    );

    res.json({
      activities,
      total: activities.length
    });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
