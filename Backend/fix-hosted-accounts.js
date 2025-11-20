const mongoose = require('mongoose');
const EmailAccount = require('./models/EmailAccount');
const { encrypt } = require('./utils/encryption');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Connect to MongoDB Atlas
const MONGODB_URI = 'mongodb+srv://noxtmstudio:qWWniMmKtOxnJcm9@cluster0.4jneyth.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

async function updateMailboxPassword(email, newPassword) {
  try {
    // Use doveadm to update the password in the mail system
    const command = `doveadm pw -s SHA512-CRYPT -p '${newPassword}' | xargs -I {} doveadm user ${email} -x password={} || echo "doveadm not available"`;
    await execAsync(command);
    console.log(`✅ Updated mailbox password for ${email}`);
  } catch (error) {
    console.warn(`⚠️  Could not update mailbox for ${email}: ${error.message}`);
    console.warn('   You may need to manually update the password in the mail system');
  }
}

async function fixHostedAccounts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Find all hosted accounts
    const allAccounts = await EmailAccount.find({ accountType: 'noxtm-hosted' });
    
    // Filter to find accounts that need fixing
    const accounts = [];
    for (const account of allAccounts) {
      // Check if missing encrypted password
      if (!account.imapSettings?.encryptedPassword) {
        accounts.push(account);
        continue;
      }
      
      // Check if password can be decrypted
      try {
        const { decrypt } = require('./utils/encryption');
        decrypt(account.imapSettings.encryptedPassword);
      } catch (err) {
        // Can't decrypt - needs re-encryption with current key
        console.log(`⚠️  ${account.email} has unreadable encrypted password - will re-encrypt`);
        accounts.push(account);
      }
    }

    console.log(`\nFound ${accounts.length} hosted accounts needing fix:\n`);

    for (const account of accounts) {
      console.log(`\n📧 Processing: ${account.email}`);
      
      // Generate new password
      const newPassword = generateSecurePassword(16);
      
      // Update the account password (will be hashed by pre-save hook)
      account.password = newPassword;
      
      // Set IMAP settings with encrypted password
      account.imapSettings = {
        host: 'mail.noxtm.com',
        port: 993,
        secure: true,
        username: account.email,
        encryptedPassword: encrypt(newPassword)
      };
      
      // Set SMTP settings with encrypted password
      account.smtpSettings = {
        host: 'mail.noxtm.com',
        port: 587,
        secure: false, // STARTTLS
        username: account.email,
        encryptedPassword: encrypt(newPassword)
      };
      
      // Save to database
      await account.save();
      console.log(`   ✅ Updated database for ${account.email}`);
      console.log(`   🔑 New password: ${newPassword}`);
      console.log(`   ⚠️  SAVE THIS PASSWORD! Email it to the account owner.`);
      
      // Try to update the actual mailbox password
      await updateMailboxPassword(account.email, newPassword);
    }

    console.log(`\n\n✅ Fixed ${accounts.length} hosted accounts`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('1. Save all the passwords shown above');
    console.log('2. Send them to the respective account owners');
    console.log('3. If doveadm updates failed, manually update passwords in mail system');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

fixHostedAccounts();
