const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const { whatsappMessageLimiter, whatsappAccountLimiter, whatsappCampaignLimiter, whatsappApiLimiter } = require('../middleware/whatsappRateLimit');

const WhatsAppAccount = require('../models/WhatsAppAccount');
const WhatsAppContact = require('../models/WhatsAppContact');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppChatbot = require('../models/WhatsAppChatbot');
const WhatsAppTemplate = require('../models/WhatsAppTemplate');
const WhatsAppPhoneList = require('../models/WhatsAppPhoneList');
const WhatsAppKeypoint = require('../models/WhatsAppKeypoint');
const WhatsAppScheduledMsg = require('../models/WhatsAppScheduledMsg');

const sessionManager = require('../services/whatsappSessionManager');
const campaignService = require('../services/whatsappCampaignService');

/**
 * Initialize WhatsApp routes with Socket.IO dependency injection
 * @param {Object} deps - { io }
 * @returns {express.Router}
 */
function initializeRoutes({ io }) {
  const router = express.Router();

  // All routes require authentication
  router.use(authenticateToken);
  router.use(whatsappApiLimiter);

  // =====================================================
  // ACCOUNT MANAGEMENT
  // =====================================================

  /**
   * GET /api/whatsapp/accounts
   * List all WhatsApp accounts for the company
   */
  router.get('/accounts', async (req, res) => {
    try {
      const accounts = await WhatsAppAccount.find({
        companyId: req.user.companyId
      }).select('-sessionFolder').sort({ createdAt: -1 });

      res.json({ success: true, data: accounts });
    } catch (error) {
      console.error('[WA Routes] Get accounts error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/accounts/link
   * Start linking a new WhatsApp account (generates QR code)
   */
  router.post('/accounts/link', whatsappAccountLimiter, async (req, res) => {
    try {
      const { displayName } = req.body;

      // Create account record
      const account = await WhatsAppAccount.create({
        companyId: req.user.companyId,
        userId: req.user._id,
        displayName: displayName || 'WhatsApp Account',
        status: 'connecting',
        sessionFolder: `session_${Date.now()}`
      });

      // Start session (will emit QR via Socket.IO)
      await sessionManager.startSession(account._id.toString());

      res.json({
        success: true,
        data: { accountId: account._id, status: 'connecting' },
        message: 'Scan the QR code with your WhatsApp to link'
      });
    } catch (error) {
      console.error('[WA Routes] Link account error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/accounts/:id/reconnect
   * Reconnect a disconnected account
   */
  router.post('/accounts/:id/reconnect', whatsappAccountLimiter, async (req, res) => {
    try {
      const account = await WhatsAppAccount.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!account) return res.status(404).json({ success: false, message: 'Account not found' });
      if (account.status === 'connected') return res.json({ success: true, message: 'Already connected' });

      account.status = 'connecting';
      await account.save();

      await sessionManager.startSession(account._id.toString());

      res.json({ success: true, message: 'Reconnecting...' });
    } catch (error) {
      console.error('[WA Routes] Reconnect error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/accounts/:id/disconnect
   * Disconnect but keep auth (can reconnect without QR)
   */
  router.post('/accounts/:id/disconnect', async (req, res) => {
    try {
      const account = await WhatsAppAccount.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

      await sessionManager.disconnectSession(account._id.toString());

      res.json({ success: true, message: 'Disconnected' });
    } catch (error) {
      console.error('[WA Routes] Disconnect error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * DELETE /api/whatsapp/accounts/:id
   * Remove account and delete all session data
   */
  router.delete('/accounts/:id', whatsappAccountLimiter, async (req, res) => {
    try {
      const account = await WhatsAppAccount.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

      // Remove session and auth files
      await sessionManager.removeSession(account._id.toString());

      // Delete related data
      await Promise.all([
        WhatsAppContact.deleteMany({ accountId: account._id }),
        WhatsAppMessage.deleteMany({ accountId: account._id }),
        WhatsAppCampaign.deleteMany({ accountId: account._id }),
        WhatsAppChatbot.updateMany({ companyId }, { $pull: { accountIds: account._id.toString() } }),
        account.deleteOne()
      ]);

      res.json({ success: true, message: 'Account removed' });
    } catch (error) {
      console.error('[WA Routes] Remove account error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * PUT /api/whatsapp/accounts/:id/settings
   * Update account settings (daily limit, delay, hours, etc.)
   */
  router.put('/accounts/:id/settings', async (req, res) => {
    try {
      const account = await WhatsAppAccount.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

      const { dailyLimit, delayMin, delayMax, sendHoursStart, sendHoursEnd, typingSimulation } = req.body;

      if (dailyLimit !== undefined) account.settings.dailyLimit = Math.min(dailyLimit, 1000);
      if (delayMin !== undefined) account.settings.delayMin = Math.max(delayMin, 1);
      if (delayMax !== undefined) account.settings.delayMax = Math.max(delayMax, 2);
      if (sendHoursStart !== undefined) account.settings.sendHoursStart = sendHoursStart;
      if (sendHoursEnd !== undefined) account.settings.sendHoursEnd = sendHoursEnd;
      if (typingSimulation !== undefined) account.settings.typingSimulation = typingSimulation;

      await account.save();
      res.json({ success: true, data: account });
    } catch (error) {
      console.error('[WA Routes] Update settings error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * PUT /api/whatsapp/accounts/:id/default
   * Set an account as the default account
   */
  router.put('/accounts/:id/default', async (req, res) => {
    try {
      // Unset all others
      await WhatsAppAccount.updateMany(
        { companyId: req.user.companyId },
        { isDefault: false }
      );

      const account = await WhatsAppAccount.findOneAndUpdate(
        { _id: req.params.id, companyId: req.user.companyId },
        { isDefault: true },
        { new: true }
      );

      if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

      res.json({ success: true, data: account });
    } catch (error) {
      console.error('[WA Routes] Set default error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // =====================================================
  // CONTACTS
  // =====================================================

  /**
   * GET /api/whatsapp/contacts
   * List contacts for a specific account
   */
  router.get('/contacts', async (req, res) => {
    try {
      const { accountId, search, tag, page = 1, limit = 50 } = req.query;

      const filter = { companyId: req.user.companyId };
      if (accountId) filter.accountId = accountId;
      if (tag) filter.tags = tag;
      if (search) {
        const searchValue = String(search).trim();
        const escapedSearch = searchValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const digitsOnlySearch = searchValue.replace(/\D/g, '');

        const orConditions = [
          { pushName: { $regex: escapedSearch, $options: 'i' } },
          { phoneNumber: { $regex: escapedSearch, $options: 'i' } }
        ];

        // Allow phone search even when numbers are formatted with spaces/dashes/plus
        if (digitsOnlySearch) {
          const flexibleDigitsRegex = digitsOnlySearch
            .split('')
            .map(d => `${d}\\D*`)
            .join('');

          orConditions.push(
            { phoneNumber: { $regex: flexibleDigitsRegex, $options: 'i' } },
            { whatsappId: { $regex: flexibleDigitsRegex, $options: 'i' } }
          );
        }

        filter.$or = orConditions;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [contacts, total] = await Promise.all([
        WhatsAppContact.find(filter)
          .sort({ lastMessageAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        WhatsAppContact.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: contacts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('[WA Routes] Get contacts error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * PUT /api/whatsapp/contacts/:id
   * Update contact (tags, notes, block status)
   */
  router.put('/contacts/:id', async (req, res) => {
    try {
      const contact = await WhatsAppContact.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

      const { tags, notes, isBlocked, optedOut } = req.body;
      if (tags !== undefined) contact.tags = tags;
      if (notes !== undefined) contact.notes = notes;
      if (isBlocked !== undefined) contact.isBlocked = isBlocked;
      if (optedOut !== undefined) contact.optedOut = optedOut;

      await contact.save();
      res.json({ success: true, data: contact });
    } catch (error) {
      console.error('[WA Routes] Update contact error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // =====================================================
  // MESSAGES / CHAT
  // =====================================================

  /**
   * GET /api/whatsapp/messages/:contactId
   * Get message history for a specific contact
   */
  router.get('/messages/:contactId', async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const contact = await WhatsAppContact.findOne({
        _id: req.params.contactId,
        companyId: req.user.companyId
      });

      if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

      const [messages, total] = await Promise.all([
        WhatsAppMessage.find({
          contactId: req.params.contactId,
          companyId: req.user.companyId
        })
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        WhatsAppMessage.countDocuments({
          contactId: req.params.contactId,
          companyId: req.user.companyId
        })
      ]);

      // Mark contact as read
      if (contact.unreadCount > 0) {
        contact.unreadCount = 0;
        await contact.save();
      }

      res.json({
        success: true,
        data: messages.reverse(), // Oldest first for chat display
        pagination: { total, page: parseInt(page), limit: parseInt(limit) }
      });
    } catch (error) {
      console.error('[WA Routes] Get messages error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/messages/send
   * Send a message to a contact
   */
  router.post('/messages/send', whatsappMessageLimiter, async (req, res) => {
    try {
      const { accountId, contactId, jid, content, type = 'text', mediaUrl, mediaType, mediaFilename } = req.body;

      if (!accountId) return res.status(400).json({ success: false, message: 'accountId required' });
      if (!content && !mediaUrl) return res.status(400).json({ success: false, message: 'content or media required' });

      // Verify account belongs to company
      const account = await WhatsAppAccount.findOne({
        _id: accountId,
        companyId: req.user.companyId,
        status: 'connected'
      });

      if (!account) return res.status(400).json({ success: false, message: 'Account not connected' });

      // Determine target JID
      let targetJid = jid;
      if (!targetJid && contactId) {
        const contact = await WhatsAppContact.findById(contactId);
        if (contact) targetJid = contact.whatsappId;
      }
      if (!targetJid) return res.status(400).json({ success: false, message: 'No recipient specified' });

      const message = await sessionManager.sendMessage(accountId, targetJid, content, {
        type,
        mediaUrl,
        mediaType,
        mediaFilename
      });

      res.json({ success: true, data: message });
    } catch (error) {
      console.error('[WA Routes] Send message error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/messages/send-new
   * Send a message to a new phone number (not in contacts)
   */
  router.post('/messages/send-new', whatsappMessageLimiter, async (req, res) => {
    try {
      const { accountId, phoneNumber, content, type = 'text', mediaUrl } = req.body;

      if (!accountId || !phoneNumber || (!content && !mediaUrl)) {
        return res.status(400).json({ success: false, message: 'accountId, phoneNumber, and content required' });
      }

      const account = await WhatsAppAccount.findOne({
        _id: accountId,
        companyId: req.user.companyId,
        status: 'connected'
      });

      if (!account) return res.status(400).json({ success: false, message: 'Account not connected' });

      // Format phone number to JID
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const jid = `${cleanPhone}@s.whatsapp.net`;

      const message = await sessionManager.sendMessage(accountId, jid, content, {
        type,
        mediaUrl
      });

      res.json({ success: true, data: message });
    } catch (error) {
      console.error('[WA Routes] Send new message error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // =====================================================
  // CAMPAIGNS
  // =====================================================

  /**
   * GET /api/whatsapp/campaigns
   * List all campaigns
   */
  router.get('/campaigns', async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const filter = { companyId: req.user.companyId };
      if (status) filter.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [campaigns, total] = await Promise.all([
        WhatsAppCampaign.find(filter)
          .populate('accountId', 'displayName phoneNumber status')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        WhatsAppCampaign.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: campaigns,
        pagination: { total, page: parseInt(page), limit: parseInt(limit) }
      });
    } catch (error) {
      console.error('[WA Routes] Get campaigns error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * GET /api/whatsapp/campaigns/:id
   * Get single campaign with full details
   */
  router.get('/campaigns/:id', async (req, res) => {
    try {
      const campaign = await WhatsAppCampaign.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      }).populate('accountId', 'displayName phoneNumber status');

      if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

      res.json({ success: true, data: campaign });
    } catch (error) {
      console.error('[WA Routes] Get campaign error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/campaigns
   * Create a new campaign
   */
  router.post('/campaigns', async (req, res) => {
    try {
      const {
        accountId,
        name,
        description,
        message,
        mediaUrl,
        mediaType,
        mediaFilename,
        recipients,
        targetTags,
        manualPhones,
        settings,
        scheduledAt,
        templateId,
        phoneListId
      } = req.body;

      if (!accountId || !name || !message) {
        return res.status(400).json({ success: false, message: 'accountId, name, and message required' });
      }

      // Build recipients list from tags, direct list, and/or manual phone numbers
      let recipientsList = Array.isArray(recipients) ? recipients : [];

      // If targetTags provided, fetch contacts with those tags
      if (targetTags && targetTags.length > 0 && recipientsList.length === 0) {
        const contacts = await WhatsAppContact.find({
          accountId,
          companyId: req.user.companyId,
          tags: { $in: targetTags },
          optedOut: { $ne: true },
          isBlocked: { $ne: true }
        }).lean();

        recipientsList = contacts.map(c => ({
          contactId: c._id,
          whatsappId: c.whatsappId,
          name: c.pushName || c.phoneNumber,
          phone: c.phoneNumber,
          status: 'pending'
        }));
      }

      // Add manual phone numbers (comma/newline separated string OR array)
      if (manualPhones) {
        const manualPhoneList = Array.isArray(manualPhones)
          ? manualPhones
          : String(manualPhones)
            .split(/[\n,;]+/)
            .map(p => p.trim())
            .filter(Boolean);

        const manualRecipients = manualPhoneList
          .map(phone => {
            const cleanPhone = String(phone).replace(/[^0-9]/g, '');
            if (!cleanPhone) return null;
            return {
              whatsappId: `${cleanPhone}@s.whatsapp.net`,
              name: cleanPhone,
              phone: cleanPhone,
              status: 'pending'
            };
          })
          .filter(Boolean);

        recipientsList = [...recipientsList, ...manualRecipients];
      }

      // If phoneListId provided, fetch phones from the list
      if (phoneListId) {
        const phoneList = await WhatsAppPhoneList.findOne({
          _id: phoneListId,
          companyId: req.user.companyId
        });
        if (phoneList && phoneList.phones.length > 0) {
          const listRecipients = phoneList.phones
            .map(entry => {
              const cleanPhone = String(entry.phone).replace(/[^0-9]/g, '');
              if (!cleanPhone) return null;
              return {
                whatsappId: `${cleanPhone}@s.whatsapp.net`,
                name: entry.name || cleanPhone,
                phone: cleanPhone,
                status: 'pending'
              };
            })
            .filter(Boolean);
          recipientsList = [...recipientsList, ...listRecipients];
        }
      }

      // Normalize + deduplicate recipients by whatsappId
      const recipientMap = new Map();
      for (const rec of recipientsList) {
        if (!rec) continue;
        const recPhone = String(rec.phone || '').replace(/[^0-9]/g, '');
        const recWhatsappId = rec.whatsappId || (recPhone ? `${recPhone}@s.whatsapp.net` : null);
        if (!recWhatsappId) continue;

        const dedupeKey = recWhatsappId.toLowerCase();
        if (!recipientMap.has(dedupeKey)) {
          recipientMap.set(dedupeKey, {
            contactId: rec.contactId || undefined,
            whatsappId: recWhatsappId,
            name: rec.name || rec.pushName || recPhone || recWhatsappId,
            phone: rec.phone || recPhone,
            variables: rec.variables,
            status: rec.status || 'pending'
          });
        }
      }

      recipientsList = Array.from(recipientMap.values());

      if (recipientsList.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No recipients found. Add target tags or manual phone numbers.'
        });
      }

      const campaign = await WhatsAppCampaign.create({
        companyId: req.user.companyId,
        accountId,
        createdBy: req.user._id,
        name,
        description,
        message,
        mediaUrl,
        mediaType,
        mediaFilename,
        recipients: recipientsList,
        targetTags: targetTags || [],
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduledAt,
        settings: settings || {},
        templateId: templateId || undefined
      });

      res.status(201).json({ success: true, data: campaign });
    } catch (error) {
      console.error('[WA Routes] Create campaign error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * PUT /api/whatsapp/campaigns/:id
   * Update a draft/paused campaign
   */
  router.put('/campaigns/:id', async (req, res) => {
    try {
      const campaign = await WhatsAppCampaign.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
      if (!['draft', 'paused', 'scheduled'].includes(campaign.status)) {
        return res.status(400).json({ success: false, message: 'Can only edit draft/paused/scheduled campaigns' });
      }

      const { name, description, message, mediaUrl, mediaType, mediaFilename, recipients, targetTags, settings, scheduledAt } = req.body;

      if (name !== undefined) campaign.name = name;
      if (description !== undefined) campaign.description = description;
      if (message !== undefined) campaign.message = message;
      if (mediaUrl !== undefined) campaign.mediaUrl = mediaUrl;
      if (mediaType !== undefined) campaign.mediaType = mediaType;
      if (mediaFilename !== undefined) campaign.mediaFilename = mediaFilename;
      if (recipients !== undefined) campaign.recipients = recipients;
      if (targetTags !== undefined) campaign.targetTags = targetTags;
      if (settings !== undefined) campaign.settings = { ...campaign.settings, ...settings };
      if (scheduledAt !== undefined) campaign.scheduledAt = scheduledAt;

      await campaign.save();
      res.json({ success: true, data: campaign });
    } catch (error) {
      console.error('[WA Routes] Update campaign error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/campaigns/:id/start
   * Start sending a campaign
   */
  router.post('/campaigns/:id/start', whatsappCampaignLimiter, async (req, res) => {
    try {
      const campaign = await WhatsAppCampaign.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

      const result = await campaignService.startCampaign(campaign._id.toString());
      res.json(result);
    } catch (error) {
      console.error('[WA Routes] Start campaign error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/campaigns/:id/pause
   */
  router.post('/campaigns/:id/pause', async (req, res) => {
    try {
      const result = await campaignService.pauseCampaign(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/campaigns/:id/resume
   */
  router.post('/campaigns/:id/resume', whatsappCampaignLimiter, async (req, res) => {
    try {
      const result = await campaignService.resumeCampaign(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * DELETE /api/whatsapp/campaigns/:id
   */
  router.delete('/campaigns/:id', async (req, res) => {
    try {
      const campaign = await WhatsAppCampaign.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

      // Abort if running
      if (campaignService.isCampaignRunning(campaign._id.toString())) {
        await campaignService.abortCampaign(campaign._id.toString());
      }

      await campaign.deleteOne();
      res.json({ success: true, message: 'Campaign deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // =====================================================
  // AI CHATBOT
  // =====================================================

  /**
   * GET /api/whatsapp/chatbot
   * Get chatbot config for the company
   */
  router.get('/chatbot', async (req, res) => {
    try {
      let bot = await WhatsAppChatbot.findOne({ companyId: req.user.companyId }).lean();
      res.json({ success: true, data: bot || null });
    } catch (error) {
      console.error('[WA Routes] Get chatbot error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * PUT /api/whatsapp/chatbot
   * Create or update chatbot config
   */
  router.put('/chatbot', async (req, res) => {
    try {
      const {
        botName, botPersonality, enabled, accountIds,
        provider, apiKey, model, customEndpoint,
        maxTokens, temperature, notesAccess, cooldownMinutes, maxSentencesPerMsg
      } = req.body;

      let bot = await WhatsAppChatbot.findOne({ companyId: req.user.companyId });

      if (!bot) {
        bot = new WhatsAppChatbot({
          companyId: req.user.companyId,
          createdBy: req.user._id
        });
      }

      // Update fields if provided
      if (botName !== undefined) bot.botName = botName;
      if (botPersonality !== undefined) bot.botPersonality = botPersonality;
      if (enabled !== undefined) bot.enabled = enabled;
      if (accountIds !== undefined) bot.accountIds = accountIds;
      if (provider !== undefined) bot.provider = provider;
      if (apiKey !== undefined) bot.apiKey = apiKey;
      if (model !== undefined) bot.model = model;
      if (customEndpoint !== undefined) bot.customEndpoint = customEndpoint;
      if (maxTokens !== undefined) bot.maxTokens = maxTokens;
      if (temperature !== undefined) bot.temperature = temperature;
      if (notesAccess !== undefined) bot.notesAccess = notesAccess;
      if (cooldownMinutes !== undefined) bot.cooldownMinutes = cooldownMinutes;
      if (maxSentencesPerMsg !== undefined) bot.maxSentencesPerMsg = maxSentencesPerMsg;

      await bot.save();
      res.json({ success: true, data: bot });
    } catch (error) {
      console.error('[WA Routes] Update chatbot error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/chatbot/test
   * Test the chatbot with a sample message
   */
  router.post('/chatbot/test', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ success: false, message: 'message required' });

      const bot = await WhatsAppChatbot.findOne({ companyId: req.user.companyId });
      if (!bot || !bot.apiKey) {
        return res.status(400).json({ success: false, message: 'Chatbot not configured or API key missing' });
      }

      const whatsappChatbotEngine = require('../services/whatsappChatbotEngine');
      // Create a mock contact/cooldowns for testing
      const mockContact = {
        _id: 'test',
        pushName: req.user.fullName || req.user.name || 'Test User',
        phoneNumber: '0000000000',
        whatsappId: 'test@test'
      };
      const mockCooldowns = new Map();

      // Temporarily enable for test
      const wasEnabled = bot.enabled;
      if (!wasEnabled) {
        bot.enabled = true;
        await bot.save();
      }

      const response = await whatsappChatbotEngine.processIncomingMessage(
        'test-account', req.user.companyId, mockContact, message, mockCooldowns
      );

      // Restore state if we temp-enabled
      if (!wasEnabled) {
        bot.enabled = false;
        await bot.save();
      }

      if (response) {
        res.json({ success: true, reply: response.content });
      } else {
        res.json({ success: false, message: 'No response generated' });
      }
    } catch (error) {
      console.error('[WA Routes] Test chatbot error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // =====================================================
  // MESSAGE TEMPLATES
  // =====================================================

  /**
   * GET /api/whatsapp/templates
   * List all message templates for the company
   */
  router.get('/templates', async (req, res) => {
    try {
      const { category, active } = req.query;
      const filter = { companyId: req.user.companyId };
      if (category) filter.category = category;
      if (active !== undefined) filter.isActive = active === 'true';

      const templates = await WhatsAppTemplate.find(filter)
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, data: templates });
    } catch (error) {
      console.error('[WA Routes] Get templates error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/templates
   * Create a new message template
   */
  router.post('/templates', async (req, res) => {
    try {
      const { name, category, language, body, variables } = req.body;

      if (!name || !body) {
        return res.status(400).json({ success: false, message: 'name and body are required' });
      }

      const template = await WhatsAppTemplate.create({
        companyId: req.user.companyId,
        createdBy: req.user._id,
        name,
        category: category || 'marketing',
        language: language || 'en',
        body,
        variables: variables || []
      });

      res.status(201).json({ success: true, data: template });
    } catch (error) {
      console.error('[WA Routes] Create template error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * PUT /api/whatsapp/templates/:id
   * Update a message template
   */
  router.put('/templates/:id', async (req, res) => {
    try {
      const template = await WhatsAppTemplate.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

      const fields = ['name', 'category', 'language', 'headerType', 'headerContent',
        'body', 'footerText', 'buttons', 'variables', 'isActive'];

      fields.forEach(field => {
        if (req.body[field] !== undefined) template[field] = req.body[field];
      });

      await template.save();
      res.json({ success: true, data: template });
    } catch (error) {
      console.error('[WA Routes] Update template error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * DELETE /api/whatsapp/templates/:id
   * Delete a message template
   */
  router.delete('/templates/:id', async (req, res) => {
    try {
      const template = await WhatsAppTemplate.findOneAndDelete({
        _id: req.params.id,
        companyId: req.user.companyId
      });

      if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

      res.json({ success: true, message: 'Template deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // =====================================================
  // PHONE LISTS
  // =====================================================

  /**
   * GET /api/whatsapp/phone-lists
   */
  router.get('/phone-lists', async (req, res) => {
    try {
      const lists = await WhatsAppPhoneList.find({ companyId: req.user.companyId })
        .sort({ createdAt: -1 })
        .lean();
      res.json({ success: true, data: lists });
    } catch (error) {
      console.error('[WA Routes] Get phone lists error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/phone-lists
   */
  router.post('/phone-lists', async (req, res) => {
    try {
      const { name, description, phones } = req.body;
      if (!name || !phones || phones.length === 0) {
        return res.status(400).json({ success: false, message: 'name and at least one phone required' });
      }
      const list = await WhatsAppPhoneList.create({
        companyId: req.user.companyId,
        createdBy: req.user._id,
        name,
        description,
        phones
      });
      res.status(201).json({ success: true, data: list });
    } catch (error) {
      console.error('[WA Routes] Create phone list error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * PUT /api/whatsapp/phone-lists/:id
   */
  router.put('/phone-lists/:id', async (req, res) => {
    try {
      const list = await WhatsAppPhoneList.findOne({
        _id: req.params.id,
        companyId: req.user.companyId
      });
      if (!list) return res.status(404).json({ success: false, message: 'Phone list not found' });

      const fields = ['name', 'description', 'phones', 'isActive'];
      fields.forEach(field => {
        if (req.body[field] !== undefined) list[field] = req.body[field];
      });
      await list.save();
      res.json({ success: true, data: list });
    } catch (error) {
      console.error('[WA Routes] Update phone list error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * DELETE /api/whatsapp/phone-lists/:id
   */
  router.delete('/phone-lists/:id', async (req, res) => {
    try {
      const list = await WhatsAppPhoneList.findOneAndDelete({
        _id: req.params.id,
        companyId: req.user.companyId
      });
      if (!list) return res.status(404).json({ success: false, message: 'Phone list not found' });
      res.json({ success: true, message: 'Phone list deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // =====================================================
  // KEYPOINTS
  // =====================================================

  /**
   * GET /api/whatsapp/keypoints/:contactId
   * Get all keypoints for a contact
   */
  router.get('/keypoints/:contactId', async (req, res) => {
    try {
      const keypoints = await WhatsAppKeypoint.find({
        companyId: req.user.companyId,
        contactId: req.params.contactId
      }).sort({ createdAt: -1 }).limit(100).lean();
      res.json({ success: true, data: keypoints });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * POST /api/whatsapp/keypoints
   * Manually add a keypoint
   */
  router.post('/keypoints', async (req, res) => {
    try {
      const { contactId, accountId, text, category } = req.body;
      if (!contactId || !text) {
        return res.status(400).json({ success: false, message: 'contactId and text are required' });
      }
      const keypoint = await WhatsAppKeypoint.create({
        companyId: req.user.companyId,
        accountId: accountId || null,
        contactId,
        text: text.substring(0, 500),
        category: category || 'general',
        source: 'manual'
      });
      res.json({ success: true, data: keypoint });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * DELETE /api/whatsapp/keypoints/:id
   * Delete a keypoint
   */
  router.delete('/keypoints/:id', async (req, res) => {
    try {
      const kp = await WhatsAppKeypoint.findOneAndDelete({
        _id: req.params.id,
        companyId: req.user.companyId
      });
      if (!kp) return res.status(404).json({ success: false, message: 'Keypoint not found' });
      res.json({ success: true, message: 'Keypoint deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // =====================================================
  // SCHEDULED MESSAGES
  // =====================================================

  /**
   * GET /api/whatsapp/scheduled-messages
   * Get all scheduled messages for the company (optional ?contactId= filter)
   */
  router.get('/scheduled-messages', async (req, res) => {
    try {
      const query = { companyId: req.user.companyId };
      if (req.query.contactId) query.contactId = req.query.contactId;
      if (req.query.status) query.status = req.query.status;

      const messages = await WhatsAppScheduledMsg.find(query)
        .sort({ scheduledAt: -1 })
        .limit(100)
        .populate('contactId', 'pushName phoneNumber whatsappId')
        .lean();
      res.json({ success: true, data: messages });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  /**
   * PUT /api/whatsapp/scheduled-messages/:id/cancel
   * Cancel a pending scheduled message
   */
  router.put('/scheduled-messages/:id/cancel', async (req, res) => {
    try {
      const msg = await WhatsAppScheduledMsg.findOneAndUpdate(
        { _id: req.params.id, companyId: req.user.companyId, status: 'pending' },
        { $set: { status: 'cancelled' } },
        { new: true }
      );
      if (!msg) return res.status(404).json({ success: false, message: 'Scheduled message not found or not pending' });
      res.json({ success: true, data: msg });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // =====================================================
  // DASHBOARD / STATS
  // =====================================================

  /**
   * GET /api/whatsapp/dashboard
   * Get aggregated stats for WhatsApp module
   */
  router.get('/dashboard', async (req, res) => {
    try {
      const companyId = req.user.companyId;

      const [accounts, totalContacts, messagesToday, activeCampaigns, chatbotConfig] = await Promise.all([
        WhatsAppAccount.find({ companyId }).select('displayName phoneNumber status profilePicture dailyMessageCount isDefault').lean(),
        WhatsAppContact.countDocuments({ companyId }),
        WhatsAppMessage.countDocuments({
          companyId,
          timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        WhatsAppCampaign.countDocuments({ companyId, status: { $in: ['sending', 'scheduled'] } }),
        WhatsAppChatbot.findOne({ companyId }).lean()
      ]);

      // Messages stats for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const messageStats = await WhatsAppMessage.aggregate([
        { $match: { companyId: new mongoose.Types.ObjectId(companyId), timestamp: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              direction: '$direction'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      res.json({
        success: true,
        data: {
          accounts,
          totalContacts,
          messagesToday,
          activeCampaigns,
          chatbotEnabled: chatbotConfig?.enabled || false,
          chatbotTotalReplies: chatbotConfig?.totalReplies || 0,
          messageStats
        }
      });
    } catch (error) {
      console.error('[WA Routes] Dashboard error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  return router;
}

module.exports = { initializeRoutes };
