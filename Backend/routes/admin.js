const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Company = require('../models/Company');
const AdminAuditLog = require('../models/AdminAuditLog');
const {
  SUBSCRIPTION_PLAN_VALUES,
  SUBSCRIPTION_STATUS_VALUES,
  BILLING_CYCLE_VALUES,
  ROLE_VALUES,
  USER_STATUS_VALUES,
  PERMISSION_MODULE_LIST,
  FULL_PERMISSIONS,
  NEW_USER_PERMISSIONS
} = require('../utils/constants');

// All routes require admin auth
router.use(authenticateToken, requireAdmin);

// Helper: get client IP
const getIp = (req) => req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';

// Helper: normalize user permissions
const normalizePermissions = (permissions) => {
  const normalized = {};
  for (const key of PERMISSION_MODULE_LIST) {
    normalized[key] = permissions?.[key] === true;
  }
  return normalized;
};

// Helper: sync access array from permissions
const syncAccessFromPermissions = (permissions) => {
  const access = [];
  for (const [key, value] of Object.entries(permissions)) {
    if (value === true) access.push(key);
  }
  return access;
};

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * GET /api/admin/users
 * List all users with pagination, search, filters
 */
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      role = '',
      status = '',
      plan = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Search by name or email
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filters
    if (role) query.role = role;
    if (status) query.status = status;
    if (plan) query['subscription.plan'] = plan;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('companyId', 'companyName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin: Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/admin/users/:id
 * Get single user detail
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('companyId', 'companyName industry size billing.emailCredits subscription')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Admin: Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user: role, status, permissions
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { role, status, permissions, fullName, email } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const changes = { before: {}, after: {} };
    const descriptions = [];

    // Update role
    if (role && role !== user.role) {
      changes.before.role = user.role;
      changes.after.role = role;
      descriptions.push(`Role: ${user.role} → ${role}`);
      user.role = role;

      // Reset permissions based on new role
      if (role === 'Admin') {
        user.permissions = { ...FULL_PERMISSIONS };
      } else {
        user.permissions = { ...NEW_USER_PERMISSIONS };
      }
    }

    // Update status
    if (status && status !== user.status) {
      changes.before.status = user.status;
      changes.after.status = status;
      descriptions.push(`Status: ${user.status} → ${status}`);
      user.status = status;
    }

    // Update permissions
    if (permissions && typeof permissions === 'object') {
      changes.before.permissions = { ...user.permissions?.toObject?.() || user.permissions };
      const normalized = normalizePermissions(permissions);
      for (const key of PERMISSION_MODULE_LIST) {
        user.permissions[key] = normalized[key];
      }
      changes.after.permissions = normalized;
      descriptions.push('Permissions updated');
    }

    // Update basic info
    if (fullName && fullName !== user.fullName) {
      changes.before.fullName = user.fullName;
      changes.after.fullName = fullName;
      descriptions.push(`Name: ${user.fullName} → ${fullName}`);
      user.fullName = fullName;
    }
    if (email && email !== user.email) {
      changes.before.email = user.email;
      changes.after.email = email;
      descriptions.push(`Email: ${user.email} → ${email}`);
      user.email = email;
    }

    // Sync access array
    user.access = syncAccessFromPermissions(user.permissions);

    await user.save();

    // Audit log
    if (descriptions.length > 0) {
      const actionType = changes.after.role ? 'role_change'
        : changes.after.status ? 'status_change'
        : changes.after.permissions ? 'permission_change'
        : 'user_update';

      await AdminAuditLog.logAction({
        adminId: req.user._id,
        action: actionType,
        targetType: 'User',
        targetId: user._id,
        targetName: user.fullName || user.email,
        description: descriptions.join('; '),
        before: changes.before,
        after: changes.after,
        reason: req.body.reason || '',
        ipAddress: getIp(req)
      });
    }

    const updated = await User.findById(user._id)
      .select('-password')
      .populate('companyId', 'companyName')
      .lean();

    res.json({ success: true, user: updated, message: 'User updated successfully' });
  } catch (error) {
    console.error('Admin: Error updating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user and clean up company membership
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    // Remove from company membership if applicable
    if (user.companyId) {
      await Company.updateOne(
        { _id: user.companyId },
        { $pull: { members: { user: user._id } } }
      );
    }

    const userName = user.fullName || user.email;
    await User.findByIdAndDelete(req.params.id);

    // Audit log
    await AdminAuditLog.logAction({
      adminId: req.user._id,
      action: 'user_delete',
      targetType: 'User',
      targetId: req.params.id,
      targetName: userName,
      description: `Deleted user: ${userName} (${user.email})`,
      before: { email: user.email, role: user.role, status: user.status },
      after: null,
      reason: req.body.reason || '',
      ipAddress: getIp(req)
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin: Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PUT /api/admin/users/:id/subscription
 * Admin override: change user plan directly
 */
router.put('/users/:id/subscription', async (req, res) => {
  try {
    const { plan, billingCycle, status, startDate, endDate, reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (plan && !SUBSCRIPTION_PLAN_VALUES.includes(plan)) {
      return res.status(400).json({ success: false, message: 'Invalid plan' });
    }

    const before = {
      plan: user.subscription?.plan,
      status: user.subscription?.status,
      billingCycle: user.subscription?.billingCycle,
      startDate: user.subscription?.startDate,
      endDate: user.subscription?.endDate
    };

    // Apply changes
    if (!user.subscription) {
      user.subscription = {};
    }
    if (plan) user.subscription.plan = plan;
    if (billingCycle) user.subscription.billingCycle = billingCycle;
    if (status) user.subscription.status = status;
    if (startDate) user.subscription.startDate = new Date(startDate);
    if (endDate) {
      user.subscription.endDate = new Date(endDate);
    } else if (plan && !endDate) {
      // Auto-calculate end date: 1 month or 1 year from start
      const start = startDate ? new Date(startDate) : new Date();
      const end = new Date(start);
      if (billingCycle === 'Annual') {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        end.setMonth(end.getMonth() + 1);
      }
      user.subscription.endDate = end;
    }

    await user.save();

    const after = {
      plan: user.subscription.plan,
      status: user.subscription.status,
      billingCycle: user.subscription.billingCycle,
      startDate: user.subscription.startDate,
      endDate: user.subscription.endDate
    };

    // Audit log
    await AdminAuditLog.logAction({
      adminId: req.user._id,
      action: 'plan_change',
      targetType: 'User',
      targetId: user._id,
      targetName: user.fullName || user.email,
      description: `Plan: ${before.plan || 'None'} → ${after.plan}; Status: ${before.status || 'none'} → ${after.status}`,
      before,
      after,
      reason: reason || '',
      ipAddress: getIp(req)
    });

    res.json({ success: true, user: { _id: user._id, subscription: user.subscription }, message: 'Subscription updated' });
  } catch (error) {
    console.error('Admin: Error updating subscription:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// COMPANY MANAGEMENT
// ============================================

/**
 * GET /api/admin/companies
 * List all companies with pagination, search
 */
router.get('/companies', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [companies, total] = await Promise.all([
      Company.find(query)
        .populate('owner', 'fullName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Company.countDocuments(query)
    ]);

    // Add computed fields
    const enriched = companies.map(c => ({
      ...c,
      memberCount: c.members?.length || 0,
      creditBalance: c.billing?.emailCredits || 0,
      totalPurchased: c.billing?.totalPurchased || 0,
      totalUsed: c.billing?.totalUsed || 0
    }));

    res.json({
      success: true,
      companies: enriched,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin: Error fetching companies:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/admin/companies/:id
 * Get company detail
 */
router.get('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('owner', 'fullName email role subscription')
      .populate('members.user', 'fullName email role status subscription')
      .lean();

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({ success: true, company });
  } catch (error) {
    console.error('Admin: Error fetching company:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PUT /api/admin/companies/:id
 * Update company details
 */
router.put('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const { companyName, industry, size, subscription } = req.body;
    const descriptions = [];

    if (companyName && companyName !== company.companyName) {
      descriptions.push(`Name: ${company.companyName} → ${companyName}`);
      company.companyName = companyName;
    }
    if (industry) company.industry = industry;
    if (size) company.size = size;
    if (subscription) {
      if (subscription.plan) company.subscription.plan = subscription.plan;
      if (subscription.status) company.subscription.status = subscription.status;
    }

    await company.save();

    if (descriptions.length > 0) {
      await AdminAuditLog.logAction({
        adminId: req.user._id,
        action: 'company_update',
        targetType: 'Company',
        targetId: company._id,
        targetName: company.companyName,
        description: descriptions.join('; '),
        reason: req.body.reason || '',
        ipAddress: getIp(req)
      });
    }

    res.json({ success: true, company, message: 'Company updated' });
  } catch (error) {
    console.error('Admin: Error updating company:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/admin/companies/:id/credits
 * Add or remove mail credits for a company
 */
router.post('/companies/:id/credits', async (req, res) => {
  try {
    const { action, amount, reason } = req.body;
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "add" or "remove"' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    // Initialize billing if needed
    if (!company.billing) {
      company.billing = { emailCredits: 0, totalPurchased: 0, totalUsed: 0, purchaseHistory: [] };
    }

    const beforeCredits = company.billing.emailCredits || 0;

    if (action === 'add') {
      company.billing.emailCredits = beforeCredits + amount;
      company.billing.totalPurchased = (company.billing.totalPurchased || 0) + amount;
    } else {
      // Prevent going below zero
      if (beforeCredits < amount) {
        return res.status(400).json({
          success: false,
          message: `Cannot remove ${amount} credits. Current balance: ${beforeCredits}`
        });
      }
      company.billing.emailCredits = beforeCredits - amount;
    }

    // Add to purchase history
    if (!company.billing.purchaseHistory) {
      company.billing.purchaseHistory = [];
    }
    company.billing.purchaseHistory.push({
      date: new Date(),
      emailCredits: action === 'add' ? amount : -amount,
      amount: 0, // No cost — admin grant/removal
      status: 'completed',
      paymentMethod: 'admin-grant'
    });

    await company.save();

    // Audit log
    await AdminAuditLog.logAction({
      adminId: req.user._id,
      action: 'credit_adjustment',
      targetType: 'Company',
      targetId: company._id,
      targetName: company.companyName,
      description: `${action === 'add' ? 'Added' : 'Removed'} ${amount} credits. Balance: ${beforeCredits} → ${company.billing.emailCredits}`,
      before: { emailCredits: beforeCredits },
      after: { emailCredits: company.billing.emailCredits },
      reason: reason || '',
      ipAddress: getIp(req)
    });

    res.json({
      success: true,
      message: `${amount} credits ${action === 'add' ? 'added' : 'removed'} successfully`,
      billing: {
        emailCredits: company.billing.emailCredits,
        totalPurchased: company.billing.totalPurchased,
        totalUsed: company.billing.totalUsed
      }
    });
  } catch (error) {
    console.error('Admin: Error adjusting credits:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// DASHBOARD STATS
// ============================================

/**
 * GET /api/admin/stats
 * Get overview statistics for admin dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalCompanies,
      planStats,
      statusStats
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'Active' }),
      User.countDocuments({ role: 'Admin' }),
      Company.countDocuments(),
      User.aggregate([
        { $group: { _id: '$subscription.plan', count: { $sum: 1 } } }
      ]),
      User.aggregate([
        { $group: { _id: '$subscription.status', count: { $sum: 1 } } }
      ])
    ]);

    // Calculate total credits across all companies
    const creditStats = await Company.aggregate([
      {
        $group: {
          _id: null,
          totalCredits: { $sum: '$billing.emailCredits' },
          totalPurchased: { $sum: '$billing.totalPurchased' },
          totalUsed: { $sum: '$billing.totalUsed' }
        }
      }
    ]);

    const planBreakdown = {};
    planStats.forEach(p => { planBreakdown[p._id || 'None'] = p.count; });

    const statusBreakdown = {};
    statusStats.forEach(s => { statusBreakdown[s._id || 'none'] = s.count; });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        totalCompanies,
        planBreakdown,
        statusBreakdown,
        credits: creditStats[0] || { totalCredits: 0, totalPurchased: 0, totalUsed: 0 }
      }
    });
  } catch (error) {
    console.error('Admin: Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// AUDIT LOG
// ============================================

/**
 * GET /api/admin/audit-log
 * Get admin audit log with pagination and filters
 */
router.get('/audit-log', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 25,
      action = '',
      search = '',
      startDate = '',
      endDate = ''
    } = req.query;

    const query = {};
    if (action) query.action = action;
    if (search) {
      query.$or = [
        { targetName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(query)
        .populate('adminId', 'fullName email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AdminAuditLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin: Error fetching audit log:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
