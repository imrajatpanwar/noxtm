const Company = require('../models/Company');

/**
 * Middleware to check if user has Manager or Owner role
 * Used for campaign and contact list routes
 */
exports.requireManagerOrOwner = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'User must belong to a company to access campaigns'
      });
    }

    // Get company and check user's role
    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    // Check if user is owner
    if (company.owner && company.owner.toString() === userId.toString()) {
      req.userRole = 'Owner';
      return next();
    }

    // Check if user is in members array with Manager role
    const member = company.members.find(
      m => m.user.toString() === userId.toString()
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You must be a company member'
      });
    }

    if (['Owner', 'Manager'].includes(member.roleInCompany)) {
      req.userRole = member.roleInCompany;
      return next();
    }

    // Employee role - access denied
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only Managers and Owners can access campaigns'
    });

  } catch (error) {
    console.error('requireManagerOrOwner error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message
    });
  }
};
