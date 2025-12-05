const { sendEmailViaSES } = require('../utils/awsSesHelper');
const EmailLog = require('../models/EmailLog');
const Campaign = require('../models/Campaign');
const EmailTemplate = require('../models/EmailTemplate');

/**
 * Send campaign emails
 * Processes recipients in batches to avoid rate limits
 * @param {string} campaignId - Campaign ID
 * @returns {Promise<Object>} - Result with stats
 */
async function sendCampaignEmails(campaignId) {
  try {
    const campaign = await Campaign.findById(campaignId)
      .populate('emailTemplate');

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.status = 'sending';
    await campaign.save();

    const batchSize = 10; // AWS SES rate limit consideration
    const batches = [];

    for (let i = 0; i < campaign.recipients.length; i += batchSize) {
      batches.push(campaign.recipients.slice(i, i + batchSize));
    }

    // Process each batch
    for (const batch of batches) {
      await Promise.all(
        batch.map(recipient => sendToRecipient(campaign, recipient))
      );

      // Save progress after each batch
      await campaign.save();

      // Small delay between batches to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update campaign status
    campaign.status = 'sent';
    campaign.sentAt = new Date();
    await campaign.save();

    return {
      success: true,
      stats: campaign.stats
    };

  } catch (error) {
    console.error('Campaign send error:', error);

    // Update campaign status to failed
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      campaign.status = 'failed';
      await campaign.save();
    }

    throw error;
  }
}

/**
 * Send email to individual recipient
 * @param {Object} campaign - Campaign object
 * @param {Object} recipient - Recipient object
 */
async function sendToRecipient(campaign, recipient) {
  try {
    // Render email with personalization
    let subject = campaign.subject;
    let body = campaign.body;

    // Replace variables from recipient.variables Map
    if (recipient.variables && recipient.variables instanceof Map) {
      for (const [key, value] of recipient.variables) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, value || '');
        body = body.replace(regex, value || '');
      }
    }

    // Replace common variables
    subject = subject.replace(/{{name}}/g, recipient.name || '');
    subject = subject.replace(/{{email}}/g, recipient.email);
    subject = subject.replace(/{{companyName}}/g, recipient.companyName || '');

    body = body.replace(/{{name}}/g, recipient.name || '');
    body = body.replace(/{{email}}/g, recipient.email);
    body = body.replace(/{{companyName}}/g, recipient.companyName || '');

    // Send via SES
    const result = await sendEmailViaSES({
      from: `${campaign.fromName} <${campaign.fromEmail}>`,
      to: recipient.email,
      subject,
      html: body,
      text: stripHtml(body),
      replyTo: campaign.replyTo
    });

    // Log success
    const emailLog = await EmailLog.create({
      messageId: result.MessageId,
      from: campaign.fromEmail,
      to: [recipient.email],
      subject,
      status: 'sent',
      direction: 'sent',
      companyId: campaign.companyId,
      emailAddress: campaign.fromEmail,
      domain: campaign.fromEmail.split('@')[1],
      metadata: {
        campaignId: campaign._id.toString(),
        campaignName: campaign.name
      }
    });

    // Update recipient status
    recipient.status = 'sent';
    recipient.sentAt = new Date();
    recipient.emailLogId = emailLog._id;

  } catch (error) {
    console.error(`Failed to send to ${recipient.email}:`, error);

    // Log failure
    await EmailLog.create({
      from: campaign.fromEmail,
      to: [recipient.email],
      subject: campaign.subject,
      status: 'failed',
      error: error.message,
      direction: 'sent',
      companyId: campaign.companyId,
      emailAddress: campaign.fromEmail,
      domain: campaign.fromEmail.split('@')[1],
      metadata: {
        campaignId: campaign._id.toString(),
        campaignName: campaign.name
      }
    });

    // Update recipient status
    recipient.status = 'failed';
    recipient.error = error.message;
  }
}

/**
 * Strip HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} - Plain text
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Replace variables in text
 * @param {string} text - Text with variables
 * @param {Map} variables - Map of variable key-value pairs
 * @returns {string} - Text with variables replaced
 */
function replaceVariables(text, variables) {
  if (!text) return '';

  let result = text;

  if (variables && variables instanceof Map) {
    for (const [key, value] of variables) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    }
  }

  return result;
}

module.exports = {
  sendCampaignEmails,
  sendToRecipient,
  replaceVariables,
  stripHtml
};
