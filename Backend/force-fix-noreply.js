const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { encrypt, generateSecurePassword } = require('./utils/encryption');

const emailAccountSchema = new mongoose.Schema({
    email: String,
    accountType: String,
    password: String,
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
}, { timestamps: true });

const EmailAccount = mongoose.model('EmailAccount', emailAccountSchema);

async function forceFixAccount() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        const account = await EmailAccount.findOne({ email: 'noreply@noxtm.com' });

        if (!account) {
            console.log('❌ Account not found!');
            process.exit(1);
        }

        console.log('Found account:', account.email);
        console.log('Current IMAP settings:', account.imapSettings ? 'EXISTS' : 'MISSING');

        // Generate new password
        const newPassword = generateSecurePassword(16);

        // Hash for storage
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Encrypt for IMAP/SMTP
        const encryptedPassword = encrypt(newPassword);

        // Force update
        account.password = hashedPassword;
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
            secure: false,
            username: account.email,
            encryptedPassword: encryptedPassword
        };

        await account.save();

        console.log('\n✅ Account fixed!');
        console.log('NEW PASSWORD:', newPassword);
        console.log('\nIMPORTANT: Save this password!');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

forceFixAccount();
