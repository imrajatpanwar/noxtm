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
    department: {
      type: String,
      enum: [
        "Management Team", "Digital Team", "SEO Team", "Graphic Design Team",
        "Marketing Team", "Sales Team", "Development Team", "HR Team",
        "Finance Team", "Support Team", "Operations Team"
      ]
    },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date }
  }],
  invitations: [{
    email: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    roleInCompany: { type: String, enum: ["Manager", "Employee"], default: "Employee" },
    department: {
      type: String,
      required: true,
      enum: [
        "Management Team", "Digital Team", "SEO Team", "Graphic Design Team",
        "Marketing Team", "Sales Team", "Development Team", "HR Team",
        "Finance Team", "Support Team", "Operations Team"
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
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    status: { type: String, enum: ["pending", "accepted", "expired"], default: "pending" }
  }],
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

companySchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Company", companySchema);
