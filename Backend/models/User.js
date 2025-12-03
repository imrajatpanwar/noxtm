const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: "User" },
  profileImage: { type: String },
  emailAvatar: { type: String },
  phoneNumber: { type: String },
  bio: { type: String, maxLength: 500 },
  lastLogin: { type: Date },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  subscription: {
    plan: {
      type: String,
      enum: ["None", "SoloHQ", "Noxtm", "Enterprise"],
      default: "None"
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "inactive"
    },
    startDate: { type: Date },
    endDate: { type: Date }
  },
  permissions: {
    dashboard: { type: Boolean, default: true },
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
  access: [{
    type: String,
    enum: ["Dashboard", "Data Center", "Projects", "Team Communication", "Digital Media Management", "Marketing", "HR Management", "Finance Management", "SEO Management", "Internal Policies", "Settings & Configuration"]
  }],
  status: {
    type: String,
    required: true,
    default: "Active",
    enum: ["Active", "Inactive", "Terminated", "In Review"]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", userSchema);
