const express = require('express');
const router = express.Router();
const EmailAccount = require('../models/EmailAccount');
const EmailDomain = require('../models/EmailDomain');
const EmailLog = require('../models/EmailLog');
const EmailAuditLog = require('../models/EmailAuditLog');
const EmailTemplate = require('../models/EmailTemplate');
const nodemailer = require('nodemailer');
const { encrypt, decrypt, generateSecurePassword } = require('../utils/encryption');
const { testEmailAccount, getEmailProviderPreset, getInboxStats } = require('../utils/imapHelper');
const { createMailbox, getQuota, updateQuota, deleteMailbox, isDoveadmAvailable } = require('../utils/doveadmHelper');

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

// ==========================================
// FETCH INBOX EMAILS VIA IMAP (Must be before /:id route)
// ==========================================

// Fetch emails from hosted account inbox
router.get('/fetch-inbox', isAuthenticated, async (req, res) => {
  try {
    const { accountId, folder = 'INBOX', page = 1, limit = 50 } = req.query;

    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required' });
    }

    const account = await EmailAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Only fetch for hosted accounts
    if (account.accountType !== 'noxtm-hosted') {
      return res.status(400).json({ message: 'Only hosted accounts support inbox fetching' });
    }

    // For hosted accounts, use IMAP to fetch emails
    const { fetchEmails } = require('../utils/imapHelper');
    
    // Decrypt password
    const password = decrypt(account.password);

    // Configure IMAP connection for hosted account - use IP address
    const imapConfig = {
      host: '185.137.122.61',
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: true,
      username: account.email,
      password: password
    };

    console.log(`Fetching inbox for ${account.email} from ${imapConfig.host}:${imapConfig.port}`);

    const result = await fetchEmails(imapConfig, folder, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      emails: result.emails,
      total: result.total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(result.total / limit)
    });

  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ 
      message: 'Failed to fetch inbox', 
      error: error.message 
    });
  }
});

// Send email from hosted account
router.post('/send-email', isAuthenticated, async (req, res) => {
  try {
    const { accountId, to, subject, body, cc, bcc } = req.body;

    if (!accountId || !to || !subject) {
      return res.status(400).json({ message: 'Account ID, recipient, and subject are required' });
    }

    const account = await EmailAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Decrypt password
    const password = decrypt(account.password);

    // Configure SMTP for hosted account - use IP address
    const transporter = nodemailer.createTransporter({
      host: '185.137.122.61',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: account.email,
        pass: password
      }
    });

    const mailOptions = {
      from: `${account.displayName || account.email} <${account.email}>`,
      to: to,
      subject: subject,
      html: body,
      cc: cc,
      bcc: bcc
    };

    const info = await transporter.sendMail(mailOptions);

    // Log the sent email
    await EmailLog.create({
      direction: 'sent',
      status: 'sent',
      from: account.email,
      to: Array.isArray(to) ? to : [to],
      cc: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
      bcc: bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [],
      subject: subject,
      body: body,
      sentAt: new Date(),
      messageId: info.messageId
    });

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log failed email
    try {
      await EmailLog.create({
        direction: 'sent',
        status: 'failed',
        from: req.body.accountId,
        to: Array.isArray(req.body.to) ? req.body.to : [req.body.to],
        subject: req.body.subject,
        body: req.body.body,
        errorMessage: error.message,
        sentAt: new Date()
      });
    } catch (logError) {
      console.error('Error logging failed email:', logError);
    }

    res.status(500).json({ 
      message: 'Failed to send email', 
      error: error.message 
    });
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

// ==========================================
// NEW: CREATE @noxtm.com HOSTED ACCOUNT
// ==========================================

// Create a new @noxtm.com email account on the server
router.post('/create-noxtm', isAuthenticated, async (req, res) => {
  try {
    const { username, quotaMB = 1024 } = req.body;

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Validate username format
    if (!/^[a-z0-9._-]+$/i.test(username)) {
      return res.status(400).json({ message: 'Invalid username format. Use only letters, numbers, dots, hyphens, and underscores.' });
    }

    // Check if doveadm is available
    const doveadmAvailable = await isDoveadmAvailable();
    if (!doveadmAvailable) {
      return res.status(500).json({ message: 'Mail server (doveadm) not available. Please contact administrator.' });
    }

    const email = `${username}@noxtm.com`;

    // Check if email already exists
    const existingAccount = await EmailAccount.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return res.status(400).json({ message: 'Email account already exists' });
    }

    // Generate secure password
    const password = generateSecurePassword(16);

    // Create mailbox on server using doveadm
    await createMailbox(email, password, quotaMB);

    // Create email account in database
    const account = new EmailAccount({
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook
      accountType: 'noxtm-hosted',
      displayName: username,
      domain: 'noxtm.com',
      quota: quotaMB,
      isVerified: true, // Hosted accounts are auto-verified
      createdBy: req.user?._id, // Optional
      imapEnabled: true,
      smtpEnabled: true
    });

    await account.save();

    // Create audit log (only if user info is available)
    if (req.user?._id) {
      try {
        await EmailAuditLog.log({
          action: 'noxtm_account_created',
          resourceType: 'email_account',
          resourceId: account._id,
          resourceIdentifier: account.email,
          performedBy: req.user._id,
          performedByEmail: req.user.email,
          performedByName: req.user.fullName,
          description: `Created @noxtm.com account: ${account.email}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          companyId: req.user.companyId
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError.message);
        // Don't fail the request if audit log fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Email account created successfully on Noxtm mail server',
      data: {
        email: account.email,
        password: password, // Return plain password only once for user to save
        imapHost: 'mail.noxtm.com',
        imapPort: 993,
        smtpHost: 'mail.noxtm.com',
        smtpPort: 587,
        quota: quotaMB
      }
    });
  } catch (error) {
    console.error('Error creating @noxtm.com account:', error);
    res.status(500).json({ message: 'Failed to create email account', error: error.message });
  }
});

// ==========================================
// NEW: ADD EXISTING EXTERNAL EMAIL (IMAP)
// ==========================================

// Test email account connection (IMAP/SMTP)
router.post('/test-connection', isAuthenticated, async (req, res) => {
  try {
    const { email, imapHost, imapPort, imapSecure, imapUsername, imapPassword, smtpHost, smtpPort, smtpSecure, smtpUsername, smtpPassword } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    // Check for presets
    const preset = getEmailProviderPreset(email);
    
    const imapConfig = {
      host: imapHost || preset?.imap?.host,
      port: imapPort || preset?.imap?.port || 993,
      secure: imapSecure !== undefined ? imapSecure : (preset?.imap?.secure !== false),
      username: imapUsername || email,
      password: imapPassword
    };

    const smtpConfig = smtpHost ? {
      host: smtpHost || preset?.smtp?.host,
      port: smtpPort || preset?.smtp?.port || 587,
      secure: smtpSecure !== undefined ? smtpSecure : (preset?.smtp?.secure !== false),
      username: smtpUsername || email,
      password: smtpPassword || imapPassword
    } : null;

    const results = await testEmailAccount(imapConfig, smtpConfig);

    res.json({
      success: results.imap?.success && (!smtpConfig || results.smtp?.success),
      results: results,
      message: results.imap?.success ? 'Connection test successful' : 'Connection test failed'
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ message: 'Connection test failed', error: error.message });
  }
});

// Add existing external email account
router.post('/add-external', isAuthenticated, async (req, res) => {
  try {
    const { 
      email, 
      displayName,
      imapHost, 
      imapPort, 
      imapSecure, 
      imapUsername, 
      imapPassword,
      smtpHost, 
      smtpPort, 
      smtpSecure, 
      smtpUsername, 
      smtpPassword 
    } = req.body;

    if (!email || !imapPassword) {
      return res.status(400).json({ message: 'Email and IMAP password are required' });
    }

    // Check if email already exists
    const existingAccount = await EmailAccount.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return res.status(400).json({ message: 'Email account already added' });
    }

    // Get preset if available
    const preset = getEmailProviderPreset(email);

    // Test IMAP connection before saving
    const imapConfig = {
      host: imapHost || preset?.imap?.host,
      port: imapPort || preset?.imap?.port || 993,
      secure: imapSecure !== undefined ? imapSecure : true,
      username: imapUsername || email,
      password: imapPassword
    };

    const testResult = await testEmailAccount(imapConfig, null);

    if (!testResult.imap?.success) {
      return res.status(400).json({ 
        message: 'IMAP connection failed', 
        error: testResult.imap?.message 
      });
    }

    // Encrypt passwords
    const encryptedImapPassword = encrypt(imapPassword);
    const encryptedSmtpPassword = smtpPassword ? encrypt(smtpPassword) : encrypt(imapPassword);

    // Extract domain from email
    const domain = email.split('@')[1];

    // Create email account
    const account = new EmailAccount({
      email: email.toLowerCase(),
      password: imapPassword, // Will be hashed by pre-save hook
      accountType: 'external-imap',
      displayName: displayName || email.split('@')[0],
      domain: domain,
      isVerified: true,
      imapSettings: {
        host: imapConfig.host,
        port: imapConfig.port,
        secure: imapConfig.secure,
        username: imapConfig.username,
        encryptedPassword: encryptedImapPassword
      },
      smtpSettings: {
        host: smtpHost || preset?.smtp?.host || imapConfig.host,
        port: smtpPort || preset?.smtp?.port || 587,
        secure: smtpSecure !== undefined ? smtpSecure : false,
        username: smtpUsername || email,
        encryptedPassword: encryptedSmtpPassword
      },
      inboxStats: {
        totalMessages: testResult.imap?.stats?.totalMessages || 0,
        unreadMessages: testResult.imap?.stats?.unreadMessages || 0,
        lastSyncedAt: new Date()
      },
      createdBy: req.user?._id, // Optional
      lastConnectionTest: new Date()
    });

    await account.save();

    // Create audit log (only if user info is available)
    if (req.user?._id) {
      try {
        await EmailAuditLog.log({
          action: 'external_account_added',
          resourceType: 'email_account',
          resourceId: account._id,
          resourceIdentifier: account.email,
          performedBy: req.user._id,
          performedByEmail: req.user.email,
          performedByName: req.user.fullName,
          description: `Added external email account: ${account.email}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          companyId: req.user.companyId
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError.message);
        // Don't fail the request if audit log fails
      }
    }

    // Return account without sensitive data
    const accountData = account.toObject();
    delete accountData.password;
    delete accountData.imapSettings.encryptedPassword;
    delete accountData.smtpSettings.encryptedPassword;

    res.status(201).json({
      success: true,
      message: 'External email account added successfully',
      data: accountData
    });
  } catch (error) {
    console.error('Error adding external account:', error);
    res.status(500).json({ message: 'Failed to add external account', error: error.message });
  }
});

// ==========================================
// NEW: QUOTA MANAGEMENT
// ==========================================

// Get quota for an email account
router.get('/:id/quota', isAuthenticated, async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    let quotaData = {
      email: account.email,
      accountType: account.accountType,
      limit: account.quota,
      used: account.usedStorage,
      percentage: account.storagePercentage
    };

    // For hosted accounts, get real-time quota from doveadm
    if (account.accountType === 'noxtm-hosted') {
      try {
        const doveadmQuota = await getQuota(account.email);
        
        // Only update if we got real data (not default fallback)
        if (doveadmQuota.limit > 0) {
          account.usedStorage = doveadmQuota.used;
          account.quota = doveadmQuota.limit;
          await account.save();
        }

        quotaData = {
          email: account.email,
          accountType: account.accountType,
          limit: doveadmQuota.limit,
          used: doveadmQuota.used,
          percentage: doveadmQuota.percentage
        };
      } catch (error) {
        // Only log if it's not the "not available" error (local dev)
        if (!error.message.includes('not available')) {
          console.error('Error fetching doveadm quota:', error);
        }
        // Fall back to database values
      }
    }

    res.json({
      success: true,
      data: quotaData
    });
  } catch (error) {
    console.error('Error fetching quota:', error);
    res.status(500).json({ message: 'Failed to fetch quota', error: error.message });
  }
});

// Sync inbox stats for external IMAP account
router.post('/:id/sync-inbox', isAuthenticated, async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id);

    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    if (account.accountType !== 'external-imap') {
      return res.status(400).json({ message: 'Only external IMAP accounts can be synced' });
    }

    // Decrypt password and test connection
    const imapPassword = decrypt(account.imapSettings.encryptedPassword);
    
    const stats = await getInboxStats({
      host: account.imapSettings.host,
      port: account.imapSettings.port,
      secure: account.imapSettings.secure,
      username: account.imapSettings.username,
      password: imapPassword
    });

    // Update inbox stats
    account.inboxStats = {
      totalMessages: stats.total,
      unreadMessages: stats.unread,
      lastSyncedAt: new Date()
    };
    account.lastConnectionTest = new Date();
    account.connectionError = null;

    await account.save();

    res.json({
      success: true,
      message: 'Inbox synced successfully',
      data: {
        totalMessages: stats.total,
        unreadMessages: stats.unread,
        lastSyncedAt: account.inboxStats.lastSyncedAt
      }
    });
  } catch (error) {
    console.error('Error syncing inbox:', error);
    
    // Update connection error
    const account = await EmailAccount.findById(req.params.id);
    if (account) {
      account.connectionError = error.message;
      account.lastConnectionTest = new Date();
      await account.save();
    }

    res.status(500).json({ message: 'Failed to sync inbox', error: error.message });
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
