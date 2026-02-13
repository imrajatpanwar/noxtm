const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppContact = require('../models/WhatsAppContact');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const sessionManager = require('./whatsappSessionManager');

// Track running campaigns: campaignId -> { paused: bool, aborted: bool }
const runningCampaigns = new Map();

/**
 * Start or resume sending a campaign
 * @param {string} campaignId - Campaign ID
 * @param {Object} io - Socket.IO instance (optional, uses sessionManager emitter)
 */
async function startCampaign(campaignId) {
  const campaign = await WhatsAppCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status === 'completed') throw new Error('Campaign already completed');
  if (campaign.status === 'sending' && runningCampaigns.has(campaignId)) {
    throw new Error('Campaign already sending');
  }

  // Check account
  const account = await WhatsAppAccount.findById(campaign.accountId);
  if (!account || account.status !== 'connected') {
    throw new Error('WhatsApp account not connected');
  }

  // Set campaign state
  campaign.status = 'sending';
  if (!campaign.startedAt) campaign.startedAt = new Date();
  await campaign.save();

  // Track this campaign
  runningCampaigns.set(campaignId, { paused: false, aborted: false });

  // Emit start event
  emitProgress(campaign.companyId, campaignId, {
    status: 'sending',
    stats: campaign.stats
  });

  // Run in background (don't await)
  processCampaign(campaignId).catch(err => {
    console.error(`[WA Campaign] Error processing ${campaignId}:`, err.message);
  });

  return { success: true, message: 'Campaign started' };
}

/**
 * Pause a running campaign
 */
async function pauseCampaign(campaignId) {
  const state = runningCampaigns.get(campaignId);
  if (state) {
    state.paused = true;
  }

  const campaign = await WhatsAppCampaign.findById(campaignId);
  if (campaign && campaign.status === 'sending') {
    campaign.status = 'paused';
    await campaign.save();
  }

  emitProgress(campaign?.companyId, campaignId, { status: 'paused' });
  return { success: true, message: 'Campaign paused' };
}

/**
 * Resume a paused campaign
 */
async function resumeCampaign(campaignId) {
  const campaign = await WhatsAppCampaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');
  if (campaign.status !== 'paused') throw new Error('Campaign is not paused');

  return startCampaign(campaignId);
}

/**
 * Abort a campaign completely
 */
async function abortCampaign(campaignId) {
  const state = runningCampaigns.get(campaignId);
  if (state) {
    state.aborted = true;
    state.paused = true;
  }

  const campaign = await WhatsAppCampaign.findById(campaignId);
  if (campaign) {
    campaign.status = 'failed';
    campaign.completedAt = new Date();
    await campaign.save();
  }

  runningCampaigns.delete(campaignId);
  emitProgress(campaign?.companyId, campaignId, { status: 'failed', reason: 'aborted' });
  return { success: true, message: 'Campaign aborted' };
}

/**
 * Process campaign recipients in batches with throttling
 */
async function processCampaign(campaignId) {
  let campaign = await WhatsAppCampaign.findById(campaignId);
  if (!campaign) return;

  const { batchSize = 10, delayMin = 3, delayMax = 8, dailyLimit = 200, sendHoursStart = 0, sendHoursEnd = 24 } = campaign.settings || {};

  const startIndex = campaign.resumeIndex || 0;
  const recipients = campaign.recipients;
  let sentCount = 0;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;

  for (let i = startIndex; i < recipients.length; i++) {
    // Check state
    const state = runningCampaigns.get(campaignId);
    if (!state || state.paused || state.aborted) {
      campaign.resumeIndex = i;
      await campaign.save();
      runningCampaigns.delete(campaignId);
      return;
    }

    // Check send hours
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour < sendHoursStart || currentHour >= sendHoursEnd) {
      // Outside send hours — pause and notify
      campaign.status = 'paused';
      campaign.resumeIndex = i;
      await campaign.save();
      runningCampaigns.delete(campaignId);
      emitProgress(campaign.companyId, campaignId, {
        status: 'paused',
        reason: 'outside_send_hours'
      });
      return;
    }

    // Check daily limit
    if (sentCount >= dailyLimit) {
      campaign.status = 'paused';
      campaign.resumeIndex = i;
      await campaign.save();
      runningCampaigns.delete(campaignId);
      emitProgress(campaign.companyId, campaignId, {
        status: 'paused',
        reason: 'daily_limit_reached'
      });
      return;
    }

    const recipient = recipients[i];
    if (recipient.status === 'sent' || recipient.status === 'delivered' || recipient.status === 'read') {
      continue; // Already sent
    }

    try {
      // Build message content with variable interpolation
      let messageContent = campaign.message || '';
      messageContent = messageContent.replace(/{{name}}/gi, recipient.name || '');
      messageContent = messageContent.replace(/{{phone}}/gi, recipient.phone || '');

      if (recipient.variables && recipient.variables instanceof Map) {
        for (const [key, value] of recipient.variables) {
          const regex = new RegExp(`{{${key}}}`, 'gi');
          messageContent = messageContent.replace(regex, value || '');
        }
      }

      // Determine JID
      const jid = recipient.whatsappId || `${recipient.phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;

      // Send via session manager
      const sendOptions = {};
      if (campaign.mediaUrl) {
        sendOptions.type = campaign.mediaType || 'image';
        sendOptions.mediaUrl = campaign.mediaUrl;
        sendOptions.filename = campaign.mediaFilename;
        sendOptions.caption = messageContent;
      }

      const result = await sessionManager.sendMessage(
        campaign.accountId.toString(),
        jid,
        sendOptions.type ? sendOptions : { type: 'text', text: messageContent },
        { campaignId: campaign._id }
      );

      // Update recipient
      recipient.status = 'sent';
      recipient.sentAt = new Date();
      if (result?.messageId) {
        recipient.messageId = result.messageId;
      }

      sentCount++;
      consecutiveFailures = 0;

    } catch (err) {
      console.error(`[WA Campaign] Failed to send to ${recipient.phone}:`, err.message);
      recipient.status = 'failed';
      recipient.error = err.message;
      consecutiveFailures++;

      // Too many failures — abort to protect account
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        campaign.status = 'paused';
        campaign.resumeIndex = i + 1;
        await campaign.save();
        runningCampaigns.delete(campaignId);
        emitProgress(campaign.companyId, campaignId, {
          status: 'paused',
          reason: 'too_many_failures',
          stats: campaign.stats
        });
        return;
      }
    }

    // Save progress every batch
    if ((i - startIndex) % batchSize === 0 && i > startIndex) {
      campaign.resumeIndex = i;
      await campaign.save();

      emitProgress(campaign.companyId, campaignId, {
        status: 'sending',
        progress: Math.round((i / recipients.length) * 100),
        stats: campaign.stats,
        currentIndex: i,
        total: recipients.length
      });
    }

    // Random delay between messages (anti-ban)
    const delay = (Math.random() * (delayMax - delayMin) + delayMin) * 1000;
    await new Promise(r => setTimeout(r, delay));
  }

  // Campaign complete
  campaign.status = 'completed';
  campaign.completedAt = new Date();
  campaign.resumeIndex = recipients.length;
  await campaign.save();
  runningCampaigns.delete(campaignId);

  emitProgress(campaign.companyId, campaignId, {
    status: 'completed',
    stats: campaign.stats
  });
}

/**
 * Emit campaign progress via Socket.IO
 */
function emitProgress(companyId, campaignId, data) {
  try {
    sessionManager.emitToCompany(companyId, 'whatsapp:campaign:progress', {
      campaignId,
      ...data
    });
  } catch (e) {
    // Socket may not be available
  }
}

/**
 * Check if a campaign is currently running
 */
function isCampaignRunning(campaignId) {
  return runningCampaigns.has(campaignId);
}

module.exports = {
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  abortCampaign,
  isCampaignRunning
};
