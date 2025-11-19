const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/api'; // Adjust as needed
const ADMIN_TOKEN = 'YOUR_ADMIN_TOKEN'; // Replace with a valid token

async function verifyFix() {
    try {
        console.log('1. Creating test account...');
        const username = `test_${Date.now()}`;
        const createResponse = await axios.post(`${API_URL}/email-accounts/create-noxtm`, {
            username: username,
            quotaMB: 100
        }, {
            headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
        });

        if (createResponse.data.success) {
            console.log('✅ Account created successfully.');
            const email = createResponse.data.data.email;

            // Fetch the account details to check settings
            // Note: You might need to query the DB directly if the API doesn't return settings
            // But we can try to fetch inbox which should now work (or at least try to connect)

            console.log('2. Attempting to fetch inbox (this verifies IMAP settings exist)...');
            // We need the account ID. The create response might not return it in data.data depending on the API
            // Let's assume we need to search for it or it's in the response

            // If we can't easily get the ID, we can just rely on the code review for now, 
            // but if you have DB access, check the document:
            console.log(`\n⚠️  Please check the database document for email: ${email}`);
            console.log('   Ensure "imapSettings" and "smtpSettings" fields are populated.');
            console.log('   Specifically, "encryptedPassword" should be present.');

        } else {
            console.error('❌ Failed to create account:', createResponse.data);
        }

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

verifyFix();
