const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const CompanyPolicy = require('../models/CompanyPolicy');
const User = require('../models/User');

router.use(authenticateToken);

// ============================================
// GET /api/company-policies — List all policies for company
// ============================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId role').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const { category, status, search } = req.query;
    const filter = { companyId: user.companyId };

    if (category && category !== 'all') filter.category = category;
    // Non-admin: only see published
    if (user.role === 'Admin' || user.role === 'admin') {
      if (status && status !== 'all') filter.status = status;
    } else {
      filter.status = 'published';
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const policies = await CompanyPolicy.find(filter)
      .populate('createdBy', 'fullName email profileImage')
      .populate('lastUpdatedBy', 'fullName email profileImage')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    // Attach ack status for current user
    const mapped = policies.map(p => ({
      ...p,
      isAcknowledged: p.acknowledgments?.some(a => String(a.userId) === String(userId)),
      acknowledgmentCount: p.acknowledgments?.length || 0
    }));

    res.json({ success: true, policies: mapped });
  } catch (err) {
    console.error('Error fetching policies:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/company-policies/stats — Aggregate stats
// ============================================
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const total = await CompanyPolicy.countDocuments({ companyId: user.companyId });
    const published = await CompanyPolicy.countDocuments({ companyId: user.companyId, status: 'published' });
    const drafts = await CompanyPolicy.countDocuments({ companyId: user.companyId, status: 'draft' });

    const needingReview = await CompanyPolicy.countDocuments({
      companyId: user.companyId,
      status: 'published',
      reviewDate: { $lte: new Date() }
    });

    // Policies requiring your ack that you haven't acked
    const requiresAckPolicies = await CompanyPolicy.find({
      companyId: user.companyId,
      status: 'published',
      requiresAcknowledgment: true
    }).select('acknowledgments').lean();

    const pendingAck = requiresAckPolicies.filter(
      p => !p.acknowledgments?.some(a => String(a.userId) === String(userId))
    ).length;

    // Category breakdown
    const categories = await CompanyPolicy.aggregate([
      { $match: { companyId: user.companyId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, stats: { total, published, drafts, needingReview, pendingAck, categories } });
  } catch (err) {
    console.error('Error fetching policy stats:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/company-policies/:id — Get single policy
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const policy = await CompanyPolicy.findOne({ _id: req.params.id, companyId: user.companyId })
      .populate('createdBy', 'fullName email profileImage')
      .populate('lastUpdatedBy', 'fullName email profileImage')
      .populate('acknowledgments.userId', 'fullName email profileImage')
      .lean();

    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    res.json({
      success: true,
      policy: {
        ...policy,
        isAcknowledged: policy.acknowledgments?.some(a => String(a.userId?._id || a.userId) === String(userId))
      }
    });
  } catch (err) {
    console.error('Error fetching policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/company-policies — Create policy
// ============================================
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const { title, description, category, content, status, version, effectiveDate, reviewDate, priority, tags, requiresAcknowledgment } = req.body;

    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    const policy = new CompanyPolicy({
      companyId: user.companyId,
      title: title.trim(),
      description: description?.trim() || '',
      category: category || 'general',
      content: content || '',
      status: status || 'draft',
      version: version || '1.0',
      effectiveDate: effectiveDate || null,
      reviewDate: reviewDate || null,
      priority: priority || 'medium',
      tags: tags || [],
      requiresAcknowledgment: requiresAcknowledgment || false,
      createdBy: userId,
      lastUpdatedBy: userId
    });

    await policy.save();

    const populated = await CompanyPolicy.findById(policy._id)
      .populate('createdBy', 'fullName email profileImage')
      .lean();

    res.status(201).json({ success: true, policy: populated });
  } catch (err) {
    console.error('Error creating policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PUT /api/company-policies/:id — Update policy
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const policy = await CompanyPolicy.findOne({ _id: req.params.id, companyId: user.companyId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    const allowed = ['title', 'description', 'category', 'content', 'status', 'version', 'effectiveDate', 'reviewDate', 'priority', 'tags', 'requiresAcknowledgment', 'sortOrder'];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) policy[key] = req.body[key];
    });
    policy.lastUpdatedBy = userId;

    await policy.save();

    const populated = await CompanyPolicy.findById(policy._id)
      .populate('createdBy', 'fullName email profileImage')
      .populate('lastUpdatedBy', 'fullName email profileImage')
      .lean();

    res.json({ success: true, policy: populated });
  } catch (err) {
    console.error('Error updating policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// DELETE /api/company-policies/:id — Delete policy
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const policy = await CompanyPolicy.findOneAndDelete({ _id: req.params.id, companyId: user.companyId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    res.json({ success: true, message: 'Policy deleted' });
  } catch (err) {
    console.error('Error deleting policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/company-policies/:id/acknowledge — Acknowledge a policy
// ============================================
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const policy = await CompanyPolicy.findOne({ _id: req.params.id, companyId: user.companyId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    const alreadyAcked = policy.acknowledgments.some(a => String(a.userId) === String(userId));
    if (alreadyAcked) return res.json({ success: true, message: 'Already acknowledged' });

    policy.acknowledgments.push({ userId, acknowledgedAt: new Date() });
    await policy.save();

    res.json({ success: true, message: 'Policy acknowledged' });
  } catch (err) {
    console.error('Error acknowledging policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
