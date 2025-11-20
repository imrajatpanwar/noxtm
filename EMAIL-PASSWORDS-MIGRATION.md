# Email Account Passwords - Generated during Migration

## Date: November 20, 2025

All @noxtm.com hosted email accounts had their passwords reset during database migration to add IMAP/SMTP encryption support.

### Account Passwords:

1. **noreply@noxtm.com**
   - Password: `BZh7OfDtBiMfYfqE`
   - IMAP: mail.noxtm.com:993 (SSL)
   - SMTP: mail.noxtm.com:587 (STARTTLS)

2. **info@noxtm.com**
   - Password: `J6*^$jYC5#hWgmLy`
   - IMAP: mail.noxtm.com:993 (SSL)
   - SMTP: mail.noxtm.com:587 (STARTTLS)

3. **support@noxtm.com**
   - Password: `xOlovswswP&VTiF7`
   - IMAP: mail.noxtm.com:993 (SSL)
   - SMTP: mail.noxtm.com:587 (STARTTLS)

4. **sales@noxtm.com**
   - Password: `FjcaaZE@pxVtIDOb`
   - IMAP: mail.noxtm.com:993 (SSL)
   - SMTP: mail.noxtm.com:587 (STARTTLS)

5. **contact@noxtm.com**
   - Password: `zYtNscU4DHkwypTJ`
   - IMAP: mail.noxtm.com:993 (SSL)
   - SMTP: mail.noxtm.com:587 (STARTTLS)

6. **admin@noxtm.com**
   - Password: `gtLSnubO^r%xmcGp`
   - IMAP: mail.noxtm.com:993 (SSL)
   - SMTP: mail.noxtm.com:587 (STARTTLS)

7. **rajat@noxtm.com**
   - Password: `dBQBDPi0Z7Or9JA2`
   - IMAP: mail.noxtm.com:993 (SSL)
   - SMTP: mail.noxtm.com:587 (STARTTLS)

### Important Notes:

1. **Security**: These passwords were auto-generated with 16 characters including uppercase, lowercase, numbers, and special characters.

2. **Distribution**: Send these passwords to the respective account owners through a secure channel (not email).

3. **First Login**: Users should change their passwords upon first login through the webmail interface.

4. **Encryption**: All passwords are now properly encrypted in the database using AES-256-CBC encryption.

5. **Mail System**: All passwords have been updated in both:
   - MongoDB Atlas database (for web application)
   - Dovecot mail server (for IMAP/SMTP authentication)

### Technical Changes:

- Added `imapSettings.encryptedPassword` for all accounts
- Added `smtpSettings.encryptedPassword` for all accounts
- Using default encryption key (EMAIL_ENCRYPTION_KEY commented out in .env)
- Backend configured to connect to 127.0.0.1:993 for IMAP (localhost)
- Redis caching enabled for email fetching performance

### What Was Fixed:

**Problem**: Email accounts were created without encrypted IMAP/SMTP passwords, causing "IMAP settings not configured" errors when trying to fetch emails.

**Solution**: Ran migration script that:
1. Generated new secure passwords for all hosted accounts
2. Updated account passwords in database (bcrypt hashed)
3. Added encrypted IMAP credentials using AES-256-CBC
4. Added encrypted SMTP credentials using AES-256-CBC
5. Updated mailbox passwords in Dovecot using doveadm

**Result**: All 7 @noxtm.com hosted accounts can now:
- Fetch emails via IMAP in the webmail interface
- Send emails via SMTP
- Use email clients (Thunderbird, Outlook, etc.) with the new passwords
