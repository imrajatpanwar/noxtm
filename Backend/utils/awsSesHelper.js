const {
  SESv2Client,
  SendEmailCommand,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  PutEmailIdentityDkimAttributesCommand
} = require('@aws-sdk/client-sesv2');

const sesClient = new SESv2Client({
  region: process.env.AWS_SDK_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_SDK_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SDK_SECRET_ACCESS_KEY
  }
});

async function sendEmailViaSES({ from, to, subject, html, text, replyTo, metadata }) {
  const params = {
    FromEmailAddress: from,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to]
    },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: html ? { Data: html, Charset: 'UTF-8' } : undefined,
          Text: text ? { Data: text, Charset: 'UTF-8' } : undefined
        }
      }
    }
  };

  if (replyTo) {
    params.ReplyToAddresses = Array.isArray(replyTo) ? replyTo : [replyTo];
  }

  const command = new SendEmailCommand(params);
  
  try {
    const result = await sesClient.send(command);
    console.log(`✓ Email sent via AWS SES: ${result.MessageId}`);
    return result;
  } catch (error) {
    console.error(`✗ AWS SES send failed: ${error.message}`);
    throw error;
  }
}

/**
 * Register a domain with AWS SES for email sending
 * @param {String} domain - Domain name to register
 * @returns {Object} Registration result with DKIM tokens
 */
async function registerDomainWithSES(domain) {
  try {
    console.log(`[AWS SES] Registering domain: ${domain}`);

    const command = new CreateEmailIdentityCommand({
      EmailIdentity: domain
    });

    const response = await sesClient.send(command);

    console.log(`[AWS SES] Domain registered successfully: ${domain}`);
    console.log(`[AWS SES] Initial DKIM Tokens:`, response.DkimAttributes?.Tokens);

    // CRITICAL FIX: Ensure DKIM tokens are retrieved
    let dkimTokens = response.DkimAttributes?.Tokens || [];

    if (!dkimTokens || dkimTokens.length === 0) {
      console.log(`[AWS SES] DKIM tokens not returned by CreateEmailIdentityCommand. Fetching with GetEmailIdentityCommand...`);

      // Wait 2 seconds for AWS to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      const getResult = await getAWSSESIdentity(domain);
      if (getResult.success && getResult.dkimTokens && getResult.dkimTokens.length > 0) {
        dkimTokens = getResult.dkimTokens;
        console.log(`[AWS SES] ✅ Retrieved ${dkimTokens.length} DKIM tokens via GetEmailIdentityCommand`);
      } else {
        console.warn(`[AWS SES] ⚠️ Still no DKIM tokens after GetEmailIdentityCommand. Will retry later via background job.`);
      }
    } else {
      console.log(`[AWS SES] ✅ Got ${dkimTokens.length} DKIM tokens from CreateEmailIdentityCommand`);
    }

    return {
      success: true,
      domain,
      identityType: response.IdentityType,
      dkimTokens: dkimTokens,
      verificationToken: dkimTokens[0] || null,
      identityArn: response.DkimAttributes?.SigningAttributesOrigin === 'AWS_SES' ? `arn:aws:ses:${process.env.AWS_SDK_REGION}:identity/${domain}` : null,
      message: dkimTokens.length > 0
        ? 'Domain registered with AWS SES. Add CNAME records to verify DKIM.'
        : 'Domain registered with AWS SES. DKIM tokens pending (will retry automatically).'
    };
  } catch (error) {
    console.error(`[AWS SES] Registration error for ${domain}:`, error.message);

    // Domain already exists - fetch existing details
    if (error.name === 'AlreadyExistsException') {
      console.log(`[AWS SES] Domain already registered: ${domain}. Fetching existing identity...`);
      return await getAWSSESIdentity(domain);
    }

    // Access denied or invalid credentials
    if (error.name === 'AccessDeniedException') {
      return {
        success: false,
        error: 'AWS SES access denied. Check your AWS credentials.',
        code: 'ACCESS_DENIED'
      };
    }

    // Other errors
    return {
      success: false,
      error: `AWS SES registration failed: ${error.message}`,
      code: error.name
    };
  }
}

/**
 * Get existing AWS SES identity details
 * @param {String} domain - Domain name
 * @returns {Object} Identity details
 */
async function getAWSSESIdentity(domain) {
  try {
    const command = new GetEmailIdentityCommand({
      EmailIdentity: domain
    });

    const response = await sesClient.send(command);

    return {
      success: true,
      domain,
      identityType: response.IdentityType,
      dkimTokens: response.DkimAttributes?.Tokens || [],
      verifiedForSending: response.VerifiedForSendingStatus,
      dkimStatus: response.DkimAttributes?.Status,
      message: 'Domain identity retrieved successfully'
    };
  } catch (error) {
    if (error.name === 'NotFoundException') {
      return {
        success: false,
        error: 'Domain not registered with AWS SES',
        code: 'NOT_FOUND'
      };
    }

    return {
      success: false,
      error: `Failed to get identity: ${error.message}`,
      code: error.name
    };
  }
}

/**
 * Check AWS SES verification status for a domain
 * @param {String} domain - Domain name
 * @returns {Object} Verification status
 */
async function checkAWSSESVerification(domain) {
  try {
    const command = new GetEmailIdentityCommand({
      EmailIdentity: domain
    });

    const response = await sesClient.send(command);

    const verified = response.VerifiedForSendingStatus === true;
    const dkimStatus = response.DkimAttributes?.Status; // SUCCESS, PENDING, FAILED, etc.

    return {
      verified,
      verifiedForSending: response.VerifiedForSendingStatus,
      status: dkimStatus,
      dkimTokens: response.DkimAttributes?.Tokens || [],
      message: verified
        ? 'Domain verified and ready for sending'
        : `Verification pending. DKIM status: ${dkimStatus}`
    };
  } catch (error) {
    if (error.name === 'NotFoundException') {
      return {
        verified: false,
        status: 'not_registered',
        message: 'Domain not registered with AWS SES'
      };
    }

    console.error(`[AWS SES] Verification check error for ${domain}:`, error.message);
    return {
      verified: false,
      status: 'error',
      message: `Failed to check verification: ${error.message}`
    };
  }
}

/**
 * Remove domain from AWS SES (cleanup)
 * @param {String} domain - Domain name
 * @returns {Object} Deletion result
 */
async function removeDomainFromSES(domain) {
  try {
    console.log(`[AWS SES] Removing domain: ${domain}`);

    const command = new DeleteEmailIdentityCommand({
      EmailIdentity: domain
    });

    await sesClient.send(command);

    console.log(`[AWS SES] Domain removed successfully: ${domain}`);
    return {
      success: true,
      message: 'Domain removed from AWS SES'
    };
  } catch (error) {
    if (error.name === 'NotFoundException') {
      return {
        success: true,
        message: 'Domain was not registered (already removed)'
      };
    }

    console.error(`[AWS SES] Removal error for ${domain}:`, error.message);
    return {
      success: false,
      error: `Failed to remove domain: ${error.message}`
    };
  }
}

/**
 * Get AWS SES sending quota and statistics
 * @returns {Object} Quota information
 */
async function getSendingQuota() {
  try {
    const { GetAccountCommand } = require('@aws-sdk/client-sesv2');
    const command = new GetAccountCommand({});
    const response = await sesClient.send(command);

    return {
      success: true,
      quotaDetails: response.SendQuota || {},
      productionAccess: response.ProductionAccessEnabled,
      sendingEnabled: response.SendingEnabled
    };
  } catch (error) {
    console.error('[AWS SES] Failed to get sending quota:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sesClient,
  sendEmailViaSES,
  registerDomainWithSES,
  getAWSSESIdentity,
  checkAWSSESVerification,
  removeDomainFromSES,
  getSendingQuota
};
