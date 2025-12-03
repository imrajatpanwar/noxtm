const EmailAccount = require('../models/EmailAccount');
// const Company = require('../models/Company'); // Company model not implemented yet

/**
 * Middleware to require company owner role
 * Only allows company owners to proceed
 * TODO: Implement proper company owner check when Company model exists
 */
exports.requireCompanyOwner = async (req, res, next) => {
  try {
    // Bypass company owner check for now since Company model doesn't exist
    console.warn('⚠️  Company owner check bypassed - Company model not implemented');
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
 * TODO: Implement proper company access check when Company model exists
 */
exports.requireCompanyAccess = async (req, res, next) => {
  try {
    // Bypass company access check for now since Company model doesn't exist
    console.warn('⚠️  Company access check bypassed - Company model not implemented');
    req.isCompanyOwner = true; // Assume owner for now
    next();
  } catch (error) {
    console.error('requireCompanyAccess error:', error);
    res.status(500).json({ error: error.message });
  }
};
