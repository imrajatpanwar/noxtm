// const Company = require('../models/Company'); // Not fully implemented yet

/**
 * Middleware to check if user has Manager or Owner role
 * Used for campaign and contact list routes
 * TODO: Implement proper company role check when Company model is ready
 */
exports.requireManagerOrOwner = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.userId;
    // Use userId as companyId fallback since Company model not fully implemented
    const companyId = req.user.companyId || userId;

    // Store companyId in req.user for use in routes
    req.user.companyId = companyId;

    // Bypass company check for now - treat user as Owner
    // TODO: Implement proper company membership check when Company model is ready
    console.warn('⚠️  Company role check bypassed - Company model not fully implemented');
    req.userRole = 'Owner';
    return next();

  } catch (error) {
    console.error('requireManagerOrOwner error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message
    });
  }
};
