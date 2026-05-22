const express = require('express');
const router = express.Router();
const CoreData = require('../models/CoreData');

// No auth required — open access

// GET all entries (summary)
router.get('/', async (req, res) => {
  try {
    const entries = await CoreData.find()
      .select('-data')  // exclude large data payload from list
      .sort({ createdAt: -1 });
    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single entry with full data
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

// POST — save any data
router.post('/', async (req, res) => {
  try {
    const { source, dataType, label, data, meta } = req.body;
    if (!source || !dataType || data === undefined) {
      return res.status(400).json({ success: false, error: 'source, dataType, data required' });
    }
    const count = Array.isArray(data) ? data.length : 1;
    const entry = new CoreData({ source, dataType, label, data, meta, count });
    await entry.save();
    res.json({ success: true, entry: { _id: entry._id, source, dataType, label, count, createdAt: entry.createdAt } });
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
