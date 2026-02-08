const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const { NoxtmChatMessage, NoxtmChatConfig } = require('../models/NoxtmChat');
const User = require('../models/User');
const InstalledModule = require('../models/InstalledModule');
const { detectTaskIntent, startTaskCreation, processTaskStep, getActiveIntent } = require('../services/taskChatService');
const {
  aggregateUserContext,
  getUserMemory,
  extractAndSaveInsights,
  extractAndSaveKeypoints,
  buildSystemPrompt,
  callClaude,
  sanitizeUserMessage
} = require('../utils/aiHelpers');

// In-memory inactivity timers for keypoint extraction
const keypointTimers = new Map();

// Helper: resolve companyId (from JWT or fallback to User model)
const resolveCompanyId = async (reqUser) => {
  if (reqUser.companyId) return reqUser.companyId;
  // Fallback: lookup from User model for old tokens missing companyId
  try {
    const user = await User.findById(reqUser.userId).select('companyId').lean();
    return user?.companyId || null;
  } catch (e) {
    return null;
  }
};

// ===== USER ENDPOINTS (any authenticated user) =====

/**
 * POST /api/noxtm-chat/send
 * Send a message to Noxtm and get AI response
 */
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;
    const companyId = await resolveCompanyId(req.user);

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

    // === CHAT AUTOMATION: Task creation via conversation ===
    // Only active if user has "ChatAutomation" module installed
    const hasChatAutomation = await InstalledModule.findOne({
      userId, moduleId: 'ChatAutomation', status: 'active'
    }).lean();

    if (hasChatAutomation) {
      // Check if user has an active task creation flow
      const activeIntent = await getActiveIntent(userId);
      if (activeIntent) {
        const taskResult = await processTaskStep(userId, companyId, sanitized);
        if (taskResult.handled) {
          // Save user message
          const userMsg = await NoxtmChatMessage.create({ userId, companyId, role: 'user', content: sanitized });
          // Save bot response
          const assistantMsg = await NoxtmChatMessage.create({
            userId, companyId, role: 'assistant', content: taskResult.response,
            metadata: { contextUsed: false, model: 'task-flow' }
          });
          return res.json({
            success: true,
            userMessage: { _id: userMsg._id, role: 'user', content: sanitized, createdAt: userMsg.createdAt },
            reply: { _id: assistantMsg._id, role: 'assistant', content: taskResult.response, createdAt: assistantMsg.createdAt },
            isTaskFlow: true
          });
        }
      }

      // Check if this message triggers a new task creation
      if (detectTaskIntent(sanitized)) {
        const taskResult = await startTaskCreation(userId, companyId, sanitized);
        if (taskResult.handled) {
          const userMsg = await NoxtmChatMessage.create({ userId, companyId, role: 'user', content: sanitized });
          const assistantMsg = await NoxtmChatMessage.create({
            userId, companyId, role: 'assistant', content: taskResult.response,
            metadata: { contextUsed: false, model: 'task-flow' }
          });
          return res.json({
            success: true,
            userMessage: { _id: userMsg._id, role: 'user', content: sanitized, createdAt: userMsg.createdAt },
            reply: { _id: assistantMsg._id, role: 'assistant', content: taskResult.response, createdAt: assistantMsg.createdAt },
            isTaskFlow: true
          });
        }
      }
    }
    // === END CHAT AUTOMATION ===

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

    // Load bot config FIRST (we need updatedBy to fetch admin memory)
    let botConfig = null;
    let systemPromptOverride = '';
    // Try user's company config first, then fall back to any platform config
    let config = companyId ? await NoxtmChatConfig.findOne({ companyId }) : null;
    if (!config) {
      // Fallback: use the first available config (platform-wide)
      config = await NoxtmChatConfig.findOne({}).sort({ updatedAt: -1 });
    }
    if (config) {
      botConfig = config.toObject();
      if (config.systemPromptOverride) {
        systemPromptOverride = config.systemPromptOverride;
      }
    }

    // Build AI context + memory
    // Core Memory & Context Modes come from the ADMIN (bot owner) who configured them
    // Learned Memories & Keypoints come from the CHATTING USER
    const adminUserId = config?.updatedBy;
    const UserKeypoint = require('../models/UserKeypoint');
    const [context, adminMemory, userMemory, keypoints] = await Promise.all([
      aggregateUserContext(userId, companyId),
      adminUserId ? getUserMemory(adminUserId) : Promise.resolve({ core: null, contexts: [], learned: [] }),
      getUserMemory(userId),
      UserKeypoint.find({ userId }).sort({ createdAt: -1 }).limit(50).lean()
    ]);

    // Merge: admin's core identity + context modes, user's learned memories
    const memory = {
      core: adminMemory.core,
      contexts: adminMemory.contexts,
      learned: userMemory.learned
    };

    // Detect active mode from message (e.g., "Mode: Technical Colleagues")
    let activeMode = null;
    const modeMatch = sanitized.match(/^mode:\s*(.+)/i);
    if (modeMatch) {
      activeMode = modeMatch[1].trim();
    }

    let systemPrompt = buildSystemPrompt(context, memory, activeMode, botConfig, keypoints);
    if (systemPromptOverride) {
      systemPrompt = systemPromptOverride + '\n\n' + systemPrompt;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: sanitized }
    ];

    const effectiveMaxWords = botConfig?.maxWordCount || 200;
    const aiResponse = await callClaude(messages, 'claude-3-haiku-20240307', effectiveMaxWords);

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

    // Inactivity-based keypoint extraction: reset timer on each message
    // When user stops chatting for 2 minutes, extract keypoints from recent conversation
    const timerKey = userId.toString();
    if (keypointTimers.has(timerKey)) {
      clearTimeout(keypointTimers.get(timerKey));
    }
    keypointTimers.set(timerKey, setTimeout(() => {
      keypointTimers.delete(timerKey);
      extractAndSaveKeypoints(userId, companyId).catch(err => {
        console.error('Keypoint extraction failed:', err.message);
      });
    }, 2 * 60 * 1000)); // 2 minutes of inactivity

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
    const companyId = await resolveCompanyId(req.user);

    // Try user's company config, then fall back to any platform config
    let config = companyId ? await NoxtmChatConfig.findOne({ companyId }).lean() : null;
    if (!config) {
      config = await NoxtmChatConfig.findOne({}).sort({ updatedAt: -1 }).lean();
    }
    if (!config) {
      config = {
        enabled: true,
        welcomeMessage: 'Hi! How can I help you today?',
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
    const adminUser = await User.findById(req.user.userId);
    if (!adminUser || adminUser.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const companyId = await resolveCompanyId(req.user);
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Company context required' });
    }

    const {
      enabled, welcomeMessage, systemPromptOverride, maxMessagesPerDay, allowedRoles,
      botName, botTitle, botProfilePicture, showVerifiedBadge,
      // New response control fields
      botIdentity, personality, emotionalScale, angerState, humorLevel, empathyLevel,
      maxWordCount, responseLanguage, formality, useEmojis, creativityLevel,
      confidenceLevel, proactiveness, forbiddenTopics, focusTopics, customInstructions,
      defaultExcuse
    } = req.body;

    // Validate botProfilePicture if provided
    if (botProfilePicture !== undefined && botProfilePicture !== '') {
      if (!botProfilePicture.startsWith('data:image/')) {
        return res.status(400).json({ success: false, message: 'Invalid image format. Must be a data URL.' });
      }
      const sizeInBytes = (botProfilePicture.length * 3) / 4;
      const sizeInMB = sizeInBytes / (1024 * 1024);
      if (sizeInMB > 5) {
        return res.status(400).json({ success: false, message: `Image too large (${sizeInMB.toFixed(2)}MB). Maximum 5MB allowed.` });
      }
    }

    const updateFields = {
      ...(typeof enabled === 'boolean' && { enabled }),
      ...(welcomeMessage !== undefined && { welcomeMessage }),
      ...(systemPromptOverride !== undefined && { systemPromptOverride }),
      ...(maxMessagesPerDay !== undefined && { maxMessagesPerDay }),
      ...(allowedRoles !== undefined && { allowedRoles }),
      ...(botName !== undefined && { botName }),
      ...(botTitle !== undefined && { botTitle }),
      ...(botProfilePicture !== undefined && { botProfilePicture }),
      ...(typeof showVerifiedBadge === 'boolean' && { showVerifiedBadge }),
      // Response control fields
      ...(botIdentity !== undefined && { botIdentity }),
      ...(personality !== undefined && { personality }),
      ...(emotionalScale !== undefined && { emotionalScale: Number(emotionalScale) }),
      ...(angerState !== undefined && { angerState }),
      ...(humorLevel !== undefined && { humorLevel: Number(humorLevel) }),
      ...(empathyLevel !== undefined && { empathyLevel: Number(empathyLevel) }),
      ...(maxWordCount !== undefined && { maxWordCount: Number(maxWordCount) }),
      ...(responseLanguage !== undefined && { responseLanguage }),
      ...(formality !== undefined && { formality: Number(formality) }),
      ...(typeof useEmojis === 'boolean' && { useEmojis }),
      ...(creativityLevel !== undefined && { creativityLevel: Number(creativityLevel) }),
      ...(confidenceLevel !== undefined && { confidenceLevel: Number(confidenceLevel) }),
      ...(proactiveness !== undefined && { proactiveness: Number(proactiveness) }),
      ...(forbiddenTopics !== undefined && { forbiddenTopics }),
      ...(focusTopics !== undefined && { focusTopics }),
      ...(customInstructions !== undefined && { customInstructions }),
      ...(defaultExcuse !== undefined && { defaultExcuse }),
      updatedBy: req.user.userId
    };

    const config = await NoxtmChatConfig.findOneAndUpdate(
      { companyId },
      { $set: updateFields },
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
    const UserModel = require('mongoose').model('User');
    const user = await UserModel.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const companyId = await resolveCompanyId(req.user);

    // Aggregate conversations by user (show all for platform admin)
    const matchStage = companyId ? { $match: { companyId: new mongoose.Types.ObjectId(companyId) } } : { $match: {} };
    // If admin's company has no conversations, fall back to showing all
    let conversations = await NoxtmChatMessage.aggregate([
      matchStage,
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

    // Fallback: if no conversations found for admin's company, show ALL
    if (conversations.length === 0 && companyId) {
      conversations = await NoxtmChatMessage.aggregate([
        { $match: {} },
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
    }

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
    const UserModel2 = require('mongoose').model('User');
    const user = await UserModel2.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const messages = await NoxtmChatMessage.find({ userId: req.params.userId })
      .sort({ createdAt: 1 })
      .lean();

    const targetUser = await UserModel2.findById(req.params.userId).select('fullName email profileImage role').lean();

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
    const UserModel = require('mongoose').model('User');
    const user = await UserModel.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const companyId = await resolveCompanyId(req.user);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Show stats for all messages (platform admin)
    const filter = companyId ? { companyId } : {};
    const [totalMessages, totalUsers, todayMessages, weekMessages] = await Promise.all([
      NoxtmChatMessage.countDocuments(filter),
      NoxtmChatMessage.distinct('userId', filter).then(ids => ids.length),
      NoxtmChatMessage.countDocuments({ ...filter, createdAt: { $gte: today } }),
      NoxtmChatMessage.countDocuments({ ...filter, createdAt: { $gte: thisWeek } })
    ]);

    // If admin's company filter returns 0, try without filter
    if (totalMessages === 0 && companyId) {
      const [allMessages, allUsers, allToday, allWeek] = await Promise.all([
        NoxtmChatMessage.countDocuments({}),
        NoxtmChatMessage.distinct('userId', {}).then(ids => ids.length),
        NoxtmChatMessage.countDocuments({ createdAt: { $gte: today } }),
        NoxtmChatMessage.countDocuments({ createdAt: { $gte: thisWeek } })
      ]);
      return res.json({
        success: true,
        stats: { totalMessages: allMessages, totalUsers: allUsers, todayMessages: allToday, weekMessages: allWeek }
      });
    }

    res.json({
      success: true,
      stats: { totalMessages, totalUsers, todayMessages, weekMessages }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/noxtm-chat/admin/keypoints/:userId
 * Get all keypoints for a specific user (admin only)
 */
router.get('/admin/keypoints/:userId', authenticateToken, async (req, res) => {
  try {
    const UserModel = require('mongoose').model('User');
    const user = await UserModel.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const UserKeypoint = require('../models/UserKeypoint');
    const keypoints = await UserKeypoint.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, keypoints });
  } catch (error) {
    console.error('Admin keypoints error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch keypoints' });
  }
});

/**
 * DELETE /api/noxtm-chat/admin/keypoints/:keypointId
 * Delete a specific keypoint (admin only)
 */
router.delete('/admin/keypoints/:keypointId', authenticateToken, async (req, res) => {
  try {
    const UserModel = require('mongoose').model('User');
    const user = await UserModel.findById(req.user.userId);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const UserKeypoint = require('../models/UserKeypoint');
    await UserKeypoint.findByIdAndDelete(req.params.keypointId);

    res.json({ success: true, message: 'Keypoint deleted' });
  } catch (error) {
    console.error('Admin delete keypoint error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete keypoint' });
  }
});

module.exports = router;
