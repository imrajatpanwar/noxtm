/**
 * Email Domain Middleware
 *
 * Middleware for validating domain ownership and restrictions
 * for email account creation in the multi-tenant BYOD platform.
 */

const EmailDomain = require('../models/EmailDomain');
const mailConfig = require('../config/mailConfig');

/**
 * Middleware to check if domain is reserved (noxtm.com, etc.)
 * and block non-admin users from using it
 */
const checkReservedDomain = async (req, res, next) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({
      success: false,
      message: 'Domain is required',
      code: 'DOMAIN_REQUIRED'
    });
  }

  // Check if domain is in reserved list
  const isReserved = mailConfig.reservedDomains.includes(domain.toLowerCase());

  if (isReserved) {
    // Allow admins to use reserved domains
    if (req.user && req.user.role === 'Admin') {
      console.log(`[EMAIL_DOMAIN] Admin ${req.user.email} accessing reserved domain: ${domain}`);
      return next();
    }

    // Block regular users
    return res.status(403).json({
      success: false,
      message: `Cannot create email accounts on ${domain}. This domain is reserved for platform use.`,
      hint: 'Please add and verify your own domain first',
      code: 'DOMAIN_RESERVED',
      redirectTo: '/domains/setup'
    });
  }

  next();
};

/**
 * Middleware to require that domain is verified before email account creation
 */
const requireVerifiedDomain = async (req, res, next) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({
      success: false,
      message: 'Domain is required',
      code: 'DOMAIN_REQUIRED'
    });
  }

  // Skip verification check for admin on reserved domains
  const isReserved = mailConfig.reservedDomains.includes(domain.toLowerCase());
  if (isReserved && req.user && req.user.role === 'Admin') {
    return next();
  }

  // Find domain in database
  const emailDomain = await EmailDomain.findOne({
    domain: domain.toLowerCase()
  });

  if (!emailDomain) {
    return res.status(404).json({
      success: false,
      message: `Domain "${domain}" not found. Please add this domain first.`,
      code: 'DOMAIN_NOT_FOUND',
      redirectTo: '/domains/setup'
    });
  }

  // Check if domain is verified
  if (!emailDomain.verified) {
    return res.status(403).json({
      success: false,
      message: `Domain "${domain}" is not verified yet. Please complete DNS verification first.`,
      code: 'DOMAIN_NOT_VERIFIED',
      verificationStatus: {
        hasVerificationToken: false,
        hasMxRecord: false,
        hasSpf: false,
        awsSesVerified: false
      },
      redirectTo: `/domains/${emailDomain._id}/verify`,
      dnsInstructions: `/domains/${emailDomain._id}/dns`
    });
  }

  // Check if domain belongs to user's company
  if (req.user.companyId && emailDomain.companyId) {
    const userCompanyId = req.user.companyId._id || req.user.companyId;
    const domainCompanyId = emailDomain.companyId._id || emailDomain.companyId;

    if (userCompanyId.toString() !== domainCompanyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to create email accounts on this domain',
        code: 'DOMAIN_ACCESS_DENIED'
      });
    }
  }

  // Attach domain to request for use in route handler
  req.emailDomain = emailDomain;
  next();
};

/**
 * Combined middleware: Check both reserved domain and verification
 */
const requireOwnedVerifiedDomain = async (req, res, next) => {
  // First check if domain is reserved
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({
      success: false,
      message: 'Domain is required',
      code: 'DOMAIN_REQUIRED'
    });
  }

  const isReserved = mailConfig.reservedDomains.includes(domain.toLowerCase());

  // Block reserved domains for non-admins
  if (isReserved && req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: `Cannot create email accounts on ${domain}. Please add and verify your own domain.`,
      hint: 'Add your company domain (e.g., yourcompany.com) to get started',
      code: 'DOMAIN_RESERVED',
      action: {
        label: 'Add Your Domain',
        url: '/domains/setup'
      }
    });
  }

  // Skip verification for admin on reserved domains
  if (isReserved && req.user.role === 'Admin') {
    console.log(`[EMAIL_DOMAIN] Admin ${req.user.email} creating account on reserved domain: ${domain}`);
    return next();
  }

  // For non-reserved domains, check verification
  const emailDomain = await EmailDomain.findOne({
    domain: domain.toLowerCase()
  });

  if (!emailDomain) {
    return res.status(404).json({
      success: false,
      message: `Domain "${domain}" not found`,
      hint: 'Add your domain and complete DNS verification to create email accounts',
      code: 'DOMAIN_NOT_FOUND',
      action: {
        label: 'Add Domain',
        url: '/domains/setup'
      }
    });
  }

  if (!emailDomain.verified) {
    return res.status(403).json({
      success: false,
      message: `Domain "${domain}" is not verified`,
      hint: 'Complete DNS verification to activate email account creation',
      code: 'DOMAIN_NOT_VERIFIED',
      domain: {
        id: emailDomain._id,
        domain: emailDomain.domain,
        verificationToken: emailDomain.verificationToken,
        dnsRecords: emailDomain.dnsRecords
      },
      action: {
        label: 'Verify Domain',
        url: `/domains/${emailDomain._id}/verify`
      }
    });
  }

  // Check company ownership
  if (req.user.companyId && emailDomain.companyId) {
    const userCompanyId = req.user.companyId._id || req.user.companyId;
    const domainCompanyId = emailDomain.companyId._id || emailDomain.companyId;

    if (userCompanyId.toString() !== domainCompanyId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this domain',
        code: 'DOMAIN_ACCESS_DENIED'
      });
    }
  }

  // Check quota limits
  const accountCount = await req.emailDomain.countDocuments({ domain: domain.toLowerCase() });

  if (accountCount >= emailDomain.maxAccounts) {
    return res.status(403).json({
      success: false,
      message: 'Email account limit reached for this domain',
      current: accountCount,
      maximum: emailDomain.maxAccounts,
      code: 'DOMAIN_ACCOUNT_LIMIT',
      hint: 'Upgrade your plan or delete unused accounts'
    });
  }

  // All checks passed - attach domain to request
  req.emailDomain = emailDomain;
  next();
};

/**
 * Check if user has permission to manage domain
 */
const requireDomainOwnership = async (req, res, next) => {
  const domainId = req.params.id || req.params.domainId;

  if (!domainId) {
    return res.status(400).json({
      success: false,
      message: 'Domain ID is required',
      code: 'DOMAIN_ID_REQUIRED'
    });
  }

  const emailDomain = await EmailDomain.findById(domainId);

  if (!emailDomain) {
    return res.status(404).json({
      success: false,
      message: 'Domain not found',
      code: 'DOMAIN_NOT_FOUND'
    });
  }

  // Admins can access any domain
  if (req.user.role === 'Admin') {
    req.emailDomain = emailDomain;
    return next();
  }

  // Check company ownership
  if (!req.user.companyId || !emailDomain.companyId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'ACCESS_DENIED'
    });
  }

  const userCompanyId = req.user.companyId._id || req.user.companyId;
  const domainCompanyId = emailDomain.companyId._id || emailDomain.companyId;

  if (userCompanyId.toString() !== domainCompanyId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You do not own this domain',
      code: 'DOMAIN_ACCESS_DENIED'
    });
  }

  req.emailDomain = emailDomain;
  next();
};

module.exports = {
  checkReservedDomain,
  requireVerifiedDomain,
  requireOwnedVerifiedDomain,
  requireDomainOwnership
};
