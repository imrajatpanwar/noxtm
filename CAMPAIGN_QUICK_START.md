# Campaign System Quick Start Guide

## For Developers: 5-Minute Setup

### 1. Install Dependencies

**Backend:**
```bash
cd Backend
npm install
# papaparse and multer should already be installed
```

**Frontend:**
```bash
cd Frontend
npm install
# react-quill should already be installed
```

### 2. Verify Environment

Ensure `.env` has AWS SES configuration:
```env
AWS_SDK_REGION=eu-north-1
AWS_SDK_ACCESS_KEY_ID=your_access_key
AWS_SDK_SECRET_ACCESS_KEY=your_secret_key
EMAIL_FROM=rajat@mail.noxtm.com
```

### 3. Start Servers

**Backend:**
```bash
cd Backend
npm start
# Or with PM2: pm2 restart noxtm-backend
```

**Frontend:**
```bash
cd Frontend
npm start
# Or build: npm run build
```

### 4. Test Installation

**Quick Model Test:**
```bash
cd Backend
node -e "
const Campaign = require('./models/Campaign');
const ContactList = require('./models/ContactList');
console.log('✅ Campaign model loaded');
console.log('✅ ContactList model loaded');
console.log('✅ Backend ready!');
"
```

**Access Frontend:**
1. Open browser: `http://localhost:3000`
2. Login as Manager or Owner user
3. Navigate to `/campaigns`
4. You should see the Campaign Dashboard

---

## For Users: First Campaign in 3 Steps

### Step 1: Create a Contact List

1. **Navigate:** Go to `/contact-lists` or click "Contact Lists" in menu
2. **Import Contacts:** Click one of the import buttons:
   - **📁 CSV:** Upload the included `test_contacts.csv` file
   - **👥 Leads:** Select leads from your Lead Directory
   - **🎪 Shows:** Choose a trade show and select exhibitors
3. **Name Your List:** Enter a descriptive name (e.g., "Q4 Prospects")
4. **Verify:** List appears in sidebar with contact count

### Step 2: Create a Campaign

1. **Navigate:** Go to `/campaigns` or click "Campaigns" in menu
2. **Click:** "Create New Campaign" button
3. **Fill Details (Step 1):**
   - Campaign Name: "Welcome Email"
   - Reply-To Email: your.email@company.com
   - From Name: Your Company Name
4. **Create Email (Step 2):**
   - Subject: "Welcome to {{companyName}}"
   - Body: Use rich text editor to compose email
   - Insert variables: Click {{name}} or {{email}} buttons
5. **Add Recipients (Step 3):**
   - Select your contact list from Step 1
   - Or import new contacts directly
6. **Review & Send (Step 4):**
   - Review campaign summary
   - Click "Send Test" to test first
   - Click "Send Now" to send campaign

### Step 3: Monitor Results

1. **View Details:** Click "View Details" on your campaign
2. **Check Stats:**
   - Total Recipients
   - Successfully Sent
   - Failed (if any)
   - Success Rate %
3. **Review Recipients:** Scroll down to see individual recipient status
4. **Check Email Logs:** Backend creates EmailLog entries for each sent email

---

## Quick API Test

### Test Campaign Creation
```bash
# Get your JWT token first (login via frontend or API)
TOKEN="your_jwt_token_here"

# Create a campaign
curl -X POST http://localhost:5000/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "subject": "Hello {{name}}",
    "body": "<p>Welcome to our newsletter!</p>",
    "replyTo": "test@example.com",
    "fromEmail": "rajat@mail.noxtm.com",
    "fromName": "Noxtm"
  }'
```

### Test CSV Import
```bash
# Import the test CSV file
curl -X POST http://localhost:5000/api/contact-lists/import/csv \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_contacts.csv" \
  -F "listName=Test Import" \
  -F "description=Imported from test CSV"
```

---

## Troubleshooting

### "Access denied: Only Managers and Owners can access campaigns"
**Solution:** You're logged in as an Employee. Login with a Manager or Owner account.

### Test email not received
**Solutions:**
1. Check AWS SES dashboard - is sender email verified?
2. Check spam folder
3. If in SES Sandbox mode, verify recipient email too
4. Check backend logs for errors

### CSV import fails
**Solutions:**
1. Ensure CSV has 'email' column (required)
2. File size must be <5MB
3. Check file encoding (UTF-8 recommended)
4. Verify file type is .csv or .xlsx

### Campaign stuck in "sending" status
**Solutions:**
1. Check backend logs for errors
2. Verify AWS SES credentials in .env
3. Check EmailLog collection in MongoDB for failures
4. Restart backend server if needed

---

## File Structure Reference

```
Backend/
├── models/
│   ├── Campaign.js ✨ NEW
│   └── ContactList.js ✨ NEW
├── routes/
│   ├── campaigns.js ✨ NEW
│   └── contact-lists.js ✨ NEW
├── middleware/
│   └── campaignAuth.js ✨ NEW
├── services/
│   └── campaignEmailService.js ✨ NEW
└── utils/
    └── csvParser.js ✨ NEW

Frontend/src/components/
├── CampaignDashboard.js ✨ NEW
├── CampaignDashboard.css ✨ NEW
├── CampaignWizard.js ✨ NEW
├── CampaignWizard.css ✨ NEW
├── CampaignDetails.js ✨ NEW
├── CampaignDetails.css ✨ NEW
├── ContactListManager.js ✨ NEW
├── ContactListManager.css ✨ NEW
└── ImportModals/
    ├── CSVImport.js ✨ NEW
    ├── LeadImport.js ✨ NEW
    ├── TradeShowImport.js ✨ NEW
    └── ImportModals.css ✨ NEW
```

---

## Routes Reference

**Frontend Routes:**
- `/campaigns` - Campaign Dashboard (list all campaigns)
- `/campaign/wizard` - Create new campaign (4-step wizard)
- `/campaign/:id` - Campaign details & analytics
- `/contact-lists` - Contact list manager

**Backend API Endpoints:**

**Campaigns:**
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns/:id/recipients` - Add recipients
- `POST /api/campaigns/:id/send` - Send campaign
- `POST /api/campaigns/:id/test` - Send test email
- `DELETE /api/campaigns/:id` - Delete campaign

**Contact Lists:**
- `GET /api/contact-lists` - List contact lists
- `POST /api/contact-lists` - Create list
- `GET /api/contact-lists/:id` - Get list with contacts
- `POST /api/contact-lists/import/csv` - Import from CSV
- `POST /api/contact-lists/import/leads` - Import from leads
- `GET /api/contact-lists/import/trade-shows` - List trade shows
- `POST /api/contact-lists/import/trade-shows/:id` - Import from trade show
- `DELETE /api/contact-lists/:id` - Delete list
- `DELETE /api/contact-lists/:id/contacts/:email` - Remove contact

---

## Next Steps

1. **Test with Real Data:** Import your actual contacts and send test campaigns
2. **Review Documentation:** See [CAMPAIGN_SYSTEM_README.md](CAMPAIGN_SYSTEM_README.md:1) for complete docs
3. **Run Deployment Checklist:** See [CAMPAIGN_DEPLOYMENT_CHECKLIST.md](CAMPAIGN_DEPLOYMENT_CHECKLIST.md:1) before production
4. **Monitor Performance:** Check EmailLog collection and AWS SES metrics
5. **Gather Feedback:** Get input from Manager/Owner users

---

## Support

For issues:
1. Check [CAMPAIGN_SYSTEM_README.md](CAMPAIGN_SYSTEM_README.md:1) Troubleshooting section
2. Review backend logs: `pm2 logs noxtm-backend`
3. Check browser console for frontend errors
4. Verify AWS SES dashboard for email delivery issues
5. Test with included `test_contacts.csv` file

---

**System Status:** ✅ All Phases 1-6 Complete

**Ready for:** Phase 7 (Integration & Testing)

**Last Updated:** December 6, 2025
