const express = require('express');
const router = express.Router();
const AssignmentRule = require('../models/AssignmentRule');
const EmailAccount = require('../models/EmailAccount');
const { authenticateToken } = require('../middleware/auth');
const { requireCompanyAccess, requireCompanyOwner } = require('../middleware/emailAuth');

// All routes require authentication and company access
router.use(authenticateToken);
router.use(requireCompanyAccess);

/**
 * POST /api/assignment-rules/
 * Create a new assignment rule
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      emailAccountId,
      conditions,
      actions,
      enabled,
      priority,
      stopOnMatch
    } = req.body;

    const userId = req.user._id;
    const companyId = req.user.companyId;

    // Validate required fields
    if (!name || !emailAccountId) {
      return res.status(400).json({
        error: 'Name and email account ID are required'
      });
    }

    // Verify email account exists and belongs to company
    const emailAccount = await EmailAccount.findOne({
      _id: emailAccountId,
      companyId
    });

    if (!emailAccount) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    // Create rule
    const rule = await AssignmentRule.create({
      name,
      description,
      companyId,
      emailAccountId,
      conditions: conditions || {},
      actions: actions || {},
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 100,
      stopOnMatch: stopOnMatch || false,
      createdBy: userId
    });

    await rule.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'actions.assignTo', select: 'name email department' },
      { path: 'actions.roundRobin.teamMembers', select: 'name email' }
    ]);

    res.json({
      success: true,
      rule
    });

  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/assignment-rules/
 * Get all rules for company
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { emailAccountId } = req.query;

    const query = { companyId };

    if (emailAccountId) {
      query.emailAccountId = emailAccountId;
    }

    const rules = await AssignmentRule.find(query)
      .populate('createdBy', 'name email')
      .populate('emailAccountId', 'email displayName')
      .populate('actions.assignTo', 'name email department')
      .populate('actions.roundRobin.teamMembers', 'name email')
      .sort({ priority: 1, createdAt: -1 });

    res.json({
      rules,
      total: rules.length
    });

  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/assignment-rules/:id
 * Get rule by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const rule = await AssignmentRule.findOne({ _id: id, companyId })
      .populate('createdBy', 'name email')
      .populate('emailAccountId', 'email displayName')
      .populate('actions.assignTo', 'name email department')
      .populate('actions.roundRobin.teamMembers', 'name email');

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ rule });

  } catch (error) {
    console.error('Error fetching rule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/assignment-rules/:id
 * Update rule
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user._id;

    const rule = await AssignmentRule.findOne({ _id: id, companyId });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const {
      name,
      description,
      conditions,
      actions,
      enabled,
      priority,
      stopOnMatch
    } = req.body;

    // Update fields
    if (name !== undefined) rule.name = name;
    if (description !== undefined) rule.description = description;
    if (conditions !== undefined) rule.conditions = conditions;
    if (actions !== undefined) rule.actions = actions;
    if (enabled !== undefined) rule.enabled = enabled;
    if (priority !== undefined) rule.priority = priority;
    if (stopOnMatch !== undefined) rule.stopOnMatch = stopOnMatch;

    rule.lastModifiedBy = userId;

    await rule.save();

    await rule.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'actions.assignTo', select: 'name email department' },
      { path: 'actions.roundRobin.teamMembers', select: 'name email' }
    ]);

    res.json({
      success: true,
      rule
    });

  } catch (error) {
    console.error('Error updating rule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/assignment-rules/:id/toggle
 * Toggle rule enabled/disabled
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const rule = await AssignmentRule.findOne({ _id: id, companyId });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    rule.enabled = !rule.enabled;
    await rule.save();

    res.json({
      success: true,
      enabled: rule.enabled
    });

  } catch (error) {
    console.error('Error toggling rule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/assignment-rules/:id
 * Delete rule
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const rule = await AssignmentRule.findOne({ _id: id, companyId });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    await rule.deleteOne();

    res.json({
      success: true,
      message: 'Rule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting rule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/assignment-rules/:id/test
 * Test rule against sample email (dry-run)
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { sampleEmail } = req.body;
    const companyId = req.user.companyId;

    const rule = await AssignmentRule.findOne({ _id: id, companyId });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (!sampleEmail) {
      return res.status(400).json({ error: 'Sample email is required' });
    }

    const matches = rule.matches(sampleEmail);

    res.json({
      matches,
      rule: {
        name: rule.name,
        conditions: rule.conditions
      }
    });

  } catch (error) {
    console.error('Error testing rule:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/assignment-rules/stats/overview
 * Get rule statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const stats = await AssignmentRule.getStats(companyId);

    res.json({ stats });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
