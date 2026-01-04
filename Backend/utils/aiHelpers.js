const axios = require('axios');
const User = require('../models/User');
const Company = require('../models/Company');
const Project = require('../models/Project');
const Campaign = require('../models/Campaign');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const EmailAccount = require('../models/EmailAccount');

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
 * Builds system prompt with user context
 * @param {Object} contextData - Aggregated user context
 * @returns {String} System prompt for AI
 */
const buildSystemPrompt = (contextData) => {
  return `You are an AI assistant for the Noxtm Dashboard. You help users understand their data and navigate features.

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
- Email Accounts: ${contextData.emailAccountCount} total${contextData.domains !== 'None' ? ` (Domains: ${contextData.domains})` : ''}

Guidelines:
- Be helpful, concise, and professional
- Reference specific data from the user's context when answering questions
- Suggest relevant dashboard sections when appropriate (e.g., "You can view this in the Projects section")
- If you don't know something, say so honestly
- Keep responses under 150 words for readability
- Focus on actionable insights and next steps
- DO NOT use markdown formatting like **bold**, *italic*, or code blocks - use plain text only
- Avoid special characters like asterisks, underscores, or backticks for formatting`;
};

/**
 * Calls OpenRouter API for AI completion
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

module.exports = {
  aggregateUserContext,
  buildSystemPrompt,
  callOpenRouter,
  sanitizeUserMessage
};
