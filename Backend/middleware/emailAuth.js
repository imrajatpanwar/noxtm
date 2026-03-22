const EmailAccount = require('../models/EmailAccount');
const Company = require('../models/Company');
const User = require('../models/User');
const { ROLES } = require('../utils/constants');

/**
 * Middleware to require company owner role
 * Only allows company owners or admins to proceed
 */
exports.requireCompanyOwner = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    // Admin bypass
    if (req.user.role === ROLES.ADMIN) {
      req.isCompanyOwner = true;
      return next();
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company membership required'
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const member = company.members.find(m => m.user.toString() === userId.toString());
    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this company'
      });
    }

    if (member.roleInCompany !== 'Owner') {
      return res.status(403).json({
        success: false,
        message: 'Only the workspace owner can perform this action'
      });
    }

    req.isCompanyOwner = true;
    next();
  } catch (error) {
    console.error('requireCompanyOwner error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Middleware to check access to email account with specific permission
 * Usage: requireEmailAccess('canRead'), requireEmailAccess('canSend'), etc.
 *
 * Personal Inbox: All company members have access (automatic)
 * Email Marketing: Only users with marketing permission
 */
exports.requireEmailAccess = (requiredPermission = 'canRead') => {
  return async (req, res, next) => {
    try {
      const accountId = req.params.id || req.params.accountId;
      const user = req.user;

      if (!accountId) {
        return res.status(400).json({ error: 'Account ID is required' });
      }

      const emailAccount = await EmailAccount.findById(accountId);

      if (!emailAccount) {
        return res.status(404).json({ error: 'Email account not found' });
      }

      // Check if user has access
      const hasAccess = await emailAccount.hasAccess(user);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'You do not have access to this email account'
        });
      }

      // Check specific permission
      const permissions = await emailAccount.getPermissions(user);
      if (!permissions[requiredPermission]) {
        const action = requiredPermission.replace('can', '').toLowerCase();
        return res.status(403).json({
          error: `You do not have permission to ${action}`,
          requiredPermission,
          yourPermissions: permissions
        });
      }

      req.emailAccount = emailAccount;
      req.emailPermissions = permissions;
      next();

    } catch (error) {
      console.error('requireEmailAccess error:', error);
      res.status(500).json({ error: error.message });
    }
  };
};

/**
 * Middleware to check if user has company access (owner or member)
 * All company members have access to personal inbox features
 */
exports.requireCompanyAccess = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    // Admin bypass
    if (req.user.role === ROLES.ADMIN) {
      req.isCompanyOwner = true;
      return next();
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company membership required'
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const member = company.members.find(m => m.user.toString() === userId.toString());
    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this company'
      });
    }

    req.isCompanyOwner = member.roleInCompany === 'Owner';
    req.userRoleInCompany = member.roleInCompany;
    next();
  } catch (error) {
    console.error('requireCompanyAccess error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Middleware to check marketing permission for email marketing features
 * Owner has access, Members need marketing permission
 */
exports.requireEmailMarketingAccess = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    // Admin bypass
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company membership required for email marketing'
      });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    const member = company.members.find(m => m.user.toString() === userId.toString());
    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this company'
      });
    }

    // Owner always has access
    if (member.roleInCompany === 'Owner') {
      return next();
    }

    // Check marketing permission
    const user = await User.findById(userId).select('permissions').lean();
    if (user?.permissions?.marketing === true) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Email marketing access required. Contact your workspace owner to enable this permission.'
    });
  } catch (error) {
    console.error('requireEmailMarketingAccess error:', error);
    res.status(500).json({ error: error.message });
  }
};
