const express = require('express');
const router = express.Router();
const EmailAccount = require('../models/EmailAccount');
const EmailDomain = require('../models/EmailDomain');
const EmailLog = require('../models/EmailLog');
const EmailAuditLog = require('../models/EmailAuditLog');
const EmailTemplate = require('../models/EmailTemplate');
const nodemailer = require('nodemailer');

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
// EMAIL ACCOUNTS
// ==========================================

// Get all email accounts
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, domain, enabled, sort = '-createdAt' } = req.query;

    const query = {};

    // Filter by search
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by domain
    if (domain) {
      query.domain = domain.toLowerCase();
    }

    // Filter by status
    if (enabled !== undefined) {
      query.enabled = enabled === 'true';
    }

    // Pagination
    const skip = (page - 1) * limit;

    const [accounts, total] = await Promise.all([
      EmailAccount.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-password')
        .populate('createdBy', 'fullName email')
        .populate('lastModifiedBy', 'fullName email'),
      EmailAccount.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: accounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    res.status(500).json({ message: 'Failed to fetch email accounts', error: error.message });
  }
});

// Get single email account
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id)
      .select('-password')
      .populate('createdBy', 'fullName email')
      .populate('lastModifiedBy', 'fullName email');

    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Error fetching email account:', error);
    res.status(500).json({ message: 'Failed to fetch email account', error: error.message });
  }
});

// Create email account
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { email, password, displayName, domain, quota, aliases, forwardTo } = req.body;

    // Validation
    if (!email || !password || !domain) {
      return res.status(400).json({ message: 'Email, password, and domain are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Check if email already exists
    const existingAccount = await EmailAccount.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return res.status(400).json({ message: 'Email account already exists' });
    }

    // Check if domain exists and is verified
    const emailDomain = await EmailDomain.findOne({ domain: domain.toLowerCase() });
    if (!emailDomain) {
      return res.status(400).json({ message: 'Domain not found. Please add the domain first.' });
    }

    if (!emailDomain.verified) {
      return res.status(400).json({ message: 'Domain not verified. Please verify DNS records first.' });
    }

    // Check domain account limit
    if (emailDomain.accountCount >= emailDomain.maxAccounts) {
      return res.status(400).json({ message: 'Domain account limit reached' });
    }

    // Create email account
    const account = new EmailAccount({
      email: email.toLowerCase(),
      password,
      displayName: displayName || '',
      domain: domain.toLowerCase(),
      quota: quota || emailDomain.defaultQuota,
      aliases: aliases || [],
      forwardTo: forwardTo || [],
      createdBy: req.user._id
    });

    await account.save();

    // Update domain account count
    emailDomain.accountCount += 1;
    await emailDomain.save();

    // Create audit log
    await EmailAuditLog.log({
      action: 'account_created',
      resourceType: 'email_account',
      resourceId: account._id,
      resourceIdentifier: account.email,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Created email account: ${account.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    // Return account without password
    const accountData = account.toObject();
    delete accountData.password;

    res.status(201).json({
      success: true,
      message: 'Email account created successfully',
      data: accountData
    });
  } catch (error) {
    console.error('Error creating email account:', error);
    res.status(500).json({ message: 'Failed to create email account', error: error.message });
  }
});

// Update email account
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    const { displayName, enabled, quota, aliases, forwardTo, forwardEnabled, keepCopy, spamThreshold } = req.body;

    // Store old values for audit
    const oldValues = {
      displayName: account.displayName,
      enabled: account.enabled,
      quota: account.quota,
      forwardEnabled: account.forwardEnabled
    };

    // Update fields
    if (displayName !== undefined) account.displayName = displayName;
    if (enabled !== undefined) account.enabled = enabled;
    if (quota !== undefined) account.quota = quota;
    if (aliases !== undefined) account.aliases = aliases;
    if (forwardTo !== undefined) account.forwardTo = forwardTo;
    if (forwardEnabled !== undefined) account.forwardEnabled = forwardEnabled;
    if (keepCopy !== undefined) account.keepCopy = keepCopy;
    if (spamThreshold !== undefined) account.spamThreshold = spamThreshold;

    account.lastModifiedBy = req.user._id;

    await account.save();

    // Create audit log
    await EmailAuditLog.log({
      action: 'account_updated',
      resourceType: 'email_account',
      resourceId: account._id,
      resourceIdentifier: account.email,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      oldValues,
      newValues: {
        displayName: account.displayName,
        enabled: account.enabled,
        quota: account.quota,
        forwardEnabled: account.forwardEnabled
      },
      description: `Updated email account: ${account.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    // Return account without password
    const accountData = account.toObject();
    delete accountData.password;

    res.json({
      success: true,
      message: 'Email account updated successfully',
      data: accountData
    });
  } catch (error) {
    console.error('Error updating email account:', error);
    res.status(500).json({ message: 'Failed to update email account', error: error.message });
  }
});

// Reset email account password
router.post('/:id/reset-password', isAuthenticated, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const account = await EmailAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    account.password = newPassword;
    account.lastModifiedBy = req.user._id;
    await account.save();

    // Create audit log
    await EmailAuditLog.log({
      action: 'password_reset',
      resourceType: 'email_account',
      resourceId: account._id,
      resourceIdentifier: account.email,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Reset password for email account: ${account.email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});

// Delete email account
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    const email = account.email;
    const domain = account.domain;

    await account.deleteOne();

    // Update domain account count
    await EmailDomain.updateOne(
      { domain },
      { $inc: { accountCount: -1 } }
    );

    // Create audit log
    await EmailAuditLog.log({
      action: 'account_deleted',
      resourceType: 'email_account',
      resourceId: account._id,
      resourceIdentifier: email,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Deleted email account: ${email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    res.json({
      success: true,
      message: 'Email account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting email account:', error);
    res.status(500).json({ message: 'Failed to delete email account', error: error.message });
  }
});

// Get account SMTP/IMAP credentials
router.get('/:id/credentials', isAuthenticated, async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    const domain = await EmailDomain.findOne({ domain: account.domain });

    if (!domain) {
      return res.status(404).json({ message: 'Domain configuration not found' });
    }

    const credentials = {
      email: account.email,
      displayName: account.displayName,

      // SMTP settings
      smtp: {
        host: domain.smtpHost,
        port: domain.smtpPort,
        secure: domain.smtpSecure,
        username: account.email,
        encryption: domain.smtpSecure ? 'SSL/TLS' : 'STARTTLS'
      },

      // IMAP settings
      imap: {
        host: domain.imapHost,
        port: domain.imapPort,
        secure: domain.imapSecure,
        username: account.email,
        encryption: domain.imapSecure ? 'SSL/TLS' : 'STARTTLS'
      },

      // POP3 settings
      pop: {
        host: domain.popHost,
        port: domain.popPort,
        secure: domain.popSecure,
        username: account.email,
        encryption: domain.popSecure ? 'SSL/TLS' : 'STARTTLS'
      },

      // Webmail
      webmail: domain.webmailEnabled ? {
        url: domain.webmailUrl,
        username: account.email
      } : null
    };

    res.json({
      success: true,
      data: credentials
    });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    res.status(500).json({ message: 'Failed to fetch credentials', error: error.message });
  }
});

// Get account email logs
router.get('/:id/logs', isAuthenticated, async (req, res) => {
  try {
    const {page = 1, limit = 50, direction, status} = req.query;

    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    const query = { emailAccount: account._id };

    if (direction) query.direction = direction;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      EmailLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    res.status(500).json({ message: 'Failed to fetch email logs', error: error.message });
  }
});

module.exports = router;
