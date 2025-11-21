const mongoose = require('mongoose');
const EmailAccount = require('../models/EmailAccount');
const { encrypt } = require('../utils/encryption');
require('dotenv').config({ path: '../.env' });

/**
 * Script to fix existing email accounts that don't have IMAP/SMTP settings
 * This is needed for accounts created before the imapSettings fix
 */

async function fixEmailAccountSettings() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all hosted accounts without imapSettings
    const accountsToFix = await EmailAccount.find({
      accountType: { $in: ['noxtm-hosted', null] }, // null for old accounts
      $or: [
        { 'imapSettings.encryptedPassword': { $exists: false } },
        { 'imapSettings.encryptedPassword': null },
        { 'imapSettings.encryptedPassword': '' }
      ]
    });

    console.log(`\n📧 Found ${accountsToFix.length} accounts to fix\n`);

    if (accountsToFix.length === 0) {
      console.log('✅ All accounts are already configured correctly!');
      await mongoose.disconnect();
      return;
    }

    let fixed = 0;
    let errors = 0;

    for (const account of accountsToFix) {
      try {
        console.log(`Processing: ${account.email}`);

        // Use the existing password (it's already stored in the account)
        // Note: The password field is bcrypt hashed, but we need to use the plain password
        // For hosted accounts, we'll prompt for manual update or use a default
        
        // Check if account has a plain password we can use (unlikely)
        if (!account.password) {
          console.log(`  ⚠️  Skipping ${account.email} - no password available`);
          errors++;
          continue;
        }

        // For existing accounts, we'll need to manually set a password
        // or they need to reset it. For now, let's just set up the structure
        // with a flag that password needs reset
        
        const needsPasswordReset = true; // Flag for manual handling
        
        // Update account with IMAP/SMTP settings structure
        account.accountType = 'noxtm-hosted';
        account.isVerified = true;
        account.imapEnabled = true;
        account.smtpEnabled = true;
        
        // Note: We can't encrypt the password here because it's already bcrypt hashed
        // These accounts will need to have their passwords reset or manually configured
        console.log(`  ⚠️  ${account.email} - Account structure updated, but password needs to be reset or manually configured`);
        console.log(`  ℹ️  Admin should reset password for this account to enable email fetching`);
        
        await account.save();
        fixed++;

      } catch (error) {
        console.error(`  ❌ Error fixing ${account.email}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`\n⚠️  IMPORTANT: Accounts need password reset to enable IMAP/SMTP`);
    console.log(`   Use the "Reset Password" feature or create new accounts\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixEmailAccountSettings()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
