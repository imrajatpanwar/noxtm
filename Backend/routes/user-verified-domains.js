const express = require('express');
const router = express.Router();
const { SESv2Client, CreateEmailIdentityCommand, GetEmailIdentityCommand, ListEmailIdentitiesCommand } = require('@aws-sdk/client-sesv2');
const UserVerifiedDomain = require('../models/UserVerifiedDomain');
const { awsSESRateLimitMiddleware } = require('../middleware/awsSesRateLimiter');
const { sendEmailWithRetry } = require('../services/emailRetryQueue');

const sesClient = new SESv2Client({
  region: process.env.AWS_SDK_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SDK_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SDK_SECRET_ACCESS_KEY
  }
});

// Middleware: Authentication check
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

// POST /api/user-domains/add - Add domain for verification
router.post('/add', requireAuth, async (req, res) => {
  try {
    const { domain } = req.body;
    const userId = req.user.id || req.user._id;

    if (!domain) {
      return res.status(400).json({ success: false, error: 'Domain is required' });
    }

    // Check domain limit (default: 1 per user)
    const limitCheck = await UserVerifiedDomain.checkDomainLimit(userId, 1);
    if (!limitCheck.canAddMore) {
      return res.status(403).json({
        success: false,
        error: 'DOMAIN_LIMIT_EXCEEDED',
        message: 'You have reached your domain limit. Contact support for an upgrade.',
        limit: limitCheck.limit,
        current: limitCheck.count
      });
    }

    // Check if domain already exists
    const existing = await UserVerifiedDomain.findOne({ domain, userId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'DOMAIN_EXISTS',
        message: 'This domain is already added to your account',
        domain: existing
      });
    }

    // Create in AWS SES
    const command = new CreateEmailIdentityCommand({ EmailIdentity: domain });
    const response = await sesClient.send(command);

    // Save to database
    const userDomain = new UserVerifiedDomain({
      domain,
      userId,
      companyId: req.user.companyId,
      dkimTokens: response.DkimAttributes.Tokens,
      verificationStatus: 'PENDING',
      dkimVerificationStatus: 'PENDING',
      dnsRecords: response.DkimAttributes.Tokens.map(token => ({
        type: 'CNAME',
        name: `${token}._domainkey.${domain}`,
        value: `${token}.dkim.amazonses.com`,
        verified: false
      }))
    });

    await userDomain.save();

    res.json({
      success: true,
      message: 'Domain added. Please add the DNS records to verify.',
      domain: userDomain,
      dnsRecords: userDomain.dnsRecords
    });
  } catch (error) {
    console.error('Error adding domain:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/user-domains/status/:domain - Check verification status
router.get('/status/:domain', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const domain = req.params.domain;

    // Verify ownership
    const userDomain = await UserVerifiedDomain.findOne({ domain, userId });
    if (!userDomain) {
      return res.status(404).json({ success: false, error: 'Domain not found' });
    }

    // Check status in AWS
    const command = new GetEmailIdentityCommand({ EmailIdentity: domain });
    const response = await sesClient.send(command);

    const isVerified = response.VerifiedForSendingStatus;
    const dkimStatus = response.DkimAttributes?.Status || 'PENDING';

    // Update in database
    userDomain.verificationStatus = isVerified ? 'SUCCESS' : 'PENDING';
    userDomain.dkimVerificationStatus = dkimStatus;
    userDomain.lastVerificationCheck = new Date();
    if (isVerified && !userDomain.verifiedAt) {
      userDomain.verifiedAt = new Date();
    }
    await userDomain.save();

    res.json({
      success: true,
      domain: domain,
      verified: isVerified,
      verificationStatus: userDomain.verificationStatus,
      dkimStatus: dkimStatus,
      verifiedAt: userDomain.verifiedAt,
      dnsRecords: userDomain.dnsRecords
    });
  } catch (error) {
    console.error('Error checking domain status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/user-domains - List user's domains
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const domains = await UserVerifiedDomain.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      domains,
      count: domains.length
    });
  } catch (error) {
    console.error('Error listing domains:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/user-domains/send - Send email from verified domain
router.post('/send', requireAuth, awsSESRateLimitMiddleware, async (req, res) => {
  try {
    const { from, to, subject, html, text } = req.body;
    const userId = req.user.id || req.user._id;

    if (!from || !to || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: from, to, subject'
      });
    }

    // Extract domain from email
    const domain = from.split('@')[1];
    if (!domain) {
      return res.status(400).json({ success: false, error: 'Invalid from email address' });
    }

    // Verify domain ownership and status
    const userDomain = await UserVerifiedDomain.findOne({ domain, userId });
    if (!userDomain) {
      return res.status(403).json({
        success: false,
        error: 'DOMAIN_NOT_FOUND',
        message: 'This domain is not registered to your account'
      });
    }

    if (!userDomain.canSend()) {
      return res.status(403).json({
        success: false,
        error: 'DOMAIN_NOT_VERIFIED',
        message: 'This domain is not verified or is disabled',
        verificationStatus: userDomain.verificationStatus
      });
    }

    // Send with retry queue
    const result = await sendEmailWithRetry({
      from,
      to,
      subject,
      html,
      text,
      userId,
      domain,
      metadata: {
        userDomainId: userDomain._id,
        rateLimits: req.rateLimits
      }
    });

    // Update stats
    if (result.sent === 'immediate') {
      await userDomain.incrementSentCount();
    }

    res.json({
      success: true,
      ...result,
      rateLimits: req.rateLimits
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/user-domains/:domain - Remove domain
router.delete('/:domain', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const domain = req.params.domain;

    const userDomain = await UserVerifiedDomain.findOneAndDelete({ domain, userId });
    if (!userDomain) {
      return res.status(404).json({ success: false, error: 'Domain not found' });
    }

    res.json({ success: true, message: 'Domain removed successfully' });
  } catch (error) {
    console.error('Error removing domain:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
