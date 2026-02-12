const jwt = require('jsonwebtoken');
const { ROLES } = require('../utils/constants');
const { hasPermission, isAdmin } = require('../utils/permissionHelpers');
const { hasActiveSubscription } = require('../utils/subscriptionHelpers');

/**
 * Authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    // Normalize: ensure _id is always available (JWT stores userId, but many routes use _id)
    decoded._id = decoded._id || decoded.userId;
    decoded.userId = decoded.userId || decoded._id;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Middleware to check specific module permission
 * @param {String} module - Module name from PERMISSION_MODULES
 */
const requirePermission = (module) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin always has permission
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (hasPermission(req.user, module)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Permission denied: ${module} access required`
    });
  };
};

/**
 * Middleware to check any of the specified permissions
 * @param {Array<String>} modules - Array of module names
 */
const requireAnyPermission = (modules) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin always has permission
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    const hasAny = modules.some(module => hasPermission(req.user, module));
    if (hasAny) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Permission denied: access to one of [${modules.join(', ')}] required`
    });
  };
};

/**
 * Middleware to check active subscription
 */
const requireActiveSubscription = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admin bypasses subscription checks
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }

  if (hasActiveSubscription(req.user)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Active subscription required',
    code: 'SUBSCRIPTION_REQUIRED',
    redirect: '/pricing'
  });
};

/**
 * Middleware to check if user is company owner or admin
 */
const requireCompanyOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admin always has access
  if (req.user.role === ROLES.ADMIN) {
    return next();
  }

  // Check if user is company owner (has companyId and is the owner)
  if (req.user.companyId) {
    // Further validation should be done in the route handler
    // by checking if the user is the owner of the company
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Company owner or admin access required'
  });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePermission,
  requireAnyPermission,
  requireActiveSubscription,
  requireCompanyOwnerOrAdmin
};
