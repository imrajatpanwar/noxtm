const WhatsAppChatbotRule = require('../models/WhatsAppChatbotRule');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const axios = require('axios');

/**
 * Process incoming message through chatbot rules
 * @param {string} accountId - WhatsApp Account ID
 * @param {string} companyId - Company ID
 * @param {Object} contact - WhatsAppContact document
 * @param {string} messageText - Incoming message text
 * @param {Map} cooldowns - Cooldown tracking map
 * @returns {Object|null} Response to send, or null if no rule matched
 */
async function processIncomingMessage(accountId, companyId, contact, messageText, cooldowns) {
  if (!messageText || !messageText.trim()) return null;

  const text = messageText.trim().toLowerCase();

  // Fetch active rules for this account (or global rules with null accountId)
  const rules = await WhatsAppChatbotRule.find({
    companyId,
    isActive: true,
    $or: [
      { accountId },
      { accountId: null }
    ]
  }).sort({ priority: 1 });

  if (!rules.length) return null;

  let aiFallbackRule = null;

  for (const rule of rules) {
    // AI fallback is only used if no other rule matches
    if (rule.triggerType === 'ai-fallback') {
      aiFallbackRule = rule;
      continue;
    }

    // Check cooldown
    const cooldownKey = `${accountId}:${contact.whatsappId}:${rule._id}`;
    const lastTriggered = cooldowns.get(cooldownKey);
    if (lastTriggered && (Date.now() - lastTriggered) < rule.cooldownMinutes * 60 * 1000) {
      continue; // Still in cooldown
    }

    // Check if trigger matches
    let matched = false;

    switch (rule.triggerType) {
      case 'keyword':
        matched = text === (rule.triggerValue || '').toLowerCase();
        break;
      case 'contains':
        matched = text.includes((rule.triggerValue || '').toLowerCase());
        break;
      case 'starts-with':
        matched = text.startsWith((rule.triggerValue || '').toLowerCase());
        break;
      case 'regex':
        try {
          const regex = new RegExp(rule.triggerValue, 'i');
          matched = regex.test(messageText);
        } catch (e) {
          // Invalid regex — skip
        }
        break;
    }

    if (matched) {
      // Set cooldown
      cooldowns.set(cooldownKey, Date.now());

      // Update stats
      rule.stats.triggered = (rule.stats.triggered || 0) + 1;
      rule.stats.responded = (rule.stats.responded || 0) + 1;
      await rule.save();

      // Build response
      return buildResponse(rule, contact, messageText);
    }
  }

  // No rule matched — try AI fallback
  if (aiFallbackRule) {
    const cooldownKey = `${accountId}:${contact.whatsappId}:${aiFallbackRule._id}`;
    const lastTriggered = cooldowns.get(cooldownKey);
    if (lastTriggered && (Date.now() - lastTriggered) < aiFallbackRule.cooldownMinutes * 60 * 1000) {
      return null;
    }

    try {
      const aiResponse = await generateAIResponse(aiFallbackRule, accountId, companyId, contact, messageText);
      if (aiResponse) {
        cooldowns.set(cooldownKey, Date.now());
        aiFallbackRule.stats.triggered = (aiFallbackRule.stats.triggered || 0) + 1;
        aiFallbackRule.stats.responded = (aiFallbackRule.stats.responded || 0) + 1;
        await aiFallbackRule.save();
        return aiResponse;
      }
    } catch (err) {
      console.error('[WA Chatbot] AI fallback error:', err.message);
    }
  }

  return null;
}

/**
 * Build a response from a rule-based match
 */
function buildResponse(rule, contact, messageText) {
  let content = rule.responseContent || '';

  // Variable replacement
  content = content.replace(/{{name}}/gi, contact.pushName || contact.phoneNumber || '');
  content = content.replace(/{{phone}}/gi, contact.phoneNumber || '');

  return {
    type: rule.responseType === 'ai' ? 'text' : rule.responseType,
    content,
    mediaUrl: rule.responseMediaUrl || null,
    ruleId: rule._id
  };
}

/**
 * Generate AI response using OpenAI-compatible API
 */
async function generateAIResponse(rule, accountId, companyId, contact, messageText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('[WA Chatbot] No OPENAI_API_KEY set, skipping AI response');
    return null;
  }

  // Fetch last 5 messages for context
  const recentMessages = await WhatsAppMessage.find({
    accountId,
    contactId: contact._id
  })
    .sort({ timestamp: -1 })
    .limit(5)
    .lean();

  // Build conversation history
  const conversationHistory = recentMessages.reverse().map(msg => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content || '[media]'
  }));

  // Add current message
  conversationHistory.push({ role: 'user', content: messageText });

  const systemPrompt = (rule.aiPrompt || 'You are a helpful business assistant.')
    + `\n\nCustomer name: ${contact.pushName || 'Unknown'}`
    + `\nCustomer phone: ${contact.phoneNumber || 'Unknown'}`
    + '\n\nKeep responses concise and under 200 words. Be professional and friendly.';

  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: rule.aiModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ],
      max_tokens: rule.aiMaxTokens || 300,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const aiContent = response.data.choices?.[0]?.message?.content;
    if (aiContent) {
      return {
        type: 'text',
        content: aiContent.trim(),
        ruleId: rule._id
      };
    }
  } catch (err) {
    console.error('[WA Chatbot] OpenAI API error:', err.response?.data?.error?.message || err.message);
  }

  return null;
}

module.exports = {
  processIncomingMessage
};
