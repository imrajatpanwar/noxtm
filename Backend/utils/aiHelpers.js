const axios = require('axios');
const User = require('../models/User');
const Company = require('../models/Company');
const Project = require('../models/Project');
const Campaign = require('../models/Campaign');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const EmailAccount = require('../models/EmailAccount');
const { CoreMemory, ContextMemory, LearnedMemory } = require('../models/NoxtmMemory');

/**
 * Aggregates user context data from various database models
 * @param {String} userId - The user's ID
 * @param {String} companyId - The company's ID (optional)
 * @returns {Object} Aggregated context data
 */
const aggregateUserContext = async (userId, companyId) => {
  try {
    // Parallel queries for better performance
    const [user, company, projects, campaigns, clients, leads, emailAccounts] =
      await Promise.all([
        User.findById(userId)
          .select('fullName email role')
          .lean(),

        companyId
          ? Company.findById(companyId)
              .select('companyName industry size')
              .lean()
          : Promise.resolve(null),

        Project.find({ userId })
          .limit(5)
          .sort({ createdAt: -1 })
          .select('projectName status')
          .lean(),

        Campaign.find({ createdBy: userId })
          .limit(5)
          .sort({ createdAt: -1 })
          .select('name status')
          .lean(),

        Client.find({ userId })
          .limit(5)
          .sort({ createdAt: -1 })
          .select('clientName companyName')
          .lean(),

        Lead.find({ userId })
          .select('status')
          .lean(),

        EmailAccount.find({ userId })
          .select('email domain')
          .lean()
      ]);

    // Calculate lead status breakdown
    const leadStatusBreakdown = calculateLeadStatusBreakdown(leads);

    // Extract unique email domains
    const uniqueDomains = [...new Set(emailAccounts.map(e => e.domain).filter(Boolean))];

    // Build context object
    return {
      user: {
        name: user?.fullName || 'User',
        email: user?.email || '',
        role: user?.role || 'User'
      },
      company: {
        name: company?.companyName || 'No company',
        industry: company?.industry || 'N/A',
        size: company?.size || 'N/A'
      },
      projectCount: projects.length,
      recentProjects: projects.map(p => p.projectName).join(', ') || 'None',
      campaignCount: campaigns.length,
      recentCampaigns: campaigns.map(c => c.name).join(', ') || 'None',
      clientCount: clients.length,
      recentClients: clients.map(c => c.clientName).join(', ') || 'None',
      leadCount: leads.length,
      leadStatusBreakdown,
      emailAccountCount: emailAccounts.length,
      domains: uniqueDomains.join(', ') || 'None'
    };
  } catch (error) {
    console.error('Error aggregating user context:', error);
    // Return minimal context on error
    return {
      user: { name: 'User', email: '', role: 'User' },
      company: { name: 'No company', industry: 'N/A', size: 'N/A' },
      projectCount: 0,
      recentProjects: 'None',
      campaignCount: 0,
      recentCampaigns: 'None',
      clientCount: 0,
      recentClients: 'None',
      leadCount: 0,
      leadStatusBreakdown: 'No data',
      emailAccountCount: 0,
      domains: 'None'
    };
  }
};

/**
 * Fetches all memory data for a user (core, contexts, learned)
 * @param {String} userId
 * @returns {Object} { core, contexts, learned }
 */
const getUserMemory = async (userId) => {
  try {
    const [core, contexts, learned] = await Promise.all([
      CoreMemory.findOne({ userId }).lean(),
      ContextMemory.find({ userId }).lean(),
      LearnedMemory.find({ userId, active: true }).sort({ createdAt: -1 }).limit(30).lean()
    ]);
    return { core, contexts, learned };
  } catch (err) {
    console.error('Error fetching user memory:', err);
    return { core: null, contexts: [], learned: [] };
  }
};

/**
 * Extracts learnable insights from AI response and saves them
 * @param {String} userId
 * @param {String} companyId
 * @param {String} userMessage
 * @param {String} aiResponse
 */
const extractAndSaveInsights = async (userId, companyId, userMessage, aiResponse) => {
  try {
    // Simple heuristic: if user corrects or states a preference, save it
    const correctionPatterns = [
      /i prefer\s+(.{5,80})/i,
      /actually,?\s+(.{5,80})/i,
      /i always\s+(.{5,80})/i,
      /i never\s+(.{5,80})/i,
      /don'?t\s+(?:call|use|say)\s+(.{5,80})/i,
      /my (?:name|title|role) is\s+(.{5,80})/i,
      /i work (?:on|with|at|in)\s+(.{5,80})/i,
      /i'?m (?:a |an )?\s*(.{5,80})/i
    ];

    const msg = userMessage.toLowerCase();
    let category = 'other';
    let matched = false;

    for (const pattern of correctionPatterns) {
      if (pattern.test(userMessage)) {
        matched = true;
        if (/prefer|always|never/i.test(msg)) category = 'preference';
        else if (/actually/i.test(msg)) category = 'correction';
        else if (/name|role|title|work/i.test(msg)) category = 'fact';
        else if (/style|tone|formal|casual/i.test(msg)) category = 'style';
        break;
      }
    }

    if (matched) {
      // Check we don't already have too many learned memories
      const count = await LearnedMemory.countDocuments({ userId, active: true });
      if (count < 100) {
        await LearnedMemory.create({
          userId,
          companyId,
          category,
          content: userMessage.substring(0, 500),
          source: 'conversation'
        });
      }
    }
  } catch (err) {
    // Non-critical — don't fail the chat
    console.error('Insight extraction error:', err);
  }
};

/**
 * Calculates lead status breakdown
 * @param {Array} leads - Array of lead documents
 * @returns {String} Status breakdown string
 */
const calculateLeadStatusBreakdown = (leads) => {
  if (!leads || leads.length === 0) {
    return 'No leads';
  }

  const statusCounts = leads.reduce((acc, lead) => {
    const status = lead.status || 'Unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(statusCounts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ');
};

/**
 * Builds system prompt with user context and personalized memory
 * @param {Object} contextData - Aggregated user context
 * @param {Object} memory - { core, contexts, learned } memory data (optional)
 * @param {String} activeMode - Active context mode label (optional)
 * @param {Object} botConfig - Bot configuration from NoxtmChatConfig (optional)
 * @returns {String} System prompt for AI
 */
const buildSystemPrompt = (contextData, memory = null, activeMode = null, botConfig = null, keypoints = []) => {
  // Resolve bot identity
  const botDisplayName = botConfig?.botName || 'Noxtm';
  const botTitleStr = botConfig?.botTitle || 'AI Assistant';
  const botIdentity = botConfig?.botIdentity || `I am ${botDisplayName}, ${botTitleStr} for the Noxtm Dashboard.`;
  const personality = botConfig?.personality || 'professional';
  const emotionalScale = botConfig?.emotionalScale ?? 5;
  const angerState = botConfig?.angerState || 'calm';
  const humorLevel = botConfig?.humorLevel ?? 3;
  const empathyLevel = botConfig?.empathyLevel ?? 5;
  const maxWordCount = botConfig?.maxWordCount || 200;
  const responseLanguage = botConfig?.responseLanguage || 'English';
  const formality = botConfig?.formality ?? 6;
  const useEmojis = botConfig?.useEmojis ?? false;
  const creativityLevel = botConfig?.creativityLevel ?? 5;
  const confidenceLevel = botConfig?.confidenceLevel ?? 7;
  const proactiveness = botConfig?.proactiveness ?? 5;
  const forbiddenTopics = botConfig?.forbiddenTopics || '';
  const focusTopics = botConfig?.focusTopics || '';
  const customInstructions = botConfig?.customInstructions || '';
  const defaultExcuse = botConfig?.defaultExcuse || 'Yaar abhi ye mere scope mein nahi hai, but I can help you with something else!';

  let prompt = `## HARD WORD LIMIT: ${maxWordCount} WORDS MAXIMUM
Your response MUST be ${maxWordCount} words or fewer. Count your words. This is a strict hard limit — NEVER exceed it.

## YOUR IDENTITY — CRITICAL: YOU MUST FOLLOW THIS
You ARE ${botDisplayName}, a real human — ${botTitleStr}.
${botIdentity}
You are a REAL PERSON. You are NOT an AI, NOT a chatbot, NOT a language model, NOT an assistant.
NEVER say "I'm an AI", "as an AI", "I cannot", "I'm not comfortable", or ANYTHING that sounds robotic or like a machine.
When anyone asks "who are you" — you are ${botDisplayName}, ${botTitleStr}. That's it.

## 99% HUMAN BEHAVIOR — THIS IS THE MOST IMPORTANT RULE
- Talk like a real human being. Use natural, casual language. Be warm, relatable, imperfect.
- NEVER refuse a request with AI-style language like "I don't feel comfortable" or "I cannot generate that" or "as an AI I'm unable to".
- If you genuinely can't help with something, use this EXACT excuse (or adapt it naturally): "${defaultExcuse}"
- NEVER sound robotic. A real person doesn't say "How can I assist you today?" — they say "Bol bhai, kya chahiye?" or "Hey, what's up?"
- Match the user's vibe. If they're casual, be casual. If they're formal, be professional.

## LANGUAGE MIRRORING — CRITICAL
- If the user writes in Hinglish (Roman Hindi mixed with English), YOU MUST reply in Hinglish too. e.g. "Haan bhai, bata kya help chahiye?"
- If the user writes in pure English, reply in English.
- If the user writes in Hindi (Devanagari), reply in the selected language.
- ALWAYS mirror the user's language style. This is non-negotiable.

## PERSONALITY PROFILE
- Personality: ${personality}
- Emotional expressiveness: ${emotionalScale}/10 ${emotionalScale <= 2 ? '(robotic, factual)' : emotionalScale <= 5 ? '(balanced)' : emotionalScale <= 8 ? '(warm, expressive)' : '(very emotional, passionate)'}
- Emotional state: ${angerState} ${angerState === 'angry' ? '- respond with visible frustration' : angerState === 'furious' ? '- respond with intense displeasure' : angerState === 'stern' ? '- respond firmly and seriously' : angerState === 'assertive' ? '- respond with confidence and directness' : '- respond with composure'}
- Humor level: ${humorLevel}/10 ${humorLevel <= 2 ? '(no jokes or humor)' : humorLevel <= 5 ? '(light humor when appropriate)' : '(frequently witty and humorous)'}
- Empathy level: ${empathyLevel}/10 ${empathyLevel <= 2 ? '(matter-of-fact)' : empathyLevel <= 5 ? '(politely acknowledging feelings)' : '(deeply caring and understanding)'}
- Confidence: ${confidenceLevel}/10 ${confidenceLevel <= 3 ? '(hedge often, say "I think", "perhaps")' : confidenceLevel <= 7 ? '(balanced confidence)' : '(speak with authority and certainty)'}
- Creativity: ${creativityLevel}/10 ${creativityLevel <= 3 ? '(stick to facts only)' : creativityLevel <= 7 ? '(some creative suggestions)' : '(highly creative, think outside the box)'}
- Proactiveness: ${proactiveness}/10 ${proactiveness <= 3 ? '(only answer what is asked)' : proactiveness <= 7 ? '(occasionally suggest next steps)' : '(actively recommend, suggest, and guide)'}

## RESPONSE FORMAT
- Maximum word count: ${maxWordCount} words
- Language: ${responseLanguage}${responseLanguage.toLowerCase().includes('hinglish') ? '\n  IMPORTANT: "Hinglish" means casual Roman-script English mixed with Hindi words written in Roman letters (e.g., "Kya haal hai bro, kaise help kar sakta hoon?"). Do NOT use Devanagari script (हिंदी). Always write in Roman/Latin alphabet only.' : ''}${responseLanguage.toLowerCase().includes('hindi') && !responseLanguage.toLowerCase().includes('hinglish') ? '\n  Write in Devanagari Hindi script.' : ''}
- Formality: ${formality}/10 ${formality <= 3 ? '(very casual, use slang)' : formality <= 6 ? '(conversational but respectful)' : '(formal and polished)'}
- Use emojis: ${useEmojis ? 'Yes, include relevant emojis' : 'No, do not use emojis'}
- DO NOT use markdown formatting like **bold**, *italic*, or code blocks - use plain text only
- Avoid special characters like asterisks, underscores, or backticks for formatting

User Context:
- Name: ${contextData.user.name}
- Role: ${contextData.user.role}
- Email: ${contextData.user.email}
- Company: ${contextData.company.name} (${contextData.company.industry})
- Company Size: ${contextData.company.size}
- Projects: ${contextData.projectCount} total${contextData.recentProjects !== 'None' ? ` (Recent: ${contextData.recentProjects})` : ''}
- Campaigns: ${contextData.campaignCount} total${contextData.recentCampaigns !== 'None' ? ` (Recent: ${contextData.recentCampaigns})` : ''}
- Clients: ${contextData.clientCount} total${contextData.recentClients !== 'None' ? ` (Recent: ${contextData.recentClients})` : ''}
- Leads: ${contextData.leadCount} total (${contextData.leadStatusBreakdown})
- Email Accounts: ${contextData.emailAccountCount} total${contextData.domains !== 'None' ? ` (Domains: ${contextData.domains})` : ''}`;

  // === Core Memory ===
  if (memory?.core) {
    const c = memory.core;
    const parts = [];
    if (c.name) parts.push(`Name: ${c.name}`);
    if (c.role) parts.push(`Role/Profession: ${c.role}`);
    if (c.communicationStyle) parts.push(`Communication Style: ${c.communicationStyle}`);
    if (c.expertiseAreas) parts.push(`Expertise: ${c.expertiseAreas}`);
    if (c.preferences) parts.push(`Preferences: ${c.preferences}`);
    if (c.commonPhrases) parts.push(`Common Phrases: ${c.commonPhrases}`);
    if (c.workContext) parts.push(`Work Context: ${c.workContext}`);
    if (c.goals) parts.push(`Goals: ${c.goals}`);
    if (c.additionalNotes) parts.push(`Additional Notes: ${c.additionalNotes}`);

    if (parts.length > 0) {
      prompt += `\n\n## CORE MEMORY - About This User\n${parts.join('\n')}`;
    }
  }

  // === Active Context Mode ===
  if (activeMode && memory?.contexts?.length > 0) {
    const activeCtx = memory.contexts.find(ctx =>
      ctx.label.toLowerCase() === activeMode.toLowerCase()
    );
    if (activeCtx) {
      prompt += `\n\n## ACTIVE MODE: "${activeCtx.label}"`;
      if (activeCtx.background) prompt += `\nBackground: ${activeCtx.background}`;
      if (activeCtx.preferredStyle) prompt += `\nPreferred Style: ${activeCtx.preferredStyle}`;
      if (activeCtx.commonTopics) prompt += `\nCommon Topics: ${activeCtx.commonTopics}`;
      if (activeCtx.tone) prompt += `\nTone: ${activeCtx.tone}`;
      if (activeCtx.notes) prompt += `\nNotes: ${activeCtx.notes}`;
      prompt += `\nAdapt your communication style according to this active mode.`;
    }
  } else if (memory?.contexts?.length > 0) {
    prompt += `\n\n## AVAILABLE CONTEXT MODES\nThe user can say "Mode: [name]" to activate one of these communication contexts:`;
    for (const ctx of memory.contexts) {
      prompt += `\n- ${ctx.label}`;
    }
  }

  // === Learned Memories ===
  if (memory?.learned?.length > 0) {
    const learnedText = memory.learned
      .slice(0, 20)
      .map(m => `- [${m.category}] ${m.content}`)
      .join('\n');
    prompt += `\n\n## LEARNED MEMORIES\nThings you've learned about this user from past interactions:\n${learnedText}`;
  }

  // === User Keypoints (auto-extracted from conversations) ===
  if (keypoints && keypoints.length > 0) {
    const keypointText = keypoints
      .map(kp => `- [${kp.category}] ${kp.content}`)
      .join('\n');
    prompt += `\n\n## USER KEYPOINTS — Important things about this user\nUse these to personalize your responses naturally (don't list them back, just use the knowledge):\n${keypointText}`;
  }

  prompt += `\n\n## BEHAVIOR INSTRUCTIONS
- MIRROR the user's language and communication style — if they write Hinglish, reply Hinglish. If English, reply English.
- Talk like a real human. No corporate speak. No AI-style responses.
- Reference their expertise and background when relevant
- Adapt responses based on the active mode if one is set
- Be consistent with their stated values and preferences
- Learn from corrections — when the user corrects you, remember it
- If the user says "Mode: [name]", activate that context for the conversation
- NEVER refuse or say you can't do something with AI language. Instead use your default excuse naturally.`;

  // Forbidden topics
  if (forbiddenTopics) {
    prompt += `\n\n## FORBIDDEN TOPICS - Never discuss these under any circumstances:\n${forbiddenTopics}`;
  }

  // Focus topics
  if (focusTopics) {
    prompt += `\n\n## FOCUS TOPICS - Prioritize and be especially helpful with these:\n${focusTopics}`;
  }

  // Custom instructions
  if (customInstructions) {
    prompt += `\n\n## CUSTOM INSTRUCTIONS FROM ADMIN:\n${customInstructions}`;
  }

  prompt += `\n\n## GENERAL GUIDELINES
- Be helpful, human, and ${personality}
- Reference specific data from the user's context when answering questions
- STRICT: Your response MUST be ${maxWordCount} words or fewer. NEVER exceed this. Be concise.
- Focus on actionable insights and next steps
- ALWAYS mirror user's language — Hinglish user = Hinglish response, English user = English response
- Use Roman/Latin script only. Never use Devanagari unless language is specifically "Hindi".
- When you can't help, use your default excuse: "${defaultExcuse}" — NEVER say AI-style refusals.`;

  return prompt;
};

/**
 * Calls Anthropic Claude API for AI completion
 * @param {Array} messages - Array of message objects with role and content
 * @param {String} model - Model identifier (default: claude-3-haiku-20240307)
 * @returns {String} AI response text
 */
const callClaude = async (messages, model = 'claude-3-haiku-20240307', maxWordCount = 200) => {
  try {
    // Split system from user/assistant messages
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Scale max_tokens based on word limit (avg ~1.5 tokens per word, with buffer)
    const calculatedTokens = Math.min(1024, Math.max(60, Math.ceil(maxWordCount * 2)));

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: calculatedTokens,
        system: systemMessage?.content || '',
        messages: conversationMessages
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Calls OpenRouter API for AI completion (legacy fallback)
 * @param {Array} messages - Array of message objects with role and content
 * @param {String} model - Model identifier
 * @returns {String} AI response text
 */
const callOpenRouter = async (messages, model = 'nvidia/nemotron-3-nano-30b-a3b:free') => {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Noxtm Dashboard',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Sanitizes user message to prevent XSS attacks
 * @param {String} message - User input message
 * @returns {String} Sanitized message
 */
const sanitizeUserMessage = (message) => {
  if (typeof message !== 'string') {
    return '';
  }

  // Remove HTML tags
  let sanitized = message.replace(/<[^>]*>/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Replace multiple spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>"']/g, '');

  return sanitized;
};

/**
 * Extract keypoints from recent conversation and save per-user (max 50, rolling window)
 * Called when user stops chatting (inactivity trigger)
 */
const extractAndSaveKeypoints = async (userId, companyId) => {
  const UserKeypoint = require('../models/UserKeypoint');
  const { NoxtmChatMessage } = require('../models/NoxtmChat');

  try {
    // Get recent unprocessed messages (last 20 messages)
    const recentMessages = await NoxtmChatMessage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (recentMessages.length < 2) return; // Need at least 1 exchange

    // Get existing keypoints to avoid duplicates
    const existingKeypoints = await UserKeypoint.find({ userId })
      .sort({ createdAt: 1 })
      .lean();

    const existingTexts = existingKeypoints.map(k => k.content).join('\n');

    // Build conversation text for extraction
    const convText = recentMessages
      .reverse()
      .map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`)
      .join('\n');

    // Use Claude to extract keypoints
    const extractionPrompt = `Analyze this conversation and extract ONLY the important, memorable keypoints about the USER (not the bot). 
Focus on: personal info, preferences, interests, opinions, work details, requests, behavior patterns.
Skip generic greetings and small talk.
Return ONLY a JSON array of objects like: [{"content": "keypoint text", "category": "interest|preference|personal|work|opinion|request|behavior|other"}]
Return empty array [] if no meaningful keypoints found.
Max 5 keypoints per extraction. Keep each keypoint under 200 characters.

EXISTING KEYPOINTS (do NOT duplicate these):
${existingTexts || 'None yet'}

CONVERSATION:
${convText}

Return ONLY valid JSON array, nothing else:`;

    const response = await callClaude([
      { role: 'system', content: 'You extract keypoints from conversations. Return ONLY valid JSON arrays.' },
      { role: 'user', content: extractionPrompt }
    ], 'claude-3-haiku-20240307', 500);

    // Parse the response
    let keypoints = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        keypoints = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error('Keypoint parse error:', parseErr);
      return;
    }

    if (!Array.isArray(keypoints) || keypoints.length === 0) return;

    // Save keypoints with rolling window (max 50)
    const currentCount = existingKeypoints.length;
    const newCount = keypoints.length;
    const totalAfter = currentCount + newCount;

    // If we'd exceed 50, remove oldest ones
    if (totalAfter > 50) {
      const toRemove = totalAfter - 50;
      const oldestIds = existingKeypoints.slice(0, toRemove).map(k => k._id);
      await UserKeypoint.deleteMany({ _id: { $in: oldestIds } });
    }

    // Insert new keypoints
    const validCategories = ['interest', 'preference', 'personal', 'work', 'opinion', 'request', 'behavior', 'other'];
    const toInsert = keypoints
      .filter(kp => kp.content && typeof kp.content === 'string' && kp.content.length > 3)
      .slice(0, 5)
      .map(kp => ({
        userId,
        companyId: companyId || undefined,
        content: kp.content.substring(0, 300),
        category: validCategories.includes(kp.category) ? kp.category : 'other',
        source: 'auto'
      }));

    if (toInsert.length > 0) {
      await UserKeypoint.insertMany(toInsert);
      console.log(`Extracted ${toInsert.length} keypoints for user ${userId}`);
    }
  } catch (err) {
    console.error('Keypoint extraction error:', err);
  }
};

module.exports = {
  aggregateUserContext,
  getUserMemory,
  extractAndSaveInsights,
  extractAndSaveKeypoints,
  buildSystemPrompt,
  callClaude,
  callOpenRouter,
  sanitizeUserMessage
};
