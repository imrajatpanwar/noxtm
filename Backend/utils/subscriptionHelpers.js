const {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
  PLAN_LIMITS,
  TIMING,
  ROLES
} = require('./constants');

/**
 * Check if user has an active subscription
 * @param {Object} user - User object with subscription
 * @returns {Boolean}
 */
function hasActiveSubscription(user) {
  if (!user) return false;

  // Admin always bypasses subscription checks
  if (user.role === ROLES.ADMIN) return true;

  // Company members (employees) use the company's subscription
  if (user.companyId) return true;

  const status = user.subscription?.status;

  // Active subscription
  if (status === SUBSCRIPTION_STATUS.ACTIVE) return true;

  // Trial subscription - check if not expired
  if (status === SUBSCRIPTION_STATUS.TRIAL) {
    return !isSubscriptionExpired(user.subscription);
  }

  return false;
}

/**
 * Check if subscription is expired
 * @param {Object} subscription - Subscription object
 * @returns {Boolean}
 */
function isSubscriptionExpired(subscription) {
  if (!subscription || !subscription.endDate) return false;

  const now = new Date();
  const endDate = new Date(subscription.endDate);

  return now > endDate;
}

/**
 * Check if subscription is in grace period
 * @param {Object} subscription - Subscription object
 * @returns {Boolean}
 */
function isInGracePeriod(subscription) {
  if (!subscription || !subscription.endDate) return false;

  const now = new Date();
  const endDate = new Date(subscription.endDate);
  const gracePeriodEnd = new Date(endDate.getTime() + (TIMING.SUBSCRIPTION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));

  return now > endDate && now <= gracePeriodEnd;
}

/**
 * Calculate subscription end date based on billing cycle
 * @param {Date} startDate - Subscription start date
 * @param {String} billingCycle - 'Monthly' or 'Annual'
 * @returns {Date}
 */
function calculateEndDate(startDate, billingCycle) {
  const start = new Date(startDate);
  const endDate = new Date(start);

  if (billingCycle === 'Annual') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return endDate;
}

/**
 * Get days remaining in subscription
 * @param {Object} subscription - Subscription object
 * @returns {Number} - Days remaining (negative if expired)
 */
function getDaysRemaining(subscription) {
  if (!subscription || !subscription.endDate) return 0;

  const now = new Date();
  const endDate = new Date(subscription.endDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if user can access a specific plan feature
 * @param {Object} user - User object
 * @param {String} feature - Feature name
 * @returns {Boolean}
 */
function hasFeatureAccess(user, feature) {
  if (!user) return false;

  // Admin bypasses all checks
  if (user.role === ROLES.ADMIN) return true;

  // Must have active subscription
  if (!hasActiveSubscription(user)) return false;

  const plan = user.subscription?.plan;
  if (!plan || !PLAN_LIMITS[plan]) return false;

  const planFeatures = PLAN_LIMITS[plan].features;
  return planFeatures && planFeatures[feature] === true;
}

/**
 * Check if user has reached employee limit for their plan
 * @param {Number} currentEmployees - Current number of employees
 * @param {String} planType - Plan type (Noxtm or Enterprise)
 * @returns {Boolean}
 */
function hasReachedEmployeeLimit(currentEmployees, planType) {
  if (!planType || !PLAN_LIMITS[planType]) return true;

  const maxEmployees = PLAN_LIMITS[planType].maxEmployees;

  // Infinity means unlimited
  if (maxEmployees === Infinity) return false;

  return currentEmployees >= maxEmployees;
}

/**
 * Get plan price for billing cycle
 * @param {String} planType - Plan type
 * @param {String} billingCycle - 'Monthly' or 'Annual'
 * @returns {Number|null} - Price in currency or null
 */
function getPlanPrice(planType, billingCycle) {
  if (!planType || !PLAN_LIMITS[planType]) return null;

  const cycle = billingCycle === 'Annual' ? 'yearly' : 'monthly';
  return PLAN_LIMITS[planType].price[cycle];
}

/**
 * Get plan limits
 * @param {String} planType - Plan type
 * @returns {Object|null} - Plan limits object or null
 */
function getPlanLimits(planType) {
  return PLAN_LIMITS[planType] || null;
}

/**
 * Validate subscription status
 * @param {String} status - Status to validate
 * @returns {Boolean}
 */
function isValidStatus(status) {
  return Object.values(SUBSCRIPTION_STATUS).includes(status);
}

/**
 * Validate subscription plan
 * @param {String} plan - Plan to validate
 * @returns {Boolean}
 */
function isValidPlan(plan) {
  return Object.values(SUBSCRIPTION_PLANS).includes(plan);
}

/**
 * Get subscription status display name
 * @param {String} status - Status code
 * @returns {String} - Display name
 */
function getStatusDisplayName(status) {
  const displayNames = {
    [SUBSCRIPTION_STATUS.ACTIVE]: 'Active',
    [SUBSCRIPTION_STATUS.INACTIVE]: 'Inactive',
    [SUBSCRIPTION_STATUS.TRIAL]: 'Trial',
    [SUBSCRIPTION_STATUS.EXPIRED]: 'Expired',
    [SUBSCRIPTION_STATUS.CANCELLED]: 'Cancelled',
    [SUBSCRIPTION_STATUS.IN_REVIEW]: 'In Review',
    [SUBSCRIPTION_STATUS.SUSPENDED]: 'Suspended',
    [SUBSCRIPTION_STATUS.PENDING]: 'Pending'
  };

  return displayNames[status] || status;
}

/**
 * Determine if subscription needs renewal soon
 * @param {Object} subscription - Subscription object
 * @param {Number} daysThreshold - Days before expiry to warn (default 7)
 * @returns {Boolean}
 */
function needsRenewal(subscription, daysThreshold = 7) {
  if (!subscription || !subscription.endDate) return false;

  const daysRemaining = getDaysRemaining(subscription);
  return daysRemaining > 0 && daysRemaining <= daysThreshold;
}

/**
 * Create new subscription object
 * @param {String} plan - Plan type
 * @param {String} billingCycle - Billing cycle
 * @returns {Object} - New subscription object
 */
function createSubscription(plan, billingCycle = 'Monthly') {
  const startDate = new Date();
  const endDate = calculateEndDate(startDate, billingCycle);

  return {
    plan: plan,
    status: SUBSCRIPTION_STATUS.INACTIVE, // Start inactive, admin activates
    startDate: startDate,
    endDate: endDate,
    billingCycle: billingCycle
  };
}

/**
 * Update subscription status based on dates
 * @param {Object} subscription - Subscription object
 * @returns {String} - Updated status
 */
function getCalculatedStatus(subscription) {
  if (!subscription) return SUBSCRIPTION_STATUS.INACTIVE;

  // If manually set to cancelled/suspended, keep that status
  if ([SUBSCRIPTION_STATUS.CANCELLED, SUBSCRIPTION_STATUS.SUSPENDED].includes(subscription.status)) {
    return subscription.status;
  }

  // Check if expired
  if (isSubscriptionExpired(subscription)) {
    // Check if in grace period
    if (isInGracePeriod(subscription)) {
      return SUBSCRIPTION_STATUS.EXPIRED; // But still accessible
    }
    return SUBSCRIPTION_STATUS.EXPIRED;
  }

  // If has start and end date and current status is active
  if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
    return SUBSCRIPTION_STATUS.ACTIVE;
  }

  return subscription.status || SUBSCRIPTION_STATUS.INACTIVE;
}

/**
 * Get subscription summary for display
 * @param {Object} user - User object
 * @returns {Object} - Subscription summary
 */
function getSubscriptionSummary(user) {
  if (!user || !user.subscription) {
    return {
      hasPlan: false,
      plan: null,
      status: SUBSCRIPTION_STATUS.INACTIVE,
      daysRemaining: 0,
      needsRenewal: false,
      isExpired: false,
      isActive: false
    };
  }

  const subscription = user.subscription;
  const daysRemaining = getDaysRemaining(subscription);

  return {
    hasPlan: true,
    plan: subscription.plan,
    status: subscription.status,
    daysRemaining: daysRemaining,
    needsRenewal: needsRenewal(subscription),
    isExpired: isSubscriptionExpired(subscription),
    isActive: subscription.status === SUBSCRIPTION_STATUS.ACTIVE,
    inGracePeriod: isInGracePeriod(subscription),
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    billingCycle: subscription.billingCycle
  };
}

module.exports = {
  hasActiveSubscription,
  isSubscriptionExpired,
  isInGracePeriod,
  calculateEndDate,
  getDaysRemaining,
  hasFeatureAccess,
  hasReachedEmployeeLimit,
  getPlanPrice,
  getPlanLimits,
  isValidStatus,
  isValidPlan,
  getStatusDisplayName,
  needsRenewal,
  createSubscription,
  getCalculatedStatus,
  getSubscriptionSummary
};
