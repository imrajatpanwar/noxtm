# Company Member Management System - Setup & Troubleshooting Guide

## ✅ Implementation Complete

The company-based member management system with invite links has been successfully implemented!

## 🔍 Current Database Status

**Companies Found:** 2 active companies
1. **Hosterowl** (ID: `68f158248522615060c9d73d`)
   - Owner: hosterowl@gmail.com
   - Members: 2 (hosterowl - Owner, hosteroil - Member)

2. **Noxtm** (ID: `68f6141b324f57f9289cb063`)
   - Owner: noxtmofficial@gmail.com
   - Members: 2 (noxtm - Owner, Rajat Panwar - Member)

**Issue Found:** Some users have orphaned `companyId` references to a deleted company (`68ed5c2b194cf49c32d19daf`)
- Affected users: Ayush, Aarav, Jaatraj

## 🧪 Testing Instructions

### Step 1: Login with a Company Owner Account

Use one of these accounts that have valid companies:
- **hosterowl@gmail.com** (Owner of Hosterowl)
- **noxtmofficial@gmail.com** (Owner of Noxtm)

### Step 2: Navigate to Workspace Settings

1. Login to dashboard
2. Go to **Workspace Settings** (in sidebar/menu)
3. Click on the **Members** tab

### Step 3: View Members

You should see:
- Company name and member count at the top
- List of current members with avatars, names, emails, roles
- **"Invite Members" button** (only visible to Owners/Admins)

### Step 4: Generate Invite Link

1. Click **"Invite Members"** button
2. Enter email address of person to invite
3. Select role (Member or Admin)
4. Click **"Generate Invite Link"**
5. Copy the generated link

### Step 5: Accept Invitation

**Option A - Existing User:**
1. Logout
2. Login with account that matches the invited email
3. Visit the invite link
4. Click "Accept Invitation"
5. You'll be added to the company

**Option B - New User:**
1. Visit the invite link (while logged out)
2. Click "Create New Account"
3. Sign up with the email that was invited
4. Complete registration
5. Return to invite link and accept

## 🐛 Troubleshooting

### Error: "Failed to load company members"

**Cause:** User has a `companyId` that references a deleted/non-existent company

**Solution:** Clear the orphaned companyId

```javascript
// Run this in Backend folder
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm').then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({ companyId: mongoose.Schema.Types.ObjectId }));
  const Company = mongoose.model('Company', new mongoose.Schema({}));
  const users = await User.find({ companyId: { \$ne: null } });
  for (let user of users) {
    const companyExists = await Company.findById(user.companyId);
    if (!companyExists) {
      console.log('Removing orphaned companyId from user:', user.email);
      user.companyId = null;
      await user.save();
    }
  }
  console.log('✅ Done');
  process.exit(0);
});
"
```

### "Invite Members" Button Not Showing

**Possible causes:**
1. **Not logged in** - You must be authenticated
2. **No company** - User doesn't have a `companyId`
3. **Not Owner/Admin** - Only Owners and Admins can invite members
4. **Company not loaded** - Wait a moment for company details to load

**Debug steps:**
1. Open browser console (F12)
2. Go to Members tab
3. Check console logs:
   ```
   Fetching company members...
   Response status: 200
   Response data: { success: true, members: [...] }
   Company details loaded: { companyName: "...", owner: {...} }
   ```

### Company Members Not Loading

**Check browser console** for these logs:
- `Fetching company members...` - Request started
- `Response status: XXX` - HTTP status code
- `Response data: {...}` - API response

**Common issues:**
- **404** - No company associated with user
- **401** - Not authenticated (token expired)
- **500** - Server error (check Backend logs)

## 🔧 Fix Orphaned Company References

Run this script to clean up orphaned companyId references:

```bash
cd Backend
node -p "require('./server.js')" # This will not work, use the script below instead
```

Or create a cleanup script:

```javascript
// Backend/cleanup-orphaned-companies.js
const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';

async function cleanup() {
  await mongoose.connect(mongoUri);

  const User = mongoose.model('User');
  const Company = mongoose.model('Company');

  const usersWithCompany = await User.find({ companyId: { $ne: null } });
  let fixed = 0;

  for (let user of usersWithCompany) {
    const companyExists = await Company.findById(user.companyId);
    if (!companyExists) {
      console.log(`Fixing ${user.email} - removing deleted company reference`);
      user.companyId = null;
      await user.save();
      fixed++;
    }
  }

  console.log(`✅ Fixed ${fixed} users`);
  await mongoose.connection.close();
}

cleanup();
```

## 📋 API Endpoints Reference

### Get Company Members
```
GET /api/company/members
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  members: [...],
  total: 2,
  companyName: "Company Name"
}
```

### Generate Invite Link
```
POST /api/company/invite
Headers: Authorization: Bearer <token>
Body: {
  email: "colleague@company.com",
  roleInCompany: "Member" // or "Admin"
}
Response: {
  success: true,
  inviteUrl: "http://domain/invite/abc123...",
  expiresAt: "2025-01-30..."
}
```

### Validate Invite
```
GET /api/company/invite/:token
Response: {
  valid: true,
  invitation: {
    email: "...",
    roleInCompany: "Member",
    companyName: "...",
    expiresAt: "..."
  }
}
```

### Accept Invite
```
POST /api/company/invite/:token/accept
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  message: "Successfully joined the company",
  company: {...}
}
```

### Remove Member
```
DELETE /api/company/members/:memberId
Headers: Authorization: Bearer <token>
Response: {
  success: true,
  message: "Member removed successfully"
}
```

## ✨ Features Implemented

✅ Member list filtered by companyId
✅ Invite link generation with unique tokens
✅ Email-based invitations
✅ Role assignment (Admin/Member)
✅ Copy to clipboard functionality
✅ 7-day link expiration
✅ Invite validation
✅ Accept flow for logged-in and new users
✅ Member removal (Owner/Admin only)
✅ Permission checks
✅ Responsive design
✅ Loading and error states

## 🎯 Next Steps

1. Test with a valid company owner account
2. Clean up orphaned company references if needed
3. Generate invite links and test the full flow
4. Consider adding email notifications when invites are sent
