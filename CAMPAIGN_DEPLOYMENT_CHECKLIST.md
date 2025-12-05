# Campaign System Deployment Checklist

## Pre-Deployment Verification

### Backend Dependencies
- [ ] Verify `papaparse` installed: `npm list papaparse`
- [ ] Verify `multer` installed: `npm list multer`
- [ ] Check all existing dependencies are up to date

### Frontend Dependencies
- [ ] Verify `react-quill` installed: `npm list react-quill`
- [ ] Check React Router is working correctly

### Environment Variables
- [ ] AWS SES credentials configured in `.env`
  - `AWS_SDK_REGION=eu-north-1`
  - `AWS_SDK_ACCESS_KEY_ID=your_access_key`
  - `AWS_SDK_SECRET_ACCESS_KEY=your_secret_key`
- [ ] Email configuration present
  - `EMAIL_FROM=rajat@mail.noxtm.com`

---

## Backend Testing Checklist

### Model Validation
- [ ] Campaign model loads without errors
- [ ] ContactList model loads without errors
- [ ] Test pre-save hooks calculate stats correctly
- [ ] Verify indexes are created on companyId, status, createdAt

### Middleware Testing
- [ ] Test `requireManagerOrOwner` blocks Employee role users
- [ ] Test middleware allows Owner role
- [ ] Test middleware allows Manager role
- [ ] Test middleware returns 403 for Employee

### Campaign Routes Testing

**Create Campaign:**
```bash
curl -X POST http://localhost:5000/api/campaigns \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "description": "Test campaign description",
    "subject": "Test Subject Line",
    "body": "<p>Hello {{name}},</p><p>This is a test email.</p>",
    "replyTo": "test@example.com",
    "fromEmail": "rajat@mail.noxtm.com",
    "fromName": "Noxtm Test"
  }'
```
- [ ] Returns 201 status code
- [ ] Campaign created with status='draft'
- [ ] Response includes campaign ID

**List Campaigns:**
```bash
curl http://localhost:5000/api/campaigns \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```
- [ ] Returns campaigns for current company only
- [ ] Includes stats object
- [ ] Pagination works (page, limit params)

**Get Campaign Details:**
```bash
curl http://localhost:5000/api/campaigns/CAMPAIGN_ID \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```
- [ ] Returns full campaign details
- [ ] Includes recipients array
- [ ] Includes contactLists references

**Add Recipients:**
```bash
curl -X POST http://localhost:5000/api/campaigns/CAMPAIGN_ID/recipients \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactListIds": ["LIST_ID_1", "LIST_ID_2"]
  }'
```
- [ ] Adds recipients from contact lists
- [ ] Updates totalRecipients stat
- [ ] No duplicate emails

**Send Test Email:**
```bash
curl -X POST http://localhost:5000/api/campaigns/CAMPAIGN_ID/test \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "testEmail": "your.email@example.com"
  }'
```
- [ ] Sends email with [TEST] prefix
- [ ] Variables replaced correctly
- [ ] Reply-to header set correctly
- [ ] Email received in inbox

**Send Campaign:**
```bash
curl -X POST http://localhost:5000/api/campaigns/CAMPAIGN_ID/send \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```
- [ ] Campaign status changes to 'sending'
- [ ] Emails sent in batches of 10
- [ ] Recipient statuses updated (sent/failed)
- [ ] EmailLog entries created
- [ ] Campaign status changes to 'sent' when complete

### Contact List Routes Testing

**Create Contact List:**
```bash
curl -X POST http://localhost:5000/api/contact-lists \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test List",
    "description": "Test contact list",
    "source": {
      "type": "custom"
    }
  }'
```
- [ ] List created successfully
- [ ] Returns list ID
- [ ] contactCount starts at 0

**Import from CSV:**
```bash
curl -X POST http://localhost:5000/api/contact-lists/import/csv \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -F "file=@test_contacts.csv" \
  -F "listName=CSV Import Test" \
  -F "description=Imported from test CSV"
```
- [ ] CSV file parsed correctly
- [ ] Contacts extracted with email, name, company
- [ ] Contact list created with sourceType='csv'
- [ ] Email validation works
- [ ] Duplicate emails handled

**Import from Leads:**
```bash
curl -X POST http://localhost:5000/api/contact-lists/import/leads \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listName": "Lead Import Test",
    "description": "Imported from leads",
    "leadIds": ["LEAD_ID_1", "LEAD_ID_2"]
  }'
```
- [ ] Leads fetched from LeadsDirectory
- [ ] Contact data extracted correctly
- [ ] List created with sourceType='leads'
- [ ] Source tracking includes leadIds

**List Trade Shows:**
```bash
curl http://localhost:5000/api/contact-lists/import/trade-shows \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```
- [ ] Returns list of Global Trade Shows for company
- [ ] Includes show name, date, location
- [ ] Filtered by company correctly

**List Exhibitors:**
```bash
curl http://localhost:5000/api/contact-lists/import/trade-shows/TRADE_SHOW_ID/exhibitors \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```
- [ ] Returns exhibitors for selected trade show
- [ ] Includes contact count for each exhibitor
- [ ] Sorted appropriately

**Import from Trade Show:**
```bash
curl -X POST http://localhost:5000/api/contact-lists/import/trade-shows/TRADE_SHOW_ID \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listName": "CES 2025 Contacts",
    "description": "Imported from CES exhibitors",
    "exhibitorIds": ["EXHIBITOR_ID_1", "EXHIBITOR_ID_2"]
  }'
```
- [ ] Contacts imported from all selected exhibitors
- [ ] List created with sourceType='tradeshow'
- [ ] Source tracking includes tradeShowId and exhibitorIds
- [ ] Duplicate emails across exhibitors handled

**Delete Contact from List:**
```bash
curl -X DELETE http://localhost:5000/api/contact-lists/LIST_ID/contacts/EMAIL \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```
- [ ] Contact removed from list
- [ ] contactCount decremented
- [ ] Returns success message

**Delete Contact List:**
```bash
curl -X DELETE http://localhost:5000/api/contact-lists/LIST_ID \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```
- [ ] List deleted successfully
- [ ] Confirmation required
- [ ] Cannot delete if used in active campaigns

---

## Frontend Testing Checklist

### Campaign Dashboard ([CampaignDashboard.js](Frontend/src/components/CampaignDashboard.js:1))

**Initial Load:**
- [ ] Dashboard loads without errors
- [ ] Statistics cards display correctly (Total, Draft, Sent, Failed)
- [ ] Campaign list displays
- [ ] Empty state shows if no campaigns

**Filter Functionality:**
- [ ] "All" filter shows all campaigns
- [ ] "Draft" filter shows only draft campaigns
- [ ] "Sent" filter shows only sent campaigns
- [ ] "Sending" filter shows campaigns currently sending
- [ ] "Failed" filter shows failed campaigns

**Campaign Actions:**
- [ ] "Create Campaign" button opens wizard
- [ ] "View Details" navigates to campaign details page
- [ ] Delete campaign shows confirmation dialog
- [ ] Delete campaign removes from list after confirmation

**Role-Based Access:**
- [ ] Manager role can access dashboard
- [ ] Owner role can access dashboard
- [ ] Employee role is redirected with error message

### Campaign Wizard ([CampaignWizard.js](Frontend/src/components/CampaignWizard.js:1))

**Step 1: Campaign Details**
- [ ] All input fields render correctly
- [ ] Campaign name is required
- [ ] Reply-to email validation works
- [ ] "Next" button disabled until required fields filled
- [ ] Can navigate to next step

**Step 2: Email Content**
- [ ] Email template dropdown displays templates
- [ ] Can select existing template
- [ ] Template loads subject and body when selected
- [ ] Custom email option works
- [ ] ReactQuill editor loads correctly
- [ ] Rich text formatting works (bold, italic, lists)
- [ ] Variable insertion buttons work ({{name}}, {{email}})
- [ ] Subject line accepts variables
- [ ] Can navigate back and forward

**Step 3: Recipients**
- [ ] Existing contact lists display
- [ ] Can select multiple contact lists
- [ ] Total recipient count updates correctly
- [ ] Import buttons display (CSV, Leads, Shows)
- [ ] CSV import modal opens
- [ ] Lead import modal opens
- [ ] Trade Show import modal opens
- [ ] Recipients added successfully

**Step 4: Review & Send**
- [ ] Campaign summary displays correctly
- [ ] Email preview shows subject and body
- [ ] Recipient count is accurate
- [ ] Variable preview shows sample data
- [ ] "Save as Draft" creates draft campaign
- [ ] "Send Test" opens test email modal
- [ ] Test email sent successfully
- [ ] "Send Now" sends campaign immediately
- [ ] "Schedule" option available (if implemented)

### Contact List Manager ([ContactListManager.js](Frontend/src/components/ContactListManager.js:1))

**Sidebar - Lists View:**
- [ ] All contact lists display in sidebar
- [ ] Contact count badge shows correct number
- [ ] Source badges display with correct colors
- [ ] Search filter works
- [ ] Source type filter works (All, CSV, Leads, Trade Shows)
- [ ] Empty state shows if no lists
- [ ] "Create Your First List" button works

**List Details View:**
- [ ] Clicking a list loads details
- [ ] List name and description display
- [ ] Info grid shows stats (Total Contacts, Created, Source, Used in Campaigns)
- [ ] Contacts table displays all contacts
- [ ] Table shows: Email, Name, Company, Phone, Designation, Added date
- [ ] Empty state shows if no contacts in list

**Import Functions:**
- [ ] CSV import button opens modal
- [ ] Leads import button opens modal
- [ ] Trade Shows import button opens modal
- [ ] Successful import refreshes list
- [ ] Imported contacts appear in table

**Export & Delete:**
- [ ] Export CSV downloads correct file
- [ ] CSV file contains all contacts with proper headers
- [ ] Delete contact shows confirmation
- [ ] Contact removed from list after confirmation
- [ ] Delete list shows confirmation
- [ ] List deleted successfully

### Import Modals

**CSV Import ([CSVImport.js](Frontend/src/components/ImportModals/CSVImport.js)):**
- [ ] Modal opens and closes correctly
- [ ] File input accepts CSV and Excel files
- [ ] File validation rejects invalid types
- [ ] List name input is required
- [ ] Description is optional
- [ ] Upload button disabled until file and name provided
- [ ] Upload progress shows (if implemented)
- [ ] Success message displays
- [ ] List created and visible in manager

**Lead Import ([LeadImport.js](Frontend/src/components/ImportModals/LeadImport.js)):**
- [ ] Modal opens with lead list
- [ ] Leads display with status badges
- [ ] Filter by status works (All, New, Contacted, Qualified)
- [ ] Can select individual leads (checkboxes)
- [ ] "Select All" works
- [ ] Selected count displays
- [ ] List name required
- [ ] Import creates list with selected leads
- [ ] Lead data extracted correctly (name, email, company)

**Trade Show Import ([TradeShowImport.js](Frontend/src/components/ImportModals/TradeShowImport.js)):**
- [ ] Step 1: Trade shows list displays
- [ ] Shows display with date, location, exhibitor count
- [ ] Clicking a show loads exhibitors (Step 2)
- [ ] Step 2: Exhibitors list displays
- [ ] Each exhibitor shows company name, booth, contact count
- [ ] Can select multiple exhibitors
- [ ] Selected count updates
- [ ] List name required at bottom
- [ ] Import creates list with all contacts from selected exhibitors
- [ ] Contact data includes email, name, designation, company, phone

### Campaign Details ([CampaignDetails.js](Frontend/src/components/CampaignDetails.js:1))

**Statistics Display:**
- [ ] Campaign name and status badge display
- [ ] Description shows if present
- [ ] Stats cards show: Total Recipients, Successfully Sent, Pending, Failed
- [ ] Icons and colors correct for each stat
- [ ] Success rate progress bar displays
- [ ] Percentage calculation is accurate

**Email Details:**
- [ ] Subject line displays
- [ ] From email and name display
- [ ] Reply-to address displays
- [ ] Email content preview renders HTML correctly
- [ ] Variables are visible (not replaced in preview)

**Campaign Info:**
- [ ] Created date displays
- [ ] Sent date displays (if sent)
- [ ] Scheduled date displays (if scheduled)
- [ ] Created by user name displays

**Contact Lists Used:**
- [ ] Lists chips display for all contact lists used
- [ ] Clicking list chip could navigate to list (optional)

**Recipients Table:**
- [ ] Only shows if campaign is sending/sent/failed
- [ ] Table displays first 50 recipients
- [ ] Columns: Email, Name, Status, Sent At, Error
- [ ] Status badges color-coded correctly (sent=green, failed=red)
- [ ] Sent At timestamps formatted correctly
- [ ] Error messages display for failed recipients
- [ ] "Showing first 50 of X" message if more than 50

**Test Email Function:**
- [ ] "Send Test" button visible for draft campaigns
- [ ] Test email modal opens
- [ ] Email input validates format
- [ ] Send button disabled until email entered
- [ ] Test email sent successfully
- [ ] Success alert displays
- [ ] Modal closes after sending

**Send Now Function:**
- [ ] "Send Now" button visible for draft campaigns
- [ ] Confirmation dialog appears
- [ ] Campaign status changes to "sending"
- [ ] Page refreshes to show updated status

---

## Integration Testing

### End-to-End Campaign Flow
1. [ ] Login as Manager role user
2. [ ] Navigate to Campaign Dashboard
3. [ ] Click "Create Campaign"
4. [ ] Complete Step 1: Enter campaign details
5. [ ] Complete Step 2: Create custom email with variables
6. [ ] Complete Step 3: Import contacts from CSV
7. [ ] Complete Step 4: Review and send test email
8. [ ] Verify test email received with variables replaced
9. [ ] Send campaign
10. [ ] Monitor campaign status on details page
11. [ ] Verify all emails sent successfully
12. [ ] Check EmailLog collection for entries
13. [ ] Verify recipient statuses updated

### Multi-Source Import Flow
1. [ ] Create contact list from CSV upload
2. [ ] Create contact list from Lead Directory
3. [ ] Create contact list from Trade Show exhibitors
4. [ ] Create campaign using all 3 lists
5. [ ] Verify total recipient count is correct
6. [ ] Verify no duplicate emails across lists
7. [ ] Send campaign to all recipients

### Role-Based Access Testing
1. [ ] Login as Owner - verify full access
2. [ ] Login as Manager - verify full access
3. [ ] Login as Employee - verify redirect/blocked
4. [ ] Test API endpoints with Employee token - verify 403 errors
5. [ ] Verify data isolation (only see own company's campaigns/lists)

---

## AWS SES Testing

### Email Configuration
- [ ] Verify sender email verified in AWS SES
- [ ] Test email sending to verified recipient
- [ ] Test email sending to unverified recipient (sandbox mode)
- [ ] Verify reply-to header set correctly
- [ ] Check email arrives in inbox (not spam)

### Rate Limiting
- [ ] Send campaign with 100+ recipients
- [ ] Verify batch processing (10 emails per batch)
- [ ] Verify 1 second delay between batches
- [ ] Monitor AWS SES sending rate
- [ ] Ensure rate limit not exceeded (14/second)

### Error Handling
- [ ] Test with invalid recipient email
- [ ] Verify error captured in recipient.error
- [ ] Verify EmailLog entry created with error
- [ ] Test with AWS SES credentials removed
- [ ] Verify appropriate error message

---

## Database Validation

### Campaign Collection
```javascript
// MongoDB shell
db.campaigns.findOne()
```
- [ ] Verify schema matches Campaign model
- [ ] Check recipients array structure
- [ ] Verify stats object calculated correctly
- [ ] Check companyId reference exists
- [ ] Verify indexes created (companyId, status, createdAt)

### ContactList Collection
```javascript
db.contactlists.findOne()
```
- [ ] Verify schema matches ContactList model
- [ ] Check contacts array structure
- [ ] Verify source object structure
- [ ] Check sourceType is one of: manual/csv/leads/tradeshow
- [ ] Verify contactCount matches contacts.length

### EmailLog Collection
```javascript
db.emaillogs.find({ campaignId: ObjectId("...") })
```
- [ ] EmailLog entries created for sent emails
- [ ] Verify to, from, subject fields
- [ ] Check status field (sent/failed)
- [ ] Verify error field populated for failures

---

## Performance Testing

### Large Contact Lists
- [ ] Import CSV with 1000+ contacts
- [ ] Verify import completes without timeout
- [ ] Check memory usage during import
- [ ] Test campaign with 1000+ recipients
- [ ] Monitor email sending performance

### Concurrent Users
- [ ] Two managers create campaigns simultaneously
- [ ] Verify no data conflicts
- [ ] Check companyId isolation works

---

## Security Testing

### Authentication
- [ ] All endpoints require valid JWT token
- [ ] Expired tokens rejected
- [ ] Invalid tokens rejected
- [ ] No token returns 401

### Authorization
- [ ] Employee role blocked from all campaign endpoints
- [ ] Manager can only access own company's data
- [ ] Owner can only access own company's data
- [ ] Cannot access other company's campaigns/lists

### Input Validation
- [ ] Email format validation works
- [ ] File upload size limits enforced (5MB max)
- [ ] File type validation works (CSV/Excel only)
- [ ] HTML injection prevented in email body
- [ ] Script injection prevented

---

## Browser Compatibility

- [ ] Chrome: Dashboard, Wizard, Modals work
- [ ] Firefox: All features functional
- [ ] Safari: All features functional
- [ ] Edge: All features functional
- [ ] Mobile Safari: Responsive layout works
- [ ] Mobile Chrome: Responsive layout works

---

## Known Limitations (Document for Users)

1. **Scheduled Campaigns:** Schedule functionality requires cron job (not yet implemented)
2. **Unsubscribe Management:** No unsubscribe links or management (planned)
3. **Email Tracking:** No open/click tracking (planned)
4. **AWS SES Sandbox:** Production accounts need SES out of sandbox mode
5. **Campaign Edit:** Cannot edit campaigns after sending starts
6. **Recipient Limit:** MongoDB document size limit (~16MB) limits recipients to ~10,000

---

## Deployment Steps

1. [ ] Backup current database
2. [ ] Pull latest code from repository
3. [ ] Install backend dependencies: `cd Backend && npm install`
4. [ ] Install frontend dependencies: `cd Frontend && npm install`
5. [ ] Verify `.env` file has AWS SES credentials
6. [ ] Restart backend server: `pm2 restart noxtm-backend`
7. [ ] Build frontend: `cd Frontend && npm run build`
8. [ ] Deploy frontend build
9. [ ] Test with Manager account in production
10. [ ] Monitor logs for errors

---

## Rollback Plan

If critical issues found:
1. [ ] Stop backend server
2. [ ] Restore database from backup
3. [ ] Revert code to previous commit
4. [ ] Restart backend server
5. [ ] Notify users of issue

---

## Post-Deployment Monitoring

**First 24 Hours:**
- [ ] Monitor backend logs for errors
- [ ] Check AWS SES sending metrics
- [ ] Review EmailLog collection for failures
- [ ] Gather user feedback from Manager/Owner users

**First Week:**
- [ ] Track campaign creation rate
- [ ] Monitor email delivery success rate
- [ ] Check for any performance issues
- [ ] Document any user-reported bugs

---

## Success Criteria

✅ **Minimum Viable Product (MVP):**
- Manager and Owner users can create campaigns
- Contact lists can be imported from CSV, Leads, and Trade Shows
- Emails send successfully via AWS SES
- Reply-to addresses configured correctly
- Employee users blocked from access
- No critical errors in production

✅ **Ideal State:**
- All manual tests pass
- Email delivery rate >95%
- No reported bugs from users
- Documentation complete and accessible
- User training completed (if needed)

---

**Deployment Date:** _____________

**Deployed By:** _____________

**Verified By:** _____________

**Notes:**
