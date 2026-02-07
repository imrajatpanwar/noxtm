# Noxtm Role System Documentation

## Overview
The Noxtm platform uses a comprehensive role-based access control (RBAC) system with two layers:
1. **System Roles** - Platform-wide roles for individual users
2. **Company Roles** - Organization-specific roles for team collaboration

---

## System Roles (User-Level)

### 1. User (Default)
- **Assigned to**: All new sign-ups
- **Access Level**: Basic platform features based on subscription plan
- **Description**: Standard user with access limited by their subscription tier
- **Permissions**: Controlled by subscription plan (Trial, Noxtm, Starter, Pro+, Advance, Enterprise)

### 2. Admin
- **Assigned to**: Platform administrators (manually assigned)
- **Access Level**: Full platform access
- **Description**: Has complete control over all platform features and settings
- **Permissions**: All modules enabled, can manage all features

**Note**: The "Lord" role has been removed from the system. Admin is now the highest privilege level.

---

## Company Roles (Organization-Level)

When a user creates or joins a company, they receive a **Company Role** in addition to their System Role:

### 1. Owner (Founder)
- **Assigned to**: Company creator
- **Access Level**: Full company control
- **Can**:
  - Manage all company settings
  - Invite and remove team members
  - Assign roles to members
  - Delete the company
  - Access all company projects and data
  - Configure billing and subscriptions

### 2. Manager
- **Assigned to**: Team leaders and department heads
- **Access Level**: High-level management access
- **Can**:
  - View and manage projects
  - **Access Project Settings** (includes onboarding email configuration)
  - Invite team members
  - View company analytics
  - Manage team members in their department
- **Cannot**:
  - Delete company
  - Modify owner-level settings
  - Change company subscription

### 3. Business Admin
- **Assigned to**: Administrative staff
- **Access Level**: Similar to Manager with focus on operations
- **Can**:
  - Access most modules
  - **Access Project Settings**
  - Manage projects and clients
  - View reports and analytics
- **Cannot**:
  - Change critical company settings
  - Modify subscription plans

### 4. Employee (Default Company Role)
- **Assigned to**: Regular team members
- **Access Level**: Standard company features
- **Can**:
  - Access modules based on their permissions
  - View assigned projects
  - Collaborate with team members
- **Cannot**:
  - Access Project Settings
  - Invite other members (unless granted permission)
  - Modify company-wide settings

---

## Role Assignment Flow

### New User Sign-Up
```
1. User registers → Assigned "User" system role
2. Status: Active
3. Default Subscription: Noxtm (Trial if configured)
4. Default Permissions: Based on subscription plan
```

### Joining a Company
```
1. User receives invitation
2. Invitation specifies:
   - Company Role (Employee, Manager)
   - Department (Management Team, Digital Team, etc.)
   - Custom Permissions (optional)
3. User accepts → Gets company role in addition to system role
```

### Creating a Company
```
1. User creates company → Automatically becomes "Owner"
2. Owner can invite members with roles:
   - Manager
   - Employee
3. Custom permissions can be set per invitation
```

---

## Permission Hierarchy

### Access Priority (Highest to Lowest)
1. **Admin** (System Role) - Full access to everything
2. **Owner** (Company Role) - Full access to company
3. **Manager** (Company Role) - High-level company access
4. **Business Admin** (Company Role) - Administrative company access
5. **Employee** (Company Role) - Standard company access
6. **User** (System Role only) - Individual subscription-based access

### Manager-Level Permissions
The following roles can access Project Settings and other management features:
- Owner
- Manager
- Admin (System Role)
- Business Admin

---

## Project Management Settings

### Who Can Access Settings?
Only users with **Manager-level permissions** can:
- Access Project Settings modal
- Enable/disable onboarding emails
- Configure sender email accounts
- Select email templates
- View mail configuration status

### Settings Features
- **Onboarding Email Configuration**
  - Enable/disable client welcome emails
  - Select sender email account
  - Choose email template
  - Depends on verified mail domain

---

## Subscription Plans & Permissions

Each subscription plan grants different module access:

### Trial / Noxtm
- Dashboard, Data Center, Projects, Team Communication
- Digital Media, Marketing, HR, Finance
- SEO Management, Internal Policies
- ❌ Settings & Configuration (Admin/Owner only)

### Starter
- Similar to Noxtm
- Limited SEO features
- Basic module access

### Pro+ / Advance / Enterprise
- All modules enabled
- Advanced features unlocked
- Full platform capabilities

### SoloHQ (Special Plan)
- **Projects Only** - Focused on individual project management
- Limited team features

---

## Role Checking in Code

### Backend (Node.js/Express)
```javascript
// Check if user has manager permissions
const managerRoles = ['Owner', 'Manager', 'Admin', 'Business Admin'];
const userRole = req.user.role || req.user.roleInCompany;

if (!managerRoles.includes(userRole)) {
    return res.status(403).json({ message: 'Manager access required' });
}
```

### Frontend (React)
```javascript
// Check manager access
const managerRoles = ['Owner', 'Manager', 'Admin', 'Business Admin'];
const hasManagerRole = managerRoles.includes(user.role) ||
    managerRoles.includes(user.roleInCompany);

{hasManagerRole && (
    <button onClick={openSettings}>Settings</button>
)}
```

---

## Important Notes

1. **System Role vs Company Role**:
   - `user.role` = System role (User, Admin)
   - `user.roleInCompany` = Company role (Owner, Manager, Employee)

2. **Admin Override**:
   - Users with System Role "Admin" bypass all company role restrictions

3. **Permission Inheritance**:
   - Higher roles inherit all permissions of lower roles
   - Custom permissions can override defaults

4. **Default Behavior**:
   - New sign-ups → User (System Role)
   - Company invitations → Employee (default, can be changed to Manager)
   - Company creation → Owner (automatic)

---

## Summary Table

| Role | Type | Default? | Can Access Project Settings? | Full Platform Access? |
|------|------|----------|------------------------------|----------------------|
| Admin | System | No | ✅ Yes | ✅ Yes |
| User | System | ✅ Yes | ❌ No | Based on subscription |
| Owner | Company | When creating company | ✅ Yes | Within company |
| Manager | Company | No | ✅ Yes | High-level company access |
| Business Admin | Company | No | ✅ Yes | Administrative access |
| Employee | Company | ✅ Yes (when invited) | ❌ No | Standard company access |

---

## Migration Notes

### Removed: "Lord" Role
- Previously existed as super-admin role
- **Replaced by**: Admin (no functional change)
- **Action Required**: None - existing "Lord" users should be migrated to "Admin"
- All "Lord" references removed from codebase

---

*Last Updated: February 5, 2026*
