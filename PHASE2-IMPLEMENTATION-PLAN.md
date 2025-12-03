# Phase 2: Email Assignment & Collaboration System - Implementation Plan

**Date:** 2025-11-27
**Status:** Planning
**Dependencies:** Phase 1 Complete ✅

---

## 🎯 Phase 2 Objectives

Implement email assignment and collaboration features that allow team members to:
- Assign emails to specific team members
- Track email status (new, in progress, resolved)
- Add internal notes/comments on emails
- View assignment history and activity
- Get notifications for assignments
- See team workload dashboard

---

## 📊 Database Schema Updates

### 1. New Model: EmailAssignment

**File:** `Backend/models/EmailAssignment.js`

```javascript
const emailAssignmentSchema = new mongoose.Schema({
  // Email identification
  emailAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAccount',
    required: true,
    index: true
  },

  emailUid: {
    type: String,
    required: true
  },

  emailSubject: String,
  emailFrom: String,
  emailDate: Date,

  // Assignment details
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  assignedAt: {
    type: Date,
    default: Date.now
  },

  // Status tracking
  status: {
    type: String,
    enum: ['new', 'in_progress', 'resolved', 'closed', 'reopened'],
    default: 'new',
    index: true
  },

  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  dueDate: Date,

  // Resolution details
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  resolutionNote: String,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Tags for categorization
  tags: [String],

  // Internal notes count (for quick reference)
  notesCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes
emailAssignmentSchema.index({ companyId: 1, status: 1 });
emailAssignmentSchema.index({ assignedTo: 1, status: 1 });
emailAssignmentSchema.index({ emailAccountId: 1, emailUid: 1 }, { unique: true });

// Methods
emailAssignmentSchema.methods.updateStatus = async function(newStatus, userId, note) {
  const oldStatus = this.status;
  this.status = newStatus;

  if (newStatus === 'resolved' || newStatus === 'closed') {
    this.resolvedAt = new Date();
    this.resolvedBy = userId;
    if (note) this.resolutionNote = note;
  }

  await this.save();

  // Create activity log
  await EmailActivity.create({
    assignmentId: this._id,
    userId,
    action: 'status_changed',
    details: { from: oldStatus, to: newStatus },
    companyId: this.companyId
  });
};

module.exports = mongoose.model('EmailAssignment', emailAssignmentSchema);
```

---

### 2. New Model: EmailNote

**File:** `Backend/models/EmailNote.js`

```javascript
const emailNoteSchema = new mongoose.Schema({
  // Assignment reference
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAssignment',
    required: true,
    index: true
  },

  // Note details
  content: {
    type: String,
    required: true
  },

  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Visibility
  isInternal: {
    type: Boolean,
    default: true // Internal notes only visible to team
  },

  // Mentions
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  // Soft delete
  deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
emailNoteSchema.index({ assignmentId: 1, deleted: 1 });
emailNoteSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('EmailNote', emailNoteSchema);
```

---

### 3. New Model: EmailActivity

**File:** `Backend/models/EmailActivity.js`

```javascript
const emailActivitySchema = new mongoose.Schema({
  // Assignment reference
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailAssignment',
    required: true,
    index: true
  },

  // Activity details
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  action: {
    type: String,
    enum: [
      'assigned',
      'reassigned',
      'status_changed',
      'priority_changed',
      'note_added',
      'due_date_set',
      'tag_added',
      'tag_removed'
    ],
    required: true
  },

  details: mongoose.Schema.Types.Mixed,

  // Company association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
emailActivitySchema.index({ assignmentId: 1, createdAt: -1 });
emailActivitySchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model('EmailActivity', emailActivitySchema);
```

---

## 🛠️ Backend API Endpoints

### 1. Email Assignment Endpoints

**File:** `Backend/routes/email-assignments.js`

#### **1.1 Assign Email to User**
```javascript
POST /api/email-assignments/assign
Authorization: Bearer <token>
Permission: canManage or canSend

Body:
{
  "emailAccountId": "64a1b2c3...",
  "emailUid": "12345",
  "assignedTo": "userId",
  "priority": "normal", // optional
  "dueDate": "2025-12-01", // optional
  "tags": ["customer-inquiry"], // optional
  "note": "Please handle this customer request" // optional
}

Response:
{
  "success": true,
  "assignment": {
    "_id": "...",
    "emailAccountId": "...",
    "emailUid": "12345",
    "assignedTo": { ... },
    "assignedBy": { ... },
    "status": "new",
    "priority": "normal"
  }
}
```

#### **1.2 Get My Assignments**
```javascript
GET /api/email-assignments/my-assignments
Authorization: Bearer <token>
Query: ?status=new&priority=high&limit=50&page=1

Response:
{
  "assignments": [
    {
      "_id": "...",
      "emailSubject": "Customer inquiry",
      "emailFrom": "customer@example.com",
      "assignedAt": "2025-11-27T10:00:00Z",
      "status": "new",
      "priority": "normal",
      "dueDate": "2025-12-01",
      "notesCount": 2,
      "tags": ["customer-inquiry"]
    }
  ],
  "total": 25,
  "page": 1
}
```

#### **1.3 Get Team Assignments (Manager View)**
```javascript
GET /api/email-assignments/team-assignments
Authorization: Bearer <token>
Query: ?accountId=...&status=in_progress

Response:
{
  "assignments": [
    {
      "_id": "...",
      "emailSubject": "Bug report",
      "assignedTo": { "name": "John Doe", "email": "john@company.com" },
      "assignedBy": { "name": "Manager", "email": "manager@company.com" },
      "status": "in_progress",
      "priority": "high"
    }
  ],
  "stats": {
    "total": 50,
    "new": 10,
    "in_progress": 15,
    "resolved": 20,
    "closed": 5
  }
}
```

#### **1.4 Update Assignment Status**
```javascript
PATCH /api/email-assignments/:id/status
Authorization: Bearer <token>

Body:
{
  "status": "in_progress",
  "note": "Started working on this" // optional
}

Response:
{
  "success": true,
  "assignment": { ... }
}
```

#### **1.5 Reassign Email**
```javascript
PATCH /api/email-assignments/:id/reassign
Authorization: Bearer <token>
Permission: canManage

Body:
{
  "assignedTo": "newUserId",
  "note": "Reassigning to specialist"
}

Response:
{
  "success": true,
  "assignment": { ... }
}
```

#### **1.6 Update Priority**
```javascript
PATCH /api/email-assignments/:id/priority
Authorization: Bearer <token>

Body:
{
  "priority": "urgent"
}
```

#### **1.7 Set Due Date**
```javascript
PATCH /api/email-assignments/:id/due-date
Authorization: Bearer <token>

Body:
{
  "dueDate": "2025-12-01T23:59:59Z"
}
```

#### **1.8 Add/Remove Tags**
```javascript
PATCH /api/email-assignments/:id/tags
Authorization: Bearer <token>

Body:
{
  "action": "add", // or "remove"
  "tags": ["urgent", "vip-customer"]
}
```

---

### 2. Email Notes Endpoints

**File:** `Backend/routes/email-notes.js`

#### **2.1 Add Note to Assignment**
```javascript
POST /api/email-notes/
Authorization: Bearer <token>

Body:
{
  "assignmentId": "...",
  "content": "Customer confirmed the issue",
  "mentions": ["userId1", "userId2"] // optional
}

Response:
{
  "success": true,
  "note": {
    "_id": "...",
    "content": "...",
    "author": { ... },
    "createdAt": "..."
  }
}
```

#### **2.2 Get Notes for Assignment**
```javascript
GET /api/email-notes/:assignmentId
Authorization: Bearer <token>

Response:
{
  "notes": [
    {
      "_id": "...",
      "content": "Customer confirmed the issue",
      "author": { "name": "John Doe", "email": "john@company.com" },
      "createdAt": "2025-11-27T10:30:00Z",
      "mentions": [...]
    }
  ]
}
```

#### **2.3 Update Note**
```javascript
PATCH /api/email-notes/:id
Authorization: Bearer <token>

Body:
{
  "content": "Updated note content"
}
```

#### **2.4 Delete Note**
```javascript
DELETE /api/email-notes/:id
Authorization: Bearer <token>

Response:
{
  "success": true
}
```

---

### 3. Email Activity Endpoints

**File:** `Backend/routes/email-activity.js`

#### **3.1 Get Activity Log**
```javascript
GET /api/email-activity/:assignmentId
Authorization: Bearer <token>

Response:
{
  "activities": [
    {
      "_id": "...",
      "action": "assigned",
      "userId": { "name": "Manager" },
      "details": { "to": "John Doe" },
      "createdAt": "2025-11-27T09:00:00Z"
    },
    {
      "action": "status_changed",
      "userId": { "name": "John Doe" },
      "details": { "from": "new", "to": "in_progress" },
      "createdAt": "2025-11-27T10:00:00Z"
    }
  ]
}
```

---

## 🎨 Frontend Components

### 1. AssignmentPanel Component

**File:** `Frontend/src/components/email/AssignmentPanel.js`

**Purpose:** Show assignment details sidebar in TeamInbox

**Features:**
- Display assignment status, priority, due date
- Show assigned user with avatar
- Status update dropdown
- Priority selector
- Due date picker
- Tag management
- Activity timeline
- Notes section
- Reassignment button (for managers)

**Props:**
```javascript
{
  emailUid: string,
  emailAccountId: string,
  assignment: object | null,
  onAssignmentUpdate: function
}
```

---

### 2. AssignEmailModal Component

**File:** `Frontend/src/components/email/AssignEmailModal.js`

**Purpose:** Modal to assign email to team member

**Features:**
- User selector (dropdown of team members)
- Priority selector
- Due date picker
- Tag input (multi-select)
- Note input
- Submit button

---

### 3. MyAssignments Component

**File:** `Frontend/src/components/email/MyAssignments.js`

**Purpose:** Dashboard showing user's assigned emails

**Features:**
- Filter by status (new, in progress, resolved)
- Filter by priority
- Sort by due date
- Card view of assignments
- Quick status update
- Click to open email in TeamInbox

---

### 4. TeamDashboard Component

**File:** `Frontend/src/components/email/TeamDashboard.js`

**Purpose:** Manager view of team workload

**Features:**
- Team member cards with assignment counts
- Status distribution (pie chart or bars)
- Overdue assignments list
- Unassigned emails count
- Quick reassignment interface

---

### 5. EmailNotes Component

**File:** `Frontend/src/components/email/EmailNotes.js`

**Purpose:** Display and add internal notes

**Features:**
- Notes list with author and timestamp
- Add new note textarea
- @ mention autocomplete
- Edit/delete own notes
- Real-time updates (optional)

---

### 6. ActivityTimeline Component

**File:** `Frontend/src/components/email/ActivityTimeline.js`

**Purpose:** Show assignment history

**Features:**
- Chronological activity list
- Action icons (assigned, status changed, etc.)
- User avatars
- Relative timestamps
- Expandable details

---

## 🔄 Updated Components

### TeamInbox Updates

**File:** `Frontend/src/components/email/TeamInbox.js`

**Changes:**
1. Add "Assign" button to email detail view
2. Show assignment indicator on email list items
3. Add AssignmentPanel sidebar (toggle)
4. Color-code emails by assignment status
5. Add filter: "Show only assigned to me"
6. Add filter: "Show unassigned only"

---

## 📋 Implementation Steps

### Step 1: Backend Models (30 mins)
- [ ] Create EmailAssignment model
- [ ] Create EmailNote model
- [ ] Create EmailActivity model
- [ ] Test models in MongoDB

### Step 2: Backend Routes - Assignments (1 hour)
- [ ] Create email-assignments.js routes file
- [ ] Implement assign endpoint
- [ ] Implement get my assignments endpoint
- [ ] Implement get team assignments endpoint
- [ ] Implement update status endpoint
- [ ] Implement reassign endpoint
- [ ] Implement priority/due-date/tags endpoints
- [ ] Test all endpoints with Postman/curl

### Step 3: Backend Routes - Notes & Activity (30 mins)
- [ ] Create email-notes.js routes file
- [ ] Implement CRUD endpoints for notes
- [ ] Create email-activity.js routes file
- [ ] Implement activity log endpoint
- [ ] Test endpoints

### Step 4: Frontend - Assignment Panel (45 mins)
- [ ] Create AssignmentPanel component
- [ ] Create AssignmentPanel.css
- [ ] Integrate with TeamInbox
- [ ] Test assignment display

### Step 5: Frontend - Assign Modal (30 mins)
- [ ] Create AssignEmailModal component
- [ ] Add assign button to email detail
- [ ] Test assignment creation

### Step 6: Frontend - Notes (30 mins)
- [ ] Create EmailNotes component
- [ ] Integrate into AssignmentPanel
- [ ] Test note CRUD operations

### Step 7: Frontend - Activity Timeline (20 mins)
- [ ] Create ActivityTimeline component
- [ ] Integrate into AssignmentPanel
- [ ] Test activity display

### Step 8: Frontend - Dashboards (1 hour)
- [ ] Create MyAssignments component
- [ ] Create TeamDashboard component
- [ ] Add to MainstreamInbox tabs
- [ ] Test filtering and sorting

### Step 9: Integration & Testing (30 mins)
- [ ] End-to-end assignment workflow
- [ ] Test reassignment
- [ ] Test status updates
- [ ] Test notes with mentions
- [ ] Test activity logging

### Step 10: UI Polish (20 mins)
- [ ] Add loading states
- [ ] Add error handling
- [ ] Responsive design tweaks
- [ ] Add tooltips and help text

---

## 🎯 Success Criteria

✅ Users can assign emails to team members
✅ Assigned users see their assignments in dashboard
✅ Status can be updated (new → in_progress → resolved)
✅ Priority and due dates can be set
✅ Internal notes can be added with mentions
✅ Activity history is tracked
✅ Managers can view team workload
✅ Reassignment works correctly
✅ Filters work (status, priority, assigned user)
✅ All operations are logged

---

## 📊 Estimated Time

- **Backend Development:** 2 hours
- **Frontend Development:** 3 hours
- **Testing & Polish:** 1 hour
- **Total:** ~6 hours

---

## 🔗 Dependencies

**Required from Phase 1:**
- ✅ EmailAccount model with companyId
- ✅ Team email accounts
- ✅ Role-based permissions
- ✅ TeamInbox component
- ✅ Authentication & authorization

**External Dependencies:**
- MongoDB (existing)
- Express.js (existing)
- React (existing)
- Axios (existing)

---

**Status:** Ready to implement
**Next:** Start with backend models

---

*Created: 2025-11-27*
*Phase 1: Complete ✅*
*Phase 2: Planning → Implementation*
