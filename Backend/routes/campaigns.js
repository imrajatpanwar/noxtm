const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const ContactList = require('../models/ContactList');
const { authenticateToken } = require('../middleware/auth');
const { requireManagerOrOwner } = require('../middleware/campaignAuth');
const { sendCampaignEmails } = require('../services/campaignEmailService');

// Apply authentication and role check to all routes
router.use(authenticateToken);
router.use(requireManagerOrOwner);

/**
 * GET /api/campaigns
 * List all campaigns for the user's company
 */
router.get('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { status, page = 1, limit = 20 } = req.query;

    const filters = {};
    if (status) {
      filters.status = status;
    }

    const campaigns = await Campaign.getByCompany(companyId, filters);

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCampaigns = campaigns.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedCampaigns,
      pagination: {
        total: campaigns.length,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(campaigns.length / limit)
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns/:id
 * Get single campaign with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const campaign = await Campaign.findOne({ _id: id, companyId })
      .populate('createdBy', 'fullName email')
      .populate('lastModifiedBy', 'fullName email')
      .populate('contactLists', 'name contactCount')
      .populate('emailTemplate', 'name subject body');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign',
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns
 * Create new campaign
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    const {
      name,
      description,
      subject,
      body,
      content, // Frontend sends 'content', accept both
      replyTo,
      from,    // Frontend sends 'from', accept both
      fromEmail,
      fromName,
      emailTemplate,
      recipients,
      schedule,
      scheduledTime
    } = req.body;

    // Use content if body not provided (frontend compatibility)
    const emailBody = body || content;
    // Use from if fromEmail not provided (frontend compatibility)
    const senderEmail = fromEmail || from || 'rajat@mail.noxtm.com';
    // Use fromEmail as replyTo fallback
    const replyToEmail = replyTo || senderEmail;

    // Validation - only name, subject, and body/content are required
    if (!name || !subject || !emailBody) {
      return res.status(400).json({
        success: false,
        message: 'Name, subject, and body/content are required'
      });
    }

    const campaign = new Campaign({
      name,
      description,
      subject,
      body: emailBody,
      replyTo: replyToEmail,
      fromEmail: senderEmail,
      fromName: fromName || 'Noxtm',
      emailTemplate,
      companyId,
      createdBy: userId,
      lastModifiedBy: userId
    });

    // If recipients provided, add them directly
    if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      campaign.recipients = recipients.map(email => ({
        email: typeof email === 'string' ? email : email.email,
        name: typeof email === 'object' ? email.name : '',
        status: 'pending'
      }));
      campaign.stats = {
        totalRecipients: recipients.length,
        sent: 0,
        failed: 0,
        bounced: 0,
        pending: recipients.length
      };
    }

    await campaign.save();

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message
    });
  }
});

/**
 * PATCH /api/campaigns/:id
 * Update campaign
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.userId;
    const companyId = req.user.companyId;

    const campaign = await Campaign.findOne({ _id: id, companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Don't allow editing campaigns that are sending or sent
    if (['sending', 'sent'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit campaign that is sending or has been sent'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'subject', 'body', 'replyTo', 'fromEmail', 'fromName', 'emailTemplate'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        campaign[field] = req.body[field];
      }
    });

    campaign.lastModifiedBy = userId;
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: error.message
    });
  }
});

/**
 * DELETE /api/campaigns/:id
 * Delete campaign
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const campaign = await Campaign.findOne({ _id: id, companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Don't allow deleting campaigns that are sending
    if (campaign.status === 'sending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete campaign that is currently sending'
      });
    }

    await Campaign.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign',
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/recipients
 * Add recipients to campaign
 */
router.post('/:id/recipients', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { recipients, contactListIds } = req.body;

    const campaign = await Campaign.findOne({ _id: id, companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Don't allow adding recipients to campaigns that are sending or sent
    if (['sending', 'sent'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add recipients to campaign that is sending or has been sent'
      });
    }

    // Add recipients from contact lists
    if (contactListIds && contactListIds.length > 0) {
      for (const listId of contactListIds) {
        const contactList = await ContactList.findOne({ _id: listId, companyId });
        if (contactList) {
          await campaign.addRecipientsFromList(contactList);
          await contactList.recordUsage();
        }
      }
    }

    // Add individual recipients
    if (recipients && recipients.length > 0) {
      const existingEmails = new Set(campaign.recipients.map(r => r.email));
      const newRecipients = recipients
        .filter(r => !existingEmails.has(r.email))
        .map(r => ({
          email: r.email,
          name: r.name,
          companyName: r.companyName,
          variables: new Map(Object.entries(r.variables || {})),
          status: 'pending'
        }));

      campaign.recipients.push(...newRecipients);
    }

    await campaign.save();

    res.json({
      success: true,
      message: 'Recipients added successfully',
      data: {
        recipientCount: campaign.stats.totalRecipients
      }
    });
  } catch (error) {
    console.error('Add recipients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add recipients',
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/send
 * Send campaign immediately
 */
router.post('/:id/send', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const campaign = await Campaign.findOne({ _id: id, companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Validate campaign has recipients
    if (!campaign.recipients || campaign.recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must have at least one recipient'
      });
    }

    // Don't allow sending campaigns that are already sending or sent
    if (['sending', 'sent'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: 'Campaign is already sending or has been sent'
      });
    }

    // Start sending process (async)
    sendCampaignEmails(campaign._id).catch(err => {
      console.error('Campaign send error:', err);
    });

    // Return immediately
    campaign.status = 'sending';
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign sending started',
      data: {
        campaignId: campaign._id,
        status: campaign.status,
        recipientCount: campaign.stats.totalRecipients
      }
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send campaign',
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/schedule
 * Schedule campaign for future sending
 */
router.post('/:id/schedule', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'scheduledAt is required'
      });
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future'
      });
    }

    const campaign = await Campaign.findOne({ _id: id, companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Validate campaign has recipients
    if (!campaign.recipients || campaign.recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must have at least one recipient'
      });
    }

    campaign.scheduledAt = scheduledDate;
    campaign.status = 'scheduled';
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign scheduled successfully',
      data: {
        campaignId: campaign._id,
        scheduledAt: campaign.scheduledAt
      }
    });
  } catch (error) {
    console.error('Schedule campaign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule campaign',
      error: error.message
    });
  }
});

/**
 * POST /api/campaigns/:id/test
 * Send a test email
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    const { testEmail } = req.body;

    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: 'Test email address is required'
      });
    }

    const campaign = await Campaign.findOne({ _id: id, companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Send test email using the campaign email service
    const { sendEmailViaSES } = require('../utils/awsSesHelper');

    await sendEmailViaSES({
      from: `${campaign.fromName} <${campaign.fromEmail}>`,
      to: testEmail,
      subject: `[TEST] ${campaign.subject}`,
      html: campaign.body,
      text: campaign.body.replace(/<[^>]*>/g, ''),
      replyTo: campaign.replyTo
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        testEmail
      }
    });
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

/**
 * GET /api/campaigns/:id/stats
 * Get campaign statistics
 */
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;

    const campaign = await Campaign.findOne({ _id: id, companyId });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const stats = {
      ...campaign.stats.toObject(),
      successRate: campaign.stats.totalRecipients > 0
        ? ((campaign.stats.sent / campaign.stats.totalRecipients) * 100).toFixed(2)
        : 0,
      failureRate: campaign.stats.totalRecipients > 0
        ? ((campaign.stats.failed / campaign.stats.totalRecipients) * 100).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign statistics',
      error: error.message
    });
  }
});

module.exports = router;
