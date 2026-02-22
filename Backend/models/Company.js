const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  industry: { type: String },
  size: { type: String, enum: ["1-10", "11-50", "51-200", "201-500", "500+"] },
  address: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    roleInCompany: { type: String, enum: ["Owner", "Manager", "Employee"], default: "Employee" },
    jobTitle: { type: String, default: '' },
    department: {
      type: String,
      enum: [
        "Management Team", "Digital Team", "SEO Team", "Graphic Design Team",
        "Marketing Team", "Sales Team", "Development Team", "HR Team",
        "Finance Team", "Support Team", "Operations Team",
        "Content Team", "Legal Team", "Quality Assurance"
      ]
    },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date }
  }],
  invitations: [{
    email: { type: String, required: true },
    token: { type: String, required: true },
    roleInCompany: { type: String, enum: ["Manager", "Employee"], default: "Employee" },
    jobTitle: { type: String, default: '' },
    department: {
      type: String,
      required: true,
      enum: [
        "Management Team", "Digital Team", "SEO Team", "Graphic Design Team",
        "Marketing Team", "Sales Team", "Development Team", "HR Team",
        "Finance Team", "Support Team", "Operations Team",
        "Content Team", "Legal Team", "Quality Assurance"
      ]
    },
    customPermissions: {
      dashboard: { type: Boolean },
      dataCenter: { type: Boolean },
      projects: { type: Boolean },
      teamCommunication: { type: Boolean },
      digitalMediaManagement: { type: Boolean },
      marketing: { type: Boolean },
      hrManagement: { type: Boolean },
      financeManagement: { type: Boolean },
      seoManagement: { type: Boolean },
      internalPolicies: { type: Boolean },
      settingsConfiguration: { type: Boolean }
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }, // 48 hours
    status: { type: String, enum: ["pending", "accepted", "expired"], default: "pending" }
  }],
  hrSettings: {
    workingHoursPerDay: { type: Number, default: 8 },
    workingDays: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    halfDayThresholdHours: { type: Number, default: 4 },
    salaryDeductions: {
      paidLeavePercent: { type: Number, default: 0, min: 0, max: 100 },
      halfDayPercent: { type: Number, default: 50, min: 0, max: 100 },
      latePercent: { type: Number, default: 0, min: 0, max: 100 },
      absentPercent: { type: Number, default: 100, min: 0, max: 100 }
    }
  },
  subscription: {
    plan: { type: String, enum: ["Trial", "Noxtm", "Enterprise"], default: "Trial" },
    status: { type: String, enum: ["trial", "active", "inactive", "cancelled", "expired"], default: "trial" },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date }
  },
  emailSettings: {
    primaryDomain: { type: String },
    defaultSignature: { type: String },
    emailQuota: {
      totalMB: { type: Number, default: 10240 },
      usedMB: { type: Number, default: 0 }
    }
  },
  projectSettings: {
    onboardingEmailEnabled: { type: Boolean, default: false },
    senderEmailAccountId: { type: String, default: '' },
    templateId: { type: String, default: '' }
  },
  billing: {
    emailCredits: { type: Number, default: 0 },
    totalPurchased: { type: Number, default: 0 },
    totalUsed: { type: Number, default: 0 },
    purchaseHistory: [{
      date: { type: Date, default: Date.now },
      emailCredits: { type: Number },
      amount: { type: Number },
      status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'completed' },
      paymentMethod: { type: String },
      transactionId: { type: String }
    }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

companySchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Company", companySchema);
