const WhatsAppChatbot = require('../models/WhatsAppChatbot');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const WhatsAppKeypoint = require('../models/WhatsAppKeypoint');
const WhatsAppScheduledMsg = require('../models/WhatsAppScheduledMsg');
const Note = require('../models/Note');
const Company = require('../models/Company');
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

  // Fetch chatbot config and company AI settings in parallel
  const [bot, company] = await Promise.all([
    WhatsAppChatbot.findOne({ companyId, enabled: true }),
    Company.findById(companyId).select('aiSettings').lean()
  ]);

  if (!bot) return null;

  // Get AI config from company-level settings (new) or fall back to bot-level (legacy)
  const ai = company?.aiSettings || {};
  const provider = ai.provider || bot.provider || 'openrouter';
  const apiKey = ai.apiKey || bot.apiKey || '';
  const model = ai.model || bot.model || '';
  const customEndpoint = ai.customEndpoint || bot.customEndpoint || '';

  if (!apiKey) return null;

  // Check if this bot applies to this account
  if (bot.accountIds && bot.accountIds.length > 0) {
    if (!bot.accountIds.some(id => id.toString() === accountId.toString())) {
      return null;
    }
  }

  // Check cooldown — always enforce a minimum 10-second internal cooldown
  const cooldownKey = `bot:${companyId}:${contact.whatsappId}`;
  const cooldownMs = Math.max(10000, (bot.cooldownMinutes || 0) * 60 * 1000);
  const lastTriggered = cooldowns.get(cooldownKey);
  if (lastTriggered && (Date.now() - lastTriggered) < cooldownMs) {
    return null;
  }

  try {
    const aiResponse = await generateAIResponse(bot, accountId, companyId, contact, messageText, { provider, apiKey, model, customEndpoint });
    if (aiResponse) {
      // Strip any roleplay actions that slipped through (with or without asterisks)
      if (aiResponse.content) {
        aiResponse.content = aiResponse.content
          .replace(/\*[^*]{1,60}\*/g, '')           // *action text*
          .replace(/^\s*(smiles|grins|nods|waves|laughs|chuckles|sighs|leans|clears throat|speaks|looks|bows|winks|pauses|takes a deep breath)[^.!?\n]{0,40}/gim, '')
          .replace(/\n{3,}/g, '\n\n')               // collapse excess newlines
          .trim();
        // Hard cap: if response is way too long, truncate at last sentence within limit
        const maxChars = (bot.maxTokens || 300) * 3; // rough token-to-char ratio
        if (aiResponse.content.length > maxChars) {
          const truncated = aiResponse.content.substring(0, maxChars);
          const lastSentence = truncated.search(/[.!?][^.!?]*$/);
          aiResponse.content = lastSentence > 0 ? truncated.substring(0, lastSentence + 1) : truncated;
        }
      }
      cooldowns.set(cooldownKey, Date.now());
      // Use atomic update to avoid race condition on concurrent messages
      await WhatsAppChatbot.updateOne(
        { _id: bot._id },
        { $inc: { totalReplies: 1 }, $set: { lastReplyAt: new Date() } }
      );
      // Pass maxSentencesPerMsg so session manager can split if needed
      aiResponse.maxSentencesPerMsg = bot.maxSentencesPerMsg || 0;
      aiResponse.maxMsgsPerReply = bot.maxMsgsPerReply ?? 1;
      aiResponse.msgDelaySec = bot.msgDelaySec ?? 3;
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
async function generateAIResponse(bot, accountId, companyId, contact, messageText, aiConfig) {
  // Parallel fetch: message history + notes (don't wait sequentially)
  let recentMessages = [];
  let notes = [];

  const [msgResult, notesResult] = await Promise.allSettled([
    WhatsAppMessage.find({ accountId, contactId: contact._id })
      .sort({ timestamp: -1 })
      .limit(30)
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

  // Build system prompt — personality first, then minimal guardrails
  let systemPrompt = bot.botPersonality || 'You are a helpful business assistant. Keep replies short — 2-4 sentences max.';
  systemPrompt += `\n\nYour name is "${bot.botName || 'botgit'}".`;
  systemPrompt += `\nCustomer name: ${contact.pushName || 'Unknown'}`;
  systemPrompt += `\nCustomer phone: ${contact.phoneNumber || 'Unknown'}`;
  systemPrompt += '\n\nHARD RULES (override everything else):';
  systemPrompt += '\n- MAXIMUM 3-5 short lines per reply. Never more. No paragraphs, no essays.';
  systemPrompt += '\n- Write like a WhatsApp text — short, punchy, human. Not an email.';
  systemPrompt += '\n- Do NOT reveal you are an AI or bot.';
  systemPrompt += '\n- NEVER use roleplay actions with or without asterisks (no "smiles warmly", no *leans in*, etc).';
  systemPrompt += '\n- NEVER apologize for delays or previous messages.';
  systemPrompt += '\n- Match the customer\'s language naturally.';
  systemPrompt += '\n- You have the full conversation history above. Use it for context.';

  // Attach notes as knowledge base
  if (notes.length > 0) {
    const notesContext = notes
      .map(n => `[${n.title}]: ${(n.content || '').substring(0, 500)}`)
      .join('\n\n');
    systemPrompt += `\n\n--- KNOWLEDGE BASE (Company Notes) ---\n${notesContext}\n--- END KNOWLEDGE BASE ---`;
    systemPrompt += '\nUse the knowledge base above to answer questions when relevant.';
  }

  if (aiConfig.provider === 'anthropic') {
    return callAnthropicAPI(bot, systemPrompt, conversationHistory, aiConfig);
  } else {
    return callOpenAICompatibleAPI(bot, systemPrompt, conversationHistory, aiConfig);
  }
}

// Fallback models for OpenRouter when primary model is unavailable
const OPENROUTER_FALLBACKS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-235b-a22b:free',
  'deepseek/deepseek-r1-zero:free',
  'google/gemma-3-27b-it:free'
];

/**
 * Call OpenAI-compatible API (OpenAI, OpenRouter, Groq, Together, Custom)
 */
async function callOpenAICompatibleAPI(bot, systemPrompt, messages, aiConfig) {
  const provider = PROVIDERS[aiConfig.provider];
  const url = aiConfig.provider === 'custom' ? aiConfig.customEndpoint : provider?.url;
  const headers = aiConfig.provider === 'custom'
    ? { 'Authorization': `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' }
    : provider?.headerFn(aiConfig.apiKey);

  if (!url) {
    console.warn('[WA Bot] No endpoint configured for provider:', aiConfig.provider);
    return null;
  }

  // Build list of models to try: primary + fallbacks for OpenRouter
  const modelsToTry = [aiConfig.model];
  if (aiConfig.provider === 'openrouter') {
    for (const fb of OPENROUTER_FALLBACKS) {
      if (fb !== aiConfig.model) modelsToTry.push(fb);
    }
  }

  for (const modelId of modelsToTry) {
    const payload = {
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: bot.maxTokens || 300,
      temperature: bot.temperature || 0.7
    };

    try {
      const response = await axios.post(url, payload, {
        headers,
        timeout: 20000
      });

      const content = response.data.choices?.[0]?.message?.content;
      if (content) {
        if (modelId !== aiConfig.model) {
          console.log(`[WA Bot] Primary model ${aiConfig.model} failed, succeeded with fallback: ${modelId}`);
        }
        return { type: 'text', content: content.trim(), ruleId: null };
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      console.error(`[WA Bot] ${aiConfig.provider} API error (model: ${modelId}):`, errMsg);
      // If rate limited or model not found on OpenRouter, try next fallback
      if (aiConfig.provider === 'openrouter' && modelsToTry.length > 1) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
      // For non-OpenRouter: retry once on server errors
      if (!err.response || err.response.status >= 500) {
        await new Promise(r => setTimeout(r, 1000));
        try {
          const retryRes = await axios.post(url, payload, { headers, timeout: 20000 });
          const retryContent = retryRes.data.choices?.[0]?.message?.content;
          if (retryContent) return { type: 'text', content: retryContent.trim(), ruleId: null };
        } catch (retryErr) {
          console.error(`[WA Bot] ${aiConfig.provider} retry failed:`, retryErr.response?.data?.error?.message || retryErr.message);
        }
      }
      break;
    }
  }

  return null;
}

/**
 * Call Anthropic API (different request format)
 */
async function callAnthropicAPI(bot, systemPrompt, messages, aiConfig) {
  const headers = PROVIDERS.anthropic.headerFn(aiConfig.apiKey);

  const payload = {
    model: aiConfig.model || 'claude-sonnet-4-20250514',
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

/**
 * Extract keypoints and detect scheduling requests from conversation (fire-and-forget)
 */
async function extractKeypointsAndSchedule(bot, accountId, companyId, contact, messageText, aiReply) {
  try {
    const extractPrompt = `You are an analyst. Given the latest user message and bot reply, extract:
1. Key conversation points (max 3, skip trivial greetings)
2. If the user asked to be contacted/messaged later (e.g. "message me after 5 min", "remind me in 1 hour", "call me after 3 days")

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "keypoints": [{"text": "short point max 80 chars", "category": "info|interest|request|issue|followup|general"}],
  "schedule": null or {"delay_minutes": number, "message": "follow-up message to send", "reason": "why scheduling"}
}

If no meaningful keypoints, return empty array. If no scheduling request, set schedule to null.
Categories: info=shared information, interest=showed interest in product/service, request=asked for something, issue=reported problem, followup=needs follow-up, general=other`;

    const messages = [
      { role: 'user', content: `User message: "${messageText}"\n\nBot reply: "${aiReply}"` }
    ];

    let extractResult = null;

    if (bot.provider === 'anthropic') {
      const headers = PROVIDERS.anthropic.headerFn(bot.apiKey);
      const response = await axios.post(PROVIDERS.anthropic.url, {
        model: bot.model || 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: extractPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      }, { headers, timeout: 12000 });
      extractResult = response.data.content?.[0]?.text;
    } else {
      const provider = PROVIDERS[bot.provider];
      const url = bot.provider === 'custom' ? bot.customEndpoint : provider?.url;
      const headers = bot.provider === 'custom'
        ? { 'Authorization': `Bearer ${bot.apiKey}`, 'Content-Type': 'application/json' }
        : provider?.headerFn(bot.apiKey);
      if (!url) return;

      const response = await axios.post(url, {
        model: bot.model,
        messages: [{ role: 'system', content: extractPrompt }, ...messages],
        max_tokens: 300,
        temperature: 0.3
      }, { headers, timeout: 12000 });
      extractResult = response.data.choices?.[0]?.message?.content;
    }

    if (!extractResult) return;

    // Parse JSON from AI response
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = extractResult.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[WA Bot] Failed to parse keypoint extraction JSON:', e.message);
      return;
    }

    // Save keypoints
    if (parsed.keypoints && Array.isArray(parsed.keypoints) && parsed.keypoints.length > 0) {
      const keypointDocs = parsed.keypoints
        .filter(kp => kp.text && kp.text.length > 3)
        .slice(0, 3)
        .map(kp => ({
          companyId,
          accountId,
          contactId: contact._id,
          text: kp.text.substring(0, 500),
          category: ['info', 'interest', 'request', 'issue', 'followup', 'general'].includes(kp.category)
            ? kp.category : 'general',
          source: 'ai'
        }));

      if (keypointDocs.length > 0) {
        await WhatsAppKeypoint.insertMany(keypointDocs);
        console.log(`[WA Bot] Saved ${keypointDocs.length} keypoints for contact ${contact.pushName || contact.whatsappId}`);
      }
    }

    // Handle scheduling
    if (parsed.schedule && parsed.schedule.delay_minutes && parsed.schedule.message) {
      const delayMin = Math.max(1, Math.min(parsed.schedule.delay_minutes, 43200)); // 1 min to 30 days
      const scheduledAt = new Date(Date.now() + delayMin * 60 * 1000);
      const jid = contact.whatsappId.includes('@') ? contact.whatsappId : `${contact.whatsappId}@s.whatsapp.net`;

      const scheduledMsg = await WhatsAppScheduledMsg.create({
        companyId,
        accountId,
        contactId: contact._id,
        jid,
        content: parsed.schedule.message.substring(0, 2000),
        scheduledAt,
        status: 'pending',
        reason: (parsed.schedule.reason || 'User requested follow-up').substring(0, 500)
      });

      // Also save a keypoint linking to the scheduled message
      await WhatsAppKeypoint.create({
        companyId,
        accountId,
        contactId: contact._id,
        text: `Follow-up scheduled in ${delayMin} min: ${parsed.schedule.message.substring(0, 100)}`,
        category: 'followup',
        source: 'ai',
        scheduledMsgId: scheduledMsg._id
      });

      console.log(`[WA Bot] Scheduled message for ${contact.pushName || contact.whatsappId} in ${delayMin} minutes`);
    }
  } catch (err) {
    console.error('[WA Bot] Keypoint extraction error:', err.message);
  }
}

module.exports = {
  processIncomingMessage,
  extractKeypointsAndSchedule
};
