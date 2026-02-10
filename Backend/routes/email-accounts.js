const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const EmailAccount = require('../models/EmailAccount');
const EmailDomain = require('../models/EmailDomain');
const EmailLog = require('../models/EmailLog');
const EmailAuditLog = require('../models/EmailAuditLog');
const EmailTemplate = require('../models/EmailTemplate');
const UserVerifiedDomain = require('../models/UserVerifiedDomain');
const nodemailer = require('nodemailer');
const { encrypt, decrypt, generateSecurePassword } = require('../utils/encryption');
const { testEmailAccount, getEmailProviderPreset, getInboxStats, appendEmailToFolder } = require('../utils/imapHelper');
const { createMailbox, getQuota, updateQuota, deleteMailbox, isDoveadmAvailable } = require('../utils/doveadmHelper');
const { getCachedEmailList, cacheEmailList, getCachedEmailBody, cacheEmailBody, invalidateFolderCache } = require('../utils/emailCache');
const { scheduleSyncJob, syncMultiplePages } = require('../utils/emailSyncWorker');
const { requireCompanyOwner, requireEmailAccess, requireCompanyAccess } = require('../middleware/emailAuth');
const { requireOwnedVerifiedDomain } = require('../middleware/emailDomain');
const mailConfig = require('../config/mailConfig');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const plainTextToHtml = (content = '') => {
  if (!content) return '<p></p>';
  const containsHtmlTags = /<[^>]+>/i.test(content);
  if (containsHtmlTags) {
    return content;
  }

  return content
    .split(/\n/)
    .map(line => line.trim() ? `<p>${escapeHtml(line)}</p>` : '<br />')
    .join('');
};

const stripHtml = (content = '') => content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const fallbackAvatarFor = (name = '', email = '') => {
  const label = name || email || 'User';
  return `https://ui-avatars.com/api/?background=3B82F6&color=fff&name=${encodeURIComponent(label)}`;
};

const buildEmailEnvelope = ({ senderName, senderEmail, avatarUrl, bodyHtml }) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="font-family: 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; box-shadow:0 10px 35px rgba(15, 23, 42, 0.08); overflow:hidden;">
          <tr>
            <td style="padding:24px; border-bottom:1px solid #edf2f7;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="64" valign="top">
                    <img src="${avatarUrl}" width="50" height="50" style="border-radius:50%; object-fit:cover; display:block;" alt="${senderName} avatar" />
                  </td>
                  <td valign="middle">
                    <div style="font-size:16px; font-weight:600; color:#111827;">${senderName}</div>
                    <div style="font-size:13px; color:#6b7280;">${senderEmail}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 32px; color:#1f2937; font-size:15px; line-height:1.7;">
              ${bodyHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
`;

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

// Get email accounts for user's own domains (user-level isolation)
router.get('/by-verified-domain', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get models
    const EmailDomain = require('../models/EmailDomain');
    const UserVerifiedDomain = require('../models/UserVerifiedDomain');

    // 1. Get domains from EmailDomain (legacy model)
    const emailDomains = await EmailDomain.find({
      createdBy: userId,
      $or: [
        { verified: true },
        { dnsVerified: true }
      ]
    }).select('domain');

    const emailDomainNames = emailDomains.map(d => d.domain.toLowerCase());

    // 2. Get domains from UserVerifiedDomain (new model with AWS SES)
    const userVerifiedDomains = await UserVerifiedDomain.find({
      userId: userId,
      verificationStatus: 'SUCCESS',
      enabled: true
    }).select('domain');

    const userVerifiedDomainNames = userVerifiedDomains.map(d => d.domain.toLowerCase());

    // 3. Combine both domain lists (remove duplicates)
    const allDomainNames = [...new Set([...emailDomainNames, ...userVerifiedDomainNames])];

    console.log(`[by-verified-domain] User ${userId} owns domains:`, allDomainNames);

    // 4. Fetch only email accounts on domains owned by this user
    const query = {
      domain: { $in: allDomainNames },
      enabled: true
    };

    // 5. Fetch email accounts
    const accounts = await EmailAccount.find(query)
      .select('-password')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`[by-verified-domain] Found ${accounts.length} accounts on user's domains`);

    res.json({
      success: true,
      accounts: accounts,
      verifiedDomains: allDomainNames
    });
  } catch (error) {
    console.error('[by-verified-domain] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email accounts by verified domain',
      error: error.message
    });
  }
});

// Authenticate and connect to an existing email account
// Used by invited workspace members to connect to accounts created by owner
router.post('/connect', isAuthenticated, async (req, res) => {
  try {
    const { email, password } = req.body;
    const userId = req.user._id;

    console.log(`[connect] User ${req.user.email} attempting to connect to ${email}`);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find the email account
    const EmailAccount = require('../models/EmailAccount');
    const emailAccount = await EmailAccount.findOne({
      email: email.toLowerCase(),
      enabled: true
    });

    if (!emailAccount) {
      return res.status(404).json({
        success: false,
        message: 'Email account not found'
      });
    }

    // Verify the password
    const isPasswordValid = await emailAccount.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check if user has company access to this account
    // If account has companyId, verify user is in the same company
    if (emailAccount.companyId) {
      if (!req.user.companyId) {
        return res.status(403).json({
          success: false,
          message: 'You must be part of a workspace to access this account'
        });
      }

      if (!emailAccount.companyId.equals(req.user.companyId)) {
        return res.status(403).json({
          success: false,
          message: 'This email account belongs to a different workspace'
        });
      }

      // Check role-based access permissions
      const hasAccess = await emailAccount.hasAccess(req.user);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this email account'
        });
      }
    } else {
      // Personal account - only creator can connect
      if (!emailAccount.createdBy.equals(userId)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this email account'
        });
      }
    }

    // Create/update a UserEmailConnection record to remember this connection
    const UserEmailConnection = require('../models/UserEmailConnection');

    await UserEmailConnection.findOneAndUpdate(
      { userId, emailAccountId: emailAccount._id },
      {
        userId,
        emailAccountId: emailAccount._id,
        email: emailAccount.email,
        lastConnectedAt: new Date(),
        // Store encrypted credentials for auto-login
        encryptedPassword: emailAccount.imapSettings?.encryptedPassword
      },
      { upsert: true, new: true }
    );

    // Get user's permissions for this account
    const permissions = emailAccount.companyId ? await emailAccount.getPermissions(req.user) : {
      canSend: true,
      canRead: true,
      canDelete: true,
      canManage: true
    };

    // Update last login
    emailAccount.lastLoginAt = new Date();
    await emailAccount.save();

    // Return account info without password
    const accountData = emailAccount.toObject();
    delete accountData.password;
    delete accountData.imapSettings?.encryptedPassword;
    delete accountData.smtpSettings?.encryptedPassword;

    res.json({
      success: true,
      message: 'Successfully connected to email account',
      account: accountData,
      permissions
    });
  } catch (error) {
    console.error('[connect] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to email account',
      error: error.message
    });
  }
});

// Get connected email accounts for current user
router.get('/connected', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const UserEmailConnection = require('../models/UserEmailConnection');

    // Get all connected accounts for this user
    const connections = await UserEmailConnection.find({ userId })
      .populate('emailAccountId')
      .sort({ lastConnectedAt: -1 });

    // Filter out deleted accounts and get valid ones
    const validConnections = connections
      .filter(conn => conn.emailAccountId && conn.emailAccountId.enabled)
      .map(conn => {
        const account = conn.emailAccountId.toObject();
        delete account.password;
        delete account.imapSettings?.encryptedPassword;
        delete account.smtpSettings?.encryptedPassword;
        return account;
      });

    res.json({
      success: true,
      accounts: validConnections
    });
  } catch (error) {
    console.error('[connected] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connected accounts',
      error: error.message
    });
  }
});

// Get email accounts by domain name (only if user owns the domain)
router.get('/by-domain/:domainName', isAuthenticated, async (req, res) => {
  try {
    const { domainName } = req.params;
    const userId = req.user.userId;

    console.log(`[by-domain] User ${userId} requesting accounts for domain: ${domainName}`);

    // Get EmailDomain model
    const EmailDomain = require('../models/EmailDomain');

    // 1. Verify user owns this domain
    const domain = await EmailDomain.findOne({
      domain: domainName.toLowerCase(),
      createdBy: userId
    });

    if (!domain) {
      console.warn(`[by-domain] User ${userId} does not own domain ${domainName}`);
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this domain'
      });
    }

    // 2. Fetch email accounts for this domain
    const accounts = await EmailAccount.find({
      domain: domainName.toLowerCase(),
      enabled: true
    })
      .select('email displayName accountType createdAt quota usedStorage')
      .sort('-createdAt')
      .lean();

    console.log(`[by-domain] Found ${accounts.length} accounts for ${domainName}`);

    res.json({
      success: true,
      accounts: accounts,
      count: accounts.length
    });
  } catch (error) {
    console.error('[by-domain] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email accounts for domain',
      error: error.message
    });
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
      console.warn('fetch-inbox rejected: missing accountId');
      return res.status(400).json({ message: 'Account ID is required' });
    }

    const account = await EmailAccount.findById(accountId);
    if (!account) {
      console.warn(`fetch-inbox rejected: account not found (${accountId})`);
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Only fetch for hosted accounts
    if (account.accountType !== 'noxtm-hosted') {
      console.warn(`fetch-inbox rejected: accountType=${account.accountType} for ${account.email}`);
      return res.status(400).json({ message: 'Only hosted accounts support inbox fetching' });
    }

    // Check if IMAP settings exist
    if (!account.imapSettings || !account.imapSettings.encryptedPassword) {
      console.warn(`fetch-inbox rejected: missing IMAP settings for ${account.email}`);
      return res.status(400).json({ message: 'IMAP settings not configured for this account' });
    }

    // For hosted accounts, use IMAP to fetch emails
    const { fetchEmails } = require('../utils/imapHelper');

    // Decrypt password from imapSettings
    const password = decrypt(account.imapSettings.encryptedPassword);

    // If decryption fails, it will throw an error, which is caught by the catch block
    // No need to add extra checks here, as the error is already descriptive

    // Configure IMAP connection for hosted account
    // Use localhost since Dovecot is on the same server
    const host = account.imapSettings.host || '127.0.0.1';
    const imapConfig = {
      host: host,
      port: account.imapSettings.port || 993,
      secure: account.imapSettings.secure !== false,
      username: account.imapSettings.username || account.email,
      password: password
    };

    const startTime = Date.now();

    // Try to get from cache first
    console.log(`🧠 Checking cache for ${account.email} page ${page}`);
    const cached = await getCachedEmailList(accountId, folder, parseInt(page));

    if (cached) {
      console.log(`📦 Serving ${cached.emails.length} emails from cache (${Date.now() - startTime}ms)`);

      // Schedule background refresh for next pages
      if (parseInt(page) === 1) {
        syncMultiplePages(accountId, folder, 3).catch(err =>
          console.error('Background sync scheduling failed:', err)
        );
      }

      console.log(`📤 Responding with cached inbox for ${account.email} (page ${page})`);
      return res.json({
        success: true,
        emails: cached.emails,
        total: cached.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(cached.total / limit),
        cached: true
      });
    }

    console.log(`🔍 Cache MISS - Fetching inbox for ${account.email} from ${imapConfig.host}:${imapConfig.port}`);

    const result = await fetchEmails(imapConfig, folder, parseInt(page), parseInt(limit));

    const duration = Date.now() - startTime;
    console.log(`✅ Fetched ${result.emails.length} emails in ${duration}ms`);

    // Cache the result
    console.log(`🧠 Caching ${result.emails.length} emails for ${account.email} page ${page}`);
    await cacheEmailList(accountId, folder, parseInt(page), result.emails, result.total);
    console.log(`🧠 Cache write complete for ${account.email} page ${page}`);

    // Schedule background sync for next pages
    if (parseInt(page) === 1 && result.total > parseInt(limit)) {
      const totalPages = Math.min(3, Math.ceil(result.total / parseInt(limit)));
      syncMultiplePages(accountId, folder, totalPages).catch(err =>
        console.error('Background sync scheduling failed:', err)
      );
    }

    console.log(`📤 Responding with fresh inbox for ${account.email} (page ${page})`);
    res.json({
      success: true,
      emails: result.emails,
      total: result.total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(result.total / limit),
      cached: false
    });

  } catch (error) {
    console.error('Error fetching inbox:', error);
    if (res.headersSent) {
      console.error('⚠️  fetch-inbox error after headers sent, request may hang');
    }
    res.status(500).json({
      message: 'Failed to fetch inbox',
      error: error.message
    });
  }
});

// Fetch single email body by UID
router.get('/fetch-email-body', isAuthenticated, async (req, res) => {
  try {
    const { accountId, uid, folder } = req.query;

    if (!accountId || !uid) {
      return res.status(400).json({ message: 'Account ID and UID are required' });
    }

    const folderName = folder || 'INBOX';

    // Check cache first
    const cached = await getCachedEmailBody(accountId, uid);
    if (cached) {
      // Enrich cached email with sender's profile image if available
      if (cached && cached.from && cached.from.address) {
        try {
          const User = require('../models/User');
          const senderUser = await User.findOne(
            { email: cached.from.address },
            { emailAvatar: 1, profileImage: 1, fullName: 1 }
          ).lean();

          if (senderUser) {
            cached.from.avatar = senderUser.emailAvatar || senderUser.profileImage || null;
            if (senderUser.fullName && !cached.from.name) {
              cached.from.name = senderUser.fullName;
            }
          }
        } catch (lookupError) {
          console.warn('Failed to lookup sender profile from cache:', lookupError.message);
        }
      }
      return res.json({ success: true, email: cached, cached: true });
    }

    const account = await EmailAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (account.accountType !== 'noxtm-hosted') {
      return res.status(400).json({ message: 'Only hosted accounts support this feature' });
    }

    if (!account.imapSettings || !account.imapSettings.encryptedPassword) {
      return res.status(400).json({ message: 'IMAP settings not configured' });
    }

    const { fetchSingleEmail } = require('../utils/imapHelper');
    const password = decrypt(account.imapSettings.encryptedPassword);
    const host = account.imapSettings.host === 'mail.noxtm.com' ? '127.0.0.1' : (account.imapSettings.host || '127.0.0.1');

    const imapConfig = {
      host: host,
      port: account.imapSettings.port || 993,
      secure: account.imapSettings.secure !== false,
      username: account.imapSettings.username || account.email,
      password: password
    };

    console.log(`📧 Fetching email body for UID ${uid} from ${folderName} folder of ${account.email}`);
    const startTime = Date.now();

    const email = await fetchSingleEmail(imapConfig, parseInt(uid), folderName);

    console.log(`✅ Fetched email body in ${Date.now() - startTime}ms`);

    // Enrich email data with sender's profile image if they have an account
    if (email && email.from && email.from.address) {
      try {
        const User = require('../models/User');
        const senderUser = await User.findOne(
          { email: email.from.address },
          { emailAvatar: 1, profileImage: 1, fullName: 1 }
        ).lean();

        if (senderUser) {
          email.from.avatar = senderUser.emailAvatar || senderUser.profileImage || null;
          if (senderUser.fullName && !email.from.name) {
            email.from.name = senderUser.fullName;
          }
        }
      } catch (lookupError) {
        console.warn('Failed to lookup sender profile:', lookupError.message);
      }
    }

    // Cache the email body
    await cacheEmailBody(accountId, uid, email);

    res.json({ success: true, email, cached: false });

  } catch (error) {
    console.error('Error fetching email body:', error);
    res.status(500).json({
      message: 'Failed to fetch email body',
      error: error.message
    });
  }
});

// Mark email as read
router.post('/mark-as-read', isAuthenticated, async (req, res) => {
  try {
    const { accountId, uid, folder } = req.body;

    if (!accountId || !uid) {
      return res.status(400).json({ message: 'Account ID and UID are required' });
    }

    const folderName = folder || 'INBOX';

    const account = await EmailAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (account.accountType !== 'noxtm-hosted') {
      return res.status(400).json({ message: 'Only hosted accounts support this feature' });
    }

    if (!account.imapSettings || !account.imapSettings.encryptedPassword) {
      return res.status(400).json({ message: 'IMAP settings not configured' });
    }

    const Imap = require('imap');
    const password = decrypt(account.imapSettings.encryptedPassword);
    const host = account.imapSettings.host === 'mail.noxtm.com' ? '127.0.0.1' : (account.imapSettings.host || '127.0.0.1');

    const imapConfig = {
      user: account.imapSettings.username || account.email,
      password: password,
      host: host,
      port: account.imapSettings.port || 993,
      tls: account.imapSettings.secure !== false,
      tlsOptions: { rejectUnauthorized: false }
    };

    console.log(`📧 Marking email UID ${uid} as read in ${folderName} folder of ${account.email}`);

    // Mark email as read using IMAP
    await new Promise((resolve, reject) => {
      const imap = new Imap(imapConfig);

      imap.once('ready', () => {
        imap.openBox(folderName, false, (err) => {  // false = read-write mode
          if (err) {
            imap.end();
            return reject(err);
          }

          imap.addFlags([parseInt(uid)], ['\\Seen'], (flagErr) => {
            imap.end();
            if (flagErr) {
              return reject(flagErr);
            }
            resolve();
          });
        });
      });

      imap.once('error', (err) => {
        reject(err);
      });

      imap.connect();
    });

    console.log(`✅ Marked email UID ${uid} as read`);

    // Invalidate cache for this folder to reflect the read status
    await invalidateFolderCache(accountId, folderName);

    res.json({ success: true, message: 'Email marked as read' });

  } catch (error) {
    console.error('Error marking email as read:', error);
    res.status(500).json({
      message: 'Failed to mark email as read',
      error: error.message
    });
  }
});

// Download email attachment
router.get('/download-attachment', isAuthenticated, async (req, res) => {
  try {
    const { accountId, uid, folder, index } = req.query;

    if (!accountId || !uid || index === undefined) {
      return res.status(400).json({ message: 'Account ID, UID, and attachment index are required' });
    }

    const folderName = folder || 'INBOX';

    // Fetch email with attachments
    const account = await EmailAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (account.accountType !== 'noxtm-hosted') {
      return res.status(400).json({ message: 'Only hosted accounts support this feature' });
    }

    if (!account.imapSettings || !account.imapSettings.encryptedPassword) {
      return res.status(400).json({ message: 'IMAP settings not configured' });
    }

    const { fetchSingleEmail } = require('../utils/imapHelper');
    const password = decrypt(account.imapSettings.encryptedPassword);
    const host = account.imapSettings.host === 'mail.noxtm.com' ? '127.0.0.1' : (account.imapSettings.host || '127.0.0.1');

    const imapConfig = {
      host: host,
      port: account.imapSettings.port || 993,
      secure: account.imapSettings.secure !== false,
      username: account.imapSettings.username || account.email,
      password: password
    };

    const email = await fetchSingleEmail(imapConfig, parseInt(uid), folderName);

    if (!email.attachments || !email.attachments[index]) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const attachment = email.attachments[index];

    if (!attachment.content) {
      return res.status(404).json({ message: 'Attachment content not available' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(attachment.content, 'base64');

    // Set response headers
    res.setHeader('Content-Type', attachment.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // Send the file
    res.send(buffer);

  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      message: 'Failed to download attachment',
      error: error.message
    });
  }
});

// Send email from hosted account
router.post('/send-email', isAuthenticated, async (req, res) => {
  try {
    const { accountId, to, subject, body, cc, bcc } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ message: 'Recipient and subject are required' });
    }

    // FIXED: Use SMTP via mail server instead of AWS SES
    const nodemailer = require('nodemailer');

    let senderProfile = null;
    if (mongoose.Types.ObjectId.isValid(req.user.userId)) {
      try {
        senderProfile = await mongoose.connection.collection('users').findOne(
          { _id: new mongoose.Types.ObjectId(req.user.userId) },
          { projection: { fullName: 1, profileImage: 1, emailAvatar: 1 } }
        );
      } catch (profileError) {
        console.warn('Unable to load sender profile for avatar rendering:', profileError.message);
      }
    }

    // Get sender email from selected account or user's verified domain account
    let fromEmail = process.env.EMAIL_FROM || 'noreply@noxtm.com';
    if (accountId) {
      const account = await EmailAccount.findById(accountId);
      if (account) {
        fromEmail = account.email;
      }
    } else {
      // No account selected - try to use user's primary email
      if (senderProfile && senderProfile.email) {
        fromEmail = senderProfile.email;
      }
    }

    const senderName = senderProfile?.fullName || 'NOXTM Mail';
    const avatarUrl =
      senderProfile?.emailAvatar ||
      senderProfile?.profileImage ||
      process.env.DEFAULT_AVATAR_URL ||
      fallbackAvatarFor(senderName, fromEmail);

    const originalBody = body || '';
    const bodyHtml = plainTextToHtml(originalBody);
    // Send clean HTML without envelope wrapper - let email clients handle sender display
    const plainTextVariant = originalBody ? stripHtml(originalBody) : stripHtml(bodyHtml);

    // Build recipients array
    const recipients = Array.isArray(to) ? to : [to];
    if (cc) {
      const ccArray = Array.isArray(cc) ? cc : [cc];
      recipients.push(...ccArray);
    }
    if (bcc) {
      const bccArray = Array.isArray(bcc) ? bcc : [bcc];
      recipients.push(...bccArray);
    }

    // FIXED: Send via SMTP through mail server
    // Get account for SMTP credentials
    if (!accountId) {
      return res.status(400).json({ message: 'Account ID is required for sending emails' });
    }

    const emailAccount = await EmailAccount.findById(accountId);
    if (!emailAccount || !emailAccount.smtpSettings) {
      return res.status(400).json({ message: 'Email account not found or SMTP not configured' });
    }

    // Use 127.0.0.1 when connecting to local mail server (same as IMAP does)
    const smtpHost = emailAccount.smtpSettings.host === 'mail.noxtm.com' ? '127.0.0.1' : (emailAccount.smtpSettings.host || '127.0.0.1');
    const smtpPort = emailAccount.smtpSettings.port || 587;
    const smtpUser = emailAccount.smtpSettings.username || emailAccount.email;
    const smtpPass = decrypt(emailAccount.smtpSettings.encryptedPassword);

    console.log(`📧 SMTP Send: host=${smtpHost}, port=${smtpPort}, user=${smtpUser}, from=${fromEmail}`);

    // Create SMTP transport
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: emailAccount.smtpSettings.secure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    });

    // Send email via SMTP
    const info = await transporter.sendMail({
      from: `${senderName} <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      cc: cc,
      bcc: bcc,
      subject: subject,
      html: bodyHtml,
      text: plainTextVariant
    });

    // Append sent email to IMAP Sent folder
    let savedToSent = false;
    if (accountId) {
      try {
        const account = await EmailAccount.findById(accountId);
        if (account && account.imapSettings && account.imapSettings.encryptedPassword) {
          const password = decrypt(account.imapSettings.encryptedPassword);

          const imapConfig = {
            host: account.imapSettings.host || '127.0.0.1',
            port: account.imapSettings.port || 993,
            secure: account.imapSettings.secure !== false,
            username: account.imapSettings.username || account.email,
            password: password
          };

          const emailMessage = {
            from: fromEmail,
            to: Array.isArray(to) ? to : [to],
            cc: cc || [],
            bcc: bcc || [],
            subject: subject,
            body: bodyHtml,
            plainText: plainTextVariant,
            date: new Date(),
            messageId: info.MessageId
          };

          // Append to IMAP Sent folder with 5s timeout
          const appendPromise = appendEmailToFolder(imapConfig, 'Sent', emailMessage);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('IMAP append timeout')), 5000)
          );

          await Promise.race([appendPromise, timeoutPromise]);

          console.log(`✅ Sent email appended to IMAP Sent folder for ${fromEmail}`);
          savedToSent = true;

          // Invalidate Sent folder cache so new email appears immediately
          await invalidateFolderCache(accountId, 'Sent');
        }
      } catch (appendError) {
        // Don't fail the request if IMAP append fails - email was still sent
        console.error('⚠️ Failed to append to Sent folder (email was sent via SES):', appendError.message);
      }
    }

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.MessageId,
      savedToSent: savedToSent
    });

  } catch (error) {
    console.error('Error sending email:', error);

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
// Create new email account (protected by domain ownership middleware)
router.post('/', isAuthenticated, requireOwnedVerifiedDomain, async (req, res) => {
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

    // Domain is already verified by requireOwnedVerifiedDomain middleware
    // and attached to req.emailDomain
    const emailDomain = req.emailDomain;

    // Check domain account limit (already checked in middleware, but keeping for safety)
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
      createdBy: req.user._id,
      accountType: 'noxtm-hosted',
      isVerified: true,
      imapEnabled: true,
      smtpEnabled: true,
      // Populate IMAP/SMTP settings for inbox fetching
      imapSettings: {
        host: mailConfig.mailServer.imap.host,
        port: mailConfig.mailServer.imap.port,
        secure: mailConfig.mailServer.imap.secure,
        username: email.toLowerCase(),
        encryptedPassword: encrypt(password)
      },
      smtpSettings: {
        host: mailConfig.mailServer.smtp.host,
        port: mailConfig.mailServer.smtp.port,
        secure: mailConfig.mailServer.smtp.secure,
        username: email.toLowerCase(),
        encryptedPassword: encrypt(password)
      }
    });

    await account.save();

    // Update domain account count and track first email created milestone
    emailDomain.accountCount += 1;
    if (!emailDomain.firstEmailCreatedAt && emailDomain.accountCount === 1) {
      emailDomain.firstEmailCreatedAt = new Date();
      console.log(`[EMAIL_ACCOUNT] First email account created for domain ${emailDomain.domain}`);
    }
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
      smtpEnabled: true,
      // Fix: Populate IMAP/SMTP settings so fetch-inbox works
      imapSettings: {
        host: 'mail.noxtm.com',
        port: 993,
        secure: true,
        username: email,
        encryptedPassword: encrypt(password)
      },
      smtpSettings: {
        host: 'mail.noxtm.com',
        port: 587,
        secure: false, // STARTTLS
        username: email,
        encryptedPassword: encrypt(password)
      }
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
// CREATE HOSTED EMAIL ACCOUNT (NEW SIMPLIFIED VERSION)
// ==========================================
router.post('/create-hosted', isAuthenticated, async (req, res) => {
  try {
    const { username, password, domain } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Validate username format (lowercase letters, numbers, dots, hyphens, underscores)
    if (!/^[a-z0-9._-]+$/.test(username)) {
      return res.status(400).json({
        message: 'Invalid username format. Use only lowercase letters, numbers, dots, hyphens, and underscores.'
      });
    }

    // Validate username length
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ message: 'Username must be between 3 and 30 characters' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Use provided domain or default to noxtm.com
    const emailDomain = domain || 'noxtm.com';
    const email = `${username}@${emailDomain}`;

    // Check if email already exists
    const existingAccount = await EmailAccount.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return res.status(400).json({ message: 'Email account already exists' });
    }

    // Create mailbox on mail server using doveadm
    console.log(`📝 Creating mailbox for ${email} on mail server...`);

    try {
      const quotaMB = 1024; // Default 1GB
      await createMailbox(email, password, quotaMB);
      console.log(`✅ Mailbox created successfully for ${email}`);
    } catch (mailboxError) {
      console.error(`❌ Failed to create mailbox for ${email}:`, mailboxError.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to create mailbox on mail server',
        error: mailboxError.message
      });
    }

    // Create email account in database
    const account = new EmailAccount({
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook
      accountType: 'noxtm-hosted',
      displayName: username,
      domain: emailDomain,
      quota: 1024, // Default 1GB
      isVerified: true,
      createdBy: req.user?._id,
      imapEnabled: true,
      smtpEnabled: true,
      imapSettings: {
        host: process.env.IMAP_HOST || 'mail.noxtm.com',
        port: parseInt(process.env.IMAP_PORT) || 993,
        secure: true,
        username: email,
        encryptedPassword: encrypt(password)
      },
      smtpSettings: {
        host: process.env.SMTP_HOST || 'mail.noxtm.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // STARTTLS
        username: email,
        encryptedPassword: encrypt(password)
      }
    });

    await account.save();

    // Create audit log
    if (req.user?._id) {
      try {
        await EmailAuditLog.log({
          action: 'hosted_account_created',
          resourceType: 'email_account',
          resourceId: account._id,
          resourceIdentifier: account.email,
          performedBy: req.user._id,
          performedByEmail: req.user.email,
          performedByName: req.user.fullName,
          description: `Created hosted email account: ${account.email}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          companyId: req.user.companyId
        });
      } catch (auditError) {
        console.error('Failed to create audit log:', auditError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: `Email account ${email} created successfully`,
      email: account.email,
      data: {
        _id: account._id,
        email: account.email,
        displayName: account.displayName,
        accountType: account.accountType,
        domain: account.domain,
        quota: account.quota,
        imapSettings: {
          host: account.imapSettings.host,
          port: account.imapSettings.port,
          secure: account.imapSettings.secure
        },
        smtpSettings: {
          host: account.smtpSettings.host,
          port: account.smtpSettings.port,
          secure: account.smtpSettings.secure
        }
      }
    });
  } catch (error) {
    console.error('Error creating hosted email account:', error);
    res.status(500).json({
      message: 'Failed to create email account',
      error: error.message
    });
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
    const { page = 1, limit = 50, direction, status } = req.query;

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

// Reset/Update email account password
router.put('/:id/reset-password', isAuthenticated, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Update password
    account.password = newPassword; // Will be hashed by pre-save hook

    // Update or create IMAP/SMTP settings with encrypted password
    if (account.accountType === 'noxtm-hosted' || !account.accountType) {
      account.accountType = 'noxtm-hosted';
      account.imapEnabled = true;
      account.smtpEnabled = true;
      account.isVerified = true;

      // Encrypt the plain password for IMAP/SMTP use
      const encryptedPassword = encrypt(newPassword);

      account.imapSettings = {
        host: account.imapSettings?.host || 'mail.noxtm.com',
        port: account.imapSettings?.port || 993,
        secure: account.imapSettings?.secure !== false,
        username: account.imapSettings?.username || account.email,
        encryptedPassword: encryptedPassword
      };

      account.smtpSettings = {
        host: account.smtpSettings?.host || 'mail.noxtm.com',
        port: account.smtpSettings?.port || 587,
        secure: account.smtpSettings?.secure === true,
        username: account.smtpSettings?.username || account.email,
        encryptedPassword: encryptedPassword
      };
    }

    account.lastModifiedBy = req.user._id;
    await account.save();

    // Update password on mail server if it's a hosted account
    if (account.accountType === 'noxtm-hosted') {
      try {
        const doveadmAvailable = await isDoveadmAvailable();
        if (doveadmAvailable) {
          const { changePassword: changeMailboxPassword } = require('../utils/doveadmHelper');
          await changeMailboxPassword(account.email, newPassword);
          console.log(`✅ Updated password on mail server for ${account.email}`);
        }
      } catch (mailServerError) {
        console.error('Failed to update password on mail server:', mailServerError.message);
        // Don't fail the request, password is updated in database
      }
    }

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
      message: 'Password updated successfully. IMAP/SMTP settings configured.'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password', error: error.message });
  }
});

// Update display name for email account
router.put('/:id/display-name', isAuthenticated, async (req, res) => {
  try {
    const { displayName } = req.body;

    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ message: 'Display name is required' });
    }

    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Check if user owns this account
    if (account.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to update this account' });
    }

    // Update display name
    account.displayName = displayName.trim();
    account.lastModifiedBy = req.user._id;
    await account.save();

    // Create audit log
    await EmailAuditLog.log({
      action: 'update_display_name',
      resourceType: 'email_account',
      resourceId: account._id,
      resourceIdentifier: account.email,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Updated display name for email account: ${account.email} to "${displayName.trim()}"`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    res.json({
      success: true,
      message: 'Display name updated successfully',
      displayName: account.displayName
    });
  } catch (error) {
    console.error('Error updating display name:', error);
    res.status(500).json({ message: 'Failed to update display name', error: error.message });
  }
});

/**
 * Update Email Account Quota
 * PUT /api/email-accounts/:id/quota
 */
router.put('/:id/quota', isAuthenticated, async (req, res) => {
  try {
    const { quota } = req.body;

    if (quota === undefined || quota === null) {
      return res.status(400).json({ message: 'Quota value is required' });
    }

    const quotaValue = parseInt(quota);
    if (isNaN(quotaValue) || quotaValue < 0) {
      return res.status(400).json({ message: 'Quota must be a non-negative number (in MB)' });
    }

    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Check if user owns this account
    if (account.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You do not have permission to update this account' });
    }

    // Update quota
    account.quota = quotaValue;
    account.lastModifiedBy = req.user._id;
    await account.save();

    // Create audit log
    await EmailAuditLog.log({
      action: 'update_quota',
      resourceType: 'email_account',
      resourceId: account._id,
      performedBy: req.user._id,
      description: `Updated quota for email account: ${account.email} to ${quotaValue} MB`,
    });

    res.json({
      success: true,
      message: 'Quota updated successfully',
      quota: account.quota
    });
  } catch (error) {
    console.error('Error updating quota:', error);
    res.status(500).json({ message: 'Failed to update quota', error: error.message });
  }
});

// =====================================================
// TEAM EMAIL ENDPOINTS (Phase 1 Implementation)
// =====================================================

/**
 * Create Team Email Account (Owner Only)
 * POST /api/email-accounts/create-team
 */
router.post('/create-team', requireCompanyOwner, async (req, res) => {
  try {
    const {
      username,
      domain,
      displayName,
      description,
      purpose,
      quotaMB,
      roleAccess,
      departmentAccess
    } = req.body;

    const companyId = req.user.companyId;

    // Validate required fields
    if (!username || !domain) {
      return res.status(400).json({
        error: 'Username and domain are required'
      });
    }

    // Validate domain ownership and verification
    const emailDomain = await EmailDomain.findOne({
      domain,
      companyId,
      verified: true
    });

    if (!emailDomain) {
      return res.status(403).json({
        error: 'Domain not found or not verified for your company. Please add and verify the domain first.'
      });
    }

    // Check quota limits
    const quotaCheck = emailDomain.canCreateAccount(quotaMB || 2048);
    if (!quotaCheck.allowed) {
      return res.status(400).json({
        error: quotaCheck.reason,
        available: quotaCheck.available,
        maxAccounts: quotaCheck.maxAccounts
      });
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9._-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        error: 'Username must contain only lowercase letters, numbers, dots, hyphens, and underscores'
      });
    }

    // Generate secure password
    const password = generateSecurePassword(16);
    const email = `${username}@${domain}`;

    // Check if email already exists
    const existingAccount = await EmailAccount.findOne({ email });
    if (existingAccount) {
      return res.status(409).json({
        error: `Email account ${email} already exists`
      });
    }

    // Create mailbox on server using doveadm
    const doveadmAvailable = await isDoveadmAvailable();
    if (doveadmAvailable) {
      const mailboxResult = await createMailbox(email, password, quotaMB || 2048);

      if (!mailboxResult.success) {
        return res.status(500).json({
          error: 'Failed to create mailbox on server',
          details: mailboxResult.error
        });
      }
    } else {
      console.warn('⚠️  doveadm not available - creating database entry only');
    }

    // Create email account in database
    const emailAccount = new EmailAccount({
      email,
      displayName: displayName || email,
      description: description || '',
      purpose: purpose || 'shared',
      domain,
      companyId,
      accountType: 'noxtm-hosted',
      password, // Will be hashed by pre-save hook

      imapSettings: {
        host: 'mail.noxtm.com',
        port: 993,
        secure: true,
        username: email,
        encryptedPassword: encrypt(password)
      },

      smtpSettings: {
        host: 'mail.noxtm.com',
        port: 587,
        secure: false,
        username: email,
        encryptedPassword: encrypt(password)
      },

      quota: quotaMB || 2048,
      usedStorage: 0,

      roleAccess: roleAccess || [
        {
          role: 'Owner',
          permissions: { canRead: true, canSend: true, canDelete: true, canManage: true }
        },
        {
          role: 'Manager',
          permissions: { canRead: true, canSend: true, canDelete: false, canManage: false }
        },
        {
          role: 'Employee',
          permissions: { canRead: false, canSend: false, canDelete: false, canManage: false }
        }
      ],

      departmentAccess: departmentAccess || [],

      enabled: true,
      createdBy: req.user._id
    });

    await emailAccount.save();

    // Update domain quota usage
    await emailDomain.calculateQuotaUsage();

    // Create audit log
    await EmailAuditLog.log({
      action: 'create_team_account',
      resourceType: 'email_account',
      resourceId: emailAccount._id,
      resourceIdentifier: email,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Created team email account: ${email}`,
      metadata: {
        purpose,
        roleAccess: roleAccess ? roleAccess.map(r => r.role) : ['Owner', 'Manager', 'Employee']
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId
    });

    res.json({
      success: true,
      account: {
        _id: emailAccount._id,
        email: emailAccount.email,
        displayName: emailAccount.displayName,
        description: emailAccount.description,
        purpose: emailAccount.purpose,
        domain: emailAccount.domain,
        companyId: emailAccount.companyId,
        roleAccess: emailAccount.roleAccess,
        departmentAccess: emailAccount.departmentAccess,
        quota: emailAccount.quota,
        usedStorage: emailAccount.usedStorage,
        enabled: emailAccount.enabled,
        createdAt: emailAccount.createdAt
      },
      credentials: {
        imap: {
          host: emailAccount.imapSettings.host,
          port: emailAccount.imapSettings.port,
          username: emailAccount.imapSettings.username,
          password: '***' // Masked for security
        },
        smtp: {
          host: emailAccount.smtpSettings.host,
          port: emailAccount.smtpSettings.port,
          username: emailAccount.smtpSettings.username
        }
      }
    });

  } catch (error) {
    console.error('Error creating team account:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List Team Email Accounts
 * GET /api/email-accounts/team
 */
router.get('/team', requireCompanyAccess, async (req, res) => {
  try {
    const { purpose, domain } = req.query;
    const companyId = req.user.companyId;

    // Build query
    const query = { companyId, enabled: true };
    if (purpose) query.purpose = purpose;
    if (domain) query.domain = domain;

    // Fetch accounts (exclude sensitive fields)
    const accounts = await EmailAccount.find(query)
      .select('-password -imapSettings.encryptedPassword -smtpSettings.encryptedPassword')
      .sort({ createdAt: -1 });

    // Calculate summary
    const summary = {
      totalAccounts: accounts.length,
      totalQuotaMB: accounts.reduce((sum, acc) => sum + (acc.quota || 0), 0),
      usedQuotaMB: accounts.reduce((sum, acc) => sum + (acc.usedStorage || 0), 0)
    };
    summary.availableQuotaMB = summary.totalQuotaMB - summary.usedQuotaMB;

    res.json({ accounts, summary });

  } catch (error) {
    console.error('Error fetching team accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get My Accessible Team Accounts
 * GET /api/email-accounts/my-team-accounts
 */
router.get('/my-team-accounts', requireCompanyAccess, async (req, res) => {
  try {
    const user = req.user;
    const companyId = user.companyId;

    // Get all team accounts for user's company
    const allAccounts = await EmailAccount.find({
      companyId,
      enabled: true
    });

    // Filter by access and get permissions
    const accessibleAccounts = [];

    for (const account of allAccounts) {
      const hasAccess = await account.hasAccess(user);

      if (hasAccess) {
        const permissions = await account.getPermissions(user);

        // Skip IMAP unread count check - not using IMAP anymore
        const unreadCount = 0;

        accessibleAccounts.push({
          _id: account._id,
          email: account.email,
          displayName: account.displayName,
          description: account.description,
          purpose: account.purpose,
          domain: account.domain,
          permissions,
          unreadCount,
          quota: account.quota,
          usedStorage: account.usedStorage,
          storagePercentage: account.storagePercentage
        });
      }
    }

    res.json({ accounts: accessibleAccounts });

  } catch (error) {
    console.error('Error fetching my team accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Fetch Team Inbox Emails
 * GET /api/email-accounts/team-inbox/:accountId
 */
router.get('/team-inbox/:accountId', requireEmailAccess('canRead'), async (req, res) => {
  try {
    const { accountId } = req.params;
    const { page = 1, limit = 50, folder = 'INBOX' } = req.query;

    const emailAccount = req.emailAccount;

    // Use existing fetchEmails logic from imapHelper
    const { fetchEmails } = require('../utils/imapHelper');

    const result = await fetchEmails(
      emailAccount.imapSettings.host,
      emailAccount.imapSettings.port,
      emailAccount.imapSettings.username,
      decrypt(emailAccount.imapSettings.encryptedPassword),
      folder,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      ...result,
      account: {
        email: emailAccount.email,
        displayName: emailAccount.displayName
      }
    });

  } catch (error) {
    console.error('Error fetching team inbox:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send Email from Team Account
 * POST /api/email-accounts/team-send/:accountId
 */
router.post('/team-send/:accountId', requireEmailAccess('canSend'), async (req, res) => {
  try {
    const { to, cc, bcc, subject, body } = req.body;
    const emailAccount = req.emailAccount;
    const user = req.user;

    if (!to || !subject || !body) {
      return res.status(400).json({
        error: 'To, subject, and body are required'
      });
    }

    // Create SMTP transport
    const transporter = nodemailer.createTransport({
      host: emailAccount.smtpSettings.host,
      port: emailAccount.smtpSettings.port,
      secure: emailAccount.smtpSettings.secure,
      auth: {
        user: emailAccount.smtpSettings.username,
        pass: decrypt(emailAccount.smtpSettings.encryptedPassword)
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    });

    // Send email
    const info = await transporter.sendMail({
      from: `${emailAccount.displayName} <${emailAccount.email}>`,
      to,
      cc,
      bcc,
      subject,
      html: body,
      text: stripHtml(body) // Strip HTML for plain text
    });

    // Log in EmailLog
    await EmailLog.create({
      accountId: emailAccount._id,
      companyId: emailAccount.companyId,
      messageId: info.messageId,
      direction: 'sent',
      from: emailAccount.email,
      to: Array.isArray(to) ? to : [to],
      cc: cc || [],
      bcc: bcc || [],
      subject,
      status: 'sent',
      size: Buffer.byteLength(body),
      sentBy: user._id,
      sentAt: new Date()
    });

    res.json({
      success: true,
      messageId: info.messageId,
      sentAt: new Date()
    });

  } catch (error) {
    console.error('Error sending team email:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== EMAIL SETTINGS ENDPOINTS ====================

// Get email forwarding settings
router.get('/:id/forwarding', isAuthenticated, async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Verify user owns this account
    if (!account.userId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json({
      success: true,
      forwardingEnabled: account.forwardingEnabled || false,
      forwardTo: account.forwardTo || ''
    });
  } catch (error) {
    console.error('Error fetching forwarding settings:', error);
    res.status(500).json({ message: 'Failed to fetch forwarding settings' });
  }
});

// Update email forwarding settings
router.put('/:id/forwarding', isAuthenticated, async (req, res) => {
  try {
    const { forwardingEnabled, forwardTo } = req.body;

    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Verify user owns this account
    if (!account.userId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Validate email format if forwarding is enabled
    if (forwardingEnabled && forwardTo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(forwardTo)) {
        return res.status(400).json({ message: 'Invalid forward-to email address' });
      }
    }

    account.forwardingEnabled = forwardingEnabled;
    account.forwardTo = forwardingEnabled ? forwardTo : '';
    await account.save();

    // Create audit log
    const EmailAuditLog = require('../models/EmailAuditLog');
    await EmailAuditLog.log({
      action: 'forwarding_updated',
      resourceType: 'email_account',
      resourceId: account._id,
      resourceIdentifier: account.email,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Updated forwarding settings: ${forwardingEnabled ? `enabled to ${forwardTo}` : 'disabled'}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    res.json({
      success: true,
      message: 'Forwarding settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating forwarding settings:', error);
    res.status(500).json({ message: 'Failed to update forwarding settings' });
  }
});

// Get blocked senders list
router.get('/:id/blocked-senders', isAuthenticated, async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Verify user owns this account
    if (!account.userId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json({
      success: true,
      blockedSenders: account.blockedSenders || []
    });
  } catch (error) {
    console.error('Error fetching blocked senders:', error);
    res.status(500).json({ message: 'Failed to fetch blocked senders' });
  }
});

// Add blocked sender
router.post('/:id/blocked-senders', isAuthenticated, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Verify user owns this account
    if (!account.userId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Check if already blocked
    if (account.blockedSenders && account.blockedSenders.includes(email.toLowerCase())) {
      return res.status(400).json({ message: 'Email address is already blocked' });
    }

    // Add to blocked senders
    if (!account.blockedSenders) {
      account.blockedSenders = [];
    }
    account.blockedSenders.push(email.toLowerCase());
    await account.save();

    // Create audit log
    const EmailAuditLog = require('../models/EmailAuditLog');
    await EmailAuditLog.log({
      action: 'blocked_sender_added',
      resourceType: 'email_account',
      resourceId: account._id,
      resourceIdentifier: account.email,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Added blocked sender: ${email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    res.json({
      success: true,
      message: 'Sender blocked successfully',
      blockedSenders: account.blockedSenders
    });
  } catch (error) {
    console.error('Error adding blocked sender:', error);
    res.status(500).json({ message: 'Failed to block sender' });
  }
});

// Remove blocked sender
router.delete('/:id/blocked-senders/:email', isAuthenticated, async (req, res) => {
  try {
    const { email } = req.params;

    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Verify user owns this account
    if (!account.userId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Remove from blocked senders
    if (account.blockedSenders) {
      account.blockedSenders = account.blockedSenders.filter(
        sender => sender !== email.toLowerCase()
      );
      await account.save();
    }

    // Create audit log
    const EmailAuditLog = require('../models/EmailAuditLog');
    await EmailAuditLog.log({
      action: 'blocked_sender_removed',
      resourceType: 'email_account',
      resourceId: account._id,
      resourceIdentifier: account.email,
      performedBy: req.user._id,
      performedByEmail: req.user.email,
      performedByName: req.user.fullName,
      description: `Removed blocked sender: ${email}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      companyId: req.user.companyId
    });

    res.json({
      success: true,
      message: 'Sender unblocked successfully',
      blockedSenders: account.blockedSenders || []
    });
  } catch (error) {
    console.error('Error removing blocked sender:', error);
    res.status(500).json({ message: 'Failed to unblock sender' });
  }
});

// Get storage usage statistics
router.get('/:id/storage-usage', isAuthenticated, async (req, res) => {
  try {
    const account = await EmailAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Email account not found' });
    }

    // Verify user owns this account
    if (!account.userId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const used = account.usedStorage || 0;
    const quota = account.quota || 1024;
    const percentage = quota > 0 ? Math.round((used / quota) * 100) : 0;
    const available = Math.max(0, quota - used);

    res.json({
      success: true,
      storage: {
        used,
        quota,
        available,
        percentage
      }
    });
  } catch (error) {
    console.error('Error fetching storage usage:', error);
    res.status(500).json({ message: 'Failed to fetch storage usage' });
  }
});

// Update email signature
router.put('/signature', isAuthenticated, async (req, res) => {
  try {
    const { signature } = req.body;

    // Find the user's email account
    const account = await EmailAccount.findOne({ userId: req.user._id });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Email account not found' });
    }

    // Update signature
    account.signature = signature || '';
    await account.save();

    // Log the change
    await AuditLog.create({
      userId: req.user._id,
      action: 'update_signature',
      details: { email: account.email },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Signature updated successfully' });
  } catch (error) {
    console.error('Error updating signature:', error);
    res.status(500).json({ success: false, message: 'Failed to update signature' });
  }
});

module.exports = router;
