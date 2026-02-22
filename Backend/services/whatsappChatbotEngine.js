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

  // Check cooldown (skip if cooldownMinutes is 0)
  const cooldownKey = `bot:${companyId}:${contact.whatsappId}`;
  if (bot.cooldownMinutes > 0) {
    const lastTriggered = cooldowns.get(cooldownKey);
    if (lastTriggered && (Date.now() - lastTriggered) < bot.cooldownMinutes * 60 * 1000) {
      return null;
    }
  }

  try {
    const aiResponse = await generateAIResponse(bot, accountId, companyId, contact, messageText);
    if (aiResponse) {
      cooldowns.set(cooldownKey, Date.now());
      // Use atomic update to avoid race condition on concurrent messages
      await WhatsAppChatbot.updateOne(
        { _id: bot._id },
        { $inc: { totalReplies: 1 }, $set: { lastReplyAt: new Date() } }
      );
      // Pass maxWordsPerMsg so session manager can split if needed
      aiResponse.maxWordsPerMsg = bot.maxWordsPerMsg || 0;
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
  // Parallel fetch: message history + notes (don't wait sequentially)
  let recentMessages = [];
  let notes = [];

  const [msgResult, notesResult] = await Promise.allSettled([
    WhatsAppMessage.find({ accountId, contactId: contact._id })
      .sort({ timestamp: -1 })
      .limit(6)
      .lean(),
    Note.find({ companyId, botgitAccess: true, archived: { $ne: true } })
      .select('title content')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean()
  ]);

  if (msgResult.status === 'fulfilled') recentMessages = msgResult.value;
  if (notesResult.status === 'fulfilled') notes = notesResult.value;

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
  systemPrompt += '\nNEVER apologize for delays or say "sorry for the late reply". Just respond directly to the message.';

  // Attach notes as knowledge base
  if (notes.length > 0) {
    const notesContext = notes
      .map(n => `[${n.title}]: ${(n.content || '').substring(0, 500)}`)
      .join('\n\n');
    systemPrompt += `\n\n--- KNOWLEDGE BASE (Company Notes) ---\n${notesContext}\n--- END KNOWLEDGE BASE ---`;
    systemPrompt += '\nUse the knowledge base above to answer questions when relevant.';
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

  const payload = {
    model: bot.model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    max_tokens: bot.maxTokens || 300,
    temperature: bot.temperature || 0.7
  };

  // Try up to 2 times (initial + 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await axios.post(url, payload, {
        headers,
        timeout: 15000
      });

      const content = response.data.choices?.[0]?.message?.content;
      if (content) {
        return { type: 'text', content: content.trim(), ruleId: null };
      }
      break; // Got response but no content, don't retry
    } catch (err) {
      console.error(`[WA Bot] ${bot.provider} API error (attempt ${attempt + 1}):`, err.response?.data?.error?.message || err.message);
      if (attempt === 0 && (!err.response || err.response.status >= 500)) {
        await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
        continue;
      }
      break; // Client error or 2nd attempt, don't retry
    }
  }

  return null;
}

/**
 * Call Anthropic API (different request format)
 */
async function callAnthropicAPI(bot, systemPrompt, messages) {
  const headers = PROVIDERS.anthropic.headerFn(bot.apiKey);

  const payload = {
    model: bot.model || 'claude-sonnet-4-20250514',
    max_tokens: bot.maxTokens || 300,
    system: systemPrompt,
    messages: messages.map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.content
    }))
  };

  // Try up to 2 times (initial + 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await axios.post(PROVIDERS.anthropic.url, payload, {
        headers,
        timeout: 15000
      });

      const content = response.data.content?.[0]?.text;
      if (content) {
        return { type: 'text', content: content.trim(), ruleId: null };
      }
      break;
    } catch (err) {
      console.error(`[WA Bot] Anthropic API error (attempt ${attempt + 1}):`, err.response?.data?.error?.message || err.message);
      if (attempt === 0 && (!err.response || err.response.status >= 500)) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      break;
    }
  }

  return null;
}

module.exports = {
  processIncomingMessage
};
