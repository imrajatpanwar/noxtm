const express = require('express');
const router = express.Router();
const EmailDomain = require('../models/EmailDomain');
const EmailAuditLog = require('../models/EmailAuditLog');
const dns = require('dns').promises;

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

// Middleware to check admin access
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// ==========================================
// EMAIL DOMAINS
// ==========================================

// Get all domains
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, verified, enabled } = req.query;

    const query = {};

    if (search) {
      query.domain = { $regex: search, $options: 'i' };
    }

    if (verified !== undefined) {
      query.verified = verified === 'true';
    }

    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }

    const skip = (page - 1) * limit;

    const [domains, total] = await Promise.all([
      EmailDomain.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'fullName email')
        .populate('lastModifiedBy', 'fullName email'),
      EmailDomain.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: domains,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({ message: 'Failed to fetch domains', error: error.message });
  }
});

// Get single domain
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const domain = await EmailDomain.findById(req.params.id)
      .populate('createdBy', 'fullName email')
      .populate('lastModifiedBy', 'fullName email');

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    res.json({
      success: true,
      data: domain
    });
  } catch (error) {
    console.error('Error fetching domain:', error);
    res.status(500).json({ message: 'Failed to fetch domain', error: error.message });
  }
});

// Add new domain
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { domain: domainName, defaultQuota, maxAccounts, webmailUrl } = req.body;

    if (!domainName) {
      return res.status(400).json({ message: 'Domain name is required' });
    }

    // Check if domain already exists
    const existing = await EmailDomain.findOne({ domain: domainName.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'Domain already exists' });
    }

    // Create new domain
    const domain = new EmailDomain({
      domain: domainName.toLowerCase(),
      defaultQuota: defaultQuota || 1024,
      maxAccounts: maxAccounts || 100,
      webmailUrl: webmailUrl || '',
      createdBy: req.user._id,
      companyId: req.user.companyId
    });

    // Generate verification token
    domain.generateVerificationToken();

    // Generate DKIM keys
    await domain.generateDKIMKeys();

    // Set default DNS records
    domain.dnsRecords.mx = [
      { priority: 10, host: `mail.${domainName}`, verified: false }
    ];

    domain.dnsRecords.spf = {
      record: `v=spf1 mx a ip4:${process.env.EMAIL_HOST || '185.137.122.61'} ~all`,
      verified: false
    };

    domain.dnsRecords.dmarc = {
      record: `v=DMARC1; p=quarantine; rua=mailto:postmaster@${domainName}`,
      verified: false
    };

    await domain.save();

    // Create audit log
    await EmailAuditLog.log({
      action: 'domain_added',
      resourceType: 'email_domain',
      resourceId: domain._id,
      resourceIdentifier: domain.domain,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Added email domain: ${domain.domain}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    res.status(201).json({
      success: true,
      message: 'Domain added successfully. Please configure DNS records.',
      data: domain
    });
  } catch (error) {
    console.error('Error adding domain:', error);
    res.status(500).json({ message: 'Failed to add domain', error: error.message });
  }
});

// Get DNS setup instructions
router.get('/:id/dns-instructions', isAuthenticated, async (req, res) => {
  try {
    const domain = await EmailDomain.findById(req.params.id);

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    const instructions = {
      domain: domain.domain,
      records: [
        {
          type: 'MX',
          name: domain.domain,
          value: `mail.${domain.domain}`,
          priority: 10,
          purpose: 'Mail server for receiving emails',
          verified: domain.dnsRecords.mx[0]?.verified || false
        },
        {
          type: 'A',
          name: `mail.${domain.domain}`,
          value: process.env.EMAIL_HOST || '185.137.122.61',
          purpose: 'IP address of mail server',
          verified: false
        },
        {
          type: 'TXT',
          name: domain.domain,
          value: domain.dnsRecords.spf.record,
          purpose: 'SPF record for email authentication',
          verified: domain.dnsRecords.spf.verified
        },
        {
          type: 'TXT',
          name: `${domain.dnsRecords.dkim.selector}._domainkey.${domain.domain}`,
          value: domain.dnsRecords.dkim.record,
          purpose: 'DKIM signature for email authentication',
          verified: domain.dnsRecords.dkim.verified
        },
        {
          type: 'TXT',
          name: `_dmarc.${domain.domain}`,
          value: domain.dnsRecords.dmarc.record,
          purpose: 'DMARC policy for email handling',
          verified: domain.dnsRecords.dmarc.verified
        },
        {
          type: 'TXT',
          name: domain.domain,
          value: domain.dnsRecords.verification.record,
          purpose: 'Domain ownership verification',
          verified: domain.dnsRecords.verification.verified
        }
      ],
      setup: {
        description: 'Add these DNS records to your domain registrar or DNS provider',
        steps: [
          '1. Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)',
          '2. Go to DNS management section',
          '3. Add each record listed above',
          '4. Wait 10-30 minutes for DNS propagation',
          '5. Click "Verify DNS" button to check configuration'
        ]
      }
    };

    res.json({
      success: true,
      data: instructions
    });
  } catch (error) {
    console.error('Error fetching DNS instructions:', error);
    res.status(500).json({ message: 'Failed to fetch DNS instructions', error: error.message });
  }
});

// Verify DNS configuration
router.post('/:id/verify-dns', isAuthenticated, async (req, res) => {
  try {
    const domain = await EmailDomain.findById(req.params.id);

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    const results = {
      domain: domain.domain,
      verificationToken: false,
      mx: false,
      spf: false,
      dkim: false,
      dmarc: false
    };

    try {
      // Verify TXT records
      const txtRecords = await dns.resolveTxt(domain.domain);
      const txtFlat = txtRecords.map(r => r.join('')).join(' ');

      // Check verification token
      if (txtFlat.includes(domain.verificationToken)) {
        results.verificationToken = true;
        domain.dnsRecords.verification.verified = true;
      }

      // Check SPF
      if (txtFlat.includes('v=spf1')) {
        results.spf = true;
        domain.dnsRecords.spf.verified = true;
      }

      // Check DMARC
      try {
        const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain.domain}`);
        const dmarcFlat = dmarcRecords.map(r => r.join('')).join(' ');
        if (dmarcFlat.includes('v=DMARC1')) {
          results.dmarc = true;
          domain.dnsRecords.dmarc.verified = true;
        }
      } catch (e) {
        // DMARC record not found
      }

      // Check DKIM
      try {
        const dkimRecords = await dns.resolveTxt(`${domain.dnsRecords.dkim.selector}._domainkey.${domain.domain}`);
        const dkimFlat = dkimRecords.map(r => r.join('')).join(' ');
        if (dkimFlat.includes('v=DKIM1')) {
          results.dkim = true;
          domain.dnsRecords.dkim.verified = true;
        }
      } catch (e) {
        // DKIM record not found
      }
    } catch (error) {
      // TXT records not found
    }

    // Check MX records
    try {
      const mxRecords = await dns.resolveMx(domain.domain);
      if (mxRecords.some(r => r.exchange.includes('mail'))) {
        results.mx = true;
        if (domain.dnsRecords.mx[0]) {
          domain.dnsRecords.mx[0].verified = true;
        }
      }
    } catch (error) {
      // MX records not found
    }

    // Update verified status
    const allVerified = results.verificationToken && results.mx && results.spf;
    if (allVerified && !domain.verified) {
      domain.verified = true;
      domain.verifiedAt = new Date();

      // Create audit log
      await EmailAuditLog.log({
        action: 'domain_verified',
        resourceType: 'email_domain',
        resourceId: domain._id,
        resourceIdentifier: domain.domain,
        performedBy: req.user._id,
        performedByEmail: req.user.email,
        performedByName: req.user.fullName,
        description: `Verified email domain: ${domain.domain}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        companyId: req.user.companyId
      });
    }

    domain.lastModifiedBy = req.user._id;
    await domain.save();

    res.json({
      success: true,
      verified: allVerified,
      message: allVerified ? 'Domain verified successfully!' : 'Some DNS records are missing or incorrect',
      results
    });
  } catch (error) {
    console.error('Error verifying DNS:', error);
    res.status(500).json({ message: 'Failed to verify DNS', error: error.message });
  }
});

// Update domain settings
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const domain = await EmailDomain.findById(req.params.id);

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    const {
      enabled,
      defaultQuota,
      maxAccounts,
      totalQuota,
      webmailUrl,
      webmailEnabled,
      spamFilterEnabled,
      defaultSpamThreshold
    } = req.body;

    const oldValues = {
      enabled: domain.enabled,
      defaultQuota: domain.defaultQuota,
      maxAccounts: domain.maxAccounts
    };

    if (enabled !== undefined) domain.enabled = enabled;
    if (defaultQuota !== undefined) domain.defaultQuota = defaultQuota;
    if (maxAccounts !== undefined) domain.maxAccounts = maxAccounts;
    if (totalQuota !== undefined) domain.totalQuota = totalQuota;
    if (webmailUrl !== undefined) domain.webmailUrl = webmailUrl;
    if (webmailEnabled !== undefined) domain.webmailEnabled = webmailEnabled;
    if (spamFilterEnabled !== undefined) domain.spamFilterEnabled = spamFilterEnabled;
    if (defaultSpamThreshold !== undefined) domain.defaultSpamThreshold = defaultSpamThreshold;

    domain.lastModifiedBy = req.user._id;
    await domain.save();

    // Create audit log
    await EmailAuditLog.log({
      action: 'domain_updated',
      resourceType: 'email_domain',
      resourceId: domain._id,
      resourceIdentifier: domain.domain,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      oldValues,
      newValues: {
        enabled: domain.enabled,
        defaultQuota: domain.defaultQuota,
        maxAccounts: domain.maxAccounts
      },
      description: `Updated email domain: ${domain.domain}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    res.json({
      success: true,
      message: 'Domain updated successfully',
      data: domain
    });
  } catch (error) {
    console.error('Error updating domain:', error);
    res.status(500).json({ message: 'Failed to update domain', error: error.message });
  }
});

// Delete domain
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const domain = await EmailDomain.findById(req.params.id);

    if (!domain) {
      return res.status(404).json({ message: 'Domain not found' });
    }

    if (domain.accountCount > 0) {
      return res.status(400).json({
        message: `Cannot delete domain with ${domain.accountCount} active email accounts. Please delete accounts first.`
      });
    }

    const domainName = domain.domain;
    await domain.deleteOne();

    // Create audit log
    await EmailAuditLog.log({
      action: 'domain_deleted',
      resourceType: 'email_domain',
      resourceId: domain._id,
      resourceIdentifier: domainName,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Deleted email domain: ${domainName}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    res.json({
      success: true,
      message: 'Domain deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting domain:', error);
    res.status(500).json({ message: 'Failed to delete domain', error: error.message });
  }
});

module.exports = router;
