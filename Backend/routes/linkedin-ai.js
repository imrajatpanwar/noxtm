const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { authenticateToken } = require('../middleware/auth');
const LinkedInAISettings = require('../models/LinkedInAISettings');
const LinkedInAIComment = require('../models/LinkedInAIComment');

const auth = authenticateToken;

// Helper: get or create user settings
async function getUserSettings(userId) {
    let settings = await LinkedInAISettings.findOne({ userId });
    if (!settings) {
        settings = await LinkedInAISettings.create({ userId });
    }

    // Reset daily counter if it's a new day
    const today = new Date().toDateString();
    const lastReset = new Date(settings.lastResetDate).toDateString();
    if (today !== lastReset) {
        settings.commentsToday = 0;
        settings.lastResetDate = new Date();
        await settings.save();
    }

    return settings;
}

// ============================================
// POST /generate-comment — Generate AI comment for a LinkedIn post
// ============================================
router.post('/generate-comment', auth, async (req, res) => {
    try {
        const { postText, postAuthor } = req.body;

        if (!postText || postText.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Post text is required' });
        }

        // Get user settings
        const settings = await getUserSettings(req.user.userId);

        if (!settings.enabled) {
            return res.status(403).json({ success: false, message: 'AI commenting is disabled in your settings' });
        }

        // Check daily limit
        if (settings.commentsToday >= settings.dailyLimit) {
            return res.status(429).json({
                success: false,
                message: `Daily limit reached (${settings.dailyLimit} comments). Resets tomorrow.`
            });
        }

        // Get Anthropic API key from environment
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return res.status(500).json({
                success: false,
                message: 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to server environment.'
            });
        }

        // Build the prompt based on user settings
        const toneDescriptions = {
            professional: 'professional, insightful, and business-appropriate',
            casual: 'friendly, conversational, and approachable',
            thoughtful: 'reflective, nuanced, and adds meaningful perspective',
            witty: 'clever, engaging with a touch of humor while staying respectful',
            supportive: 'encouraging, positive, and empathetic'
        };

        const toneDesc = toneDescriptions[settings.commentTone] || toneDescriptions.professional;

        let systemPrompt = `You are a LinkedIn engagement assistant. Generate a single comment for a LinkedIn post.

Rules:
- Tone: ${toneDesc}
- Maximum length: ${settings.commentMaxLength} characters
- Language: ${settings.commentLanguage}
- The comment should be relevant to the post content
- Do NOT use hashtags
- Do NOT start with "Great post!" or similar generic openers
- Sound natural and human — not like a bot
- Add genuine value or perspective to the conversation
- Do NOT use quotation marks around the comment`;

        if (settings.customInstructions) {
            systemPrompt += `\n- Additional user instructions: ${settings.customInstructions}`;
        }

        const userPrompt = postAuthor
            ? `LinkedIn post by ${postAuthor}:\n\n"${postText.substring(0, 1500)}"\n\nGenerate a comment:`
            : `LinkedIn post:\n\n"${postText.substring(0, 1500)}"\n\nGenerate a comment:`;

        // Call Anthropic API
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 300,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }]
        });

        const generatedComment = message.content[0].text.trim();

        // Save to history
        await LinkedInAIComment.create({
            userId: req.user.userId,
            postAuthor: postAuthor || 'Unknown',
            postTextSnippet: postText.substring(0, 500),
            generatedComment,
            tone: settings.commentTone,
            wasPosted: false
        });

        // Increment daily counter
        settings.commentsToday += 1;
        await settings.save();

        res.json({
            success: true,
            comment: generatedComment,
            remaining: settings.dailyLimit - settings.commentsToday
        });

    } catch (error) {
        console.error('Error generating AI comment:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate comment'
        });
    }
});

// ============================================
// POST /mark-posted — Mark a comment as posted
// ============================================
router.post('/mark-posted', auth, async (req, res) => {
    try {
        const { commentId } = req.body;
        if (commentId) {
            await LinkedInAIComment.findOneAndUpdate(
                { _id: commentId, userId: req.user.userId },
                { wasPosted: true }
            );
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// GET /settings — Get user's AI commenter settings
// ============================================
router.get('/settings', auth, async (req, res) => {
    try {
        const settings = await getUserSettings(req.user.userId);
        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// PUT /settings — Update user's AI commenter settings
// ============================================
router.put('/settings', auth, async (req, res) => {
    try {
        const allowedFields = [
            'enabled', 'commentTone', 'commentMaxLength',
            'commentLanguage', 'autoGenerate', 'customInstructions', 'dailyLimit'
        ];

        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const settings = await LinkedInAISettings.findOneAndUpdate(
            { userId: req.user.userId },
            { $set: updates },
            { new: true, upsert: true }
        );

        res.json({ success: true, settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// GET /history — Get comment generation history
// ============================================
router.get('/history', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [comments, total] = await Promise.all([
            LinkedInAIComment.find({ userId: req.user.userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            LinkedInAIComment.countDocuments({ userId: req.user.userId })
        ]);

        res.json({
            success: true,
            comments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// GET /stats — Get commenting stats
// ============================================
router.get('/stats', auth, async (req, res) => {
    try {
        const settings = await getUserSettings(req.user.userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [totalComments, weekComments, postedComments] = await Promise.all([
            LinkedInAIComment.countDocuments({ userId: req.user.userId }),
            LinkedInAIComment.countDocuments({ userId: req.user.userId, createdAt: { $gte: weekAgo } }),
            LinkedInAIComment.countDocuments({ userId: req.user.userId, wasPosted: true })
        ]);

        res.json({
            success: true,
            stats: {
                today: settings.commentsToday,
                dailyLimit: settings.dailyLimit,
                remaining: settings.dailyLimit - settings.commentsToday,
                thisWeek: weekComments,
                total: totalComments,
                posted: postedComments
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
