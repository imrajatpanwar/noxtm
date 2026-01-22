/**
 * Centralized constants for the entire application
 * This ensures consistency across all files
 */

// ============================================
// ROLE CONSTANTS (Standardized to PascalCase for consistency)
// ============================================
const ROLES = {
  ADMIN: 'Admin',
  USER: 'User'
};

const ROLE_VALUES = Object.values(ROLES);

// ============================================
// COMPANY ROLE CONSTANTS
// ============================================
const COMPANY_ROLES = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee'
};

const COMPANY_ROLE_VALUES = Object.values(COMPANY_ROLES);

// ============================================
// SUBSCRIPTION CONSTANTS
// ============================================
const SUBSCRIPTION_PLANS = {
  NONE: 'None',
  TRIAL: 'Trial',
  STARTER: 'Starter',
  PRO_PLUS: 'Pro+',
  ADVANCE: 'Advance',
  NOXTM: 'Noxtm',
  ENTERPRISE: 'Enterprise'
};

const SUBSCRIPTION_PLAN_VALUES = Object.values(SUBSCRIPTION_PLANS);

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TRIAL: 'trial',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  IN_REVIEW: 'In Review',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

const SUBSCRIPTION_STATUS_VALUES = Object.values(SUBSCRIPTION_STATUS);

const BILLING_CYCLES = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Annual'
};

const BILLING_CYCLE_VALUES = Object.values(BILLING_CYCLES);

// ============================================
// USER STATUS CONSTANTS
// ============================================
const USER_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  TERMINATED: 'Terminated',
  IN_REVIEW: 'In Review'
};

const USER_STATUS_VALUES = Object.values(USER_STATUS);

// ============================================
// PERMISSION MODULES
// ============================================
const PERMISSION_MODULES = {
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

const PERMISSION_MODULE_LIST = Object.values(PERMISSION_MODULES);

// ============================================
// DEFAULT PERMISSIONS (Explicitly false for security)
// ============================================
const DEFAULT_PERMISSIONS = {
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

// Default permissions for new users (only dashboard)
const NEW_USER_PERMISSIONS = {
  ...DEFAULT_PERMISSIONS,
  [PERMISSION_MODULES.DASHBOARD]: true
};

// All permissions enabled (for admin or full access)
const FULL_PERMISSIONS = {
  [PERMISSION_MODULES.DASHBOARD]: true,
  [PERMISSION_MODULES.DATA_CENTER]: true,
  [PERMISSION_MODULES.PROJECTS]: true,
  [PERMISSION_MODULES.TEAM_COMMUNICATION]: true,
  [PERMISSION_MODULES.DIGITAL_MEDIA_MANAGEMENT]: true,
  [PERMISSION_MODULES.MARKETING]: true,
  [PERMISSION_MODULES.HR_MANAGEMENT]: true,
  [PERMISSION_MODULES.FINANCE_MANAGEMENT]: true,
  [PERMISSION_MODULES.SEO_MANAGEMENT]: true,
  [PERMISSION_MODULES.INTERNAL_POLICIES]: true,
  [PERMISSION_MODULES.SETTINGS_CONFIGURATION]: true
};

// ============================================
// PERMISSION TEMPLATES
// ============================================
const PERMISSION_TEMPLATES = {
  FULL_ACCESS: {
    name: 'Full Access',
    description: 'Access to all modules',
    permissions: FULL_PERMISSIONS
  },
  BASIC_USER: {
    name: 'Basic User',
    description: 'Dashboard access only',
    permissions: NEW_USER_PERMISSIONS
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
// PLAN LIMITS
// ============================================
const PLAN_LIMITS = {
  [SUBSCRIPTION_PLANS.STARTER]: {
    maxEmployees: 5,
    maxStorage: '5GB',
    support: 'Email Support',
    uptimeSLA: 99,
    price: {
      monthly: 1699,
      yearly: 1359 // 20% discount
    },
    currency: 'INR',
    features: {
      clientLeads: true,
      conversionTracking: true,
      projectManagement: 'Limited',
      emailMarketing: 'Limited',
      whatsappMarketing: true,
      socialMediaScheduler: 'Limited',
      internalMessages: true,
      hrManagement: true,
      financialManagement: true,
      internalPolicies: true,
      videoMeeting: false,
      quickTools: true,
      seoContent: false,
      storage: '5GB storage',
      emailNotifications: 'Limited'
    }
  },
  [SUBSCRIPTION_PLANS.PRO_PLUS]: {
    maxEmployees: 50,
    maxStorage: '50GB',
    support: '24/7 Support',
    uptimeSLA: 99.9,
    price: {
      monthly: 2699,
      yearly: 2159 // 20% discount
    },
    currency: 'INR',
    features: {
      clientLeads: true,
      conversionTracking: true,
      projectManagement: 'Unlimited',
      emailMarketing: 'Unlimited',
      whatsappMarketing: true,
      socialMediaScheduler: 'Unlimited Instagram | LinkedIn',
      internalMessages: true,
      hrManagement: true,
      financialManagement: true,
      internalPolicies: true,
      videoMeeting: true,
      quickTools: true,
      seoContent: true,
      storage: '50GB storage',
      emailNotifications: 'Unlimited'
    }
  },
  [SUBSCRIPTION_PLANS.ADVANCE]: {
    maxEmployees: 500,
    maxStorage: 'unlimited',
    support: '24/7 Premium Support',
    uptimeSLA: 99.99,
    price: {
      monthly: 4699,
      yearly: 3759 // 20% discount
    },
    currency: 'INR',
    features: {
      clientLeads: true,
      conversionTracking: true,
      projectManagement: 'Unlimited',
      emailMarketing: 'Unlimited',
      whatsappMarketing: true,
      socialMediaScheduler: 'Unlimited Instagram | LinkedIn',
      internalMessages: true,
      hrManagement: true,
      financialManagement: true,
      internalPolicies: true,
      videoMeeting: true,
      quickTools: true,
      seoContent: true,
      storage: 'Unlimited storage',
      emailNotifications: 'Unlimited'
    }
  },
  [SUBSCRIPTION_PLANS.NOXTM]: {
    maxEmployees: 500,
    maxStorage: 'unlimited',
    support: '24/7 Premium Support',
    uptimeSLA: 99.9,
    price: {
      monthly: 12999,
      yearly: 10399
    },
    currency: 'INR',
    features: {
      clientLeads: true,
      conversionTracking: true,
      projectManagement: 'Unlimited',
      emailMarketing: 'Unlimited',
      whatsappMarketing: true,
      socialMediaScheduler: 'Unlimited Instagram | LinkedIn',
      internalMessages: true,
      hrManagement: true,
      financialManagement: true,
      internalPolicies: true,
      videoMeeting: true,
      quickTools: true,
      seoContent: true,
      storage: 'Unlimited storage',
      emailNotifications: 'Unlimited'
    }
  },
  [SUBSCRIPTION_PLANS.ENTERPRISE]: {
    maxEmployees: Infinity,
    maxStorage: 'unlimited',
    support: 'Dedicated Support',
    uptimeSLA: 99.99,
    price: {
      monthly: null, // Contact sales
      yearly: null
    },
    currency: 'INR',
    features: {
      clientLeads: true,
      conversionTracking: true,
      projectManagement: 'Unlimited',
      emailMarketing: 'Unlimited',
      whatsappMarketing: true,
      socialMediaScheduler: 'Unlimited Instagram | LinkedIn',
      internalMessages: true,
      hrManagement: true,
      financialManagement: true,
      internalPolicies: true,
      videoMeeting: false,
      quickTools: true,
      seoContent: false,
      storage: 'Unlimited storage',
      emailNotifications: 'Unlimited'
    }
  }
};

// ============================================
// TIMING CONSTANTS
// ============================================
const TIMING = {
  PERMISSION_CHECK_INTERVAL: 30000, // 30 seconds (will be replaced by WebSocket)
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  TOKEN_EXPIRY: '7d',
  TRIAL_PERIOD_DAYS: 14,
  SUBSCRIPTION_GRACE_PERIOD_DAYS: 7
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
  // Roles
  ROLES,
  ROLE_VALUES,
  COMPANY_ROLES,
  COMPANY_ROLE_VALUES,

  // User Status
  USER_STATUS,
  USER_STATUS_VALUES,

  // Subscriptions
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLAN_VALUES,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_VALUES,
  BILLING_CYCLES,
  BILLING_CYCLE_VALUES,

  // Permissions
  PERMISSION_MODULES,
  PERMISSION_MODULE_LIST,
  DEFAULT_PERMISSIONS,
  NEW_USER_PERMISSIONS,
  FULL_PERMISSIONS,
  PERMISSION_TEMPLATES,

  // Limits
  PLAN_LIMITS,

  // Timing
  TIMING
};
