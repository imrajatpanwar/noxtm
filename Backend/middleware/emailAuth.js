const EmailAccount = require('../models/EmailAccount');
const Company = require('../models/Company');

/**
 * Middleware to require company owner role
 * Only allows company owners to proceed
 */
exports.requireCompanyOwner = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        error: 'User not associated with any company'
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if user is owner
    if (!company.owner.equals(userId)) {
      return res.status(403).json({
        error: 'Only company owner can perform this action',
        requiredRole: 'Owner'
      });
    }

    req.company = company;
    next();

  } catch (error) {
    console.error('requireCompanyOwner error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Middleware to check access to email account with specific permission
 * Usage: requireEmailAccess('canRead'), requireEmailAccess('canSend'), etc.
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
 */
exports.requireCompanyAccess = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        error: 'User not associated with any company'
      });
    }

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if user is owner or member
    const isOwner = company.owner.equals(userId);
    const isMember = company.members.some(m => m.user.equals(userId));

    if (!isOwner && !isMember) {
      return res.status(403).json({
        error: 'You are not a member of this company'
      });
    }

    req.company = company;
    req.isCompanyOwner = isOwner;
    next();

  } catch (error) {
    console.error('requireCompanyAccess error:', error);
    res.status(500).json({ error: error.message });
  }
};
