const mongoose = require('mongoose');
const { decrypt } = require('./utils/encryption');
const Imap = require('imap');
require('dotenv').config();

const emailAccountSchema = new mongoose.Schema({
    email: String,
    imapSettings: Object
}, { timestamps: true });

const EmailAccount = mongoose.model('EmailAccount', emailAccountSchema);

async function verifyImapConnection() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB Atlas\n');

        const account = await EmailAccount.findOne({ email: 'noreply@noxtm.com' });

        if (!account) {
            console.log('❌ Account not found!');
            process.exit(1);
        }

        console.log('Account found:', account.email);
        console.log('IMAP host:', account.imapSettings.host);
        console.log('IMAP port:', account.imapSettings.port);
        console.log('IMAP secure:', account.imapSettings.secure);
        console.log('IMAP username:', account.imapSettings.username);

        const password = decrypt(account.imapSettings.encryptedPassword);
        console.log('Password decrypted successfully (length:', password.length, ')');

        const config = {
            user: account.imapSettings.username,
            password: password,
            host: account.imapSettings.host,
            port: account.imapSettings.port,
            tls: account.imapSettings.secure,
            tlsOptions: { rejectUnauthorized: false },
            debug: console.log
        };

        console.log('\nAttempting IMAP connection...\n');

        const imap = new Imap(config);

        imap.once('ready', () => {
            console.log('✅ IMAP Connection Successful!');
            console.log('✅ Email loading should work now!');
            imap.end();
            mongoose.connection.close();
            process.exit(0);
        });

        imap.once('error', (err) => {
            console.log('❌ IMAP Connection Failed:', err.message);
            mongoose.connection.close();
            process.exit(1);
        });

        imap.connect();

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

verifyImapConnection();
