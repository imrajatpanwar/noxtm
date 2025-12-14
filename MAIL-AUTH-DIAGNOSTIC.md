# Mail App Authentication Diagnostic - December 14, 2025

## Problem Being Diagnosed

User reports: **"on click mail token is gentrated but i thing mail is not accepting it's redirecting back ! i want domain verification thing on mail.noxtm.com !"**

## What Was Deployed

Added comprehensive diagnostic logging to trace the complete authentication flow from token generation to domain wizard display.

### Files Modified

1. **mail-frontend/src/components/Inbox.js**
   - Added logging to `useEffect` token capture
   - Added logging to `loadUser` profile fetch
   - Added logging to `checkDomainSetup` domain verification
   - Explicitly verify token exists before API calls

2. **mail-frontend/src/config/api.js**
   - Added logging to request interceptor (shows Authorization header status)
   - Added logging to 401 error handler (shows redirect decision)
   - Tracks token presence in localStorage and cookies

### Deployment Details

- **Build**: `main.03c2260c.js` (257.63 kB gzipped, +678 B from diagnostic logs)
- **Deployed**: December 14, 2025 at 15:15
- **Location**: `/var/www/mail-noxtm/`
- **Status**: ✅ Live in production

## How to Test

### IMPORTANT: Clear Browser Cache First!

Before testing, you MUST clear your browser cache to load the new diagnostic version:

**Option 1: Hard Refresh** (Recommended)
- **Windows/Linux**: Press `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: Press `Cmd + Shift + R`

**Option 2: Incognito Mode**
- Open new incognito/private window (`Ctrl/Cmd + Shift + N`)
- Navigate to https://noxtm.com
- Login with your credentials

### Step-by-Step Testing Process

#### 1. Open Browser DevTools BEFORE Clicking "Open Mail App"

1. Login to https://noxtm.com
2. Press **F12** to open DevTools
3. Go to **Console** tab (important!)
4. Go to **Network** tab (in another pane if possible)
5. **THEN** click "Open Mail App" in the sidebar

#### 2. Observe Console Logs

You should see a sequence of logs like this:

**Expected SUCCESS Flow:**
```
[INBOX] Component mounted - Starting authentication flow...
[INBOX] ✅ Token found in URL, saving to localStorage
[INBOX] Token preview: eyJhbGciOiJIUzI1NiIs...
[INBOX] Token saved: YES
[INBOX] URL cleaned, token removed from visible URL
[INBOX] Fetching user profile from /api/profile...
[INBOX] Token exists: YES (length: 183)
[API] Request: GET /profile
[API] Token in localStorage: YES (length: 183)
[API] Authorization header SET
[INBOX] ✅ Profile fetch SUCCESS: {email: "...", fullName: "...", role: "User"}
[INBOX] User is not Admin, checking domain setup...
[INBOX] Checking domain setup via /api/email-domains...
[API] Request: GET /email-domains
[API] Token in localStorage: YES (length: 183)
[API] Authorization header SET
[INBOX] ✅ Email domains response: {success: true, data: []}
[INBOX] ⚠️  No verified domain found - SHOWING DOMAIN WIZARD
[INBOX] Total domains: 0
```

**Expected FAILURE Flow (if auth broken):**
```
[INBOX] Component mounted - Starting authentication flow...
[INBOX] ✅ Token found in URL, saving to localStorage
[INBOX] Token preview: eyJhbGciOiJIUzI1NiIs...
[INBOX] Token saved: YES
[INBOX] URL cleaned, token removed from visible URL
[INBOX] Fetching user profile from /api/profile...
[INBOX] Token exists: YES (length: 183)
[API] Request: GET /profile
[API] Token in localStorage: YES (length: 183)
[API] Authorization header SET
[API] ❌ 401 Error on: /profile
[API] Response: {success: false, message: "Invalid or expired token"}
[INBOX] ❌ Profile fetch FAILED: Error: Request failed with status code 401
[INBOX] Error status: 401
[INBOX] Error message: {success: false, message: "Invalid or expired token"}
[INBOX] Redirecting to login: https://noxtm.com/login?redirect=mail
```

#### 3. Check Network Tab

1. Find the `/api/profile` request
2. Click on it to see details
3. Check **Headers** tab:
   - Look for `Authorization: Bearer eyJ...`
   - Should be present if token was saved correctly
4. Check **Response** tab:
   - **200 OK**: Authentication succeeded
   - **401 Unauthorized**: Token verification failed on backend

#### 4. Check Application Storage

1. Go to **Application** tab in DevTools
2. Navigate to **Local Storage** → `https://mail.noxtm.com`
3. Look for `token` key
   - Should exist and start with `eyJ`
   - Should be a long string (~180+ characters)

#### 5. Check for Domain Verification Wizard

After successful authentication:
- **If you have NO verified domains**: Should see Domain Setup Wizard
- **If you have verified domains**: Should see inbox directly
- **If you're Admin**: Should bypass wizard and see inbox

## What to Look For

### Scenario 1: Token Not Being Generated

**Symptoms:**
- Console shows: `[INBOX] No token in URL, checking localStorage...`
- Console shows: `[INBOX] ⚠️  No token in localStorage either`

**This means**: The Sidebar.js onClick is not passing token correctly
**Action**: Check main app (noxtm.com) JavaScript console for errors

### Scenario 2: Token Generated But Not Saved

**Symptoms:**
- Console shows: `[INBOX] ✅ Token found in URL, saving to localStorage`
- Console shows: `[INBOX] Token saved: NO` (should be YES!)

**This means**: localStorage.setItem failed (rare browser issue)
**Action**: Check browser localStorage permissions, try different browser

### Scenario 3: Token Saved But Not Used in API Call

**Symptoms:**
- Console shows: `[INBOX] Token saved: YES`
- Console shows: `[API] Token in localStorage: NO`

**This means**: Race condition or localStorage corruption
**Action**: This should NOT happen - report this immediately

### Scenario 4: Token Used But Backend Returns 401

**Symptoms:**
- Console shows: `[API] Authorization header SET`
- Console shows: `[API] ❌ 401 Error on: /profile`
- Network tab shows 401 response

**This means**: Backend JWT verification is failing
**Possible causes**:
- Wrong JWT secret on backend
- Token format mismatch
- Token expired (unlikely - just generated)

**Action**: Check backend logs with this command:
```bash
ssh root@185.137.122.61 'pm2 logs noxtm-backend --lines 50 | grep -E "profile|401|JWT"'
```

### Scenario 5: Everything Works But No Wizard

**Symptoms:**
- Console shows: `[INBOX] ✅ Profile fetch SUCCESS`
- Console shows: `[INBOX] ⚠️  No verified domain found - SHOWING DOMAIN WIZARD`
- BUT wizard doesn't appear on screen

**This means**: React rendering issue with DomainSetupWizard component
**Action**: Check if wizard component file exists and is imported correctly

## Backend Logs to Check

If you see 401 errors, check backend logs:

```bash
# SSH to server
ssh root@185.137.122.61

# Check recent backend logs for authentication errors
pm2 logs noxtm-backend --lines 100 | grep -E "profile|401|403|token|JWT|Invalid|expired"
```

**Look for**:
- "Invalid or expired token"
- "JWT verification failed"
- "Access token required"
- 401/403 error responses

## Common Issues and Solutions

### Issue 1: Old Cache Still Loaded

**Symptom**: No console logs appear at all
**Solution**:
- Hard refresh (Ctrl+Shift+R)
- OR clear browser cache completely
- OR use incognito mode

### Issue 2: Pop-up Blocker

**Symptom**: "Open Mail App" doesn't open new tab
**Solution**:
- Check for pop-up blocked icon in address bar
- Allow pop-ups from noxtm.com
- Chrome: Settings → Privacy and Security → Site Settings → Pop-ups

### Issue 3: JWT Secret Mismatch

**Symptom**: 401 on /profile despite Authorization header present
**Solution**: Verify JWT secrets match:
```bash
# Check if JWT_SECRET is set on backend
ssh root@185.137.122.61 'grep JWT_SECRET /root/noxtm/Backend/.env'
```

### Issue 4: Token Expired

**Symptom**: 401 with "expired token" message
**Solution**: Login is recent so this shouldn't happen. If it does, check:
- System clock on server (might be incorrect)
- Token expiration time in Backend/server.js

## Next Steps Based on Results

### If Console Shows: "Token saved: YES" + "Authorization header SET" + "401 Error"

**Problem**: Backend JWT verification is failing
**Action Required**:
1. Check backend JWT_SECRET environment variable
2. Check backend /api/profile endpoint middleware
3. Look for duplicate /api/profile routes in server.js
4. Verify authenticateToken middleware is correct

### If Console Shows: "Token saved: YES" + "Profile fetch SUCCESS" + "NO verified domain" + Wizard Doesn't Show

**Problem**: React rendering or wizard component issue
**Action Required**:
1. Check DomainSetupWizard component exists
2. Verify showDomainWizard state is being set to true
3. Check for JavaScript errors in console
4. Verify wizard is not being hidden by CSS

### If Console Shows: "Token saved: YES" + "Profile fetch SUCCESS" + "Found verified domain"

**Problem**: User actually HAS a verified domain (not a new user)
**Expected**: Inbox should load (this is correct behavior)
**Action**: If you want to see wizard, delete your verified domains first

## What to Report Back

Please provide the following information:

1. **Full console output** from the moment you click "Open Mail App"
   - Copy all `[INBOX]` and `[API]` log lines
   - Include any error messages

2. **Network tab screenshot** showing `/api/profile` request
   - Show the Headers (Authorization header present?)
   - Show the Response (200 or 401?)
   - Show the Response body

3. **Application → Local Storage screenshot**
   - Show the `token` key and value (first 20 characters)

4. **What you see on screen**:
   - Domain verification wizard?
   - Inbox?
   - Redirect back to noxtm.com?
   - Error message?

## Expected Resolution

Based on console logs, we will be able to identify the EXACT point of failure:

- If token not generated → Fix Sidebar.js
- If token not saved → Browser issue (try different browser)
- If 401 on /profile → Fix backend JWT verification
- If domain check fails → Fix /email-domains endpoint
- If wizard not shown → Fix DomainSetupWizard component

---

**Diagnostic Version Deployed**: December 14, 2025 at 15:15
**Bundle Hash**: main.03c2260c.js
**Status**: ✅ Ready for testing
**Logging Level**: VERBOSE (includes all auth flow steps)

**IMPORTANT**: These diagnostic logs will help us identify the EXACT failure point. After testing, please share the complete console output!
