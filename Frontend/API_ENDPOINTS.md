# Backend API Endpoints for Role Management

## Required MongoDB Schema Updates

### User Schema
Add these fields to your existing User model:

```javascript
// In your User model (e.g., models/User.js)
const userSchema = new mongoose.Schema({
  // ... existing fields ...
  
  // Role-based access control
  role: {
    type: String,
    enum: ['Admin', 'Project Manager', 'Data Miner', 'Data Analyst', 'Social Media Manager', 'Human Resource', 'Graphic Designer', 'Web Developer', 'SEO Manager'],
    default: 'Data Miner'
  },
  
  // Custom permissions that override role defaults
  permissions: {
    dashboard: { type: Boolean, default: true },
    dataCenter: { type: Boolean },
    projects: { type: Boolean },
    digitalMediaManagement: { type: Boolean },
    marketing: { type: Boolean },
    hrManagement: { type: Boolean },
    financeManagement: { type: Boolean },
    seoManagement: { type: Boolean },
    internalPolicies: { type: Boolean },
    settingsConfiguration: { type: Boolean }
  },
  
  // User status
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  
  // Legacy access array (for backward compatibility)
  access: [String]
});
```

## Required API Endpoints

### 1. Get All Users (Enhanced)
```
GET /api/users
```
**Response Format:**
```json
{
  "users": [
    {
      "_id": "user_id",
      "username": "John Smith",
      "email": "john@example.com",
      "role": "Admin",
      "status": "Active",
      "permissions": {
        "dashboard": true,
        "dataCenter": true,
        "projects": true,
        // ... other permissions
      },
      "access": ["Data Cluster", "Projects", "Finance"]
    }
  ]
}
```

### 2. Update User Role
```
PUT /api/users/:userId
```
**Request Body:**
```json
{
  "role": "Project Manager"
}
```
**Response:**
```json
{
  "message": "User role updated successfully",
  "user": {
    "_id": "user_id",
    "role": "Project Manager"
  }
}
```

### 3. Update User Permissions (NEW)
```
PUT /api/users/:userId/permissions
```
**Request Body:**
```json
{
  "permissions": {
    "dataCenter": true,
    "financeManagement": false
  }
}
```
**Response:**
```json
{
  "message": "User permissions updated successfully",
  "user": {
    "_id": "user_id",
    "permissions": {
      "dashboard": true,
      "dataCenter": true,
      "projects": false,
      "financeManagement": false,
      // ... other permissions
    }
  }
}
```

## Sample Backend Implementation

### Route Handler for Permission Updates
```javascript
// routes/users.js
router.put('/:userId/permissions', async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;
    
    // Find user and update permissions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Merge new permissions with existing ones
    user.permissions = { ...user.permissions, ...permissions };
    await user.save();
    
    res.json({
      message: 'User permissions updated successfully',
      user: {
        _id: user._id,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

### Enhanced Role Update Handler
```javascript
// routes/users.js  
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update role
    user.role = role;
    
    // Optionally reset permissions to role defaults
    // user.permissions = {}; // This would make user inherit role permissions
    
    await user.save();
    
    res.json({
      message: 'User role updated successfully',
      user: {
        _id: user._id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

## Authentication & Authorization

All endpoints should:
1. Verify JWT token
2. Check if current user is Admin (for role/permission changes)
3. Return appropriate error codes for unauthorized access

```javascript
// Middleware example
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Use in routes
router.put('/:userId/permissions', requireAdmin, updatePermissions);
router.put('/:userId', requireAdmin, updateUserRole);
```

## Data Flow

1. **Frontend** → Makes API call to update role/permissions
2. **Backend** → Validates admin permissions → Updates MongoDB
3. **MongoDB** → Stores updated user data
4. **Backend** → Returns success/error response
5. **Frontend** → Updates local state + shows toast notification

## Error Handling

The frontend expects these response formats:

**Success:**
```json
{ "message": "Operation successful", "user": {...} }
```

**Error:**
```json
{ "message": "Error description" }
```

Status codes: 200 (success), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
