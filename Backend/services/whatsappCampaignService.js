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
 * Process campaign recipients in batches with throttling + ramp-up
 */
async function processCampaign(campaignId) {
  let campaign = await WhatsAppCampaign.findById(campaignId);
  if (!campaign) return;

  const {
    batchSize = 10,
    delayMin = 10,
    delayMax = 45,
    dailyLimit = 100,
    rampUpEnabled = true,
    rampUpPercent = 15,
    randomDelayEnabled = true
  } = campaign.settings || {};

  const startIndex = campaign.resumeIndex || 0;
  const recipients = campaign.recipients;
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 5;

  // Helper: get today's date string
  const getDateStr = () => new Date().toISOString().split('T')[0];

  // Initialize day tracking
  const today = getDateStr();
  if (campaign.lastSendDate !== today) {
    // New day — increment dayNumber (unless first run)
    if (campaign.lastSendDate) {
      campaign.dayNumber = (campaign.dayNumber || 1) + 1;
    }
    campaign.dailySentCount = 0;
    campaign.lastSendDate = today;
  }

  // Calculate today's daily limit with ramp-up
  const dayNum = campaign.dayNumber || 1;
  const todayLimit = rampUpEnabled
    ? Math.floor(dailyLimit * Math.pow(1 + rampUpPercent / 100, dayNum - 1))
    : dailyLimit;

  // Calculate estimated time remaining
  const calcEstimatedTime = (remaining) => {
    if (remaining <= 0) return 0;
    const avgDelay = (delayMin + delayMax) / 2;
    // How many can we send today
    const canSendToday = Math.max(0, todayLimit - campaign.dailySentCount);
    if (remaining <= canSendToday) {
      return remaining * avgDelay; // all fit today
    }
    // Multi-day estimate
    let remainingMsgs = remaining;
    let totalSeconds = canSendToday * avgDelay; // finish today's quota
    remainingMsgs -= canSendToday;
    let futureDay = dayNum + 1;
    while (remainingMsgs > 0) {
      const futureLimit = rampUpEnabled
        ? Math.floor(dailyLimit * Math.pow(1 + rampUpPercent / 100, futureDay - 1))
        : dailyLimit;
      const batch = Math.min(remainingMsgs, futureLimit);
      totalSeconds += batch * avgDelay;
      remainingMsgs -= batch;
      futureDay++;
      if (futureDay > dayNum + 100) break; // safety
    }
    return totalSeconds;
  };


  for (let i = startIndex; i < recipients.length; i++) {
    // Check state
    const state = runningCampaigns.get(campaignId);
    if (!state || state.paused || state.aborted) {
      campaign.resumeIndex = i;
      await campaign.save();
      runningCampaigns.delete(campaignId);
      return;
    }

    // Check if day changed mid-run
    const nowDate = getDateStr();
    if (campaign.lastSendDate !== nowDate) {
      campaign.dayNumber = (campaign.dayNumber || 1) + 1;
      campaign.dailySentCount = 0;
      campaign.lastSendDate = nowDate;
    }

    // Recalculate today's limit (may have changed if day rolled over)
    const currentDayNum = campaign.dayNumber || 1;
    const currentDayLimit = rampUpEnabled
      ? Math.floor(dailyLimit * Math.pow(1 + rampUpPercent / 100, currentDayNum - 1))
      : dailyLimit;

    // Send hours check removed — campaigns start immediately

    // Check daily limit
    if (campaign.dailySentCount >= currentDayLimit) {
      campaign.status = 'paused';
      campaign.resumeIndex = i;
      await campaign.save();
      runningCampaigns.delete(campaignId);
      emitProgress(campaign.companyId, campaignId, {
        status: 'paused',
        reason: 'daily_limit_reached',
        stats: campaign.stats,
        dayNumber: currentDayNum,
        dailySentCount: campaign.dailySentCount,
        dailyLimitToday: currentDayLimit
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
        messageContent,
        { ...sendOptions, campaignId: campaign._id }
      );

      // Update recipient
      recipient.status = 'sent';
      recipient.sentAt = new Date();
      if (result?.messageId) {
        recipient.messageId = result.messageId;
      }

      campaign.dailySentCount++;
      consecutiveFailures = 0;

    } catch (err) {
      console.error(`[WA Campaign] Failed to send to ${recipient.phone}:`, err.message);
      recipient.status = 'failed';
      recipient.error = err.message;
      consecutiveFailures++;

      // Too many failures — pause to protect account
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        campaign.status = 'paused';
        campaign.resumeIndex = i + 1;
        await campaign.save();
        runningCampaigns.delete(campaignId);
        emitProgress(campaign.companyId, campaignId, {
          status: 'paused',
          reason: 'too_many_failures',
          stats: campaign.stats,
          dayNumber: currentDayNum,
          dailySentCount: campaign.dailySentCount,
          dailyLimitToday: currentDayLimit
        });
        return;
      }
    }

    // Save progress every batch
    if ((i - startIndex) % batchSize === 0 && i > startIndex) {
      campaign.resumeIndex = i;
      await campaign.save();

      const remaining = recipients.length - i;
      const estSeconds = calcEstimatedTime(remaining);

      emitProgress(campaign.companyId, campaignId, {
        status: 'sending',
        progress: Math.round((i / recipients.length) * 100),
        stats: campaign.stats,
        currentIndex: i,
        total: recipients.length,
        dayNumber: campaign.dayNumber,
        dailySentCount: campaign.dailySentCount,
        dailyLimitToday: currentDayLimit,
        estimatedTimeRemaining: estSeconds
      });
    }

    // Random delay between messages (anti-ban)
    if (randomDelayEnabled) {
      const delay = (Math.random() * (delayMax - delayMin) + delayMin) * 1000;
      await new Promise(r => setTimeout(r, delay));
    } else {
      // Fixed minimum delay
      await new Promise(r => setTimeout(r, delayMin * 1000));
    }
  }

  // Campaign complete
  campaign.status = 'completed';
  campaign.completedAt = new Date();
  campaign.resumeIndex = recipients.length;
  await campaign.save();
  runningCampaigns.delete(campaignId);

  emitProgress(campaign.companyId, campaignId, {
    status: 'completed',
    stats: campaign.stats,
    dayNumber: campaign.dayNumber,
    dailySentCount: campaign.dailySentCount
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
