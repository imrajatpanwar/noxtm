const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  aggregateUserContext,
  buildSystemPrompt,
  callOpenRouter,
  sanitizeUserMessage
} = require('../utils/aiHelpers');

/**
 * POST /api/ai/chat
 * Send a message to the AI chatbot
 * @body {String} message - User's message
 * @body {Array} conversationHistory - Previous messages (optional)
 * @returns {Object} AI response
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    // Validate message
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a string'
      });
    }

    // Sanitize user message
    const sanitizedMessage = sanitizeUserMessage(message);

    if (!sanitizedMessage) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message content'
      });
    }

    // Check message length
    if (sanitizedMessage.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message too long (max 1000 characters)'
      });
    }

    // Aggregate user context
    const context = await aggregateUserContext(
      req.user.userId,
      req.user.companyId
    );

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(context);

    // Prepare messages for AI (system + last 10 history + new user message)
    const recentHistory = conversationHistory.slice(-10);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: sanitizedMessage }
    ];

    // Call OpenRouter API
    const aiResponse = await callOpenRouter(
      messages,
      'nvidia/nemotron-3-nano-30b-a3b:free'
    );

    // Return success response
    res.json({
      success: true,
      reply: aiResponse,
      contextUsed: true
    });

  } catch (error) {
    console.error('AI chat error:', error);

    // Handle specific error cases
    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded. Please try again in a few moments.'
      });
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(500).json({
        success: false,
        message: 'AI service configuration error. Please contact support.'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      message: 'Failed to get AI response. Please try again.'
    });
  }
});

/**
 * GET /api/ai/context
 * Get user context (for debugging purposes)
 * @returns {Object} User context data
 */
router.get('/context', authenticateToken, async (req, res) => {
  try {
    const context = await aggregateUserContext(
      req.user.userId,
      req.user.companyId
    );

    res.json({
      success: true,
      context
    });
  } catch (error) {
    console.error('Context fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch context'
    });
  }
});

module.exports = router;
