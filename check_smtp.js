require('dotenv').config({ path: '/root/noxtm/Backend/.env' });
const m = require('mongoose');
const { decrypt } = require('/root/noxtm/Backend/utils/encryption');
const nodemailer = require('nodemailer');

m.connect(process.env.MONGODB_URI).then(async () => {
    // Get the first email account
    const account = await m.connection.collection('emailaccounts').findOne({ email: 'rajat@noxtm.com' });
    if (!account) { console.log('No account found'); process.exit(1); }

    const pass = decrypt(account.smtpSettings.encryptedPassword);
    console.log('Testing SMTP auth for:', account.email, 'pass_len:', pass.length);
    console.log('SMTP host: 127.0.0.1, port: 587');

    const transporter = nodemailer.createTransport({
        host: '127.0.0.1',
        port: 587,
        secure: false,
        auth: { user: account.smtpSettings.username || account.email, pass: pass },
        tls: { rejectUnauthorized: false }
    });

    try {
        await transporter.verify();
        console.log('SUCCESS: SMTP auth works!');
    } catch (e) {
        console.log('FAILED:', e.message);
        console.log('Full error:', JSON.stringify(e, null, 2));
    }

    process.exit();
}).catch(e => { console.error(e.message); process.exit(1); });
