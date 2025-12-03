const express = require('express');
const router = express.Router();
const EmailAssignment = require('../models/EmailAssignment');
const EmailAccount = require('../models/EmailAccount');
const EmailActivity = require('../models/EmailActivity');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { requireEmailAccess, requireCompanyAccess } = require('../middleware/emailAuth');

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/email-assignments/assign
 * Assign an email to a team member
 */
router.post('/assign', requireCompanyAccess, async (req, res) => {
  try {
    const {
      emailAccountId,
      emailUid,
      emailSubject,
      emailFrom,
      emailDate,
      emailMessageId,
      assignedTo,
      priority,
      dueDate,
      tags,
      note
    } = req.body;

    const userId = req.user._id;
    const companyId = req.user.companyId;

    // Validate required fields
    if (!emailAccountId || !emailUid || !assignedTo) {
      return res.status(400).json({
        error: 'Email account ID, email UID, and assigned user are required'
      });
    }

    // Check if email account exists and user has access
    const emailAccount = await EmailAccount.findById(emailAccountId);
    if (!emailAccount) {
      return res.status(404).json({ error: 'Email account not found' });
    }

    // Verify user has permission to assign (canManage or canSend)
    const permissions = await emailAccount.getPermissions(req.user);
    if (!permissions.canManage && !permissions.canSend) {
      return res.status(403).json({
        error: 'You do not have permission to assign emails from this account'
      });
    }

    // Verify assigned user exists and belongs to same company
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser || assignedUser.companyId?.toString() !== companyId.toString()) {
      return res.status(400).json({
        error: 'Assigned user not found or not in your company'
      });
    }

    // Check if assignment already exists
    const existingAssignment = await EmailAssignment.findOne({
      emailAccountId,
      emailUid
    });

    if (existingAssignment) {
      return res.status(400).json({
        error: 'This email is already assigned',
        assignment: existingAssignment
      });
    }

    // Create assignment
    const assignment = await EmailAssignment.create({
      emailAccountId,
      emailUid,
      emailSubject: emailSubject || '(No Subject)',
      emailFrom: emailFrom || 'Unknown',
      emailDate: emailDate || new Date(),
      emailMessageId,
      assignedTo,
      assignedBy: userId,
      companyId,
      priority: priority || 'normal',
      dueDate: dueDate || null,
      tags: tags || []
    });

    // Create activity log
    await EmailActivity.create({
      assignmentId: assignment._id,
      userId,
      action: 'assigned',
      details: {
        to: assignedTo,
        note
      },
      companyId
    });

    // Populate assignment for response
    await assignment.populate([
      { path: 'assignedTo', select: 'name email department' },
      { path: 'assignedBy', select: 'name email' },
      { path: 'emailAccountId', select: 'email displayName' }
    ]);

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error assigning email:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-assignments/my-assignments
 * Get assignments for current user
 */
router.get('/my-assignments', async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, priority, overdue, limit = 50, page = 1 } = req.query;

    const filters = { status, priority, overdue: overdue === 'true', limit: parseInt(limit) };

    const assignments = await EmailAssignment.getByUser(userId, filters);

    const total = await EmailAssignment.countDocuments({
      assignedTo: userId,
      ...(status && { status }),
      ...(priority && { priority })
    });

    res.json({
      assignments,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Error fetching my assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-assignments/team-assignments
 * Get all team assignments (manager view)
 */
router.get('/team-assignments', requireCompanyAccess, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, emailAccountId, assignedTo, limit = 100 } = req.query;

    const filters = { status, emailAccountId, assignedTo, limit: parseInt(limit) };

    const assignments = await EmailAssignment.getTeamAssignments(companyId, filters);

    // Get stats
    const stats = await EmailAssignment.getStats(companyId, emailAccountId);

    res.json({
      assignments,
      stats,
      total: assignments.length
    });

  } catch (error) {
    console.error('Error fetching team assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-assignments/:id
 * Get assignment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const assignment = await EmailAssignment.findOne({ _id: id, companyId })
      .populate('assignedTo', 'name email department emailAvatar')
      .populate('assignedBy', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('emailAccountId', 'email displayName');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ assignment });

  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/email-assignments/by-email/:emailAccountId/:emailUid
 * Get assignment for specific email
 */
router.get('/by-email/:emailAccountId/:emailUid', async (req, res) => {
  try {
    const { emailAccountId, emailUid } = req.params;
    const companyId = req.user.companyId;

    const assignment = await EmailAssignment.findOne({
      emailAccountId,
      emailUid,
      companyId
    })
      .populate('assignedTo', 'name email department emailAvatar')
      .populate('assignedBy', 'name email')
      .populate('emailAccountId', 'email displayName');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ assignment });

  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/email-assignments/:id/status
 * Update assignment status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const userId = req.user._id;
    const companyId = req.user.companyId;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const assignment = await EmailAssignment.findOne({ _id: id, companyId });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Only assigned user or managers can update status
    if (assignment.assignedTo.toString() !== userId.toString()) {
      // Check if user is manager with canManage permission
      const emailAccount = await EmailAccount.findById(assignment.emailAccountId);
      const permissions = await emailAccount.getPermissions(req.user);

      if (!permissions.canManage) {
        return res.status(403).json({
          error: 'Only the assigned user or managers can update status'
        });
      }
    }

    await assignment.updateStatus(status, userId, note);

    await assignment.populate([
      { path: 'assignedTo', select: 'name email department' },
      { path: 'assignedBy', select: 'name email' },
      { path: 'resolvedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/email-assignments/:id/reassign
 * Reassign email to another user
 */
router.patch('/:id/reassign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo, note } = req.body;
    const userId = req.user._id;
    const companyId = req.user.companyId;

    if (!assignedTo) {
      return res.status(400).json({ error: 'New assigned user is required' });
    }

    const assignment = await EmailAssignment.findOne({ _id: id, companyId });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if user has canManage permission
    const emailAccount = await EmailAccount.findById(assignment.emailAccountId);
    const permissions = await emailAccount.getPermissions(req.user);

    if (!permissions.canManage) {
      return res.status(403).json({
        error: 'Only managers can reassign emails'
      });
    }

    // Verify new assigned user exists and belongs to same company
    const newAssignedUser = await User.findById(assignedTo);
    if (!newAssignedUser || newAssignedUser.companyId?.toString() !== companyId.toString()) {
      return res.status(400).json({
        error: 'Assigned user not found or not in your company'
      });
    }

    await assignment.reassign(assignedTo, userId, note);

    await assignment.populate([
      { path: 'assignedTo', select: 'name email department' },
      { path: 'assignedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error reassigning email:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/email-assignments/:id/priority
 * Update assignment priority
 */
router.patch('/:id/priority', async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;
    const userId = req.user._id;
    const companyId = req.user.companyId;

    if (!priority) {
      return res.status(400).json({ error: 'Priority is required' });
    }

    const assignment = await EmailAssignment.findOne({ _id: id, companyId });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await assignment.updatePriority(priority, userId);

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error updating priority:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/email-assignments/:id/due-date
 * Set or update due date
 */
router.patch('/:id/due-date', async (req, res) => {
  try {
    const { id } = req.params;
    const { dueDate } = req.body;
    const userId = req.user._id;
    const companyId = req.user.companyId;

    const assignment = await EmailAssignment.findOne({ _id: id, companyId });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await assignment.setDueDate(dueDate ? new Date(dueDate) : null, userId);

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error setting due date:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/email-assignments/:id/tags
 * Add or remove tags
 */
router.patch('/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, tags } = req.body;
    const userId = req.user._id;
    const companyId = req.user.companyId;

    if (!action || !tags || !Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Action and tags array are required'
      });
    }

    const assignment = await EmailAssignment.findOne({ _id: id, companyId });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (action === 'add') {
      await assignment.addTags(tags, userId);
    } else if (action === 'remove') {
      await assignment.removeTags(tags, userId);
    } else {
      return res.status(400).json({
        error: 'Invalid action. Use "add" or "remove"'
      });
    }

    res.json({
      success: true,
      assignment
    });

  } catch (error) {
    console.error('Error updating tags:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/email-assignments/:id
 * Delete assignment
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const assignment = await EmailAssignment.findOne({ _id: id, companyId });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check if user has canManage permission
    const emailAccount = await EmailAccount.findById(assignment.emailAccountId);
    const permissions = await emailAccount.getPermissions(req.user);

    if (!permissions.canManage) {
      return res.status(403).json({
        error: 'Only managers can delete assignments'
      });
    }

    await assignment.deleteOne();

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
