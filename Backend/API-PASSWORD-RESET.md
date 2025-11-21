# Email Account Password Reset API

## Endpoint
```
PUT /api/email-accounts/:id/reset-password
```

## Purpose
Reset an email account password and configure/update IMAP and SMTP settings with encrypted passwords. This fixes accounts that cannot fetch emails due to missing `imapSettings.encryptedPassword`.

## Authentication
Requires authentication token in request headers.

## Parameters

### Path Parameters
- `id` (string, required): The MongoDB ObjectId of the email account

### Body Parameters
```json
{
  "newPassword": "string (required, min 8 characters)"
}
```

## Example Request

### Using cURL
```bash
curl -X PUT http://localhost:5000/api/email-accounts/507f1f77bcf86cd799439011/reset-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "newPassword": "MyNewSecurePassword123!"
  }'
```

### Using Fetch (JavaScript)
```javascript
const resetPassword = async (accountId, newPassword) => {
  const response = await fetch(
    `http://localhost:5000/api/email-accounts/${accountId}/reset-password`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ newPassword })
    }
  );
  
  const data = await response.json();
  return data;
};

// Usage
resetPassword('507f1f77bcf86cd799439011', 'MyNewSecurePassword123!')
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));
```

### Using Axios (JavaScript)
```javascript
import axios from 'axios';

const resetPassword = async (accountId, newPassword) => {
  try {
    const response = await axios.put(
      `/api/email-accounts/${accountId}/reset-password`,
      { newPassword },
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Password reset failed:', error.response?.data);
    throw error;
  }
};

// Usage
await resetPassword('507f1f77bcf86cd799439011', 'MyNewSecurePassword123!');
```

## Response

### Success (200 OK)
```json
{
  "success": true,
  "message": "Password updated successfully. IMAP/SMTP settings configured."
}
```

### Error Responses

#### 400 Bad Request - Invalid Password
```json
{
  "message": "Password must be at least 8 characters"
}
```

#### 401 Unauthorized
```json
{
  "message": "Authentication required"
}
```

#### 404 Not Found
```json
{
  "message": "Email account not found"
}
```

#### 500 Internal Server Error
```json
{
  "message": "Failed to reset password",
  "error": "Detailed error message"
}
```

## What This Endpoint Does

1. **Validates Input**
   - Checks authentication
   - Validates password length (min 8 characters)
   - Verifies account exists

2. **Updates Database**
   - Updates account password (bcrypt hashed)
   - Creates/updates IMAP settings with encrypted password
   - Creates/updates SMTP settings with encrypted password
   - Sets account metadata (accountType, verified status, etc.)

3. **Updates Mail Server**
   - If doveadm is available (production), updates password on Dovecot mail server
   - Continues even if mail server update fails

4. **Creates Audit Log**
   - Logs the password reset action
   - Records user who performed the action
   - Includes timestamp and IP address

## IMAP/SMTP Settings Created

After password reset, the account will have:

```javascript
{
  imapSettings: {
    host: 'mail.noxtm.com',
    port: 993,
    secure: true,
    username: 'user@example.com',
    encryptedPassword: 'aes-256-cbc-encrypted-string'
  },
  smtpSettings: {
    host: 'mail.noxtm.com',
    port: 587,
    secure: false, // Uses STARTTLS
    username: 'user@example.com',
    encryptedPassword: 'aes-256-cbc-encrypted-string'
  }
}
```

## Use Cases

1. **Fix Accounts with Missing IMAP Settings**
   - Existing accounts created before the fix
   - Accounts showing "Failed to decrypt data" error

2. **Regular Password Changes**
   - User-requested password changes
   - Security policy enforcement
   - Suspected compromise

3. **Account Recovery**
   - Forgot password scenarios
   - Account locked due to failed attempts

## Frontend Integration Example

```javascript
// Component for password reset form
const PasswordResetForm = ({ accountId, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/email-accounts/${accountId}/reset-password`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ newPassword })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
      }

      onSuccess(data);
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password (min 8 characters)"
        minLength="8"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
};
```

## Security Notes

1. **Password Storage**
   - Account password is bcrypt-hashed in the database
   - IMAP/SMTP passwords are AES-256-CBC encrypted
   - Encryption key stored in `EMAIL_ENCRYPTION_KEY` environment variable

2. **Authentication Required**
   - Only authenticated users can reset passwords
   - Consider adding additional authorization checks (e.g., only account owner or admin)

3. **Audit Trail**
   - All password resets are logged in EmailAuditLog
   - Includes user info, timestamp, and IP address

4. **Password Requirements**
   - Minimum 8 characters (enforced)
   - Consider adding: uppercase, lowercase, numbers, special characters

## Testing Checklist

- [ ] Reset password for an account
- [ ] Verify IMAP settings are populated
- [ ] Test fetching emails from the account
- [ ] Verify emails display in Mainstream Mail
- [ ] Check audit log entry was created
- [ ] Test with invalid password (< 8 chars)
- [ ] Test with non-existent account ID
- [ ] Test without authentication token
