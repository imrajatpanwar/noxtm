const mongoose = require('mongoose');
const Task = require('../models/Task');
const Lead = require('../models/Lead');
const Project = require('../models/Project');
const Company = require('../models/Company');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppContact = require('../models/WhatsAppContact');
const WhatsAppAccount = require('../models/WhatsAppAccount');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const CompanyMemory = require('../models/CompanyMemory');
const AssistantAction = require('../models/AssistantAction');

// ═══════════════════════════════════════════
// TOOL DEFINITIONS (sent to Claude API)
// ═══════════════════════════════════════════

const toolDefinitions = [
  {
    name: 'get_company_info',
    description: 'Get company details including name, industry, size, members count, departments, and settings. Use this when the user asks about their company.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_team_members',
    description: 'List team members of the company with their roles, departments, and job titles. Cannot return Admin-level users.',
    input_schema: {
      type: 'object',
      properties: {
        department: { type: 'string', description: 'Filter by department name (optional)' },
        limit: { type: 'number', description: 'Max results to return (default 20)' }
      },
      required: []
    }
  },
  {
    name: 'get_tasks',
    description: 'List or search tasks. Can filter by status, priority, assignee name, or search text. Use this when the user asks about tasks, to-dos, or work items.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['Todo', 'In Progress', 'In Review', 'Done'], description: 'Filter by status' },
        priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'], description: 'Filter by priority' },
        assignee_name: { type: 'string', description: 'Filter by assignee name (partial match)' },
        search: { type: 'string', description: 'Text search in title and description' },
        limit: { type: 'number', description: 'Max results (default 10)' }
      },
      required: []
    }
  },
  {
    name: 'create_task',
    description: 'Create a new task and optionally assign it to team members. Use when the user asks to create a task, to-do, or work item.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'], description: 'Priority level (default Medium)' },
        assignee_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of team members to assign (will fuzzy match)'
        },
        due_date: { type: 'string', description: 'Due date in ISO format or natural language like "tomorrow", "next friday"' },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Labels/tags for the task'
        }
      },
      required: ['title']
    }
  },
  {
    name: 'update_task',
    description: 'Update an existing task (status, priority, assignees, etc). Use when user asks to change a task.',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID to update' },
        title: { type: 'string', description: 'New title' },
        status: { type: 'string', enum: ['Todo', 'In Progress', 'In Review', 'Done'] },
        priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'] },
        assignee_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names to assign (replaces current assignees)'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'get_leads',
    description: 'List or search leads with status breakdown. Use when user asks about leads, prospects, or sales pipeline.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by lead status' },
        search: { type: 'string', description: 'Search in lead name or company' },
        limit: { type: 'number', description: 'Max results (default 10)' }
      },
      required: []
    }
  },
  {
    name: 'get_projects',
    description: 'List projects with their status. Use when user asks about projects or ongoing work.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by project status' },
        limit: { type: 'number', description: 'Max results (default 10)' }
      },
      required: []
    }
  },
  {
    name: 'get_campaigns',
    description: 'List email and WhatsApp campaigns. Use when user asks about marketing campaigns.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['email', 'whatsapp', 'all'], description: 'Campaign type (default all)' },
        status: { type: 'string', description: 'Filter by status' },
        limit: { type: 'number', description: 'Max results (default 10)' }
      },
      required: []
    }
  },
  {
    name: 'send_whatsapp_message',
    description: 'Send a WhatsApp message to an EXTERNAL contact (client, lead, vendor) via WhatsApp. ONLY use this when the user explicitly says "WhatsApp" or the recipient is clearly an external contact — NOT a team member or colleague. For team members always use send_team_message instead.',
    input_schema: {
      type: 'object',
      properties: {
        contact_name: { type: 'string', description: 'Contact name to send to (will fuzzy match)' },
        contact_phone: { type: 'string', description: 'Phone number if name not found' },
        message: { type: 'string', description: 'Message content to send' }
      },
      required: ['message']
    }
  },
  {
    name: 'send_team_message',
    description: 'DEFAULT tool to send a message to any team member or colleague via Team Communication (internal chat). Use this whenever the user says "message", "tell", "say", "notify", "ping", or "send" to a teammate, colleague, or team member — even if they just say a person\'s name. ALWAYS prefer this over WhatsApp for internal team communication.',
    input_schema: {
      type: 'object',
      properties: {
        recipient_name: { type: 'string', description: 'Name of the team member to message (will fuzzy match)' },
        message: { type: 'string', description: 'Message content to send' }
      },
      required: ['recipient_name', 'message']
    }
  },
  {
    name: 'create_whatsapp_campaign',
    description: 'Create a WhatsApp bulk campaign. Use when user asks to create a WhatsApp campaign or send bulk messages.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Campaign name' },
        message_template: { type: 'string', description: 'Message template (use {name} for personalization)' },
        contact_filter: { type: 'string', description: 'Filter contacts by tag or group name' },
        delay_min: { type: 'number', description: 'Min delay between messages in seconds (default 30)' },
        delay_max: { type: 'number', description: 'Max delay between messages in seconds (default 60)' },
        daily_limit: { type: 'number', description: 'Max messages per day (default 100)' }
      },
      required: ['name', 'message_template']
    }
  },
  {
    name: 'schedule_action',
    description: 'Schedule a future action like sending a message, creating a task, setting a reminder, or asking for a task update. Use when user says things like "at 5pm message X", "tomorrow create a task", "remind me at 3pm", "after 1 hour ask for update", "check back in 2 hours". For ask_update: auto-generate a follow-up message asking the recipient for progress on the assigned task. If no time is specified for an update check, infer based on task type (quick tasks = 1 hour, normal = end of day, complex = next morning).',
    input_schema: {
      type: 'object',
      properties: {
        action_type: {
          type: 'string',
          enum: ['send_whatsapp', 'send_team_message', 'create_task', 'reminder', 'ask_update'],
          description: 'Type of action to schedule. Use ask_update to schedule a follow-up message that asks the team member for a progress update on their assigned task.'
        },
        scheduled_time: {
          type: 'string',
          description: 'When to execute, in ISO format. Convert natural language to ISO (e.g., "5pm today", "after 1 hour", "next morning 9am" -> appropriate ISO string)'
        },
        description: {
          type: 'string',
          description: 'Human-readable description of what will happen'
        },
        // For messages and ask_update
        recipient_name: { type: 'string', description: 'Name of team member to message or ask for update' },
        message: { type: 'string', description: 'Message content. For ask_update, auto-generate a friendly follow-up like "Hey [name], how\'s the progress on [task]? Any blockers?" if not provided.' },
        // For ask_update context
        task_title: { type: 'string', description: 'Title of the task to ask about (for ask_update context)' },
        task_assignee_names: { type: 'array', items: { type: 'string' } },
        task_priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'] }
      },
      required: ['action_type', 'scheduled_time', 'description']
    }
  },
  {
    name: 'get_analytics',
    description: 'Get dashboard analytics and stats — task counts by status, lead pipeline, campaign performance, team activity.',
    input_schema: {
      type: 'object',
      properties: {
        metric: {
          type: 'string',
          enum: ['tasks', 'leads', 'campaigns', 'team', 'overview'],
          description: 'Which metrics to fetch (default overview)'
        }
      },
      required: []
    }
  },
  {
    name: 'save_memory',
    description: 'Save important company information to persistent memory. Use when the user shares important facts, decisions, processes, or preferences about their company that should be remembered across conversations.',
    input_schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The information to remember' },
        category: {
          type: 'string',
          enum: ['fact', 'preference', 'process', 'decision', 'contact', 'goal', 'other'],
          description: 'Category of the memory'
        }
      },
      required: ['content', 'category']
    }
  },
  {
    name: 'recall_memory',
    description: 'Search company memory for previously saved information. Use when you need context about company decisions, preferences, or facts.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to find relevant memories' },
        category: {
          type: 'string',
          enum: ['fact', 'preference', 'process', 'decision', 'contact', 'goal', 'other'],
          description: 'Filter by category (optional)'
        }
      },
      required: ['query']
    }
  }
];


// ═══════════════════════════════════════════
// TOOL EXECUTORS
// ═══════════════════════════════════════════

// Helper: fuzzy match a name against company members
async function findMembersByName(companyId, names) {
  if (!names || names.length === 0) return [];

  const company = await Company.findById(companyId)
    .select('members')
    .populate('members.user', 'fullName email _id')
    .lean();

  if (!company?.members) return [];

  const matched = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    const found = company.members.find(m => {
      const memberName = m.user?.fullName?.toLowerCase() || '';
      return memberName.includes(lower) || lower.includes(memberName);
    });
    if (found?.user) {
      matched.push(found.user);
    }
  }
  return matched;
}

// Helper: parse natural language dates
function parseNaturalDate(str) {
  if (!str) return null;

  // Try ISO parse first
  const iso = new Date(str);
  if (!isNaN(iso.getTime())) return iso;

  const now = new Date();
  const lower = str.toLowerCase().trim();

  if (lower === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  if (lower === 'today') return now;
  if (lower.includes('next week')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (lower.includes('next month')) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    return d;
  }

  // Try "next friday", "this wednesday", etc
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i])) {
      const d = new Date(now);
      const diff = (i - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      d.setHours(9, 0, 0, 0);
      return d;
    }
  }

  return null;
}

const executors = {
  // ──────────────────────────────
  // GET COMPANY INFO
  // ──────────────────────────────
  get_company_info: async ({ companyId }) => {
    const company = await Company.findById(companyId)
      .select('-invitations -dataAccessPermissions -extensionAccessPeople -purchaseHistory -aiSettings')
      .lean();

    if (!company) return { error: 'Company not found' };

    return {
      name: company.companyName,
      email: company.companyEmail,
      phone: company.companyPhone,
      website: company.companyWebsite,
      industry: company.industry,
      type: company.type,
      size: company.size,
      description: company.description,
      city: company.companyCity,
      state: company.companyState,
      country: company.companyCountry,
      foundedYear: company.foundedYear,
      specialties: company.specialties,
      techStack: company.techStack,
      membersCount: company.members?.length || 0,
      plan: company.subscription?.plan,
      socialLinks: company.socialLinks
    };
  },

  // ──────────────────────────────
  // GET TEAM MEMBERS
  // ──────────────────────────────
  get_team_members: async ({ companyId, input }) => {
    const { department, limit = 20 } = input || {};

    const company = await Company.findById(companyId)
      .select('members')
      .populate('members.user', 'fullName email role profilePicture')
      .lean();

    if (!company?.members) return { members: [] };

    let members = company.members
      .filter(m => m.user && m.user.role !== 'Admin') // Exclude admin users
      .map(m => ({
        id: m.user._id,
        name: m.user.fullName,
        email: m.user.email,
        role: m.roleInCompany,
        department: m.department,
        jobTitle: m.jobTitle,
        joinedAt: m.joinedAt
      }));

    if (department) {
      members = members.filter(m =>
        m.department?.toLowerCase().includes(department.toLowerCase())
      );
    }

    return { members: members.slice(0, limit), total: members.length };
  },

  // ──────────────────────────────
  // GET TASKS
  // ──────────────────────────────
  get_tasks: async ({ companyId, userId, input }) => {
    const { status, priority, assignee_name, search, limit = 10 } = input || {};

    const query = { companyId };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (search) {
      query.$text = { $search: search };
    }

    let tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('assignees', 'fullName email')
      .populate('createdBy', 'fullName')
      .lean();

    // Filter by assignee name if provided
    if (assignee_name) {
      const lower = assignee_name.toLowerCase();
      tasks = tasks.filter(t =>
        t.assignees?.some(a => a.fullName?.toLowerCase().includes(lower))
      );
    }

    return {
      tasks: tasks.map(t => ({
        id: t._id,
        title: t.title,
        description: t.description?.substring(0, 200),
        status: t.status,
        priority: t.priority,
        assignees: t.assignees?.map(a => a.fullName) || [],
        dueDate: t.dueDate,
        labels: t.labels,
        createdBy: t.createdBy?.fullName,
        createdAt: t.createdAt,
        isOverdue: t.status !== 'Done' && t.dueDate && new Date() > new Date(t.dueDate)
      })),
      count: tasks.length
    };
  },

  // ──────────────────────────────
  // CREATE TASK
  // ──────────────────────────────
  create_task: async ({ companyId, userId, input }) => {
    const { title, description, priority, assignee_names, due_date, labels } = input;

    // Resolve assignee names to user IDs
    let assigneeIds = [];
    if (assignee_names?.length > 0) {
      const matched = await findMembersByName(companyId, assignee_names);
      assigneeIds = matched.map(m => m._id);
    }

    const dueDate = due_date ? parseNaturalDate(due_date) : undefined;

    const task = await Task.create({
      title,
      description: description || '',
      priority: priority || 'Medium',
      assignees: assigneeIds,
      dueDate,
      labels: labels || [],
      createdBy: userId,
      companyId,
      activity: [{
        user: userId,
        action: 'created',
        details: 'Created by Noxtm Assistant'
      }]
    });

    // Populate for response
    const populated = await Task.findById(task._id)
      .populate('assignees', 'fullName')
      .lean();

    return {
      success: true,
      task: {
        id: task._id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignees: populated.assignees?.map(a => a.fullName) || [],
        dueDate: task.dueDate
      }
    };
  },

  // ──────────────────────────────
  // UPDATE TASK
  // ──────────────────────────────
  update_task: async ({ companyId, userId, input }) => {
    const { task_id, title, status, priority, assignee_names } = input;

    const task = await Task.findOne({ _id: task_id, companyId });
    if (!task) return { error: 'Task not found' };

    const changes = [];
    if (title) { task.title = title; changes.push(`title to "${title}"`); }
    if (status) {
      changes.push(`status from ${task.status} to ${status}`);
      task.status = status;
      task.activity.push({ user: userId, action: 'status_changed', details: `${task.status} → ${status}` });
    }
    if (priority) {
      changes.push(`priority to ${priority}`);
      task.priority = priority;
      task.activity.push({ user: userId, action: 'priority_changed', details: priority });
    }
    if (assignee_names?.length > 0) {
      const matched = await findMembersByName(companyId, assignee_names);
      task.assignees = matched.map(m => m._id);
      changes.push(`assignees to ${matched.map(m => m.fullName).join(', ')}`);
      task.activity.push({ user: userId, action: 'assigned', details: matched.map(m => m.fullName).join(', ') });
    }

    await task.save();

    return {
      success: true,
      changes: changes.join('; '),
      task: { id: task._id, title: task.title, status: task.status, priority: task.priority }
    };
  },

  // ──────────────────────────────
  // GET LEADS
  // ──────────────────────────────
  get_leads: async ({ companyId, input }) => {
    const { status, search, limit = 10 } = input || {};

    const query = { companyId };
    if (status) query.status = status;

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Lead.countDocuments({ companyId })
    ]);

    // Status breakdown
    const statusCounts = await Lead.aggregate([
      { $match: { companyId: new require('mongoose').Types.ObjectId(companyId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return {
      leads: leads.map(l => ({
        id: l._id,
        name: `${l.firstName || ''} ${l.lastName || ''}`.trim(),
        company: l.company,
        email: l.email,
        phone: l.phone,
        status: l.status,
        source: l.source,
        createdAt: l.createdAt
      })),
      total,
      statusBreakdown: statusCounts.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {})
    };
  },

  // ──────────────────────────────
  // GET PROJECTS
  // ──────────────────────────────
  get_projects: async ({ companyId, input }) => {
    const { status, limit = 10 } = input || {};

    const query = { companyId };
    if (status) query.status = status;

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('projectName status clientName startDate endDate budget')
      .lean();

    return {
      projects: projects.map(p => ({
        id: p._id,
        name: p.projectName,
        status: p.status,
        client: p.clientName,
        startDate: p.startDate,
        endDate: p.endDate,
        budget: p.budget
      })),
      count: projects.length
    };
  },

  // ──────────────────────────────
  // GET CAMPAIGNS
  // ──────────────────────────────
  get_campaigns: async ({ companyId, input }) => {
    const { type = 'all', status, limit = 10 } = input || {};

    const results = {};

    if (type === 'email' || type === 'all') {
      const emailQuery = { companyId };
      if (status) emailQuery.status = status;
      const emailCampaigns = await Campaign.find(emailQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name status recipientCount sentCount openCount clickCount createdAt')
        .lean();
      results.emailCampaigns = emailCampaigns.map(c => ({
        id: c._id,
        name: c.name,
        status: c.status,
        recipients: c.recipientCount,
        sent: c.sentCount,
        opens: c.openCount,
        clicks: c.clickCount,
        createdAt: c.createdAt
      }));
    }

    if (type === 'whatsapp' || type === 'all') {
      const waQuery = { companyId };
      if (status) waQuery.status = status;
      const waCampaigns = await WhatsAppCampaign.find(waQuery)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('name status totalRecipients sentCount failedCount createdAt')
        .lean();
      results.whatsappCampaigns = waCampaigns.map(c => ({
        id: c._id,
        name: c.name,
        status: c.status,
        recipients: c.totalRecipients,
        sent: c.sentCount,
        failed: c.failedCount,
        createdAt: c.createdAt
      }));
    }

    return results;
  },

  // ──────────────────────────────
  // SEND WHATSAPP MESSAGE
  // ──────────────────────────────
  send_whatsapp_message: async ({ companyId, userId, input }) => {
    const { contact_name, contact_phone, message } = input;

    // Find company's WhatsApp account
    const account = await WhatsAppAccount.findOne({ companyId, status: 'connected' }).lean();
    if (!account) return { error: 'No connected WhatsApp account found. Please link a WhatsApp account first.' };

    // Find contact
    let contact;
    if (contact_name) {
      contact = await WhatsAppContact.findOne({
        companyId,
        name: { $regex: contact_name, $options: 'i' }
      }).lean();
    }
    if (!contact && contact_phone) {
      contact = await WhatsAppContact.findOne({
        companyId,
        phone: { $regex: contact_phone.replace(/[^\d]/g, '') }
      }).lean();
    }

    if (!contact) {
      return { error: `Contact "${contact_name || contact_phone}" not found. Available contacts can be listed using get_team_members or checking WhatsApp contacts.` };
    }

    // Use session manager to send
    const sessionManager = require('../services/whatsappSessionManager');
    const jid = contact.jid || `${contact.phone.replace(/[^\d]/g, '')}@s.whatsapp.net`;

    if (!sessionManager.isConnected(account._id.toString())) {
      return { error: 'WhatsApp session is not connected. Please reconnect from WhatsApp settings.' };
    }

    await sessionManager.sendMessage(account._id.toString(), jid, message, {
      type: 'text',
      isAutomated: true
    });

    return {
      success: true,
      sentTo: contact.name || contact.phone,
      message: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    };
  },

  // ──────────────────────────────
  // SEND TEAM MESSAGE
  // ──────────────────────────────
  send_team_message: async ({ companyId, userId, input }) => {
    const { recipient_name, message } = input;
    if (!recipient_name || !message) return { error: 'Recipient name and message are required' };

    const members = await findMembersByName(companyId, [recipient_name]);
    if (members.length === 0) return { error: `Team member "${recipient_name}" not found` };

    const recipientId = members[0]._id;
    const recipientName = members[0].fullName;
    const Conversation = mongoose.model('Conversation');
    const Message = mongoose.model('Message');

    // Find or create direct conversation
    let conversation = await Conversation.findOne({
      companyId,
      type: 'direct',
      'participants.user': { $all: [userId, recipientId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        companyId,
        type: 'direct',
        participants: [userId, recipientId].map(id => ({
          user: id,
          joinedAt: new Date(),
          lastReadAt: new Date()
        })),
        createdBy: userId
      });
    }

    // Create and save the message
    const msg = await Message.create({
      conversationId: conversation._id,
      companyId,
      sender: userId,
      content: message.trim(),
      type: 'text',
      readBy: [{ user: userId, readAt: new Date() }]
    });

    // Update conversation's lastMessage
    await Conversation.updateOne(
      { _id: conversation._id },
      { $set: { lastMessage: { content: message.trim(), sender: userId, timestamp: new Date() }, updatedAt: new Date() } }
    );

    return {
      success: true,
      recipientName,
      conversationId: conversation._id.toString(),
      messagePreview: message.substring(0, 100),
      note: 'Message sent successfully in Team Communication'
    };
  },

  // ──────────────────────────────
  // CREATE WHATSAPP CAMPAIGN
  // ──────────────────────────────
  create_whatsapp_campaign: async ({ companyId, userId, input }) => {
    const { name, message_template, contact_filter, delay_min = 30, delay_max = 60, daily_limit = 100 } = input;

    // Find WhatsApp account
    const account = await WhatsAppAccount.findOne({ companyId, status: 'connected' }).lean();
    if (!account) return { error: 'No connected WhatsApp account found.' };

    // Get contacts
    const contactQuery = { companyId };
    if (contact_filter) {
      contactQuery.$or = [
        { tags: { $regex: contact_filter, $options: 'i' } },
        { group: { $regex: contact_filter, $options: 'i' } },
        { name: { $regex: contact_filter, $options: 'i' } }
      ];
    }
    const contacts = await WhatsAppContact.find(contactQuery).select('_id name phone jid').lean();

    if (contacts.length === 0) {
      return { error: contact_filter ? `No contacts found matching "${contact_filter}"` : 'No WhatsApp contacts found.' };
    }

    const campaign = await WhatsAppCampaign.create({
      companyId,
      accountId: account._id,
      createdBy: userId,
      name,
      messageTemplate: message_template,
      recipients: contacts.map(c => ({
        contactId: c._id,
        jid: c.jid || `${c.phone.replace(/[^\d]/g, '')}@s.whatsapp.net`,
        name: c.name,
        status: 'pending'
      })),
      totalRecipients: contacts.length,
      delayMin: delay_min,
      delayMax: delay_max,
      dailyLimit: daily_limit,
      status: 'draft'
    });

    return {
      success: true,
      campaign: {
        id: campaign._id,
        name: campaign.name,
        status: 'draft',
        recipientCount: contacts.length,
        note: 'Campaign created as draft. User can start it from WhatsApp Marketing section.'
      }
    };
  },

  // ──────────────────────────────
  // SCHEDULE ACTION
  // ──────────────────────────────
  schedule_action: async ({ companyId, userId, input }) => {
    const {
      action_type, scheduled_time, description,
      recipient_name, message,
      task_title, task_assignee_names, task_priority
    } = input;

    const scheduledAt = new Date(scheduled_time);
    if (isNaN(scheduledAt.getTime())) {
      return { error: 'Invalid scheduled time. Please provide a valid date/time.' };
    }
    if (scheduledAt <= new Date()) {
      return { error: 'Scheduled time must be in the future.' };
    }

    // Build payload based on action type
    const payload = { message };

    if (action_type === 'send_whatsapp' && recipient_name) {
      const contact = await WhatsAppContact.findOne({
        companyId,
        name: { $regex: recipient_name, $options: 'i' }
      }).lean();
      if (contact) {
        payload.contactName = contact.name;
        payload.contactPhone = contact.phone;
        payload.jid = contact.jid || `${contact.phone.replace(/[^\d]/g, '')}@s.whatsapp.net`;
      } else {
        payload.contactName = recipient_name;
      }
      const account = await WhatsAppAccount.findOne({ companyId, status: 'connected' }).lean();
      if (account) payload.whatsappAccountId = account._id;
    }

    if ((action_type === 'send_team_message' || action_type === 'ask_update') && recipient_name) {
      const members = await findMembersByName(companyId, [recipient_name]);
      if (members.length > 0) {
        payload.recipientUserId = members[0]._id;
        payload.recipientName = members[0].fullName;
      } else {
        payload.recipientName = recipient_name;
      }

      // For ask_update, auto-generate a follow-up message if none provided
      if (action_type === 'ask_update') {
        const firstName = payload.recipientName?.split(' ')[0] || payload.recipientName;
        const taskRef = task_title ? ` on "${task_title}"` : '';
        payload.message = message || `Hey ${firstName}, just checking in${taskRef} — how's the progress? Any blockers I should know about?`;
        payload.taskTitle = task_title;
      }
    }

    if (action_type === 'create_task') {
      payload.taskTitle = task_title || description;
      payload.taskPriority = task_priority || 'Medium';
      if (task_assignee_names?.length > 0) {
        const matched = await findMembersByName(companyId, task_assignee_names);
        payload.taskAssignees = matched.map(m => m._id);
      }
    }

    const action = await AssistantAction.create({
      companyId,
      createdBy: userId,
      actionType: action_type,
      payload,
      scheduledAt,
      description,
      status: 'pending'
    });

    return {
      success: true,
      action: {
        id: action._id,
        type: action_type,
        scheduledAt,
        description,
        status: 'pending'
      }
    };
  },

  // ──────────────────────────────
  // GET ANALYTICS
  // ──────────────────────────────
  get_analytics: async ({ companyId, input }) => {
    const { metric = 'overview' } = input || {};
    const results = {};

    if (metric === 'tasks' || metric === 'overview') {
      const taskStats = await Task.aggregate([
        { $match: { companyId: new require('mongoose').Types.ObjectId(companyId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const overdueTasks = await Task.countDocuments({
        companyId,
        status: { $ne: 'Done' },
        dueDate: { $lt: new Date() }
      });
      results.tasks = {
        byStatus: taskStats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
        total: taskStats.reduce((acc, s) => acc + s.count, 0),
        overdue: overdueTasks
      };
    }

    if (metric === 'leads' || metric === 'overview') {
      const leadStats = await Lead.aggregate([
        { $match: { companyId: new require('mongoose').Types.ObjectId(companyId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      results.leads = {
        byStatus: leadStats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
        total: leadStats.reduce((acc, s) => acc + s.count, 0)
      };
    }

    if (metric === 'campaigns' || metric === 'overview') {
      const [emailCount, waCount] = await Promise.all([
        Campaign.countDocuments({ companyId }),
        WhatsAppCampaign.countDocuments({ companyId })
      ]);
      results.campaigns = { email: emailCount, whatsapp: waCount, total: emailCount + waCount };
    }

    if (metric === 'team' || metric === 'overview') {
      const company = await Company.findById(companyId).select('members').lean();
      results.team = { totalMembers: company?.members?.length || 0 };
    }

    return results;
  },

  // ──────────────────────────────
  // SAVE MEMORY
  // ──────────────────────────────
  save_memory: async ({ companyId, userId, input }) => {
    const { content, category } = input;

    // Check for duplicate-ish content
    const existing = await CompanyMemory.findOne({
      companyId,
      content: { $regex: content.substring(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      active: true
    }).lean();

    if (existing) {
      // Update existing
      await CompanyMemory.updateOne(
        { _id: existing._id },
        { $set: { content, category, updatedAt: new Date() } }
      );
      return { success: true, action: 'updated', id: existing._id };
    }

    // Cap at 200 memories per company
    const count = await CompanyMemory.countDocuments({ companyId, active: true });
    if (count >= 200) {
      // Remove oldest
      const oldest = await CompanyMemory.findOne({ companyId, active: true }).sort({ createdAt: 1 });
      if (oldest) await oldest.deleteOne();
    }

    const memory = await CompanyMemory.create({
      companyId,
      category,
      content,
      createdBy: userId,
      source: 'conversation'
    });

    return { success: true, action: 'created', id: memory._id };
  },

  // ──────────────────────────────
  // RECALL MEMORY
  // ──────────────────────────────
  recall_memory: async ({ companyId, input }) => {
    const { query, category } = input;

    const searchQuery = { companyId, active: true };
    if (category) searchQuery.category = category;

    // Text search
    let memories = [];
    try {
      memories = await CompanyMemory.find(
        { ...searchQuery, $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(10).lean();
    } catch {
      // Fallback to regex if text index not available
      memories = await CompanyMemory.find({
        ...searchQuery,
        content: { $regex: query.split(' ').join('|'), $options: 'i' }
      }).sort({ createdAt: -1 }).limit(10).lean();
    }

    return {
      memories: memories.map(m => ({
        content: m.content,
        category: m.category,
        createdAt: m.createdAt
      })),
      count: memories.length
    };
  }
};


// ═══════════════════════════════════════════
// EXECUTE TOOL
// ═══════════════════════════════════════════

async function executeTool(toolName, toolInput, context) {
  const executor = executors[toolName];
  if (!executor) return { error: `Unknown tool: ${toolName}` };

  try {
    return await executor({ ...context, input: toolInput });
  } catch (err) {
    console.error(`[Assistant] Tool ${toolName} error:`, err.message);
    return { error: `Tool execution failed: ${err.message}` };
  }
}

module.exports = { toolDefinitions, executeTool };
