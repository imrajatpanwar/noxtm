const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const LinkedInAISettings = require('../models/LinkedInAISettings');
const LinkedInAIComment = require('../models/LinkedInAIComment');
const Company = require('../models/Company');

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
        const { postText, postAuthor, platform } = req.body;

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

        // Get company AI settings
        const companyId = req.user.companyId;
        const company = companyId ? await Company.findById(companyId).select('aiSettings').lean() : null;
        const ai = company?.aiSettings || {};
        const aiProvider = ai.provider || 'anthropic';
        const aiKey = ai.apiKey || process.env.ANTHROPIC_API_KEY;
        const aiModel = ai.model || 'claude-sonnet-4-20250514';

        if (!aiKey) {
            return res.status(500).json({
                success: false,
                message: 'AI API key not configured. Go to Workspace Settings → General to set up your AI provider.'
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

        const isX = platform === 'x';
        const platformLabel = isX ? 'Twitter/X' : 'LinkedIn';
        const maxLen = isX ? 280 : settings.commentMaxLength;
        const maxLengthRule = isX
            ? '- HARD LIMIT: Your reply MUST be 280 characters or fewer. This is a strict Twitter/X character limit. Count carefully.'
            : `- HARD LIMIT: Your comment MUST be ${maxLen} characters or fewer. Count every character including spaces and punctuation. This is a strict limit — do NOT exceed it under any circumstances.`;

        // Scale max_tokens to match the character limit (~1 token ≈ 4 chars, with some buffer)
        const scaledMaxTokens = isX ? 100 : Math.min(300, Math.max(30, Math.ceil(maxLen / 2.5)));

        let systemPrompt = `You are a ${platformLabel} engagement assistant. Generate a single ${isX ? 'reply' : 'comment'} for a ${platformLabel} post.

Rules:
- Tone: ${toneDesc}
${maxLengthRule}
- Language: ${settings.commentLanguage}
- The ${isX ? 'reply' : 'comment'} should be relevant to the post content
- Do NOT use hashtags
- Do NOT start with "Great post!" or similar generic openers
- Sound natural and human — not like a bot
- Add genuine value or perspective to the conversation
- Do NOT use quotation marks around the ${isX ? 'reply' : 'comment'}
- Keep it concise. Shorter is better. Stay well within the ${maxLen}-character limit.`;

        if (settings.customInstructions) {
            systemPrompt += `\n- Additional user instructions: ${settings.customInstructions}`;
        }

        const userPrompt = postAuthor
            ? `${platformLabel} post by ${postAuthor}:\n\n"${postText.substring(0, 1500)}"\n\nGenerate a ${isX ? 'reply' : 'comment'} in ${maxLen} characters or fewer:`
            : `${platformLabel} post:\n\n"${postText.substring(0, 1500)}"\n\nGenerate a ${isX ? 'reply' : 'comment'} in ${maxLen} characters or fewer:`;

        let generatedComment;

        if (aiProvider === 'anthropic') {
            // Anthropic API
            const client = new Anthropic({ apiKey: aiKey });
            const message = await client.messages.create({
                model: aiModel,
                max_tokens: scaledMaxTokens,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            });
            generatedComment = message.content[0].text.trim();
        } else {
            // OpenAI-compatible API (OpenRouter, OpenAI, Groq, Together, Custom)
            const providerUrls = {
                openrouter: 'https://openrouter.ai/api/v1/chat/completions',
                openai: 'https://api.openai.com/v1/chat/completions',
                groq: 'https://api.groq.com/openai/v1/chat/completions',
                together: 'https://api.together.xyz/v1/chat/completions',
                custom: ai.customEndpoint
            };
            const url = providerUrls[aiProvider];
            if (!url) throw new Error('Invalid AI provider: ' + aiProvider);

            const headers = { 'Authorization': `Bearer ${aiKey}`, 'Content-Type': 'application/json' };
            if (aiProvider === 'openrouter') {
                headers['HTTP-Referer'] = 'https://noxtm.com';
                headers['X-Title'] = 'NOXTM AI Commenter';
            }

            const response = await axios.post(url, {
                model: aiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: scaledMaxTokens,
                temperature: 0.7
            }, { headers, timeout: 15000 });

            generatedComment = (response.data?.choices?.[0]?.message?.content || '').trim();
        }

        if (!generatedComment) {
            return res.status(500).json({ success: false, message: 'No response from AI' });
        }

        // Hard truncate if AI still exceeded the limit
        if (generatedComment.length > maxLen) {
            // Try to cut at last sentence boundary within limit
            const truncated = generatedComment.substring(0, maxLen);
            const lastPeriod = truncated.lastIndexOf('.');
            const lastExcl = truncated.lastIndexOf('!');
            const lastQ = truncated.lastIndexOf('?');
            const lastSentence = Math.max(lastPeriod, lastExcl, lastQ);
            generatedComment = lastSentence > maxLen * 0.4
                ? truncated.substring(0, lastSentence + 1)
                : truncated;
        }

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
// POST /generate-tweet — Generate AI tweet on a given topic
// ============================================
router.post('/generate-tweet', auth, async (req, res) => {
    try {
        const { topic, context } = req.body;

        if (!topic || topic.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Topic is required' });
        }

        const settings = await getUserSettings(req.user.userId);

        if (!settings.enabled) {
            return res.status(403).json({ success: false, message: 'AI commenting is disabled in your settings' });
        }

        if (settings.commentsToday >= settings.dailyLimit) {
            return res.status(429).json({
                success: false,
                message: `Daily limit reached (${settings.dailyLimit}). Resets tomorrow.`
            });
        }

        const companyId = req.user.companyId;
        const company = companyId ? await Company.findById(companyId).select('aiSettings').lean() : null;
        const ai = company?.aiSettings || {};
        const aiProvider = ai.provider || 'anthropic';
        const aiKey = ai.apiKey || process.env.ANTHROPIC_API_KEY;
        const aiModel = ai.model || 'claude-sonnet-4-20250514';

        if (!aiKey) {
            return res.status(500).json({
                success: false,
                message: 'AI API key not configured. Go to Workspace Settings → General to set up your AI provider.'
            });
        }

        const toneDescriptions = {
            professional: 'professional and insightful',
            casual: 'friendly and conversational',
            thoughtful: 'reflective and nuanced',
            witty: 'clever and engaging with a touch of humor',
            supportive: 'encouraging and positive'
        };
        const toneDesc = toneDescriptions[settings.commentTone] || toneDescriptions.professional;

        const systemPrompt = `You are a Twitter/X engagement assistant. Generate a single tweet on the given topic.

Rules:
- Tone: ${toneDesc}
- HARD LIMIT: Your tweet MUST be 280 characters or fewer. Count every character including spaces and punctuation. Do NOT exceed this.
- Language: ${settings.commentLanguage || 'English'}
- The tweet must be relevant, engaging, and shareable
- Do NOT put quotes around the tweet
- Sound natural and human — not like a bot
- You may use 1-2 relevant hashtags if appropriate
- Keep it concise and impactful${settings.customInstructions ? `\n- Additional instructions: ${settings.customInstructions}` : ''}`;

        const userPrompt = context
            ? `Topic: ${topic}\n\nAdditional context: ${context}\n\nGenerate a tweet in 280 characters or fewer:`
            : `Topic: ${topic}\n\nGenerate a tweet in 280 characters or fewer:`;

        let generatedTweet;

        if (aiProvider === 'anthropic') {
            const client = new Anthropic({ apiKey: aiKey });
            const message = await client.messages.create({
                model: aiModel,
                max_tokens: 200,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }]
            });
            generatedTweet = message.content[0].text.trim();
        } else {
            const providerUrls = {
                openrouter: 'https://openrouter.ai/api/v1/chat/completions',
                openai: 'https://api.openai.com/v1/chat/completions',
                groq: 'https://api.groq.com/openai/v1/chat/completions',
                together: 'https://api.together.xyz/v1/chat/completions',
                custom: ai.customEndpoint
            };
            const url = providerUrls[aiProvider];
            if (!url) throw new Error('Invalid AI provider: ' + aiProvider);

            const headers = { 'Authorization': `Bearer ${aiKey}`, 'Content-Type': 'application/json' };
            if (aiProvider === 'openrouter') {
                headers['HTTP-Referer'] = 'https://noxtm.com';
                headers['X-Title'] = 'NOXTM AI Social Commenter';
            }

            const response = await axios.post(url, {
                model: aiModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 200,
                temperature: 0.7
            }, { headers, timeout: 15000 });

            generatedTweet = (response.data?.choices?.[0]?.message?.content || '').trim();
        }

        if (!generatedTweet) {
            return res.status(500).json({ success: false, message: 'No response from AI' });
        }

        // Hard truncate if AI exceeded 280 chars
        if (generatedTweet.length > 280) {
            const truncated = generatedTweet.substring(0, 280);
            const lastSpace = truncated.lastIndexOf(' ');
            generatedTweet = lastSpace > 200 ? truncated.substring(0, lastSpace) : truncated;
        }

        // Save to history
        await LinkedInAIComment.create({
            userId: req.user.userId,
            postAuthor: 'Self (Tweet)',
            postTextSnippet: `Topic: ${topic}`.substring(0, 500),
            generatedComment: generatedTweet,
            tone: settings.commentTone,
            wasPosted: false
        });

        settings.commentsToday += 1;
        await settings.save();

        res.json({
            success: true,
            tweet: generatedTweet,
            remaining: settings.dailyLimit - settings.commentsToday
        });

    } catch (error) {
        console.error('Error generating AI tweet:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate tweet'
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

        // Enforce min/max for commentMaxLength
        if (updates.commentMaxLength !== undefined) {
            updates.commentMaxLength = Math.max(50, Math.min(500, parseInt(updates.commentMaxLength) || 200));
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
