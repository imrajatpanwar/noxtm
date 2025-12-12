const {
  ROLES,
  PERMISSION_MODULES,
  DEFAULT_PERMISSIONS,
  NEW_USER_PERMISSIONS,
  FULL_PERMISSIONS,
  PERMISSION_TEMPLATES
} = require('./constants');

/**
 * Check if a user has permission for a specific module
 * @param {Object} user - User object with role and permissions
 * @param {String} module - Module name from PERMISSION_MODULES
 * @returns {Boolean}
 */
function hasPermission(user, module) {
  if (!user) return false;

  // Admin always has all permissions
  if (user.role === ROLES.ADMIN) return true;

  // Check if module exists in permissions
  if (!user.permissions) return false;

  // Return explicit boolean (not undefined)
  return user.permissions[module] === true;
}

/**
 * Check if user has any of the specified permissions
 * @param {Object} user - User object
 * @param {Array<String>} modules - Array of module names
 * @returns {Boolean}
 */
function hasAnyPermission(user, modules) {
  if (!user || !modules || modules.length === 0) return false;

  // Admin always has all permissions
  if (user.role === ROLES.ADMIN) return true;

  return modules.some(module => hasPermission(user, module));
}

/**
 * Check if user has all of the specified permissions
 * @param {Object} user - User object
 * @param {Array<String>} modules - Array of module names
 * @returns {Boolean}
 */
function hasAllPermissions(user, modules) {
  if (!user || !modules || modules.length === 0) return false;

  // Admin always has all permissions
  if (user.role === ROLES.ADMIN) return true;

  return modules.every(module => hasPermission(user, module));
}

/**
 * Get permissions object for a new user
 * @returns {Object} - Permissions object with only dashboard enabled
 */
function getNewUserPermissions() {
  return { ...NEW_USER_PERMISSIONS };
}

/**
 * Get full permissions object (all enabled)
 * @returns {Object} - Permissions object with all modules enabled
 */
function getFullPermissions() {
  return { ...FULL_PERMISSIONS };
}

/**
 * Get permissions from a template
 * @param {String} templateName - Template name from PERMISSION_TEMPLATES
 * @returns {Object|null} - Permissions object or null if template not found
 */
function getPermissionsFromTemplate(templateName) {
  const template = PERMISSION_TEMPLATES[templateName];
  return template ? { ...template.permissions } : null;
}

/**
 * Merge user permissions with new permissions
 * @param {Object} currentPermissions - Current permissions object
 * @param {Object} newPermissions - New permissions to merge
 * @returns {Object} - Merged permissions object
 */
function mergePermissions(currentPermissions, newPermissions) {
  const merged = { ...DEFAULT_PERMISSIONS };

  // Apply current permissions
  if (currentPermissions) {
    Object.keys(currentPermissions).forEach(key => {
      if (currentPermissions[key] !== undefined) {
        merged[key] = currentPermissions[key] === true;
      }
    });
  }

  // Apply new permissions (override)
  if (newPermissions) {
    Object.keys(newPermissions).forEach(key => {
      if (newPermissions[key] !== undefined) {
        merged[key] = newPermissions[key] === true;
      }
    });
  }

  return merged;
}

/**
 * Sanitize permissions object to ensure all modules have explicit boolean values
 * @param {Object} permissions - Raw permissions object
 * @returns {Object} - Sanitized permissions with all modules as explicit booleans
 */
function sanitizePermissions(permissions) {
  const sanitized = { ...DEFAULT_PERMISSIONS };

  if (permissions && typeof permissions === 'object') {
    Object.keys(PERMISSION_MODULES).forEach(moduleKey => {
      const moduleName = PERMISSION_MODULES[moduleKey];
      if (permissions.hasOwnProperty(moduleName)) {
        sanitized[moduleName] = permissions[moduleName] === true;
      }
    });
  }

  return sanitized;
}

/**
 * Get list of modules user has access to
 * @param {Object} user - User object
 * @returns {Array<String>} - Array of module names user can access
 */
function getAccessibleModules(user) {
  if (!user) return [];

  // Admin has access to all modules
  if (user.role === ROLES.ADMIN) {
    return Object.values(PERMISSION_MODULES);
  }

  const accessibleModules = [];
  const permissions = user.permissions || {};

  Object.values(PERMISSION_MODULES).forEach(module => {
    if (permissions[module] === true) {
      accessibleModules.push(module);
    }
  });

  return accessibleModules;
}

/**
 * Convert permission modules to readable names
 * @param {String} module - Module name (e.g., 'dataCenter')
 * @returns {String} - Readable name (e.g., 'Data Center')
 */
function getModuleDisplayName(module) {
  const displayNames = {
    [PERMISSION_MODULES.DASHBOARD]: 'Dashboard',
    [PERMISSION_MODULES.DATA_CENTER]: 'Data Center',
    [PERMISSION_MODULES.PROJECTS]: 'Projects',
    [PERMISSION_MODULES.TEAM_COMMUNICATION]: 'Team Communication',
    [PERMISSION_MODULES.DIGITAL_MEDIA_MANAGEMENT]: 'Digital Media Management',
    [PERMISSION_MODULES.MARKETING]: 'Marketing',
    [PERMISSION_MODULES.HR_MANAGEMENT]: 'HR Management',
    [PERMISSION_MODULES.FINANCE_MANAGEMENT]: 'Finance Management',
    [PERMISSION_MODULES.SEO_MANAGEMENT]: 'SEO Management',
    [PERMISSION_MODULES.INTERNAL_POLICIES]: 'Internal Policies',
    [PERMISSION_MODULES.SETTINGS_CONFIGURATION]: 'Settings & Configuration'
  };

  return displayNames[module] || module;
}

/**
 * Get array of permission display names for user
 * @param {Object} user - User object
 * @returns {Array<String>} - Array of readable permission names
 */
function getAccessDisplayNames(user) {
  const modules = getAccessibleModules(user);
  return modules.map(module => getModuleDisplayName(module));
}

/**
 * Check if user is admin
 * @param {Object} user - User object
 * @returns {Boolean}
 */
function isAdmin(user) {
  return user && user.role === ROLES.ADMIN;
}

/**
 * Check if user is regular user
 * @param {Object} user - User object
 * @returns {Boolean}
 */
function isRegularUser(user) {
  return user && user.role === ROLES.USER;
}

/**
 * Validate permission module name
 * @param {String} module - Module name to validate
 * @returns {Boolean}
 */
function isValidModule(module) {
  return Object.values(PERMISSION_MODULES).includes(module);
}

/**
 * Get difference between two permission sets
 * @param {Object} oldPermissions - Old permissions object
 * @param {Object} newPermissions - New permissions object
 * @returns {Object} - { added: [], removed: [], unchanged: [] }
 */
function getPermissionDiff(oldPermissions, newPermissions) {
  const added = [];
  const removed = [];
  const unchanged = [];

  Object.values(PERMISSION_MODULES).forEach(module => {
    const oldValue = oldPermissions?.[module] === true;
    const newValue = newPermissions?.[module] === true;

    if (!oldValue && newValue) {
      added.push(module);
    } else if (oldValue && !newValue) {
      removed.push(module);
    } else {
      unchanged.push(module);
    }
  });

  return { added, removed, unchanged };
}

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getNewUserPermissions,
  getFullPermissions,
  getPermissionsFromTemplate,
  mergePermissions,
  sanitizePermissions,
  getAccessibleModules,
  getModuleDisplayName,
  getAccessDisplayNames,
  isAdmin,
  isRegularUser,
  isValidModule,
  getPermissionDiff
};
