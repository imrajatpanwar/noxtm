# Role & Permission System Fix - Complete Implementation Summary

## ✅ Completed

### 1. Backend Utilities Created

#### `/Backend/utils/constants.js`
Centralized constants for the entire application:
- **Roles**: `Admin`, `User` (standardized PascalCase)
- **Company Roles**: `Owner`, `Manager`, `Employee`
- **Subscription Plans**: `Noxtm`, `Enterprise`
- **Subscription Status**: `active`, `inactive`, `trial`, `expired`, `cancelled`, `In Review`, `suspended`, `pending`
- **User Status**: `Active`, `Inactive`, `Terminated`, `In Review`
- **Permission Modules**: All 11 modules with consistent naming
- **Permission Templates**: 7 pre-defined templates (Full Access, Basic User, Sales Team, HR Team, Finance Team, Marketing Team, Project Manager)
- **Plan Limits**: Detailed limits for Noxtm and Enterprise plans

#### `/Backend/utils/permissionHelpers.js`
Permission utility functions:
- `hasPermission(user, module)` - Check single permission
- `hasAnyPermission(user, modules)` - Check if user has any of specified permissions
- `hasAllPermissions(user, modules)` - Check if user has all specified permissions
- `getNewUserPermissions()` - Get default permissions for new users
- `getFullPermissions()` - Get all permissions enabled
- `getPermissionsFromTemplate(templateName)` - Get permissions from template
- `sanitizePermissions(permissions)` - Ensure all permissions are explicit booleans
- `getAccessibleModules(user)` - Get list of accessible modules
- `isAdmin(user)` - Check if user is admin
- And 7 more helper functions

#### `/Backend/utils/subscriptionHelpers.js`
Subscription utility functions:
- `hasActiveSubscription(user)` - Check if user has active subscription
- `isSubscriptionExpired(subscription)` - Check if expired
- `isInGracePeriod(subscription)` - Check if in grace period
- `calculateEndDate(startDate, billingCycle)` - Calculate subscription end date
- `getDaysRemaining(subscription)` - Get days until expiry
- `hasFeatureAccess(user, feature)` - Check feature access
- `getPlanLimits(planType)` - Get plan limits
- `getSubscriptionSummary(user)` - Get full subscription summary
- And 11 more helper functions

---

## 🔧 Next Steps (Implementation Required)

### Phase 1: Update User Model (CRITICAL)

**File**: `/Backend/models/User.js`

**Issues to Fix**:
1. Add `billingCycle` field to subscription schema
2. Ensure all permission fields have `default: false` instead of undefined
3. Update `role` enum to use constants
4. Update `status` enum to include "In Review"
5. Add pre-save hook to sanitize permissions

**Updated Schema**:
```javascript
const {
  ROLES,
  ROLE_VALUES,
  USER_STATUS,
  USER_STATUS_VALUES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLAN_VALUES,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_VALUES,
  BILLING_CYCLES,
  BILLING_CYCLE_VALUES
} = require('../utils/constants');
const { sanitizePermissions, getNewUserPermissions } = require('../utils/permissionHelpers');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
    enum: ROLE_VALUES,
    default: ROLES.USER
  },
  profileImage: { type: String },
  emailAvatar: { type: String },
  phoneNumber: { type: String },
  bio: { type: String, maxLength: 500 },
  lastLogin: { type: Date },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },

  subscription: {
    plan: {
      type: String,
      enum: SUBSCRIPTION_PLAN_VALUES,
      default: SUBSCRIPTION_PLANS.NOXTM
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUS_VALUES,
      default: SUBSCRIPTION_STATUS.INACTIVE
    },
    billingCycle: {  // NEW FIELD
      type: String,
      enum: BILLING_CYCLE_VALUES,
      default: BILLING_CYCLES.MONTHLY
    },
    startDate: { type: Date },
    endDate: { type: Date }
  },

  permissions: {
    dashboard: { type: Boolean, default: false },  // Explicitly false
    dataCenter: { type: Boolean, default: false },
    projects: { type: Boolean, default: false },
    teamCommunication: { type: Boolean, default: false },
    digitalMediaManagement: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false },
    hrManagement: { type: Boolean, default: false },
    financeManagement: { type: Boolean, default: false },
    seoManagement: { type: Boolean, default: false },
    internalPolicies: { type: Boolean, default: false },
    settingsConfiguration: { type: Boolean, default: false }
  },

  access: [{
    type: String,
    enum: [
      "Dashboard", "Data Center", "Projects", "Team Communication",
      "Digital Media Management", "Marketing", "HR Management",
      "Finance Management", "SEO Management", "Internal Policies",
      "Settings & Configuration"
    ]
  }],

  status: {
    type: String,
    required: true,
    enum: USER_STATUS_VALUES,
    default: USER_STATUS.IN_REVIEW  // Changed default
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to sanitize permissions and set access array
userSchema.pre("save", function(next) {
  this.updatedAt = Date.now();

  // Sanitize permissions for new users
  if (this.isNew) {
    this.permissions = this.role === ROLES.ADMIN
      ? getFullPermissions()
      : getNewUserPermissions();
  } else {
    // Ensure existing permissions are sanitized
    this.permissions = sanitizePermissions(this.permissions);
  }

  // Auto-generate access array from permissions
  const accessList = [];
  const permissionToLabel = {
    dashboard: "Dashboard",
    dataCenter: "Data Center",
    projects: "Projects",
    teamCommunication: "Team Communication",
    digitalMediaManagement: "Digital Media Management",
    marketing: "Marketing",
    hrManagement: "HR Management",
    financeManagement: "Finance Management",
    seoManagement: "SEO Management",
    internalPolicies: "Internal Policies",
    settingsConfiguration: "Settings & Configuration"
  };

  Object.keys(this.permissions).forEach(key => {
    if (this.permissions[key] === true) {
      accessList.push(permissionToLabel[key]);
    }
  });

  this.access = accessList;

  next();
});

module.exports = mongoose.model("User", userSchema);
```

---

### Phase 2: Update Auth Middleware

**File**: `/Backend/middleware/auth.js`

**Current Issues**:
- Doesn't use standardized role constants
- No permission checking capability

**Updated Version**:
```javascript
const jwt = require('jwt');
const { ROLES } = require('../utils/constants');
const { hasPermission, isAdmin } = require('../utils/permissionHelpers');
const { hasActiveSubscription } = require('../utils/subscriptionHelpers');

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
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Middleware to check specific permission
const requirePermission = (module) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
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

// Middleware to check active subscription
const requireActiveSubscription = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (hasActiveSubscription(req.user)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Active subscription required',
    redirect: '/pricing'
  });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requirePermission,
  requireActiveSubscription
};
```

---

### Phase 3: Create Migration Scripts

#### Migration 1: Fix Role Case Mismatch

**File**: `/Backend/migrations/001_fix_role_case.js`

```javascript
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function fixRoleCasing() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Starting role case fix migration...');

  // Fix ADMIN -> Admin
  const adminResult = await User.updateMany(
    { role: { $in: ['ADMIN', 'admin'] } },
    { $set: { role: 'Admin' } }
  );
  console.log(`✅ Fixed ${adminResult.modifiedCount} admin roles`);

  // Fix USER -> User
  const userResult = await User.updateMany(
    { role: { $in: ['USER', 'user'] } },
    { $set: { role: 'User' } }
  );
  console.log(`✅ Fixed ${userResult.modifiedCount} user roles`);

  await mongoose.disconnect();
  console.log('Migration complete!');
}

fixRoleCasing().catch(console.error);
```

#### Migration 2: Initialize Permissions

**File**: `/Backend/migrations/002_init_permissions.js`

```javascript
const mongoose = require('mongoose');
const User = require('../models/User');
const { getNewUserPermissions, getFullPermissions } = require('../utils/permissionHelpers');
require('dotenv').config();

async function initializePermissions() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Initializing permissions for all users...');

  const users = await User.find({});
  let adminCount = 0;
  let userCount = 0;

  for (const user of users) {
    if (user.role === 'Admin') {
      user.permissions = getFullPermissions();
      adminCount++;
    } else {
      // Keep existing permissions if they have any, otherwise give dashboard only
      if (!user.permissions || Object.keys(user.permissions).length === 0) {
        user.permissions = getNewUserPermissions();
      } else {
        // Sanitize existing permissions to ensure all are explicit booleans
        Object.keys(user.permissions).forEach(key => {
          user.permissions[key] = user.permissions[key] === true;
        });
      }
      userCount++;
    }

    await user.save();
  }

  console.log(`✅ Updated ${adminCount} admins with full permissions`);
  console.log(`✅ Updated ${userCount} users with sanitized permissions`);

  await mongoose.disconnect();
  console.log('Migration complete!');
}

initializePermissions().catch(console.error);
```

#### Migration 3: Add Billing Cycle Field

**File**: `/Backend/migrations/003_add_billing_cycle.js`

```javascript
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function addBillingCycle() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Adding billingCycle field to subscriptions...');

  const result = await User.updateMany(
    { 'subscription.billingCycle': { $exists: false } },
    { $set: { 'subscription.billingCycle': 'Monthly' } }
  );

  console.log(`✅ Added billingCycle to ${result.modifiedCount} users`);

  await mongoose.disconnect();
  console.log('Migration complete!');
}

addBillingCycle().catch(console.error);
```

---

### Phase 4: Frontend Updates

#### Update Frontend Constants

**File**: `/Frontend/src/utils/constants.js` (NEW)

```javascript
// Match backend constants exactly
export const ROLES = {
  ADMIN: 'Admin',
  USER: 'User'
};

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
```

#### Update UsersRoles Component

**File**: `/Frontend/src/components/UsersRoles.js`

Change line 109-110 from:
```jsx
<option value="USER">User</option>
<option value="ADMIN">Admin</option>
```

To:
```jsx
<option value="User">User</option>
<option value="Admin">Admin</option>
```

---

## 🚀 Deployment Steps

### 1. Local Testing
```bash
cd /Users/aaravpanwar/noxtm/noxtm/Backend

# Run migrations
node migrations/001_fix_role_case.js
node migrations/002_init_permissions.js
node migrations/003_add_billing_cycle.js

# Test User model
node -e "const User = require('./models/User'); console.log(User.schema.paths.role.enumValues);"
```

### 2. Production Deployment
```bash
# Upload files
scp -r Backend/utils root@185.137.122.61:/root/noxtm/Backend/
scp -r Backend/migrations root@185.137.122.61:/root/noxtm/Backend/
scp Backend/models/User.js root@185.137.122.61:/root/noxtm/Backend/models/
scp Backend/middleware/auth.js root@185.137.122.61:/root/noxtm/Backend/middleware/

# Run migrations on production
ssh root@185.137.122.61 'cd /root/noxtm/Backend && node migrations/001_fix_role_case.js'
ssh root@185.137.122.61 'cd /root/noxtm/Backend && node migrations/002_init_permissions.js'
ssh root@185.137.122.61 'cd /root/noxtm/Backend && node migrations/003_add_billing_cycle.js'

# Restart backend
ssh root@185.137.122.61 'pm2 restart noxtm-backend'

# Upload and rebuild frontend
scp Frontend/src/utils/constants.js root@185.137.122.61:/root/noxtm/Frontend/src/utils/
scp Frontend/src/components/UsersRoles.js root@185.137.122.61:/root/noxtm/Frontend/src/components/
ssh root@185.137.122.61 'cd /root/noxtm/Frontend && npm run build && pm2 restart noxtm-frontend'
```

---

## ✅ Benefits After Implementation

1. **Consistent Role Naming**: All roles use PascalCase (`Admin`, `User`)
2. **Explicit Permissions**: All permissions are `true` or `false`, never `undefined`
3. **Subscription Validation**: Proper expiry checking with grace periods
4. **Type Safety**: Centralized constants prevent typos
5. **Helper Functions**: Reusable utilities for permission checks
6. **Migration Scripts**: Database cleanup for existing data
7. **Better Security**: Explicit false defaults instead of undefined
8. **Audit Ready**: Permission templates for easy role assignment

---

## 📋 Files Created

- ✅ `/Backend/utils/constants.js` - Centralized constants
- ✅ `/Backend/utils/permissionHelpers.js` - Permission utilities
- ✅ `/Backend/utils/subscriptionHelpers.js` - Subscription utilities
- 🔲 `/Backend/migrations/001_fix_role_case.js` - Fix role casing
- 🔲 `/Backend/migrations/002_init_permissions.js` - Initialize permissions
- 🔲 `/Backend/migrations/003_add_billing_cycle.js` - Add billing cycle
- 🔲 `/Backend/models/User.js` - Updated user model
- 🔲 `/Backend/middleware/auth.js` - Enhanced auth middleware
- 🔲 `/Frontend/src/utils/constants.js` - Frontend constants
- 🔲 `/Frontend/src/components/UsersRoles.js` - Fixed role dropdown

---

**Status**: Utilities complete, ready for model updates and migrations.
