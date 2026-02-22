const WhatsAppChatbot = require('../models/WhatsAppChatbot');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const Note = require('../models/Note');
const axios = require('axios');

// Provider endpoint configs
const PROVIDERS = {
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headerFn: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://noxtm.com',
      'X-Title': 'NOXTM WhatsApp Bot'
    })
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    headerFn: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    headerFn: (apiKey) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    })
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headerFn: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  },
  together: {
    url: 'https://api.together.xyz/v1/chat/completions',
    headerFn: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  }
};

/**
 * Process incoming message through AI chatbot
 */
async function processIncomingMessage(accountId, companyId, contact, messageText, cooldowns) {
  if (!messageText || !messageText.trim()) return null;

  // Fetch chatbot config for this company
  const bot = await WhatsAppChatbot.findOne({ companyId, enabled: true });
  if (!bot) return null;
  if (!bot.apiKey) return null;

  // Check if this bot applies to this account
  if (bot.accountIds && bot.accountIds.length > 0) {
    if (!bot.accountIds.some(id => id.toString() === accountId.toString())) {
      return null;
    }
  }

  // Check cooldown
  const cooldownKey = `bot:${companyId}:${contact.whatsappId}`;
  const lastTriggered = cooldowns.get(cooldownKey);
  if (lastTriggered && (Date.now() - lastTriggered) < bot.cooldownMinutes * 60 * 1000) {
    return null;
  }

  try {
    const aiResponse = await generateAIResponse(bot, accountId, companyId, contact, messageText);
    if (aiResponse) {
      cooldowns.set(cooldownKey, Date.now());
      bot.totalReplies = (bot.totalReplies || 0) + 1;
      bot.lastReplyAt = new Date();
      await bot.save();
      return aiResponse;
    }
  } catch (err) {
    console.error('[WA Bot] AI response error:', err.message);
  }

  return null;
}

/**
 * Generate AI response using configured provider
 */
async function generateAIResponse(bot, accountId, companyId, contact, messageText) {
  let recentMessages = [];
  try {
    recentMessages = await WhatsAppMessage.find({
      accountId,
      contactId: contact._id
    })
      .sort({ timestamp: -1 })
      .limit(6)
      .lean();
  } catch (e) {
    // Ignore - happens in test mode with mock IDs
  }

  const conversationHistory = recentMessages.reverse().map(msg => ({
    role: msg.direction === 'inbound' ? 'user' : 'assistant',
    content: msg.content || '[media]'
  }));

  conversationHistory.push({ role: 'user', content: messageText });

  // Build system prompt
  let systemPrompt = bot.botPersonality || 'You are a helpful business assistant.';
  systemPrompt += `\n\nYour name is "${bot.botName || 'botgit'}".`;
  systemPrompt += `\nCustomer name: ${contact.pushName || 'Unknown'}`;
  systemPrompt += `\nCustomer phone: ${contact.phoneNumber || 'Unknown'}`;
  systemPrompt += '\n\nKeep responses concise and under 200 words. Be professional and friendly.';
  systemPrompt += '\nDo NOT reveal you are an AI or bot. Respond naturally as a human assistant.';

  // If notes access is enabled, fetch notes as knowledge base
  if (bot.notesAccess) {
    try {
      const notes = await Note.find({
        companyId,
        archived: { $ne: true }
      })
        .select('title content')
        .sort({ updatedAt: -1 })
        .limit(10)
        .lean();

      if (notes.length > 0) {
        const notesContext = notes
          .map(n => `[${n.title}]: ${(n.content || '').substring(0, 500)}`)
          .join('\n\n');
        systemPrompt += `\n\n--- KNOWLEDGE BASE (Company Notes) ---\n${notesContext}\n--- END KNOWLEDGE BASE ---`;
        systemPrompt += '\nUse the knowledge base above to answer questions when relevant.';
      }
    } catch (err) {
      console.error('[WA Bot] Failed to fetch notes:', err.message);
    }
  }

  if (bot.provider === 'anthropic') {
    return callAnthropicAPI(bot, systemPrompt, conversationHistory);
  } else {
    return callOpenAICompatibleAPI(bot, systemPrompt, conversationHistory);
  }
}

/**
 * Call OpenAI-compatible API (OpenAI, OpenRouter, Groq, Together, Custom)
 */
async function callOpenAICompatibleAPI(bot, systemPrompt, messages) {
  const provider = PROVIDERS[bot.provider];
  const url = bot.provider === 'custom' ? bot.customEndpoint : provider?.url;
  const headers = bot.provider === 'custom'
    ? { 'Authorization': `Bearer ${bot.apiKey}`, 'Content-Type': 'application/json' }
    : provider?.headerFn(bot.apiKey);

  if (!url) {
    console.warn('[WA Bot] No endpoint configured for provider:', bot.provider);
    return null;
  }

  try {
    const response = await axios.post(url, {
      model: bot.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: bot.maxTokens || 300,
      temperature: bot.temperature || 0.7
    }, {
      headers,
      timeout: 20000
    });

    const content = response.data.choices?.[0]?.message?.content;
    if (content) {
      return { type: 'text', content: content.trim(), ruleId: null };
    }
  } catch (err) {
    console.error(`[WA Bot] ${bot.provider} API error:`, err.response?.data?.error?.message || err.message);
  }

  return null;
}

/**
 * Call Anthropic API (different request format)
 */
async function callAnthropicAPI(bot, systemPrompt, messages) {
  const headers = PROVIDERS.anthropic.headerFn(bot.apiKey);

  try {
    const response = await axios.post(PROVIDERS.anthropic.url, {
      model: bot.model || 'claude-sonnet-4-20250514',
      max_tokens: bot.maxTokens || 300,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content
      }))
    }, {
      headers,
      timeout: 20000
    });

    const content = response.data.content?.[0]?.text;
    if (content) {
      return { type: 'text', content: content.trim(), ruleId: null };
    }
  } catch (err) {
    console.error('[WA Bot] Anthropic API error:', err.response?.data?.error?.message || err.message);
  }

  return null;
}

module.exports = {
  processIncomingMessage
};
