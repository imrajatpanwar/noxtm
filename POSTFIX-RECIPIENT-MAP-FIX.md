# Postfix Recipient Map Fix

## Problem
When sending emails to @noxtm.com addresses, the following error occurred:
```
550 5.1.1 : Recipient address rejected: User unknown in local recipient table
```

## Root Cause
- **Dovecot users** are stored in `/etc/dovecot/users` (custom passwd-like file)
- **Postfix** was configured with `local_recipient_maps = proxy:unix:passwd.byname $alias_maps`
- This meant Postfix was only checking the system's `/etc/passwd` file for valid recipients
- Since Dovecot users are NOT in `/etc/passwd`, Postfix rejected them as unknown

## Solution
Configure Postfix to check a custom recipient map that syncs with Dovecot users:

### 1. Manual Fix (Already Applied on Server)

```bash
# Create recipient map from Dovecot users
cut -d: -f1 /etc/dovecot/users | while read email; do echo "$email OK"; done > /etc/postfix/dovecot_recipients

# Generate hash database
postmap /etc/postfix/dovecot_recipients

# Update Postfix configuration
postconf -e 'local_recipient_maps = proxy:unix:passwd.byname $alias_maps hash:/etc/postfix/dovecot_recipients'

# Reload Postfix
postfix reload
```

### 2. Automatic Sync (Code Changes)

Added `updatePostfixRecipientMap()` function to `doveadmHelper.js` that:
1. Extracts all email addresses from `/etc/dovecot/users`
2. Creates `/etc/postfix/dovecot_recipients` map file (format: `email@domain.com OK`)
3. Generates Postfix hash database with `postmap`
4. Reloads Postfix configuration

This function is automatically called when:
- **Creating a mailbox** - After `createMailbox()` completes
- **Deleting a mailbox** - After `deleteMailbox()` completes

### 3. Verification

Test if an email is recognized:
```bash
postmap -q rajat@noxtm.com hash:/etc/postfix/dovecot_recipients
# Should output: OK
```

Check Postfix configuration:
```bash
postconf local_recipient_maps
# Should output: local_recipient_maps = proxy:unix:passwd.byname $alias_maps hash:/etc/postfix/dovecot_recipients
```

View the recipient map:
```bash
cat /etc/postfix/dovecot_recipients
# Should list all @noxtm.com addresses with "OK"
```

## Files Modified

### Backend/utils/doveadmHelper.js
- Added `updatePostfixRecipientMap()` function
- Updated `createMailbox()` to sync Postfix map after creating user
- Updated `deleteMailbox()` to sync Postfix map after removing user
- Exported `updatePostfixRecipientMap` for manual use if needed

## Current Status
✅ **All 7 email accounts** are now recognized by Postfix:
- noreply@noxtm.com
- info@noxtm.com
- support@noxtm.com
- sales@noxtm.com
- contact@noxtm.com
- admin@noxtm.com
- rajat@noxtm.com

## Testing
Try sending an email to any @noxtm.com address. The error should no longer occur.

## Manual Sync (If Needed)
If the automatic sync fails or you need to manually update the map:

```bash
# SSH to server
ssh root@185.137.122.61

# Run the sync commands
cut -d: -f1 /etc/dovecot/users | while read email; do echo "$email OK"; done > /etc/postfix/dovecot_recipients
postmap /etc/postfix/dovecot_recipients
postfix reload
```

Or call from Node.js:
```javascript
const { updatePostfixRecipientMap } = require('./utils/doveadmHelper');
await updatePostfixRecipientMap();
```

## Important Notes
1. This fix only applies to **hosted accounts** on the server
2. External IMAP accounts are not affected (they don't use Postfix/Dovecot)
3. The map is automatically synced when creating/deleting accounts via the API
4. If you manually edit `/etc/dovecot/users`, run the sync manually
5. The Postfix map files are:
   - `/etc/postfix/dovecot_recipients` (text file)
   - `/etc/postfix/dovecot_recipients.db` (hash database)

## Future Improvements
- Add a cron job to periodically sync the map (as a backup)
- Add API endpoint to manually trigger sync
- Add monitoring to alert if sync fails
