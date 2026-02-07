const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const { NoxtmChatMessage, NoxtmChatConfig } = require('../models/NoxtmChat');
const {
  aggregateUserContext,
  getUserMemory,
  extractAndSaveInsights,
  buildSystemPrompt,
  callClaude,
  sanitizeUserMessage
} = require('../utils/aiHelpers');

// ===== USER ENDPOINTS (any authenticated user) =====

/**
 * POST /api/noxtm-chat/send
 * Send a message to Noxtm and get AI response
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;
    const companyId = req.user.companyId;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const sanitized = sanitizeUserMessage(message);
    if (!sanitized || sanitized.length > 2000) {
      return res.status(400).json({ success: false, message: 'Invalid or too long message (max 2000 chars)' });
    }

    // Check config
    if (companyId) {
      const config = await NoxtmChatConfig.findOne({ companyId });
      if (config && !config.enabled) {
        return res.status(403).json({ success: false, message: 'Noxtm Chat is disabled for your workspace' });
      }
    }

    // Save user message
    const userMsg = await NoxtmChatMessage.create({
      userId,
      companyId,
      role: 'user',
      content: sanitized
    });

    // Get recent conversation history for context
    const recentMessages = await NoxtmChatMessage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const conversationHistory = recentMessages
      .reverse()
      .slice(0, -1) // exclude the just-saved user message
      .map(m => ({ role: m.role, content: m.content }));

    // Build AI context + memory
    const [context, memory] = await Promise.all([
      aggregateUserContext(userId, companyId),
      getUserMemory(userId)
    ]);

    // Detect active mode from message (e.g., "Mode: Technical Colleagues")
    let activeMode = null;
    const modeMatch = sanitized.match(/^mode:\s*(.+)/i);
    if (modeMatch) {
      activeMode = modeMatch[1].trim();
    }

    // Check for custom system prompt
    let systemPrompt = buildSystemPrompt(context, memory, activeMode);
    if (companyId) {
      const config = await NoxtmChatConfig.findOne({ companyId });
      if (config?.systemPromptOverride) {
        systemPrompt = config.systemPromptOverride + '\n\n' + systemPrompt;
      }
      if (config?.welcomeMessage && conversationHistory.length === 0) {
        // First message — no extra context needed
      }
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: sanitized }
    ];

    const aiResponse = await callClaude(messages, 'claude-3-haiku-20240307');

    // Save assistant response
    const assistantMsg = await NoxtmChatMessage.create({
      userId,
      companyId,
      role: 'assistant',
      content: aiResponse,
      metadata: { contextUsed: true, model: 'claude-3-haiku-20240307' }
    });

    // Auto-learn from conversation (non-blocking)
    extractAndSaveInsights(userId, companyId, sanitized, aiResponse).catch(() => {});

    res.json({
      success: true,
      userMessage: { _id: userMsg._id, role: 'user', content: sanitized, createdAt: userMsg.createdAt },
      reply: { _id: assistantMsg._id, role: 'assistant', content: aiResponse, createdAt: assistantMsg.createdAt }
    });
  } catch (error) {
    console.error('Noxtm chat error:', error);
    if (error.response?.status === 429) {
      return res.status(429).json({ success: false, message: 'Rate limit exceeded. Please try again shortly.' });
    }
    res.status(500).json({ success: false, message: 'Failed to get response. Please try again.' });
  }
});

/**
 * GET /api/noxtm-chat/messages
 * Get current user's chat history with Noxtm
 */
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      NoxtmChatMessage.find({ userId })
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NoxtmChatMessage.countDocuments({ userId })
    ]);

    res.json({
      success: true,
      messages,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

/**
 * DELETE /api/noxtm-chat/messages
 * Clear current user's chat history
 */
router.delete('/messages', authenticateToken, async (req, res) => {
  try {
    await NoxtmChatMessage.deleteMany({ userId: req.user.userId });
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear messages' });
  }
});

/**
 * GET /api/noxtm-chat/config
 * Get Noxtm chat config for the company (any user can read)
 */
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const companyId = req.user.companyId;
    if (!companyId) {
      return res.json({ success: true, config: {
        enabled: true,
        welcomeMessage: 'Hi! I\'m Noxtm, your AI assistant. Ask me anything!',
        botName: 'Navraj Panwar',
        botTitle: 'Founder',
        botProfilePicture: '',
        showVerifiedBadge: true,
        systemPromptOverride: '',
        maxMessagesPerDay: 100
      }});
    }

    let config = await NoxtmChatConfig.findOne({ companyId }).lean();
    if (!config) {
      config = {
        enabled: true,
        welcomeMessage: 'Hi! I\'m Noxtm, your AI assistant. I can help you with your dashboard, projects, campaigns, and more. Ask me anything!',
        botName: 'Navraj Panwar',
        botTitle: 'Founder',
        botProfilePicture: '',
        showVerifiedBadge: true,
        systemPromptOverride: '',
        maxMessagesPerDay: 100,
        allowedRoles: []
      };
    }

    res.json({ success: true, config });
  } catch (error) {
    console.error('Fetch config error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch config' });
  }
});

// ===== ADMIN ENDPOINTS =====

/**
 * PUT /api/noxtm-chat/config
 * Update Noxtm chat config (admin only)
 */
router.put('/config', authenticateToken, async (req, res) => {
  try {
    // Check admin role
    const User = require('mongoose').model('User');
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const companyId = req.user.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const { enabled, welcomeMessage, systemPromptOverride, maxMessagesPerDay, allowedRoles, botName, botTitle, botProfilePicture, showVerifiedBadge } = req.body;

    // Validate botProfilePicture if provided
    if (botProfilePicture !== undefined && botProfilePicture !== '') {
      // Check if it's a valid base64 data URL
      if (!botProfilePicture.startsWith('data:image/')) {
        return res.status(400).json({ success: false, message: 'Invalid image format. Must be a data URL.' });
      }
      
      // Check size (approx 5MB base64 = ~3.7MB actual file)
      const sizeInBytes = (botProfilePicture.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      if (sizeInMB > 5) {
        return res.status(400).json({ success: false, message: `Image too large (${sizeInMB.toFixed(2)}MB). Maximum 5MB allowed.` });
      }
    }

    const config = await NoxtmChatConfig.findOneAndUpdate(
      { companyId },
      {
        $set: {
          ...(typeof enabled === 'boolean' && { enabled }),
          ...(welcomeMessage !== undefined && { welcomeMessage }),
          ...(systemPromptOverride !== undefined && { systemPromptOverride }),
          ...(maxMessagesPerDay !== undefined && { maxMessagesPerDay }),
          ...(allowedRoles !== undefined && { allowedRoles }),
          ...(botName !== undefined && { botName }),
          ...(botTitle !== undefined && { botTitle }),
          ...(botProfilePicture !== undefined && { botProfilePicture }),
          ...(typeof showVerifiedBadge === 'boolean' && { showVerifiedBadge }),
          updatedBy: req.user.userId
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, config });
  } catch (error) {
    console.error('Update config error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Failed to update config' });
  }
});

/**
 * GET /api/noxtm-chat/admin/conversations
 * Get all users' conversations summary (admin only)
 */
router.get('/admin/conversations', authenticateToken, async (req, res) => {
  try {
    const User = require('mongoose').model('User');
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const companyId = req.user.companyId;

    // Aggregate conversations by user
    const conversations = await NoxtmChatMessage.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$userId',
          messageCount: { $sum: 1 },
          lastMessage: { $last: '$content' },
          lastRole: { $last: '$role' },
          lastMessageAt: { $max: '$createdAt' },
          firstMessageAt: { $min: '$createdAt' }
        }
      },
      { $sort: { lastMessageAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          fullName: '$user.fullName',
          email: '$user.email',
          profileImage: '$user.profileImage',
          role: '$user.role',
          messageCount: 1,
          lastMessage: 1,
          lastRole: 1,
          lastMessageAt: 1,
          firstMessageAt: 1
        }
      }
    ]);

    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Admin conversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/noxtm-chat/admin/messages/:userId
 * Get a specific user's chat history (admin only)
 */
router.get('/admin/messages/:userId', authenticateToken, async (req, res) => {
  try {
    const User = require('mongoose').model('User');
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const messages = await NoxtmChatMessage.find({ userId: req.params.userId })
      .sort({ createdAt: 1 })
      .lean();

    const targetUser = await User.findById(req.params.userId).select('fullName email profileImage role').lean();

    res.json({ success: true, messages, user: targetUser });
  } catch (error) {
    console.error('Admin messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

/**
 * GET /api/noxtm-chat/admin/stats
 * Get Noxtm chat statistics (admin only)
 */
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    const User = require('mongoose').model('User');
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const companyId = req.user.companyId;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalMessages, totalUsers, todayMessages, weekMessages] = await Promise.all([
      NoxtmChatMessage.countDocuments({ companyId }),
      NoxtmChatMessage.distinct('userId', { companyId }).then(ids => ids.length),
      NoxtmChatMessage.countDocuments({ companyId, createdAt: { $gte: today } }),
      NoxtmChatMessage.countDocuments({ companyId, createdAt: { $gte: thisWeek } })
    ]);

    res.json({
      success: true,
      stats: { totalMessages, totalUsers, todayMessages, weekMessages }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;
