const mongoose = require('mongoose');
const { encrypt } = require('./utils/encryption');
require('dotenv').config();

const emailAccountSchema = new mongoose.Schema({
    email: String,
    imapSettings: Object,
    smtpSettings: Object
}, { timestamps: true });

const EmailAccount = mongoose.model('EmailAccount', emailAccountSchema);

async function fixNoReplyMailServer() {
    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            console.error('❌ MONGODB_URI not set in .env file!');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        const account = await EmailAccount.findOne({ email: 'noreply@noxtm.com' });

        if (!account) {
            console.log('❌ Account not found!');
            process.exit(1);
        }

        console.log('Found account:', account.email);
        console.log('Current IMAP host:', account.imapSettings?.host);
        console.log('Current SMTP host:', account.smtpSettings?.host);

        // Use the existing password (already encrypted in DB)
        const password = '+1U.ke6+6BI^a1UN';
        const encryptedPassword = encrypt(password);

        // Update to use mail.noxtm.com
        account.imapSettings = {
            host: 'mail.noxtm.com',
            port: 993,
            secure: true,
            username: account.email,
            encryptedPassword: encryptedPassword
        };

        account.smtpSettings = {
            host: 'mail.noxtm.com',
            port: 587,
            secure: false, // STARTTLS
            username: account.email,
            encryptedPassword: encryptedPassword
        };

        await account.save();

        console.log('\n✅ Account updated successfully!');
        console.log('New IMAP host:', account.imapSettings.host);
        console.log('New SMTP host:', account.smtpSettings.host);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixNoReplyMailServer();
