const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const HandbookSection = require('../models/HandbookSection');
const User = require('../models/User');

router.use(authenticateToken);

// ============================================
// GET /api/handbook — List all sections
// ============================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId role').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const filter = { companyId: user.companyId };
    // Non-admin only sees published
    if (user.role !== 'Admin' && user.role !== 'admin') {
      filter.status = 'published';
    }

    const sections = await HandbookSection.find(filter)
      .populate('createdBy', 'fullName email profileImage')
      .populate('lastUpdatedBy', 'fullName email profileImage')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, sections });
  } catch (err) {
    console.error('Error fetching handbook sections:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// GET /api/handbook/:id — Get one section
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const section = await HandbookSection.findOne({ _id: req.params.id, companyId: user.companyId })
      .populate('createdBy', 'fullName email profileImage')
      .populate('lastUpdatedBy', 'fullName email profileImage')
      .lean();

    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    res.json({ success: true, section });
  } catch (err) {
    console.error('Error fetching handbook section:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/handbook — Create section
// ============================================
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const { title, description, icon, pages, status } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    const count = await HandbookSection.countDocuments({ companyId: user.companyId });

    const section = new HandbookSection({
      companyId: user.companyId,
      title: title.trim(),
      description: description?.trim() || '',
      icon: icon || 'book',
      pages: pages || [],
      status: status || 'draft',
      sortOrder: count,
      createdBy: userId,
      lastUpdatedBy: userId
    });

    await section.save();

    const populated = await HandbookSection.findById(section._id)
      .populate('createdBy', 'fullName email profileImage')
      .lean();

    res.status(201).json({ success: true, section: populated });
  } catch (err) {
    console.error('Error creating handbook section:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PUT /api/handbook/:id — Update section
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const section = await HandbookSection.findOne({ _id: req.params.id, companyId: user.companyId });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    const allowed = ['title', 'description', 'icon', 'pages', 'status', 'sortOrder'];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) section[key] = req.body[key];
    });
    section.lastUpdatedBy = userId;

    await section.save();

    const populated = await HandbookSection.findById(section._id)
      .populate('createdBy', 'fullName email profileImage')
      .populate('lastUpdatedBy', 'fullName email profileImage')
      .lean();

    res.json({ success: true, section: populated });
  } catch (err) {
    console.error('Error updating handbook section:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// DELETE /api/handbook/:id — Delete section
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const section = await HandbookSection.findOneAndDelete({ _id: req.params.id, companyId: user.companyId });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    res.json({ success: true, message: 'Section deleted' });
  } catch (err) {
    console.error('Error deleting handbook section:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/handbook/:id/pages — Add page to section
// ============================================
router.post('/:id/pages', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const section = await HandbookSection.findOne({ _id: req.params.id, companyId: user.companyId });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    const { title, content } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Page title is required' });

    section.pages.push({
      title: title.trim(),
      content: content || '',
      sortOrder: section.pages.length
    });
    section.lastUpdatedBy = userId;

    await section.save();
    res.json({ success: true, section });
  } catch (err) {
    console.error('Error adding handbook page:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PUT /api/handbook/:sectionId/pages/:pageId — Update page
// ============================================
router.put('/:sectionId/pages/:pageId', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const section = await HandbookSection.findOne({ _id: req.params.sectionId, companyId: user.companyId });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    const page = section.pages.id(req.params.pageId);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found' });

    if (req.body.title !== undefined) page.title = req.body.title.trim();
    if (req.body.content !== undefined) page.content = req.body.content;
    if (req.body.sortOrder !== undefined) page.sortOrder = req.body.sortOrder;

    section.lastUpdatedBy = userId;
    await section.save();

    res.json({ success: true, section });
  } catch (err) {
    console.error('Error updating handbook page:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// DELETE /api/handbook/:sectionId/pages/:pageId — Delete page
// ============================================
router.delete('/:sectionId/pages/:pageId', async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const section = await HandbookSection.findOne({ _id: req.params.sectionId, companyId: user.companyId });
    if (!section) return res.status(404).json({ success: false, message: 'Section not found' });

    section.pages = section.pages.filter(p => String(p._id) !== req.params.pageId);
    section.lastUpdatedBy = userId;
    await section.save();

    res.json({ success: true, section });
  } catch (err) {
    console.error('Error deleting handbook page:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
