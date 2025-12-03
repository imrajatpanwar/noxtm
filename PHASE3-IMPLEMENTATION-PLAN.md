# Phase 3: Auto-Assignment Rules, Templates & Analytics - Implementation Plan

**Date:** 2025-11-27
**Duration:** 3 weeks
**Status:** Planning → Implementation
**Dependencies:** Phase 1 ✅ | Phase 2 ✅

---

## 🎯 Phase 3 Objectives

Implement advanced automation and analytics features:
- **Auto-Assignment Rules** - Intelligent email routing
- **Email Templates** - Quick responses for common scenarios
- **Analytics Dashboard** - Performance metrics and insights
- **SLA Tracking** - Service level agreement monitoring
- **Advanced Reporting** - Data export and trend analysis

---

## 📊 Week 1: Auto-Assignment Rules + Email Templates

### Part A: Auto-Assignment Rules System

#### Database Models

**1. AssignmentRule Model** (`Backend/models/AssignmentRule.js`)

```javascript
const assignmentRuleSchema = new mongoose.Schema({
  // Rule identification
  name: {
    type: String,
    required: true
  },

  description: String,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Email account this rule applies to
  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: true,
    index: true
  },

  // Rule conditions (ALL must match)
  conditions: {
    // Subject contains
    subjectContains: [String],

    // From email/domain
    fromEmail: [String],
    fromDomain: [String],

    // Body contains keywords
    bodyContains: [String],

    // Has specific tags
    hasTags: [String],

    // Priority level
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent']
    },

    // Time-based (business hours, weekends, etc.)
    timeCondition: {
      businessHoursOnly: Boolean,
      daysOfWeek: [Number] // 0=Sunday, 6=Saturday
    }
  },

  // Actions to perform
  actions: {
    // Auto-assign to user
    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    // Or assign based on department
    assignToDepartment: String,

    // Or round-robin within team
    roundRobin: {
      enabled: Boolean,
      teamMembers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      currentIndex: {
        type: Number,
        default: 0
      }
    },

    // Set priority
    setPriority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent']
    },

    // Set due date (days from now)
    setDueDateDays: Number,

    // Add tags
    addTags: [String],

    // Send template response
    sendTemplateResponse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmailTemplate'
    }
  },

  // Rule settings
  enabled: {
    type: Boolean,
    default: true
  },

  priority: {
    type: Number,
    default: 100 // Lower number = higher priority
  },

  // Stop processing more rules if this matches
  stopOnMatch: {
    type: Boolean,
    default: false
  },

  // Statistics
  matchCount: {
    type: Number,
    default: 0
  },

  lastMatchedAt: Date,

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
assignmentRuleSchema.index({ companyId: 1, enabled: 1, priority: 1 });
assignmentRuleSchema.index({ emailAccountId: 1, enabled: 1 });

// Method: Check if email matches this rule
assignmentRuleSchema.methods.matches = function(email) {
  const { conditions } = this;

  // Subject contains
  if (conditions.subjectContains && conditions.subjectContains.length > 0) {
    const subject = (email.subject || '').toLowerCase();
    const matches = conditions.subjectContains.some(keyword =>
      subject.includes(keyword.toLowerCase())
    );
    if (!matches) return false;
  }

  // From email
  if (conditions.fromEmail && conditions.fromEmail.length > 0) {
    const fromEmail = (email.from?.address || '').toLowerCase();
    const matches = conditions.fromEmail.some(email =>
      fromEmail === email.toLowerCase()
    );
    if (!matches) return false;
  }

  // From domain
  if (conditions.fromDomain && conditions.fromDomain.length > 0) {
    const fromEmail = (email.from?.address || '').toLowerCase();
    const domain = fromEmail.split('@')[1];
    const matches = conditions.fromDomain.some(d =>
      domain === d.toLowerCase()
    );
    if (!matches) return false;
  }

  // Body contains
  if (conditions.bodyContains && conditions.bodyContains.length > 0) {
    const body = (email.text || email.html || '').toLowerCase();
    const matches = conditions.bodyContains.some(keyword =>
      body.includes(keyword.toLowerCase())
    );
    if (!matches) return false;
  }

  // Time conditions
  if (conditions.timeCondition) {
    const now = new Date();

    if (conditions.timeCondition.businessHoursOnly) {
      const hour = now.getHours();
      if (hour < 9 || hour >= 17) return false;
    }

    if (conditions.timeCondition.daysOfWeek && conditions.timeCondition.daysOfWeek.length > 0) {
      const day = now.getDay();
      if (!conditions.timeCondition.daysOfWeek.includes(day)) return false;
    }
  }

  return true;
};

// Method: Execute rule actions
assignmentRuleSchema.methods.execute = async function(email, emailAccountId) {
  const EmailAssignment = mongoose.model('EmailAssignment');
  const User = mongoose.model('User');
  const { actions } = this;

  let assignedTo = null;

  // Determine assignee
  if (actions.assignTo) {
    assignedTo = actions.assignTo;
  } else if (actions.assignToDepartment) {
    // Find first available user in department
    const user = await User.findOne({
      companyId: this.companyId,
      department: actions.assignToDepartment
    });
    if (user) assignedTo = user._id;
  } else if (actions.roundRobin && actions.roundRobin.enabled) {
    // Round-robin assignment
    const teamMembers = actions.roundRobin.teamMembers;
    if (teamMembers && teamMembers.length > 0) {
      const index = actions.roundRobin.currentIndex % teamMembers.length;
      assignedTo = teamMembers[index];

      // Update index for next assignment
      this.actions.roundRobin.currentIndex = index + 1;
      await this.save();
    }
  }

  if (!assignedTo) {
    return null; // No assignee determined
  }

  // Create assignment
  const assignment = await EmailAssignment.create({
    emailAccountId,
    emailUid: email.uid,
    emailSubject: email.subject || '(No Subject)',
    emailFrom: email.from?.address || 'Unknown',
    emailDate: email.date || new Date(),
    emailMessageId: email.messageId,
    assignedTo,
    assignedBy: this.createdBy,
    companyId: this.companyId,
    priority: actions.setPriority || 'normal',
    dueDate: actions.setDueDateDays ?
      new Date(Date.now() + actions.setDueDateDays * 24 * 60 * 60 * 1000) : null,
    tags: actions.addTags || []
  });

  // Update statistics
  this.matchCount += 1;
  this.lastMatchedAt = new Date();
  await this.save();

  return assignment;
};

module.exports = mongoose.model('AssignmentRule', assignmentRuleSchema);
```

---

**2. EmailTemplate Model** (`Backend/models/EmailTemplate.js`)

```javascript
const emailTemplateSchema = new mongoose.Schema({
  // Template identification
  name: {
    type: String,
    required: true
  },

  description: String,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Template content
  subject: {
    type: String,
    required: true
  },

  body: {
    type: String,
    required: true
  },

  // Template type
  category: {
    type: String,
    enum: ['support', 'sales', 'general', 'auto-response', 'follow-up'],
    default: 'general'
  },

  // Variables that can be used in template
  // Example: {{customerName}}, {{orderId}}
  variables: [{
    name: String,
    description: String,
    defaultValue: String
  }],

  // Attachments (optional)
  attachments: [{
    filename: String,
    url: String
  }],

  // Usage tracking
  useCount: {
    type: Number,
    default: 0
  },

  lastUsedAt: Date,

  // Settings
  enabled: {
    type: Boolean,
    default: true
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
emailTemplateSchema.index({ companyId: 1, enabled: 1 });
emailTemplateSchema.index({ category: 1 });

// Method: Render template with variables
emailTemplateSchema.methods.render = function(variables = {}) {
  let subject = this.subject;
  let body = this.body;

  // Replace variables in subject and body
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(placeholder, value);
    body = body.replace(placeholder, value);
  }

  // Replace any remaining placeholders with default values
  this.variables.forEach(variable => {
    const placeholder = new RegExp(`{{${variable.name}}}`, 'g');
    const defaultValue = variables[variable.name] || variable.defaultValue || '';
    subject = subject.replace(placeholder, defaultValue);
    body = body.replace(placeholder, defaultValue);
  });

  return { subject, body };
};

// Post-use hook: Update statistics
emailTemplateSchema.methods.recordUsage = async function() {
  this.useCount += 1;
  this.lastUsedAt = new Date();
  await this.save();
};

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
```

---

### API Endpoints - Week 1

#### Assignment Rules Routes (`Backend/routes/assignment-rules.js`)

1. **Create Rule** - `POST /api/assignment-rules/`
2. **Get All Rules** - `GET /api/assignment-rules/`
3. **Get Rule by ID** - `GET /api/assignment-rules/:id`
4. **Update Rule** - `PATCH /api/assignment-rules/:id`
5. **Delete Rule** - `DELETE /api/assignment-rules/:id`
6. **Toggle Rule** - `PATCH /api/assignment-rules/:id/toggle`
7. **Test Rule** - `POST /api/assignment-rules/:id/test` (dry-run)
8. **Get Rule Statistics** - `GET /api/assignment-rules/stats`

#### Email Templates Routes (`Backend/routes/email-templates.js`)

1. **Create Template** - `POST /api/email-templates/`
2. **Get All Templates** - `GET /api/email-templates/`
3. **Get Template by ID** - `GET /api/email-templates/:id`
4. **Update Template** - `PATCH /api/email-templates/:id`
5. **Delete Template** - `DELETE /api/email-templates/:id`
6. **Render Template** - `POST /api/email-templates/:id/render`
7. **Use Template** - `POST /api/email-templates/:id/use` (send email)
8. **Get Template Statistics** - `GET /api/email-templates/stats`

---

### Frontend Components - Week 1

1. **RulesManager Component** - Create/edit auto-assignment rules
2. **RuleBuilder Component** - Visual rule builder with conditions
3. **TemplateManager Component** - Manage email templates
4. **TemplateEditor Component** - Rich text editor for templates
5. **QuickResponse Component** - Template selector in compose

---

## 📈 Week 2: Analytics Dashboard & SLA Tracking

### Database Models

**1. EmailMetric Model** (`Backend/models/EmailMetric.js`)

```javascript
const emailMetricSchema = new mongoose.Schema({
  // Company/Account association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    index: true
  },

  // Time period
  period: {
    type: String,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    required: true
  },

  periodStart: {
    type: Date,
    required: true,
    index: true
  },

  periodEnd: {
    type: Date,
    required: true
  },

  // Email volume metrics
  totalReceived: { type: Number, default: 0 },
  totalSent: { type: Number, default: 0 },
  totalAssigned: { type: Number, default: 0 },

  // Response metrics
  avgResponseTimeMinutes: Number,
  medianResponseTimeMinutes: Number,
  firstResponseTimeMinutes: Number,

  // Resolution metrics
  totalResolved: { type: Number, default: 0 },
  avgResolutionTimeHours: Number,
  resolvedWithinSLA: { type: Number, default: 0 },
  resolvedOutsideSLA: { type: Number, default: 0 },

  // Status distribution
  statusBreakdown: {
    new: { type: Number, default: 0 },
    in_progress: { type: Number, default: 0 },
    resolved: { type: Number, default: 0 },
    closed: { type: Number, default: 0 },
    reopened: { type: Number, default: 0 }
  },

  // Priority distribution
  priorityBreakdown: {
    low: { type: Number, default: 0 },
    normal: { type: Number, default: 0 },
    high: { type: Number, default: 0 },
    urgent: { type: Number, default: 0 }
  },

  // Team performance
  topPerformers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignmentsResolved: Number,
    avgResolutionTimeHours: Number
  }]
}, {
  timestamps: true
});

// Compound indexes
emailMetricSchema.index({ companyId: 1, period: 1, periodStart: 1 });
emailMetricSchema.index({ emailAccountId: 1, period: 1, periodStart: 1 });

module.exports = mongoose.model('EmailMetric', emailMetricSchema);
```

---

**2. SLAPolicy Model** (`Backend/models/SLAPolicy.js`)

```javascript
const slaPolicySchema = new mongoose.Schema({
  // Policy identification
  name: {
    type: String,
    required: true
  },

  description: String,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Applies to which email accounts
  emailAccounts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount'
  }],

  // SLA targets
  targets: {
    // First response time (minutes)
    firstResponseTime: {
      enabled: Boolean,
      minutes: Number,
      priority: {
        urgent: Number,   // e.g., 15 minutes
        high: Number,     // e.g., 30 minutes
        normal: Number,   // e.g., 60 minutes
        low: Number       // e.g., 120 minutes
      }
    },

    // Resolution time (hours)
    resolutionTime: {
      enabled: Boolean,
      hours: Number,
      priority: {
        urgent: Number,   // e.g., 4 hours
        high: Number,     // e.g., 8 hours
        normal: Number,   // e.g., 24 hours
        low: Number       // e.g., 48 hours
      }
    }
  },

  // Business hours
  businessHours: {
    enabled: Boolean,
    timezone: {
      type: String,
      default: 'America/New_York'
    },
    days: {
      monday: { start: String, end: String },    // e.g., "09:00", "17:00"
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    }
  },

  // Holidays
  holidays: [{
    date: Date,
    name: String
  }],

  enabled: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Method: Check if assignment meets SLA
slaPolicySchema.methods.checkSLA = function(assignment) {
  const result = {
    firstResponse: { met: null, targetMinutes: null, actualMinutes: null },
    resolution: { met: null, targetHours: null, actualHours: null }
  };

  // Check first response SLA
  if (this.targets.firstResponseTime?.enabled) {
    const priority = assignment.priority || 'normal';
    const targetMinutes = this.targets.firstResponseTime.priority[priority] ||
                          this.targets.firstResponseTime.minutes;

    if (assignment.firstResponseAt) {
      const actualMinutes = (assignment.firstResponseAt - assignment.assignedAt) / (1000 * 60);
      result.firstResponse = {
        met: actualMinutes <= targetMinutes,
        targetMinutes,
        actualMinutes: Math.round(actualMinutes)
      };
    }
  }

  // Check resolution SLA
  if (this.targets.resolutionTime?.enabled) {
    const priority = assignment.priority || 'normal';
    const targetHours = this.targets.resolutionTime.priority[priority] ||
                        this.targets.resolutionTime.hours;

    if (assignment.resolvedAt) {
      const actualHours = (assignment.resolvedAt - assignment.assignedAt) / (1000 * 60 * 60);
      result.resolution = {
        met: actualHours <= targetHours,
        targetHours,
        actualHours: Math.round(actualHours * 10) / 10
      };
    }
  }

  return result;
};

module.exports = mongoose.model('SLAPolicy', slaPolicySchema);
```

---

### API Endpoints - Week 2

#### Analytics Routes (`Backend/routes/analytics.js`)

1. **Get Dashboard Overview** - `GET /api/analytics/overview`
2. **Get Time Series Data** - `GET /api/analytics/time-series`
3. **Get Team Performance** - `GET /api/analytics/team-performance`
4. **Get Response Time Metrics** - `GET /api/analytics/response-times`
5. **Get Resolution Metrics** - `GET /api/analytics/resolutions`
6. **Get Tag Analytics** - `GET /api/analytics/tags`
7. **Export Data** - `POST /api/analytics/export` (CSV/JSON)

#### SLA Routes (`Backend/routes/sla-policies.js`)

1. **Create SLA Policy** - `POST /api/sla-policies/`
2. **Get All Policies** - `GET /api/sla-policies/`
3. **Update Policy** - `PATCH /api/sla-policies/:id`
4. **Delete Policy** - `DELETE /api/sla-policies/:id`
5. **Get SLA Compliance** - `GET /api/sla-policies/compliance`
6. **Get Breached SLAs** - `GET /api/sla-policies/breaches`

---

### Frontend Components - Week 2

1. **AnalyticsDashboard Component** - Main analytics view
2. **MetricsCards Component** - KPI cards (total emails, avg response time, etc.)
3. **ResponseTimeChart Component** - Line chart for response times
4. **ResolutionChart Component** - Bar chart for resolutions
5. **TeamPerformance Component** - Team member leaderboard
6. **SLAManager Component** - Manage SLA policies
7. **SLACompliance Component** - SLA compliance dashboard

---

## 📊 Week 3: Advanced Reporting & Polish

### Features

1. **Export Functionality**
   - CSV export
   - JSON export
   - PDF reports (optional)
   - Scheduled reports (email delivery)

2. **Advanced Filters**
   - Date range picker
   - Multi-select filters (users, tags, priority)
   - Save filter presets
   - Share dashboard views

3. **Real-Time Notifications**
   - SLA breach alerts
   - Rule match notifications
   - Assignment notifications
   - WebSocket integration

4. **Mobile Optimization**
   - Responsive analytics charts
   - Touch-friendly dashboards
   - Mobile-first rule builder

---

## 🎯 Success Criteria

✅ Auto-assignment rules working
✅ Email templates functional
✅ Analytics dashboard showing real data
✅ SLA tracking operational
✅ Export functionality working
✅ All components responsive
✅ Performance optimized
✅ Documentation complete

---

## 📋 Testing Checklist

- [ ] Create assignment rule
- [ ] Test rule matching
- [ ] Verify auto-assignment
- [ ] Create email template
- [ ] Use template in response
- [ ] View analytics dashboard
- [ ] Create SLA policy
- [ ] Check SLA compliance
- [ ] Export data to CSV
- [ ] Test on mobile devices

---

**Phase 3 Duration:** 3 weeks
**Total Features:** 30+ new features
**Estimated LOC:** ~5,000 lines

**Next:** Start implementation with Week 1 (Rules & Templates)
