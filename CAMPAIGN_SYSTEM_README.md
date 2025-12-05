# Enhanced Campaign Email System - Complete Documentation

## 🎯 Overview

The Enhanced Campaign Email System is a complete email marketing solution integrated into Noxtm. It allows Manager and Owner users to create sophisticated email campaigns with multi-source contact imports, including CSV files, Lead Directory, and Trade Show Exhibitors (ExhibitsOS integration).

## 📋 Table of Contents

1. [Features](#features)
2. [System Architecture](#system-architecture)
3. [Installation & Setup](#installation--setup)
4. [User Guide](#user-guide)
5. [API Documentation](#api-documentation)
6. [Testing Guide](#testing-guide)
7. [Troubleshooting](#troubleshooting)

---

## ✨ Features

### Campaign Management
- ✅ Multi-step campaign creation wizard
- ✅ Draft, schedule, and send campaigns
- ✅ Email template support
- ✅ Rich text email editor
- ✅ Variable personalization ({{name}}, {{email}}, {{companyName}})
- ✅ Reply-to email configuration
- ✅ Campaign status tracking (draft, scheduled, sending, sent, failed)
- ✅ Individual recipient tracking
- ✅ Batch processing (10 emails/batch)
- ✅ Test email functionality

### Contact List Management
- ✅ Create and manage reusable contact lists
- ✅ Import from CSV/Excel files
- ✅ Import from Lead Directory
- ✅ Import from Trade Show Exhibitors
- ✅ View and edit contacts
- ✅ Export lists to CSV
- ✅ Delete contacts and lists
- ✅ Usage tracking (which campaigns used each list)

### Analytics & Reporting
- ✅ Campaign statistics dashboard
- ✅ Success rate tracking
- ✅ Recipient status (sent, failed, pending, bounced)
- ✅ Email delivery tracking
- ✅ Campaign details view with metrics

### Access Control
- ✅ Role-based access (Manager and Owner only)
- ✅ Company-based data isolation
- ✅ Employee role blocked from campaigns

---

## 🏗️ System Architecture

### Backend Components

```
Backend/
├── models/
│   ├── Campaign.js           # Campaign data model
│   └── ContactList.js        # Contact list data model
├── routes/
│   ├── campaigns.js          # Campaign API endpoints (9 endpoints)
│   └── contact-lists.js      # Contact list API endpoints (12 endpoints)
├── middleware/
│   └── campaignAuth.js       # Role-based authentication
├── services/
│   └── campaignEmailService.js  # Email sending service
└── utils/
    └── csvParser.js          # CSV parsing utility
```

### Frontend Components

```
Frontend/src/components/
├── CampaignDashboard.js      # Main campaign dashboard
├── CampaignDashboard.css
├── CampaignWizard.js         # Multi-step campaign creator
├── CampaignWizard.css
├── CampaignDetails.js        # Campaign analytics view
├── CampaignDetails.css
├── ContactListManager.js     # Contact list management
├── ContactListManager.css
└── ImportModals/
    ├── CSVImport.js          # CSV file upload
    ├── LeadImport.js         # Lead Directory import
    ├── TradeShowImport.js    # Trade Show import
    └── ImportModals.css      # Shared modal styles
```

### Data Flow

```
User (Manager/Owner)
    ↓
Campaign Dashboard → Create Campaign
    ↓
Campaign Wizard (4 steps)
    ↓
Import Contacts → ContactList
    ↓
Campaign Email Service → AWS SES
    ↓
Email Logs + Recipient Tracking
```

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js v14+
- MongoDB
- AWS SES configured
- Noxtm backend and frontend running

### Backend Dependencies

Already installed:
```bash
cd Backend
npm install papaparse multer
```

### Frontend Dependencies

Already installed:
```bash
cd Frontend
npm install react-quill
```

### Environment Variables

Ensure your `.env` file has:
```env
# AWS SES Configuration
AWS_SDK_REGION=eu-north-1
AWS_SDK_ACCESS_KEY_ID=your_access_key
AWS_SDK_SECRET_ACCESS_KEY=your_secret_key

# Email Configuration
EMAIL_FROM=rajat@mail.noxtm.com
```

### Database

No additional setup required. Models auto-create collections on first use.

---

## 📖 User Guide

### Accessing the Campaign System

1. **Login** as a Manager or Owner user
2. **Navigate** to `/campaigns` or click "Campaigns" in the dashboard
3. **Create** your first campaign

### Creating a Campaign

#### Step 1: Campaign Details
1. Enter **Campaign Name** (required)
2. Add **Description** (optional)
3. Set **Reply-To Email** (required) - where responses will go
4. Configure **From Email** and **From Name**

#### Step 2: Email Content
1. **Option A:** Select an existing email template
2. **Option B:** Create custom email
3. Enter **Subject Line** (supports variables)
4. Write **Email Body** using rich text editor
5. Use variables for personalization:
   - `{{name}}` - Contact name
   - `{{email}}` - Contact email
   - `{{companyName}}` - Company name

#### Step 3: Recipients
1. **Select Contact Lists:**
   - Check existing lists to include
   - See total contact count

2. **Import New Contacts:**
   - **CSV Upload:** Upload .csv or .xlsx file
   - **From Leads:** Select from Lead Directory
   - **From Trade Shows:** Choose trade show → select exhibitors

#### Step 4: Review & Send
1. Review all campaign details
2. Preview email content
3. Check recipient count
4. Choose action:
   - **Save as Draft** - Save for later
   - **Send Test** - Send to test email first
   - **Send Now** - Start sending immediately
   - **Schedule** - Set future send time

### Managing Contact Lists

#### View Lists
1. Navigate to `/contact-lists`
2. Browse lists in sidebar
3. Click a list to see contacts

#### Import Contacts

**CSV Import:**
1. Click "📁 CSV" button
2. Enter list name
3. Upload CSV file
4. Format: email, name, company, phone, designation, location

**Lead Import:**
1. Click "👥 Leads" button
2. Filter by lead status
3. Select leads
4. Enter list name
5. Import

**Trade Show Import:**
1. Click "🎪 Shows" button
2. Select a trade show
3. View exhibitors with contact counts
4. Select exhibitors
5. Enter list name
6. Import all contacts from selected exhibitors

#### Export Lists
1. Open a contact list
2. Click "📥 Export CSV"
3. Download CSV file

#### Delete Contacts
1. Open a contact list
2. Click ✕ next to any contact
3. Confirm deletion

### Viewing Campaign Performance

1. Go to campaign dashboard
2. Click "View Details" on any campaign
3. See:
   - Total recipients
   - Success rate (%)
   - Sent/Failed/Pending counts
   - Individual recipient status
   - Email content preview
   - Contact lists used

### Sending Test Emails

1. Open campaign details (draft status)
2. Click "📧 Send Test"
3. Enter test email address
4. Receive test email with [TEST] prefix
5. Verify content
6. Return to send full campaign

---

## 🔌 API Documentation

### Campaign Endpoints

#### List Campaigns
```http
GET /api/campaigns
Authorization: Bearer {token}
Query: ?status=draft&page=1&limit=20
```

#### Get Campaign
```http
GET /api/campaigns/:id
Authorization: Bearer {token}
```

#### Create Campaign
```http
POST /api/campaigns
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Q4 Product Launch",
  "description": "Launch campaign for new product",
  "subject": "Introducing Our New Product",
  "body": "<p>Hello {{name}},</p><p>...</p>",
  "replyTo": "sales@company.com",
  "fromEmail": "rajat@mail.noxtm.com",
  "fromName": "Noxtm"
}
```

#### Add Recipients
```http
POST /api/campaigns/:id/recipients
Authorization: Bearer {token}
Content-Type: application/json

{
  "contactListIds": ["list_id_1", "list_id_2"]
}
```

#### Send Campaign
```http
POST /api/campaigns/:id/send
Authorization: Bearer {token}
```

#### Send Test Email
```http
POST /api/campaigns/:id/test
Authorization: Bearer {token}
Content-Type: application/json

{
  "testEmail": "test@example.com"
}
```

#### Schedule Campaign
```http
POST /api/campaigns/:id/schedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "scheduledAt": "2024-12-31T10:00:00Z"
}
```

### Contact List Endpoints

#### List Contact Lists
```http
GET /api/contact-lists
Authorization: Bearer {token}
Query: ?sourceType=csv
```

#### Get Contact List
```http
GET /api/contact-lists/:id
Authorization: Bearer {token}
```

#### Create Contact List
```http
POST /api/contact-lists
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Q4 Prospects",
  "description": "Prospects for Q4 campaign",
  "source": {
    "type": "custom"
  }
}
```

#### Import from CSV
```http
POST /api/contact-lists/import/csv
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [CSV file]
listName: "My CSV Import"
description: "Imported from prospects.csv"
```

#### Import from Leads
```http
POST /api/contact-lists/import/leads
Authorization: Bearer {token}
Content-Type: application/json

{
  "listName": "Active Leads",
  "description": "All active leads",
  "leadIds": ["lead_id_1", "lead_id_2"]
}
```

#### Import from Trade Show
```http
POST /api/contact-lists/import/trade-shows/:tradeShowId
Authorization: Bearer {token}
Content-Type: application/json

{
  "listName": "CES 2024 Contacts",
  "description": "Contacts from CES 2024",
  "exhibitorIds": ["exhibitor_id_1", "exhibitor_id_2"]
}
```

---

## 🧪 Testing Guide

### Manual Testing Checklist

#### Campaign Creation
- [ ] Create draft campaign
- [ ] Use email template
- [ ] Create custom email
- [ ] Add variables to subject/body
- [ ] Set reply-to email

#### Contact Import
- [ ] Import from CSV file
- [ ] Import from Lead Directory
- [ ] Import from Trade Show
- [ ] Verify contact count
- [ ] Check contact details

#### Campaign Sending
- [ ] Send test email
- [ ] Verify test email received
- [ ] Send campaign to small list
- [ ] Check recipient status
- [ ] Verify emails delivered

#### Contact List Management
- [ ] View all lists
- [ ] Search lists
- [ ] Filter by source
- [ ] View contact details
- [ ] Export to CSV
- [ ] Delete contact
- [ ] Delete list

#### Analytics
- [ ] View campaign statistics
- [ ] Check success rate
- [ ] Review recipient table
- [ ] Verify status badges

#### Access Control
- [ ] Login as Manager - should have access
- [ ] Login as Owner - should have access
- [ ] Login as Employee - should be blocked
- [ ] Verify data isolation (only see own company campaigns)

### API Testing with cURL

```bash
# Get token first
TOKEN="your_jwt_token"

# List campaigns
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/campaigns

# Create campaign
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "subject": "Test Subject",
    "body": "<p>Test body</p>",
    "replyTo": "test@example.com"
  }' \
  http://localhost:5000/api/campaigns

# Send test email
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testEmail": "your@email.com"}' \
  http://localhost:5000/api/campaigns/{campaign_id}/test
```

---

## 🐛 Troubleshooting

### Common Issues

#### "Access denied: Only Managers and Owners can access campaigns"
**Solution:** Log in with a Manager or Owner account. Employee role users cannot access campaigns.

#### Test email not received
**Solutions:**
- Check AWS SES configuration
- Verify email address is verified in AWS SES
- Check spam folder
- Review backend logs for errors

#### CSV import fails
**Solutions:**
- Ensure CSV has 'email' column (required)
- Check file size (<5MB)
- Verify file format (CSV or Excel)
- Check for special characters in email addresses

#### Campaign stuck in "sending" status
**Solutions:**
- Check backend logs for errors
- Verify AWS SES rate limits not exceeded
- Check EmailLog collection for failures
- Restart backend if needed

#### Contacts not showing after import
**Solutions:**
- Check browser console for errors
- Verify contact list was created successfully
- Refresh the page
- Check contact count in list details

### Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 403 | Access denied | Login as Manager or Owner |
| 404 | Campaign not found | Verify campaign ID exists |
| 400 | Missing required fields | Check request body |
| 500 | Server error | Check backend logs |

### Debug Mode

Enable debug logging:
```javascript
// In backend
console.log('Campaign data:', campaign);
console.log('Recipients:', recipients);

// In frontend
console.log('API response:', result);
```

---

## 📊 Performance Considerations

### Email Sending
- **Batch Size:** 10 emails per batch
- **Delay:** 1 second between batches
- **Rate Limit:** Respects AWS SES limits (14 emails/second)

### Database Queries
- Indexed fields: companyId, status, createdAt
- Pagination: Default 20 items per page
- Caching: None (can be added if needed)

### File Upload
- **Max CSV Size:** 5MB
- **Max Recipients:** No hard limit (MongoDB document size: 16MB)
- **Recommended:** <10,000 recipients per campaign

---

## 🔐 Security

### Authentication
- JWT token required for all endpoints
- Token verified via `authenticateToken` middleware

### Authorization
- Role check via `requireManagerOrOwner` middleware
- Company-based data isolation
- All queries filter by `companyId`

### Data Validation
- Email format validation
- File type validation (CSV only)
- Input sanitization
- SQL injection protection (MongoDB)

### File Upload Security
- File size limits
- MIME type validation
- Virus scanning (recommended to add)

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Unsubscribe management
- [ ] Email open tracking
- [ ] Click-through tracking
- [ ] A/B testing
- [ ] Advanced segmentation
- [ ] Campaign templates library
- [ ] Scheduled campaign processor (cron job)
- [ ] Webhook notifications
- [ ] Email bounce handling
- [ ] Spam score checking

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review backend logs
3. Check browser console
4. Test with cURL
5. Contact development team

---

## 📝 Changelog

### Version 1.0.0 (Current)
- ✅ Campaign creation wizard
- ✅ Contact list management
- ✅ Multi-source import (CSV, Leads, Trade Shows)
- ✅ Email sending with AWS SES
- ✅ Campaign analytics
- ✅ Test email functionality
- ✅ Role-based access control
- ✅ Export to CSV

---

**Built with ❤️ for Noxtm**
