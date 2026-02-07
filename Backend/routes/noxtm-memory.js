const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { CoreMemory, ContextMemory, LearnedMemory } = require('../models/NoxtmMemory');

// ===== CORE MEMORY =====

/**
 * GET /api/noxtm-memory/core
 * Get or create current user's core memory
 */
router.get('/core', authenticateToken, async (req, res) => {
  try {
    let core = await CoreMemory.findOne({ userId: req.user.userId }).lean();
    if (!core) {
      core = { name: '', role: '', communicationStyle: '', expertiseAreas: '', preferences: '', commonPhrases: '', workContext: '', goals: '', additionalNotes: '' };
    }
    res.json({ success: true, memory: core });
  } catch (err) {
    console.error('Get core memory error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch core memory' });
  }
});

/**
 * PUT /api/noxtm-memory/core
 * Update current user's core memory
 */
router.put('/core', authenticateToken, async (req, res) => {
  try {
    const fields = ['name', 'role', 'communicationStyle', 'expertiseAreas', 'preferences', 'commonPhrases', 'workContext', 'goals', 'additionalNotes'];
    const update = {};
    for (const f of fields) {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    }

    const core = await CoreMemory.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { ...update, companyId: req.user.companyId } },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, memory: core });
  } catch (err) {
    console.error('Update core memory error:', err);
    res.status(500).json({ success: false, message: 'Failed to update core memory' });
  }
});

// ===== CONTEXT MEMORIES =====

/**
 * GET /api/noxtm-memory/contexts
 * Get all context memories for current user
 */
router.get('/contexts', authenticateToken, async (req, res) => {
  try {
    const contexts = await ContextMemory.find({ userId: req.user.userId }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, contexts });
  } catch (err) {
    console.error('Get contexts error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch context memories' });
  }
});

/**
 * POST /api/noxtm-memory/contexts
 * Create a new context memory
 */
router.post('/contexts', authenticateToken, async (req, res) => {
  try {
    const { label, background, preferredStyle, commonTopics, tone, notes } = req.body;
    if (!label || !label.trim()) {
      return res.status(400).json({ success: false, message: 'Label is required' });
    }

    const existing = await ContextMemory.countDocuments({ userId: req.user.userId });
    if (existing >= 10) {
      return res.status(400).json({ success: false, message: 'Maximum 10 context memories allowed' });
    }

    const ctx = await ContextMemory.create({
      userId: req.user.userId,
      companyId: req.user.companyId,
      label: label.trim(),
      background: background || '',
      preferredStyle: preferredStyle || '',
      commonTopics: commonTopics || '',
      tone: tone || '',
      notes: notes || ''
    });

    res.json({ success: true, context: ctx });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'A context with that label already exists' });
    }
    console.error('Create context error:', err);
    res.status(500).json({ success: false, message: 'Failed to create context memory' });
  }
});

/**
 * PUT /api/noxtm-memory/contexts/:id
 * Update a context memory
 */
router.put('/contexts/:id', authenticateToken, async (req, res) => {
  try {
    const { label, background, preferredStyle, commonTopics, tone, notes } = req.body;
    const ctx = await ContextMemory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { label, background, preferredStyle, commonTopics, tone, notes } },
      { new: true, runValidators: true }
    );
    if (!ctx) return res.status(404).json({ success: false, message: 'Context not found' });
    res.json({ success: true, context: ctx });
  } catch (err) {
    console.error('Update context error:', err);
    res.status(500).json({ success: false, message: 'Failed to update context memory' });
  }
});

/**
 * DELETE /api/noxtm-memory/contexts/:id
 * Delete a context memory
 */
router.delete('/contexts/:id', authenticateToken, async (req, res) => {
  try {
    const ctx = await ContextMemory.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!ctx) return res.status(404).json({ success: false, message: 'Context not found' });
    res.json({ success: true, message: 'Context deleted' });
  } catch (err) {
    console.error('Delete context error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete context memory' });
  }
});

// ===== LEARNED MEMORIES =====

/**
 * GET /api/noxtm-memory/learned
 * Get learned memories for current user
 */
router.get('/learned', authenticateToken, async (req, res) => {
  try {
    const memories = await LearnedMemory.find({ userId: req.user.userId, active: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, memories });
  } catch (err) {
    console.error('Get learned error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch learned memories' });
  }
});

/**
 * POST /api/noxtm-memory/learned
 * Manually add a learned memory
 */
router.post('/learned', authenticateToken, async (req, res) => {
  try {
    const { content, category } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const mem = await LearnedMemory.create({
      userId: req.user.userId,
      companyId: req.user.companyId,
      content: content.trim(),
      category: category || 'other',
      source: 'manual'
    });

    res.json({ success: true, memory: mem });
  } catch (err) {
    console.error('Create learned error:', err);
    res.status(500).json({ success: false, message: 'Failed to add memory' });
  }
});

/**
 * DELETE /api/noxtm-memory/learned/:id
 * Deactivate a learned memory
 */
router.delete('/learned/:id', authenticateToken, async (req, res) => {
  try {
    await LearnedMemory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { active: false } }
    );
    res.json({ success: true, message: 'Memory removed' });
  } catch (err) {
    console.error('Delete learned error:', err);
    res.status(500).json({ success: false, message: 'Failed to remove memory' });
  }
});

// ===== ADMIN: View any user's memory (admin only) =====

/**
 * GET /api/noxtm-memory/admin/user/:userId
 * Get all memory data for a specific user (admin only)
 */
router.get('/admin/user/:userId', authenticateToken, async (req, res) => {
  try {
    const User = require('mongoose').model('User');
    const admin = await User.findById(req.user.userId);
    if (!admin || admin.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const targetUserId = req.params.userId;
    const [core, contexts, learned] = await Promise.all([
      CoreMemory.findOne({ userId: targetUserId }).lean(),
      ContextMemory.find({ userId: targetUserId }).lean(),
      LearnedMemory.find({ userId: targetUserId, active: true }).sort({ createdAt: -1 }).limit(50).lean()
    ]);

    res.json({ success: true, core, contexts, learned });
  } catch (err) {
    console.error('Admin user memory error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user memory' });
  }
});

module.exports = router;
