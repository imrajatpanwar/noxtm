const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

// Old encryption (default key)
function getOldKey() {
  return crypto.createHash('sha256').update('noxtm-default-encryption-key-change-in-production').digest();
}

// New encryption (from .env)
function getNewKey() {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('EMAIL_ENCRYPTION_KEY not set in .env');
  }
  return crypto.createHash('sha256').update(key).digest();
}

function decryptOld(encryptedText) {
  if (!encryptedText) return '';
  const key = getOldKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 2) return encryptedText; // Not encrypted
  
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedData = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function encryptNew(text) {
  if (!text) return '';
  const key = getNewKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

async function fixPasswords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const EmailAccount = mongoose.model('EmailAccount', new mongoose.Schema({
      email: String,
      password: String,
      accountType: String,
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }));

    const accounts = await EmailAccount.find({});
    console.log(`📧 Found ${accounts.length} email accounts`);

    let fixed = 0;
    let errors = 0;

    for (const account of accounts) {
      try {
        // Try to decrypt with old key
        const plainPassword = decryptOld(account.password);
        
        // Re-encrypt with new key
        const newEncrypted = encryptNew(plainPassword);
        
        // Update in database
        await EmailAccount.updateOne(
          { _id: account._id },
          { $set: { password: newEncrypted } }
        );
        
        console.log(`✅ Fixed: ${account.email}`);
        fixed++;
      } catch (error) {
        console.error(`❌ Error fixing ${account.email}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} accounts`);
    if (errors > 0) {
      console.log(`❌ Failed ${errors} accounts`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixPasswords();
