const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

function getKey() {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) throw new Error('EMAIL_ENCRYPTION_KEY not set');
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(text) {
  if (!text) return '';
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

async function updateAccount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const EmailAccount = mongoose.model('EmailAccount', new mongoose.Schema({
      email: String,
      password: String,
      accountType: String,
      imapSettings: {
        host: String,
        port: Number,
        secure: Boolean,
        username: String,
        encryptedPassword: String
      },
      smtpSettings: {
        host: String,
        port: Number,
        secure: Boolean,
        username: String,
        encryptedPassword: String
      }
    }), 'emailaccounts');

    const plainPassword = 'testpass123';
    const encryptedPassword = encrypt(plainPassword);

    console.log('\n🔐 Encrypting password...');
    console.log('Plain password:', plainPassword);
    console.log('Encrypted:', encryptedPassword);

    // Update the account with IMAP/SMTP settings
    const result = await EmailAccount.updateOne(
      { email: 'noreply@noxtm.com' },
      {
        $set: {
          accountType: 'noxtm-hosted',
          imapSettings: {
            host: '185.137.122.61',
            port: 993,
            secure: true,
            username: 'noreply@noxtm.com',
            encryptedPassword: encryptedPassword
          },
          smtpSettings: {
            host: '185.137.122.61',
            port: 587,
            secure: false,
            username: 'noreply@noxtm.com',
            encryptedPassword: encryptedPassword
          }
        }
      }
    );

    console.log('\n✅ Updated account:', result.modifiedCount, 'document(s)');

    // Verify the update
    const account = await EmailAccount.findOne({ email: 'noreply@noxtm.com' });
    console.log('\n📧 Verified Account:');
    console.log('Email:', account.email);
    console.log('Account Type:', account.accountType);
    console.log('IMAP Host:', account.imapSettings?.host);
    console.log('IMAP Port:', account.imapSettings?.port);
    console.log('SMTP Host:', account.smtpSettings?.host);
    console.log('SMTP Port:', account.smtpSettings?.port);
    console.log('Has encrypted password:', !!account.imapSettings?.encryptedPassword);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateAccount();
