const EmailDomain = require('../models/EmailDomain');
const { checkAWSSESVerification } = require('../utils/awsSesHelper');

/**
 * Background job to automatically check pending AWS SES verifications
 * Runs periodically (every 60 minutes) to check domains that are DNS-verified
 * but still waiting for AWS SES DKIM verification to complete.
 */

let jobInterval = null;

const runAWSSESVerificationCheck = async () => {
  console.log('[AWS_SES_JOB] Starting pending domain verification checks...');

  try {
    // Find domains that are DNS-verified but AWS SES not yet verified
    const pendingDomains = await EmailDomain.find({
      dnsVerified: true,
      awsSesVerified: false,
      'awsSes.registered': true
    });

    console.log(`[AWS_SES_JOB] Found ${pendingDomains.length} pending domains to check`);

    for (const domain of pendingDomains) {
      try {
        console.log(`[AWS_SES_JOB] Checking AWS SES status for ${domain.domain}...`);

        const status = await checkAWSSESVerification(domain.domain);

        // Update AWS SES status
        domain.awsSes.verificationStatus = status.status || 'pending';
        domain.awsSes.verifiedForSending = status.verifiedForSending || false;
        domain.awsSes.lastVerificationCheck = new Date();

        if (status.verified && !domain.awsSesVerified) {
          // AWS SES verification completed!
          domain.awsSesVerified = true;
          domain.awsSesVerifiedAt = new Date();
          domain.awsSes.verifiedAt = new Date();

          // Mark domain as fully verified (DNS + AWS SES)
          domain.verified = true;
          domain.verifiedAt = new Date();

          await domain.save();

          console.log(`[AWS_SES_JOB] ✅ Domain ${domain.domain} now fully verified!`);

          // TODO: Send email notification to domain owner
          // Could emit socket event here to notify user in real-time
        } else if (status.verified && domain.awsSesVerified) {
          // Already verified, just update timestamp
          await domain.save();
          console.log(`[AWS_SES_JOB] Domain ${domain.domain} already verified`);
        } else {
          // Still pending
          await domain.save();
          console.log(`[AWS_SES_JOB] Domain ${domain.domain} still pending (status: ${status.status})`);
        }
      } catch (err) {
        console.error(`[AWS_SES_JOB] Error checking ${domain.domain}:`, err.message);
        // Continue with next domain even if this one fails
      }
    }

    console.log(`[AWS_SES_JOB] Completed checking ${pendingDomains.length} domains`);
    return { processedCount: pendingDomains.length };
  } catch (err) {
    console.error('[AWS_SES_JOB] Error running verification job:', err);
    throw err;
  }
};

/**
 * Start the background job
 * Runs every 60 minutes (3600000 ms)
 */
const startJob = () => {
  if (jobInterval) {
    console.log('[AWS_SES_JOB] Job already running');
    return;
  }

  console.log('[AWS_SES_JOB] Starting AWS SES verification background job (runs every 60 minutes)');

  // Run immediately on startup
  runAWSSESVerificationCheck().catch(err => {
    console.error('[AWS_SES_JOB] Initial run failed:', err);
  });

  // Schedule to run every 60 minutes
  jobInterval = setInterval(() => {
    runAWSSESVerificationCheck().catch(err => {
      console.error('[AWS_SES_JOB] Scheduled run failed:', err);
    });
  }, 60 * 60 * 1000); // 60 minutes

  console.log('[AWS_SES_JOB] Background job initialized successfully');
};

/**
 * Stop the background job
 */
const stopJob = () => {
  if (jobInterval) {
    clearInterval(jobInterval);
    jobInterval = null;
    console.log('[AWS_SES_JOB] Background job stopped');
  }
};

module.exports = {
  startJob,
  stopJob,
  runAWSSESVerificationCheck // Export for manual triggering if needed
};
