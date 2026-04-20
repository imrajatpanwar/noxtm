const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.use(authenticateToken);

const getUserId = (req) => req.user.userId || req.user._id;

// GET /api/notifications — fetch latest 50 for current user
router.get('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = getUserId(req);
    await Notification.findOneAndUpdate({ _id: req.params.id, userId }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/notifications/read-all — mark all as read
router.patch('/read-all', async (req, res) => {
  try {
    const userId = getUserId(req);
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/notifications/:id — remove one
router.delete('/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    await Notification.findOneAndDelete({ _id: req.params.id, userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/notifications — clear all
router.delete('/', async (req, res) => {
  try {
    const userId = getUserId(req);
    await Notification.deleteMany({ userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
