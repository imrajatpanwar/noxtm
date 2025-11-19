const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import utilities
const { encrypt, generateSecurePassword } = require('./Backend/utils/encryption');

// Define EmailAccount schema (minimal version needed for migration)
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

async function migrateBrokenAccounts() {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/noxtm-mail');
        console.log('✅ Connected to MongoDB\n');

        // Find all noxtm-hosted accounts without imapSettings
        console.log('🔍 Finding broken accounts...');
        const brokenAccounts = await EmailAccount.find({
            accountType: 'noxtm-hosted',
            $or: [
                { 'imapSettings.encryptedPassword': { $exists: false } },
                { 'imapSettings.encryptedPassword': null },
                { 'imapSettings.encryptedPassword': '' }
            ]
        });

        if (brokenAccounts.length === 0) {
            console.log('✅ No broken accounts found. All accounts are properly configured!');
            process.exit(0);
        }

        console.log(`⚠️  Found ${brokenAccounts.length} broken account(s):\n`);

        const updatedAccounts = [];

        for (const account of brokenAccounts) {
            console.log(`Processing: ${account.email}`);

            // Generate new password
            const newPassword = generateSecurePassword(16);

            // Hash the password for storage
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Encrypt password for IMAP/SMTP
            const encryptedPassword = encrypt(newPassword);

            // Update the account
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

            updatedAccounts.push({
                email: account.email,
                newPassword: newPassword
            });

            console.log(`  ✅ Updated with new password\n`);
        }

        // Display results
        console.log('\n' + '='.repeat(80));
        console.log('🎉 MIGRATION COMPLETE!');
        console.log('='.repeat(80));
        console.log('\n📋 Updated Accounts and Their New Passwords:\n');
        console.log('IMPORTANT: Save these passwords and share them with users!\n');

        updatedAccounts.forEach(({ email, newPassword }) => {
            console.log(`Email: ${email}`);
            console.log(`Password: ${newPassword}`);
            console.log('---');
        });

        console.log('\n✅ All broken accounts have been fixed!');
        console.log('⚠️  Users will need to use the NEW passwords shown above.');

        // Close connection
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateBrokenAccounts();
