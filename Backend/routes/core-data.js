const express = require('express');
const router = express.Router();
const CoreData = require('../models/CoreData');

// No auth required — open access

// GET all entries (summary)
router.get('/', async (req, res) => {
  try {
    const entries = await CoreData.find()
      .select('-data')
      .sort({ createdAt: -1 });
    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single entry with full data — supports pagination
router.get('/:id', async (req, res) => {
  try {
    const entry = await CoreData.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET by type
router.get('/type/:dataType', async (req, res) => {
  try {
    const entries = await CoreData.find({ dataType: req.params.dataType }).sort({ createdAt: -1 });
    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST — save or MERGE data into existing entry for same source+dataType
router.post('/', async (req, res) => {
  try {
    const { source, dataType, label, data, meta } = req.body;
    if (!source || !dataType || data === undefined) {
      return res.status(400).json({ success: false, error: 'source, dataType, data required' });
    }

    const incoming = Array.isArray(data) ? data : [data];

    // Find existing entry for same source + dataType (most recent)
    const existing = await CoreData.findOne({ source, dataType }).sort({ createdAt: -1 });

    if (existing && Array.isArray(existing.data)) {
      // ── Merge logic ──
      // Build lookup maps for fast matching (by email and by linkedinId)
      const byEmail = {};
      const byLinkedinId = {};
      existing.data.forEach((item, idx) => {
        if (item.email)      byEmail[item.email.toLowerCase()]           = idx;
        if (item.linkedinId) byLinkedinId[item.linkedinId.toLowerCase()] = idx;
        if (item.id)         byLinkedinId[String(item.id)]               = idx;
      });

      let added = 0;
      let merged = 0;

      incoming.forEach(lead => {
        const emailKey    = lead.email      ? lead.email.toLowerCase()      : null;
        const linkedinKey = lead.linkedinId ? lead.linkedinId.toLowerCase() : lead.id ? String(lead.id) : null;

        const existingIdx = (emailKey && byEmail[emailKey] !== undefined)
          ? byEmail[emailKey]
          : (linkedinKey && byLinkedinId[linkedinKey] !== undefined)
            ? byLinkedinId[linkedinKey]
            : -1;

        if (existingIdx >= 0) {
          // Merge: fill in any missing fields only
          const target = existing.data[existingIdx];
          Object.keys(lead).forEach(key => {
            if (
              target[key] == null ||
              target[key] === '' ||
              target[key] === undefined
            ) {
              target[key] = lead[key];
            }
          });
          existing.data[existingIdx] = target;
          merged++;
        } else {
          // New lead — add
          existing.data.push(lead);
          // Update lookup maps
          if (emailKey)    byEmail[emailKey]       = existing.data.length - 1;
          if (linkedinKey) byLinkedinId[linkedinKey] = existing.data.length - 1;
          added++;
        }
      });

      existing.count = existing.data.length;
      if (label) existing.label = label;
      existing.markModified('data');
      await existing.save();

      return res.json({
        success: true,
        merged: true,
        added,
        mergedCount: merged,
        total: existing.count,
        entry: { _id: existing._id, source, dataType, label: existing.label, count: existing.count, createdAt: existing.createdAt },
      });
    }

    // No existing entry — create new
    const entry = new CoreData({ source, dataType, label, data: incoming, meta, count: incoming.length });
    await entry.save();
    res.json({
      success: true,
      merged: false,
      added: incoming.length,
      total: incoming.length,
      entry: { _id: entry._id, source, dataType, label, count: incoming.length, createdAt: entry.createdAt },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH — remove specific records by index from entry's data array
router.patch('/:id/remove-records', async (req, res) => {
  try {
    const { indices } = req.body; // array of numeric indices to remove
    if (!Array.isArray(indices) || indices.length === 0) {
      return res.status(400).json({ success: false, error: 'indices array required' });
    }
    const entry = await CoreData.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, error: 'Not found' });
    const toRemove = new Set(indices.map(Number));
    entry.data = entry.data.filter((_, i) => !toRemove.has(i));
    entry.count = entry.data.length;
    entry.markModified('data');
    await entry.save();
    res.json({ success: true, removed: indices.length, remaining: entry.count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await CoreData.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stats
router.get('/stats/summary', async (req, res) => {
  try {
    const total = await CoreData.countDocuments();
    const byType = await CoreData.aggregate([
      { $group: { _id: '$dataType', count: { $sum: 1 }, totalRecords: { $sum: '$count' } } }
    ]);
    const bySource = await CoreData.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, total, byType, bySource });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
