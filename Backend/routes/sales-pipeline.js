const express = require('express');
const router = express.Router();
const SalesPipeline = require('../models/SalesPipeline');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// All routes require auth
router.use(authenticateToken);

// GET all leads in pipeline (with filters)
router.get('/', async (req, res) => {
  try {
    const { status, assignedTo, search, companyId } = req.query;
    const query = { companyId: req.user.companyId };

    if (status && status !== 'all') query.status = status;
    if (assignedTo) query['assignedTo.userId'] = assignedTo;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
      ];
    }

    const leads = await SalesPipeline.find(query).sort({ createdAt: -1 });
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST — share leads into pipeline (bulk from Core Data)
router.post('/share', async (req, res) => {
  try {
    const { leads, sourceEntryId, sourceEntryLabel } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, error: 'leads array required' });
    }

    const user = await User.findById(req.user.userId).select('fullName profileImage emailAvatar email');
    const sharedBy = {
      userId: user._id,
      name:   user.fullName,
      avatar: user.profileImage || user.emailAvatar || null,
      email:  user.email,
    };

    const docs = leads.map(lead => ({
      name:     lead.fullName || (lead.firstName ? `${lead.firstName} ${lead.lastName || ''}`.trim() : lead.name) || '',
      email:    lead.email || '',
      phone:    lead.phone || '',
      company:  lead.currentCompany || lead.company || '',
      location: lead.location || '',
      headline: lead.headline || '',
      fullData: lead,
      sourceEntryId,
      sourceEntryLabel,
      sharedBy,
      companyId: req.user.companyId,
    }));

    const inserted = await SalesPipeline.insertMany(docs, { ordered: false });
    res.json({ success: true, count: inserted.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT — update status, remark, followUpAt, assignedTo
router.put('/:id', async (req, res) => {
  try {
    const { status, remark, followUpAt, assignedToId } = req.body;
    const update = {};
    if (status)     update.status = status;
    if (remark !== undefined) update.remark = remark;
    if (followUpAt !== undefined) update.followUpAt = followUpAt || null;

    if (assignedToId) {
      const assignee = await User.findById(assignedToId).select('fullName profileImage emailAvatar email');
      if (assignee) {
        update.assignedTo = {
          userId: assignee._id,
          name:   assignee.fullName,
          avatar: assignee.profileImage || assignee.emailAvatar || null,
          email:  assignee.email,
        };
      }
    }

    const doc = await SalesPipeline.findOneAndUpdate(
      { _id: req.params.id, companyId: req.user.companyId },
      { $set: update },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, lead: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await SalesPipeline.findOneAndDelete({ _id: req.params.id, companyId: req.user.companyId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET team members for assign dropdown
router.get('/team/members', async (req, res) => {
  try {
    const users = await User.find({ companyId: req.user.companyId }).select('fullName profileImage emailAvatar email role');
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET stats
router.get('/stats/summary', async (req, res) => {
  try {
    const agg = await SalesPipeline.aggregate([
      { $match: { companyId: req.user.companyId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const total = await SalesPipeline.countDocuments({ companyId: req.user.companyId });
    res.json({ success: true, byStatus: agg, total });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
