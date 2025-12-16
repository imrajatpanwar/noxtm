/**
 * Migration Script: Fix MX Records for All Domains
 *
 * Issue: Existing domains have incorrect MX records pointing to mail.{userDomain}
 * Fix: Update all domains to point to mail.noxtm.com
 *
 * Run this script once after deploying the DNS fix
 */

const mongoose = require('mongoose');
const EmailDomain = require('../models/EmailDomain');

async function fixMXRecords() {
  try {
    console.log('[MIGRATION] Starting MX records fix...');

    // Find all domains
    const domains = await EmailDomain.find({});
    console.log(`[MIGRATION] Found ${domains.length} domains to check`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;

    for (const domain of domains) {
      const currentMXHost = domain.dnsRecords.mx[0]?.host;

      // Check if MX record needs fixing
      if (currentMXHost && currentMXHost !== 'mail.noxtm.com') {
        console.log(`[MIGRATION] Fixing ${domain.domain}: ${currentMXHost} -> mail.noxtm.com`);

        // Update MX record
        domain.dnsRecords.mx = [
          { priority: 10, host: 'mail.noxtm.com', verified: false }
        ];

        // Update SPF record to include NOXTM server IP and AWS SES
        const mailServerIp = '185.137.122.61';
        domain.dnsRecords.spf.record = `v=spf1 ip4:${mailServerIp} include:amazonses.com ~all`;
        domain.dnsRecords.spf.verified = false; // Need to re-verify after change

        // Save changes
        await domain.save();
        fixedCount++;
      } else if (currentMXHost === 'mail.noxtm.com') {
        alreadyCorrectCount++;
      } else {
        console.log(`[MIGRATION] Warning: Domain ${domain.domain} has no MX record, adding default`);
        domain.dnsRecords.mx = [
          { priority: 10, host: 'mail.noxtm.com', verified: false }
        ];
        await domain.save();
        fixedCount++;
      }
    }

    console.log('[MIGRATION] ✅ Migration complete!');
    console.log(`[MIGRATION] Fixed: ${fixedCount} domains`);
    console.log(`[MIGRATION] Already correct: ${alreadyCorrectCount} domains`);
    console.log(`[MIGRATION] Total: ${domains.length} domains`);

    return {
      success: true,
      total: domains.length,
      fixed: fixedCount,
      alreadyCorrect: alreadyCorrectCount
    };
  } catch (error) {
    console.error('[MIGRATION] Error fixing MX records:', error);
    throw error;
  }
}

// Allow running as standalone script
if (require.main === module) {
  // Connect to MongoDB
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';

  mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log('[MIGRATION] Connected to MongoDB');

    const result = await fixMXRecords();

    console.log('[MIGRATION] Disconnecting...');
    await mongoose.disconnect();
    console.log('[MIGRATION] Done!');

    process.exit(0);
  })
  .catch(err => {
    console.error('[MIGRATION] Failed:', err);
    process.exit(1);
  });
}

module.exports = { fixMXRecords };
