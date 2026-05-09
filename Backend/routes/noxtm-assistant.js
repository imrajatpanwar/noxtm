const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const { NoxtmChatMessage, NoxtmChatConfig } = require('../models/NoxtmChat');
const CompanyMemory = require('../models/CompanyMemory');
const { CoreMemory, LearnedMemory, NoxtmBotDefaultMemory } = require('../models/NoxtmMemory');
const { toolDefinitions, executeTool } = require('../utils/assistantTools');
const { aggregateUserContext, sanitizeUserMessage, getUserMemory, buildSystemPrompt } = require('../utils/aiHelpers');
const { authenticateToken } = require('../middleware/auth');

// Rate limit: 30 requests per minute per user
const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { error: 'Too many requests. Please slow down.' }
});

// ═══════════════════════════════════════════
// CLAUDE TOOL-USE LOOP
// ═══════════════════════════════════════════

async function callClaudeWithTools(systemPrompt, messages, tools, context, maxIterations = 5) {
  let currentMessages = [...messages];
  let iteration = 0;
  let totalTokens = 0;
  const toolsExecuted = []; // track all tool calls + results

  while (iteration < maxIterations) {
    iteration++;

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages: currentMessages,
        tools
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    const { content, stop_reason, usage } = response.data;
    totalTokens += (usage?.input_tokens || 0) + (usage?.output_tokens || 0);

    // If the model wants to use tools
    if (stop_reason === 'tool_use') {
      // Add assistant's response (with tool_use blocks) to messages
      currentMessages.push({ role: 'assistant', content });

      // Execute each tool call and collect results
      const toolResults = [];
      for (const block of content) {
        if (block.type === 'tool_use') {
          console.log(`[Assistant] Tool call: ${block.name}`, JSON.stringify(block.input).substring(0, 200));
          const result = await executeTool(block.name, block.input, context);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result)
          });
          toolsExecuted.push({ name: block.name, input: block.input, result });
        }
      }

      // Add tool results to messages
      currentMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Model finished with a text response — extract it
    const textBlocks = content.filter(b => b.type === 'text');
    const finalText = textBlocks.map(b => b.text).join('\n');

    return { text: finalText, tokensUsed: totalTokens, iterations: iteration, toolsExecuted };
  }

  // Max iterations reached
  return { text: 'I ran into some complexity processing that request. Could you try rephrasing?', tokensUsed: totalTokens, iterations: iteration, toolsExecuted };
}


// ═══════════════════════════════════════════
// BUILD ASSISTANT SYSTEM PROMPT
// ═══════════════════════════════════════════

function buildAssistantSystemPrompt(contextData, memory, botConfig, companyMemories, defaultMemories = []) {
  // Start with the existing system prompt builder
  let prompt = buildSystemPrompt(contextData, memory, null, botConfig);

  // === Admin Default Memories — authoritative, must be followed ===
  // These are manually curated by the workspace owner/admin via NoxtmBotAdmin → Memories.
  // They override normal behavior and must be framed as binding instructions.
  if (Array.isArray(defaultMemories) && defaultMemories.length > 0) {
    prompt += '\n\n## ADMIN DEFAULT INSTRUCTIONS — HIGHEST PRIORITY\n';
    prompt += 'These are authoritative instructions set by the workspace admin. You MUST follow them exactly. ';
    prompt += 'If they conflict with any other guidance above, these take precedence.\n';
    defaultMemories.forEach((m, idx) => {
      const cat = m.category ? `[${m.category}] ` : '';
      prompt += `${idx + 1}. ${cat}${m.content}\n`;
    });
  }

  // Add assistant-specific instructions
  prompt += `

## NOXTM ASSISTANT — SPECIAL CAPABILITIES
You are the Noxtm AI Assistant embedded in the workspace. You have REAL tools to interact with all sections of the sidebar and company data.

### SIDEBAR SECTIONS YOU CAN OPERATE ON:
- **Dashboard** — analytics, overview stats
- **Data Center** — extracted companies and contacts (Chrome Extension), leads
- **Projects** — read project status and details
- **Team Communication / Messages** — send direct messages to any team member (send_team_message tool)
- **HR Management** — team members, roles, departments
- **Marketing** — campaigns (email, WhatsApp), leads pipeline
- **Finance Management** — read expense/invoice data
- **Tasks** — create, assign, update, and track tasks across the workspace

### WHAT YOU CAN DO:
- Read company info, team members, tasks, leads, projects, campaigns
- Search and read contacts from the Contacts section (filter by name, status, date, importance)
- Update contact status, follow-up notes, and importance flag
- Search and read companies and contacts extracted via the Chrome Extension (Data Center)
- Update company records from the Data Center (name, email, phone, website, industry, notes)
- Update contact details and status within a company (name, designation, phone, email, status, follow-up, mark important)
- Create new tasks and assign them to team members
- Update existing tasks (status, priority, assignees)
- Send direct messages to team members via Team Communication
- Send WhatsApp messages to any contact by name OR directly to any phone number (even if not in contacts)
- Create WhatsApp bulk campaigns and optionally start them immediately
- Schedule future actions (messages, task creation, reminders, update check-ins)
- Ask for progress updates on tasks — scheduled or immediate
- Save and recall company-specific knowledge/memory
- Provide analytics and stats
- Scan the dashboard using scan_dashboard when the user clicks Scan or asks to scan/review/audit the workspace

### WHAT YOU CANNOT DO:
- Read or edit Admin-level data (super admin accounts, system configs)
- Delete data (only read, create, update)
- Access billing or payment information
- Change user permissions or roles

### MESSAGING RULES — CRITICAL:
- "Message/tell/say/ping/notify [person on team]" → ALWAYS use **send_team_message** (internal chat)
- "WhatsApp message / send WhatsApp / message on WhatsApp" → use **send_whatsapp_message**
- "Send to number / message this number [phone]" → use **send_whatsapp_message** with contact_phone
- "Create campaign / blast message / bulk WhatsApp / send to all contacts" → use **create_whatsapp_campaign**
- NEVER say campaigns or WhatsApp sending are out of scope — you have full access to both
- NEVER ask user to go do it manually if a tool exists — just do it

### HOW TO USE TOOLS:
- When the user asks about data, USE the appropriate tool — don't guess or make up data
- When the user asks to scan the dashboard, ALWAYS use scan_dashboard first, then summarize risks and next actions
- When creating tasks or sending messages, confirm what you're about to do BEFORE executing
- For scheduled actions, always confirm the time and action before scheduling
- If a tool returns an error, explain it clearly to the user
- Chain multiple tools when needed (e.g., get team members first, then create task with assignees)

### CHAINED WORKFLOW EXAMPLE:
When user says "assign task to Rahul and message him and after 1 hour ask for update":
1. Use create_task with assignee_names: ["Rahul"]
2. Use send_team_message to notify Rahul about the task
3. Use schedule_action with action_type: "ask_update", scheduled_time: +1 hour from now, recipient_name: "Rahul", task_title: the task name
4. Confirm all three actions to the user in one reply

### SCHEDULED ACTIONS & ASK_UPDATE:
When users say things like "at 5pm message Ayush", "after 1 hour ask for update", "check back tomorrow":
1. Parse the time (convert to ISO format for today or the specified date)
2. Identify the action type: send_whatsapp | send_team_message | create_task | reminder | ask_update
3. For ask_update: auto-generate a friendly follow-up message if user doesn't provide one. Infer timing if not stated: quick tasks = 1 hour, normal tasks = end of day, complex tasks = next morning 9am
4. Use the schedule_action tool
5. Confirm the scheduled action to the user

### MEMORY:
- Proactively save important company decisions, preferences, and processes
- Recall memory when context would help answer a question
- Don't save trivial or temporary information`;

  // Add company memories as context
  if (companyMemories?.length > 0) {
    prompt += '\n\n## COMPANY MEMORY — Previously saved knowledge:\n';
    prompt += companyMemories
      .map(m => `- [${m.category}] ${m.content}`)
      .join('\n');
  }

  return prompt;
}


// ═══════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════

// POST /api/noxtm-assistant/chat — Main chat endpoint
router.post('/chat', authenticateToken, assistantLimiter, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (!companyId) {
      return res.status(400).json({ error: 'Company setup required' });
    }

    const sanitized = sanitizeUserMessage(message);
    if (!sanitized || sanitized.length > 2000) {
      return res.status(400).json({ error: 'Message too long or empty' });
    }

    // Parallel: fetch context, memory, config, history, company memories, admin default memories
    const [contextData, userMemory, botConfig, recentMessages, companyMemories, defaultMemories] = await Promise.all([
      aggregateUserContext(userId, companyId),
      getUserMemory(userId),
      NoxtmChatConfig.findOne({ companyId }).lean(),
      NoxtmChatMessage.find({ userId, companyId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      CompanyMemory.find({ companyId, active: true })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      // Admin-curated default memories for this workspace — always injected into every chat
      NoxtmBotDefaultMemory.find({ companyId, active: true })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    ]);

    // Check if assistant is enabled
    if (botConfig && botConfig.enabled === false) {
      return res.status(403).json({ error: 'Assistant is currently disabled' });
    }

    // Build conversation history (oldest first)
    const history = recentMessages
      .reverse()
      .map(m => ({ role: m.role, content: m.content }));

    // Add current user message
    history.push({ role: 'user', content: sanitized });

    // Build system prompt (admin default memories take precedence)
    const systemPrompt = buildAssistantSystemPrompt(contextData, userMemory, botConfig, companyMemories, defaultMemories);

    // Execute Claude with tool-use loop
    const result = await callClaudeWithTools(
      systemPrompt,
      history,
      toolDefinitions,
      { companyId, userId }
    );

    // Save messages to DB
    await Promise.all([
      NoxtmChatMessage.create({
        userId,
        companyId,
        role: 'user',
        content: sanitized,
        metadata: { contextUsed: false }
      }),
      NoxtmChatMessage.create({
        userId,
        companyId,
        role: 'assistant',
        content: result.text,
        metadata: {
          contextUsed: true,
          model: 'claude-haiku-4-5-20251001',
          tokensUsed: result.tokensUsed
        }
      })
    ]);

    // Build actionsPerformed for frontend toast notifications
    const CREATE_TOOLS = { create_task: 'Task', create_whatsapp_campaign: 'WhatsApp Campaign', schedule_action: 'Scheduled Action', save_memory: 'Memory', send_team_message: 'Message', send_whatsapp_message: 'WhatsApp Message' };
    const actionsPerformed = (result.toolsExecuted || [])
      .filter(t => CREATE_TOOLS[t.name] && t.result?.success !== false)
      .map(t => ({ type: t.name, label: CREATE_TOOLS[t.name], title: t.input?.title || t.input?.message || t.input?.key || '' }));

    res.json({
      message: result.text,
      tokensUsed: result.tokensUsed,
      actionsPerformed
    });

  } catch (error) {
    console.error('[Assistant] Chat error:', error.response?.data || error.message);

    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'AI rate limit reached. Please try again in a moment.' });
    }

    res.status(500).json({ error: 'Failed to process message. Please try again.' });
  }
});


// GET /api/noxtm-assistant/history — Get chat history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.user.companyId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before; // cursor-based pagination

    const query = { userId, companyId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await NoxtmChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      messages: messages.reverse(),
      hasMore: messages.length === limit
    });
  } catch (error) {
    console.error('[Assistant] History error:', error.message);
    res.status(500).json({ error: 'Failed to load history' });
  }
});


// GET /api/noxtm-assistant/actions — Get scheduled actions
router.get('/actions', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const status = req.query.status || 'pending';

    const actions = await require('../models/AssistantAction').find({
      companyId,
      status
    })
      .sort({ scheduledAt: 1 })
      .limit(20)
      .lean();

    res.json({ actions });
  } catch (error) {
    console.error('[Assistant] Actions error:', error.message);
    res.status(500).json({ error: 'Failed to load actions' });
  }
});


// DELETE /api/noxtm-assistant/actions/:id — Cancel a scheduled action
router.delete('/actions/:id', authenticateToken, async (req, res) => {
  try {
    const AssistantAction = require('../models/AssistantAction');
    const action = await AssistantAction.findOne({
      _id: req.params.id,
      companyId: req.user.companyId,
      status: 'pending'
    });

    if (!action) return res.status(404).json({ error: 'Action not found or already executed' });

    action.status = 'cancelled';
    await action.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel action' });
  }
});


// DELETE /api/noxtm-assistant/history — Clear chat history
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    await NoxtmChatMessage.deleteMany({
      userId: req.user.userId,
      companyId: req.user.companyId
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});


module.exports = router;
