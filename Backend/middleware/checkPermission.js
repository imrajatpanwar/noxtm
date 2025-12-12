const { ROLES, PERMISSION_MODULES } = require('../utils/constants');
const { hasPermission, hasAnyPermission, hasAllPermissions, isAdmin } = require('../utils/permissionHelpers');

/**
 * Check if user has permission for a specific module
 * @param {String} module - Module name from PERMISSION_MODULES
 */
const checkPermission = (module) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin always has all permissions
        if (isAdmin(req.user)) {
            return next();
        }

        // Check specific module permission
        if (hasPermission(req.user, module)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Permission denied: ${module} access required`,
            requiredPermission: module
        });
    };
};

/**
 * Check if user has ANY of the specified permissions
 * @param {Array<String>} modules - Array of module names
 */
const checkAnyPermission = (modules) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (isAdmin(req.user)) {
            return next();
        }

        if (hasAnyPermission(req.user, modules)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Permission denied: requires one of [${modules.join(', ')}]`,
            requiredPermissions: modules
        });
    };
};

/**
 * Check if user has ALL of the specified permissions
 * @param {Array<String>} modules - Array of module names
 */
const checkAllPermissions = (modules) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (isAdmin(req.user)) {
            return next();
        }

        if (hasAllPermissions(req.user, modules)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: `Permission denied: requires all of [${modules.join(', ')}]`,
            requiredPermissions: modules
        });
    };
};

/**
 * Check if user is admin
 */
const checkAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    if (!isAdmin(req.user)) {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }

    next();
};

/**
 * Module-specific permission shortcuts
 */
const checkDashboardPermission = checkPermission(PERMISSION_MODULES.DASHBOARD);
const checkDataCenterPermission = checkPermission(PERMISSION_MODULES.DATA_CENTER);
const checkProjectsPermission = checkPermission(PERMISSION_MODULES.PROJECTS);
const checkTeamCommunicationPermission = checkPermission(PERMISSION_MODULES.TEAM_COMMUNICATION);
const checkDigitalMediaPermission = checkPermission(PERMISSION_MODULES.DIGITAL_MEDIA_MANAGEMENT);
const checkMarketingPermission = checkPermission(PERMISSION_MODULES.MARKETING);
const checkHRPermission = checkPermission(PERMISSION_MODULES.HR_MANAGEMENT);
const checkFinancePermission = checkPermission(PERMISSION_MODULES.FINANCE_MANAGEMENT);
const checkSEOPermission = checkPermission(PERMISSION_MODULES.SEO_MANAGEMENT);
const checkInternalPoliciesPermission = checkPermission(PERMISSION_MODULES.INTERNAL_POLICIES);
const checkSettingsPermission = checkPermission(PERMISSION_MODULES.SETTINGS_CONFIGURATION);

module.exports = {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    checkAdmin,
    // Module shortcuts
    checkDashboardPermission,
    checkDataCenterPermission,
    checkProjectsPermission,
    checkTeamCommunicationPermission,
    checkDigitalMediaPermission,
    checkMarketingPermission,
    checkHRPermission,
    checkFinancePermission,
    checkSEOPermission,
    checkInternalPoliciesPermission,
    checkSettingsPermission
};
