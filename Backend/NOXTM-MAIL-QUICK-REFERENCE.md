# Noxtm Mail - Quick Reference Card

## 🚀 Setup Commands

```bash
# 1. Install dependencies (if needed)
cd Backend
npm install mongoose bcryptjs

# 2. Seed database
node scripts/seed-email-system.js

# 3. Restart server
node server.js
```

---

## 📡 API Quick Reference

### Email Accounts
```bash
# List accounts
GET /api/email-accounts

# Create account
POST /api/email-accounts
{
  "email": "user@noxtm.com",
  "password": "SecurePass123!",
  "displayName": "John Doe",
  "domain": "noxtm.com",
  "quota": 1024
}

# Get credentials
GET /api/email-accounts/:id/credentials

# Reset password
POST /api/email-accounts/:id/reset-password
{ "newPassword": "NewPass123!" }
```

### Email Domains
```bash
# List domains
GET /api/email-domains

# Add domain
POST /api/email-domains
{
  "domain": "example.com",
  "defaultQuota": 1024,
  "maxAccounts": 50
}

# Get DNS instructions
GET /api/email-domains/:id/dns-instructions

# Verify DNS
POST /api/email-domains/:id/verify-dns
```

### Email Templates
```bash
# List templates
GET /api/email-templates

# Get template by slug
GET /api/email-templates/slug/welcome-email

# Send email using template
POST /api/email-templates/:id/send
{
  "to": "user@example.com",
  "variables": {
    "user_name": "John Doe",
    "company_name": "Noxtm"
  }
}
```

### Email Logs
```bash
# List logs
GET /api/email-logs?page=1&limit=50

# Get statistics
GET /api/email-logs/stats/summary?period=7d

# Spam quarantine
GET /api/email-logs/spam/quarantine
```

---

## 🎯 Common Tasks

### Create Email Account

```bash
curl -X POST http://localhost:5000/api/email-accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@noxtm.com",
    "password": "SecurePassword123!",
    "displayName": "John Doe",
    "domain": "noxtm.com"
  }'
```

### Get SMTP Credentials

```bash
curl http://localhost:5000/api/email-accounts/ACCOUNT_ID/credentials \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Send Email from Template

```bash
curl -X POST http://localhost:5000/api/email-templates/TEMPLATE_ID/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "variables": {
      "user_name": "John",
      "company_name": "Noxtm"
    }
  }'
```

---

## 🔑 Default Credentials

After running seed script:

- **Domain**: `noxtm.com`
- **Admin User**: Check existing admin or uses created one
- **Templates**: 4 default templates created

---

## 📋 Frontend Navigation

Sidebar location: **Marketing → Noxtm Mail**

Menu items:
- Mail Server Status
- Email Logs
- Send Email
- DNS Configuration

---

## 🧪 Testing Checklist

- [ ] Run seed script
- [ ] Create email account
- [ ] Get SMTP credentials
- [ ] Send test email
- [ ] View email logs
- [ ] Check audit trail
- [ ] Verify DNS records

---

## 📚 Documentation

- `NOXTM-MAIL-README.md` - Overview
- `NOXTM-MAIL-SETUP.md` - Detailed setup
- `NOXTM-MAIL-IMPLEMENTATION.md` - Full docs
- `MAILGUN-QUICK-SETUP.md` - Alternative
- `QUICK-FIX-EMAIL.md` - Troubleshooting

---

## 🐛 Quick Fixes

### Can't create account?
```bash
# Run seed to create default domain
node scripts/seed-email-system.js
```

### Authentication error?
```javascript
// Add JWT token to headers
headers: {
  'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

### Email not sending?
```env
# Check .env configuration
EMAIL_HOST=185.137.122.61
EMAIL_PORT=25
EMAIL_FROM=noreply@noxtm.com
```

---

**Need more help?** Check the full documentation in Backend folder!
