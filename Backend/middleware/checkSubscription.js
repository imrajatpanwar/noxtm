const { ROLES, SUBSCRIPTION_STATUS } = require('../utils/constants');
const {
    hasActiveSubscription,
    isSubscriptionExpired,
    isInGracePeriod,
    getDaysRemaining,
    getCalculatedStatus
} = require('../utils/subscriptionHelpers');

/**
 * Check if user has an active subscription
 * Admins bypass this check
 */
const checkActiveSubscription = (req, res, next) => {
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

    // Check if in grace period
    if (req.user.subscription && isInGracePeriod(req.user.subscription)) {
        const daysRemaining = getDaysRemaining(req.user.subscription);
        req.subscriptionWarning = {
            inGracePeriod: true,
            daysRemaining: Math.abs(daysRemaining),
            message: 'Your subscription has expired. Please renew to continue access.'
        };
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
        subscription: {
            status: req.user.subscription?.status || SUBSCRIPTION_STATUS.INACTIVE,
            expired: isSubscriptionExpired(req.user.subscription),
            redirect: '/pricing'
        }
    });
};

/**
 * Check subscription and add status to request
 * Does NOT block - just adds subscription info
 */
const attachSubscriptionStatus = (req, res, next) => {
    if (!req.user) {
        return next();
    }

    // Admin always has full access
    if (req.user.role === ROLES.ADMIN) {
        req.subscriptionStatus = {
            isAdmin: true,
            hasAccess: true
        };
        return next();
    }

    const subscription = req.user.subscription;

    if (!subscription) {
        req.subscriptionStatus = {
            hasSubscription: false,
            hasAccess: false,
            status: SUBSCRIPTION_STATUS.INACTIVE
        };
        return next();
    }

    const calculatedStatus = getCalculatedStatus(subscription);
    const daysRemaining = getDaysRemaining(subscription);

    req.subscriptionStatus = {
        hasSubscription: true,
        hasAccess: hasActiveSubscription(req.user),
        status: calculatedStatus,
        plan: subscription.plan,
        billingCycle: subscription.billingCycle,
        daysRemaining: daysRemaining,
        isExpired: isSubscriptionExpired(subscription),
        inGracePeriod: isInGracePeriod(subscription),
        startDate: subscription.startDate,
        endDate: subscription.endDate
    };

    next();
};

/**
 * Require subscription to be in specific status(es)
 * @param {Array<String>} allowedStatuses - Array of allowed statuses
 */
const requireSubscriptionStatus = (allowedStatuses) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin bypasses
        if (req.user.role === ROLES.ADMIN) {
            return next();
        }

        const status = req.user.subscription?.status;

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(403).json({
                success: false,
                message: `Subscription status must be one of: ${allowedStatuses.join(', ')}`,
                currentStatus: status || 'none',
                allowedStatuses
            });
        }

        next();
    };
};

/**
 * Check if subscription is not expired
 * Allows grace period access with warning
 */
const checkNotExpired = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Admin bypasses
    if (req.user.role === ROLES.ADMIN) {
        return next();
    }

    const subscription = req.user.subscription;

    if (!subscription) {
        return res.status(403).json({
            success: false,
            message: 'No subscription found',
            code: 'NO_SUBSCRIPTION'
        });
    }

    if (isSubscriptionExpired(subscription)) {
        if (isInGracePeriod(subscription)) {
            // Allow access but warn
            req.subscriptionWarning = {
                inGracePeriod: true,
                message: 'Your subscription has expired. Renew soon to maintain access.'
            };
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Subscription has expired',
            code: 'SUBSCRIPTION_EXPIRED',
            redirect: '/pricing'
        });
    }

    next();
};

module.exports = {
    checkActiveSubscription,
    attachSubscriptionStatus,
    requireSubscriptionStatus,
    checkNotExpired
};
