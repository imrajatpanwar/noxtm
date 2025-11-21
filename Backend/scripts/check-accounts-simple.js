const mongoose = require('mongoose');
const EmailAccount = require('../models/EmailAccount');
require('dotenv').config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm');
    console.log('✅ Connected to MongoDB\n');
    
    const accounts = await EmailAccount.find({}).select('email accountType imapSettings smtpSettings');
    console.log(`Total accounts: ${accounts.length}\n`);
    
    let configured = 0;
    let missing = 0;
    
    accounts.forEach(acc => {
      const hasIMAP = acc.imapSettings && acc.imapSettings.encryptedPassword;
      const hasSMTP = acc.smtpSettings && acc.smtpSettings.encryptedPassword;
      
      if (hasIMAP && hasSMTP) {
        console.log(`✅ ${acc.email} (Type: ${acc.accountType || 'legacy'})`);
        console.log(`   IMAP: Configured, SMTP: Configured`);
        configured++;
      } else {
        console.log(`❌ ${acc.email} (Type: ${acc.accountType || 'legacy'})`);
        console.log(`   IMAP: ${hasIMAP ? 'Configured' : 'Missing'}, SMTP: ${hasSMTP ? 'Configured' : 'Missing'}`);
        missing++;
      }
    });
    
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Fully Configured: ${configured}`);
    console.log(`   ❌ Need Fixing: ${missing}`);
    
    if (missing > 0) {
      console.log(`\n💡 To fix accounts, use the password reset API:`);
      console.log(`   PUT /api/email-accounts/:id/reset-password`);
      console.log(`   Body: { "newPassword": "your-new-password" }\n`);
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch(e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
})();
