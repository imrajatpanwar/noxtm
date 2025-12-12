/**
 * Frontend Constants
 * Must match backend constants exactly for consistency
 */

// ============================================
// ROLE CONSTANTS (Standardized to PascalCase)
// ============================================
export const ROLES = {
    ADMIN: 'Admin',
    USER: 'User'
};

export const ROLE_VALUES = Object.values(ROLES);

// ============================================
// COMPANY ROLE CONSTANTS
// ============================================
export const COMPANY_ROLES = {
    OWNER: 'Owner',
    MANAGER: 'Manager',
    EMPLOYEE: 'Employee'
};

export const COMPANY_ROLE_VALUES = Object.values(COMPANY_ROLES);

// ============================================
// SUBSCRIPTION CONSTANTS
// ============================================
export const SUBSCRIPTION_PLANS = {
    NOXTM: 'Noxtm',
    ENTERPRISE: 'Enterprise'
};

export const SUBSCRIPTION_PLAN_VALUES = Object.values(SUBSCRIPTION_PLANS);

export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    TRIAL: 'trial',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    IN_REVIEW: 'In Review',
    SUSPENDED: 'suspended',
    PENDING: 'pending'
};

export const SUBSCRIPTION_STATUS_VALUES = Object.values(SUBSCRIPTION_STATUS);

export const BILLING_CYCLES = {
    MONTHLY: 'Monthly',
    ANNUAL: 'Annual'
};

export const BILLING_CYCLE_VALUES = Object.values(BILLING_CYCLES);

// ============================================
// USER STATUS CONSTANTS
// ============================================
export const USER_STATUS = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    TERMINATED: 'Terminated',
    IN_REVIEW: 'In Review'
};

export const USER_STATUS_VALUES = Object.values(USER_STATUS);

// ============================================
// PERMISSION MODULES
// ============================================
export const PERMISSION_MODULES = {
    DASHBOARD: 'dashboard',
    DATA_CENTER: 'dataCenter',
    PROJECTS: 'projects',
    TEAM_COMMUNICATION: 'teamCommunication',
    DIGITAL_MEDIA_MANAGEMENT: 'digitalMediaManagement',
    MARKETING: 'marketing',
    HR_MANAGEMENT: 'hrManagement',
    FINANCE_MANAGEMENT: 'financeManagement',
    SEO_MANAGEMENT: 'seoManagement',
    INTERNAL_POLICIES: 'internalPolicies',
    SETTINGS_CONFIGURATION: 'settingsConfiguration'
};

export const PERMISSION_MODULE_LIST = Object.values(PERMISSION_MODULES);

// ============================================
// PERMISSION DISPLAY NAMES
// ============================================
export const PERMISSION_DISPLAY_NAMES = {
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

// ============================================
// DEFAULT PERMISSIONS
// ============================================
export const DEFAULT_PERMISSIONS = {
    [PERMISSION_MODULES.DASHBOARD]: false,
    [PERMISSION_MODULES.DATA_CENTER]: false,
    [PERMISSION_MODULES.PROJECTS]: false,
    [PERMISSION_MODULES.TEAM_COMMUNICATION]: false,
    [PERMISSION_MODULES.DIGITAL_MEDIA_MANAGEMENT]: false,
    [PERMISSION_MODULES.MARKETING]: false,
    [PERMISSION_MODULES.HR_MANAGEMENT]: false,
    [PERMISSION_MODULES.FINANCE_MANAGEMENT]: false,
    [PERMISSION_MODULES.SEO_MANAGEMENT]: false,
    [PERMISSION_MODULES.INTERNAL_POLICIES]: false,
    [PERMISSION_MODULES.SETTINGS_CONFIGURATION]: false
};

// ============================================
// PERMISSION TEMPLATES
// ============================================
export const PERMISSION_TEMPLATES = {
    FULL_ACCESS: {
        name: 'Full Access',
        description: 'Access to all modules',
        permissions: Object.keys(PERMISSION_MODULES).reduce((acc, key) => {
            acc[PERMISSION_MODULES[key]] = true;
            return acc;
        }, {})
    },
    BASIC_USER: {
        name: 'Basic User',
        description: 'Dashboard access only',
        permissions: {
            ...DEFAULT_PERMISSIONS,
            [PERMISSION_MODULES.DASHBOARD]: true
        }
    },
    SALES_TEAM: {
        name: 'Sales Team',
        description: 'Sales and marketing focused access',
        permissions: {
            ...DEFAULT_PERMISSIONS,
            [PERMISSION_MODULES.DASHBOARD]: true,
            [PERMISSION_MODULES.DATA_CENTER]: true,
            [PERMISSION_MODULES.PROJECTS]: true,
            [PERMISSION_MODULES.TEAM_COMMUNICATION]: true,
            [PERMISSION_MODULES.MARKETING]: true
        }
    },
    HR_TEAM: {
        name: 'HR Team',
        description: 'Human resources focused access',
        permissions: {
            ...DEFAULT_PERMISSIONS,
            [PERMISSION_MODULES.DASHBOARD]: true,
            [PERMISSION_MODULES.HR_MANAGEMENT]: true,
            [PERMISSION_MODULES.INTERNAL_POLICIES]: true,
            [PERMISSION_MODULES.TEAM_COMMUNICATION]: true
        }
    },
    FINANCE_TEAM: {
        name: 'Finance Team',
        description: 'Finance focused access',
        permissions: {
            ...DEFAULT_PERMISSIONS,
            [PERMISSION_MODULES.DASHBOARD]: true,
            [PERMISSION_MODULES.FINANCE_MANAGEMENT]: true,
            [PERMISSION_MODULES.INTERNAL_POLICIES]: true
        }
    },
    MARKETING_TEAM: {
        name: 'Marketing Team',
        description: 'Marketing and SEO focused access',
        permissions: {
            ...DEFAULT_PERMISSIONS,
            [PERMISSION_MODULES.DASHBOARD]: true,
            [PERMISSION_MODULES.MARKETING]: true,
            [PERMISSION_MODULES.SEO_MANAGEMENT]: true,
            [PERMISSION_MODULES.DIGITAL_MEDIA_MANAGEMENT]: true,
            [PERMISSION_MODULES.TEAM_COMMUNICATION]: true
        }
    },
    PROJECT_MANAGER: {
        name: 'Project Manager',
        description: 'Project management focused access',
        permissions: {
            ...DEFAULT_PERMISSIONS,
            [PERMISSION_MODULES.DASHBOARD]: true,
            [PERMISSION_MODULES.PROJECTS]: true,
            [PERMISSION_MODULES.TEAM_COMMUNICATION]: true,
            [PERMISSION_MODULES.DATA_CENTER]: true
        }
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user is admin
 */
export const isAdmin = (user) => {
    return user && user.role === ROLES.ADMIN;
};

/**
 * Check if user has permission for a module
 */
export const hasPermission = (user, module) => {
    if (!user) return false;
    if (isAdmin(user)) return true;
    return user.permissions?.[module] === true;
};

/**
 * Get permissions from template
 */
export const getPermissionsFromTemplate = (templateKey) => {
    const template = PERMISSION_TEMPLATES[templateKey];
    return template ? { ...template.permissions } : null;
};
