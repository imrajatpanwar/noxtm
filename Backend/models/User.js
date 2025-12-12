const mongoose = require("mongoose");
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
const { sanitizePermissions, getNewUserPermissions, getFullPermissions } = require('../utils/permissionHelpers');

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
    billingCycle: {
      type: String,
      enum: BILLING_CYCLE_VALUES,
      default: BILLING_CYCLES.MONTHLY
    },
    startDate: { type: Date },
    endDate: { type: Date },
    trialUsed: { type: Boolean, default: false }
  },

  permissions: {
    dashboard: { type: Boolean, default: false },
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
    default: USER_STATUS.IN_REVIEW
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Permission to access label mapping
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

// Pre-save hook to sanitize permissions and update access array
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // For new users, set appropriate default permissions
  if (this.isNew) {
    if (this.role === ROLES.ADMIN) {
      this.permissions = getFullPermissions();
    } else {
      this.permissions = getNewUserPermissions();
    }
  } else if (this.isModified('permissions')) {
    // Sanitize permissions to ensure all are explicit booleans
    this.permissions = sanitizePermissions(this.permissions);
  }

  // Auto-generate access array from permissions
  const accessList = [];
  if (this.permissions) {
    Object.keys(this.permissions).forEach(key => {
      if (this.permissions[key] === true && permissionToLabel[key]) {
        accessList.push(permissionToLabel[key]);
      }
    });
  }
  this.access = accessList;

  next();
});

module.exports = mongoose.model("User", userSchema);
