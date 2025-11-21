# Email Account IMAP/SMTP Settings Fix

## Problem
Email accounts were not showing in the Mainstream Mail section due to a decryption error:
```
Error: Failed to decrypt data
  at decrypt (C:\exe\noxtm\Backend\utils\encryption.js:70:27)
  library: 'Provider routines',
  reason: 'bad decrypt',
  code: 'ERR_OSSL_BAD_DECRYPT'
```

## Root Cause
When email accounts were created via the standard `POST /api/email-accounts/` endpoint, the `imapSettings` and `smtpSettings` fields were not populated with encrypted passwords. The `/fetch-inbox` endpoint requires these fields to:
1. Connect to the IMAP server
2. Decrypt the stored password
3. Fetch emails from the mailbox

Without `imapSettings.encryptedPassword`, the decrypt function received `null` or `undefined`, causing the error.

## Changes Made

### 1. Fixed Account Creation (email-accounts.js)
Updated the `POST /api/email-accounts/` endpoint to populate IMAP/SMTP settings when creating hosted accounts:

```javascript
// Create email account
const account = new EmailAccount({
  email: email.toLowerCase(),
  password,
  // ... other fields ...
  accountType: 'noxtm-hosted',
  isVerified: true,
  imapEnabled: true,
  smtpEnabled: true,
  // NEW: Populate IMAP/SMTP settings for inbox fetching
  imapSettings: {
    host: 'mail.noxtm.com',
    port: 993,
    secure: true,
    username: email.toLowerCase(),
    encryptedPassword: encrypt(password)
  },
  smtpSettings: {
    host: 'mail.noxtm.com',
    port: 587,
    secure: false, // STARTTLS
    username: email.toLowerCase(),
    encryptedPassword: encrypt(password)
  }
});
```

### 2. Added Password Reset Endpoint
Created a new endpoint `PUT /api/email-accounts/:id/reset-password` that:
- Updates the account password
- Populates/updates IMAP and SMTP settings with encrypted password
- Updates the password on the mail server (if doveadm is available)
- Creates an audit log entry

### 3. Improved Error Handling (encryption.js)
Enhanced the `decrypt()` function with better error messages:
- Warns when attempting to decrypt empty values
- Provides specific error messages for different failure types
- Distinguishes between wrong encryption key vs corrupted data

### 4. Added Compatibility Alias (doveadmHelper.js)
Exported `isDoveadmAvailable` as an alias for `checkDoveadmAvailable` for backward compatibility.

## Files Modified
1. `Backend/routes/email-accounts.js`
   - Updated account creation to populate IMAP/SMTP settings
   - Added password reset endpoint

2. `Backend/utils/encryption.js`
   - Improved error handling and logging

3. `Backend/utils/doveadmHelper.js`
   - Added `isDoveadmAvailable` export alias

## Files Created
1. `Backend/scripts/fix-email-account-settings.js`
   - Migration script to identify accounts that need fixing

2. `Backend/scripts/check-email-accounts-imap.ps1`
   - PowerShell script to check account IMAP configuration status

## How to Fix Existing Accounts

### Option 1: Reset Password via API
For each affected account, call the password reset endpoint:

```bash
PUT /api/email-accounts/:accountId/reset-password
Content-Type: application/json

{
  "newPassword": "NewSecurePassword123!"
}
```

This will:
- Update the account password (bcrypt hashed in DB)
- Create encrypted password for IMAP/SMTP
- Update password on the mail server

### Option 2: Check and Identify Accounts
Run the diagnostic script:

```powershell
cd C:\exe\noxtm\Backend\scripts
.\check-email-accounts-imap.ps1
```

This will show which accounts need attention.

### Option 3: Run Migration Script
```bash
cd C:\exe\noxtm\Backend
node scripts/fix-email-account-settings.js
```

Note: This script only updates account structure. Passwords still need to be reset manually via the API.

## Testing
1. Create a new email account - verify it has IMAP settings populated
2. Try fetching inbox for the new account
3. For existing accounts, reset password and test inbox fetching
4. Verify emails display in Mainstream Mail section

## Future Accounts
All new accounts created through either:
- `POST /api/email-accounts/` (regular hosted accounts)
- `POST /api/email-accounts/create-noxtm` (@noxtm.com accounts)

Will automatically have IMAP/SMTP settings configured correctly.

## Important Notes
- The `password` field in EmailAccount is bcrypt-hashed (for authentication)
- The `imapSettings.encryptedPassword` and `smtpSettings.encryptedPassword` are AES-256 encrypted (for mail server connection)
- These are two different encryption methods for different purposes
- The encryption key is stored in `EMAIL_ENCRYPTION_KEY` environment variable
- If `EMAIL_ENCRYPTION_KEY` changes, all encrypted passwords become invalid
