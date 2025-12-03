const express = require('express');
const router = express.Router();
const SLAPolicy = require('../models/SLAPolicy');
const EmailAssignment = require('../models/EmailAssignment');
const { authenticateToken } = require('../middleware/auth');
const { requireCompanyAccess } = require('../middleware/emailAuth');

// All routes require authentication and company access
router.use(authenticateToken);
router.use(requireCompanyAccess);

/**
 * POST /api/sla-policies/
 * Create a new SLA policy
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      emailAccountId,
      targets,
      businessHours,
      escalation,
      conditions,
      enabled,
      priority
    } = req.body;

    const userId = req.user._id;
    const companyId = req.user.companyId;

    // Validate required fields
    if (!name || !targets) {
      return res.status(400).json({
        error: 'Name and targets are required'
      });
    }

    // Create policy
    const policy = await SLAPolicy.create({
      name,
      description,
      companyId,
      emailAccountId: emailAccountId || null,
      targets,
      businessHours: businessHours || {},
      escalation: escalation || {},
      conditions: conditions || {},
      enabled: enabled !== undefined ? enabled : true,
      priority: priority || 100,
      createdBy: userId
    });

    await policy.populate('createdBy', 'name email');

    res.json({
      success: true,
      policy
    });

  } catch (error) {
    console.error('Error creating SLA policy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sla-policies/
 * Get all SLA policies for company
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { emailAccountId } = req.query;

    const query = { companyId };

    if (emailAccountId) {
      query.emailAccountId = emailAccountId;
    }

    const policies = await SLAPolicy.find(query)
      .populate('createdBy', 'name email')
      .populate('emailAccountId', 'email displayName')
      .populate('escalation.escalateTo', 'name email')
      .sort({ priority: 1, createdAt: -1 });

    res.json({
      policies,
      total: policies.length
    });

  } catch (error) {
    console.error('Error fetching SLA policies:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sla-policies/:id
 * Get SLA policy by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const policy = await SLAPolicy.findOne({ _id: id, companyId })
      .populate('createdBy', 'name email')
      .populate('emailAccountId', 'email displayName')
      .populate('escalation.escalateTo', 'name email');

    if (!policy) {
      return res.status(404).json({ error: 'SLA policy not found' });
    }

    res.json({ policy });

  } catch (error) {
    console.error('Error fetching SLA policy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/sla-policies/:id
 * Update SLA policy
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const userId = req.user._id;

    const policy = await SLAPolicy.findOne({ _id: id, companyId });

    if (!policy) {
      return res.status(404).json({ error: 'SLA policy not found' });
    }

    const {
      name,
      description,
      targets,
      businessHours,
      escalation,
      conditions,
      enabled,
      priority
    } = req.body;

    // Update fields
    if (name !== undefined) policy.name = name;
    if (description !== undefined) policy.description = description;
    if (targets !== undefined) policy.targets = targets;
    if (businessHours !== undefined) policy.businessHours = businessHours;
    if (escalation !== undefined) policy.escalation = escalation;
    if (conditions !== undefined) policy.conditions = conditions;
    if (enabled !== undefined) policy.enabled = enabled;
    if (priority !== undefined) policy.priority = priority;

    policy.lastModifiedBy = userId;

    await policy.save();

    await policy.populate([
      { path: 'createdBy', select: 'name email' },
      { path: 'escalation.escalateTo', select: 'name email' }
    ]);

    res.json({
      success: true,
      policy
    });

  } catch (error) {
    console.error('Error updating SLA policy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/sla-policies/:id/toggle
 * Toggle SLA policy enabled/disabled
 */
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const policy = await SLAPolicy.findOne({ _id: id, companyId });

    if (!policy) {
      return res.status(404).json({ error: 'SLA policy not found' });
    }

    policy.enabled = !policy.enabled;
    await policy.save();

    res.json({
      success: true,
      enabled: policy.enabled
    });

  } catch (error) {
    console.error('Error toggling SLA policy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sla-policies/:id
 * Delete SLA policy
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const policy = await SLAPolicy.findOne({ _id: id, companyId });

    if (!policy) {
      return res.status(404).json({ error: 'SLA policy not found' });
    }

    await policy.deleteOne();

    res.json({
      success: true,
      message: 'SLA policy deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting SLA policy:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sla-policies/:id/check
 * Check SLA status for an assignment
 */
router.post('/:id/check', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignmentId } = req.body;
    const companyId = req.user.companyId;

    const policy = await SLAPolicy.findOne({ _id: id, companyId });

    if (!policy) {
      return res.status(404).json({ error: 'SLA policy not found' });
    }

    const assignment = await EmailAssignment.findById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const violation = policy.checkViolation(assignment);
    const needsEscalation = policy.needsEscalation(assignment);

    res.json({
      success: true,
      violation,
      needsEscalation,
      policy: {
        name: policy.name,
        targets: policy.targets
      }
    });

  } catch (error) {
    console.error('Error checking SLA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sla-policies/violations/active
 * Get all active SLA violations
 */
router.get('/violations/active', async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Get all enabled policies
    const policies = await SLAPolicy.find({ companyId, enabled: true });

    // Get all open assignments
    const openAssignments = await EmailAssignment.find({
      companyId,
      status: { $in: ['new', 'in_progress', 'reopened'] }
    });

    const violations = [];

    for (const assignment of openAssignments) {
      // Find applicable policy
      const policy = await SLAPolicy.findApplicable(assignment);

      if (policy) {
        const violation = policy.checkViolation(assignment);

        if (violation.firstResponseViolation || violation.resolutionViolation) {
          violations.push({
            assignmentId: assignment._id,
            policyId: policy._id,
            policyName: policy.name,
            assignment: {
              emailUid: assignment.emailUid,
              subject: assignment.subject,
              priority: assignment.priority,
              assignedTo: assignment.assignedTo,
              createdAt: assignment.createdAt
            },
            violation
          });
        }
      }
    }

    res.json({
      success: true,
      violations,
      total: violations.length
    });

  } catch (error) {
    console.error('Error fetching SLA violations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sla-policies/stats/overview
 * Get SLA statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const stats = await SLAPolicy.getStats(companyId);

    res.json({ stats });

  } catch (error) {
    console.error('Error fetching SLA stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
