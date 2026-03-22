const Company = require('../models/Company');
const User = require('../models/User');
const { ROLES } = require('../utils/constants');

/**
 * Middleware to check if user has marketing access
 * Used for campaign and contact list routes
 *
 * Access rules:
 * - Admin: bypass (full access)
 * - Company Owner: always has access
 * - Member with marketing permission: has access
 * - Others: denied
 */
exports.requireMarketingAccess = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    // Admin bypass
    if (req.user.role === ROLES.ADMIN) {
      req.userRole = 'Owner';
      req.user.companyId = companyId || userId;
      return next();
    }

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Company membership required for marketing access'
      });
    }

    // Get company and check membership
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
      req.userRole = 'Owner';
      return next();
    }

    // Check if user has marketing permission
    const user = await User.findById(userId).select('permissions').lean();
    if (user?.permissions?.marketing === true) {
      req.userRole = 'Member';
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Marketing access required. Contact your workspace owner to enable this permission.'
    });

  } catch (error) {
    console.error('requireMarketingAccess error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message
    });
  }
};

/**
 * Legacy alias for backward compatibility
 * @deprecated Use requireMarketingAccess instead
 */
exports.requireManagerOrOwner = exports.requireMarketingAccess;
