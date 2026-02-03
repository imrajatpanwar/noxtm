const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('companyId', 'name');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        company: user.companyId,
        timezone: user.timezone || 'UTC',
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all company members (for task assignment)
router.get('/company-members', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId).select('companyId');

    if (!currentUser || !currentUser.companyId) {
      return res.status(400).json({ success: false, message: 'User company not found' });
    }

    const members = await User.find({ companyId: currentUser.companyId })
      .select('_id fullName email role profilePicture')
      .sort({ fullName: 1 });

    res.json({
      success: true,
      members: members.map(member => ({
        _id: member._id,
        id: member._id,
        name: member.fullName,
        email: member.email,
        role: member.role,
        avatar: member.profilePicture
      }))
    });
  } catch (error) {
    console.error('Error fetching company members:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update current user info
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { name, timezone } = req.body;

    const updateData = {};
    if (name) updateData.fullName = name;
    if (timezone) updateData.timezone = timezone;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Account updated successfully',
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        timezone: user.timezone
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('mailPreferences');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const prefs = user.mailPreferences || {};

    res.json({
      success: true,
      preferences: {
        defaultTracking: prefs.defaultTracking ?? true,
        emailNotifications: prefs.emailNotifications ?? true,
        weeklyReports: prefs.weeklyReports ?? false,
        lowCreditAlert: prefs.lowCreditAlert ?? true,
        defaultFromName: prefs.defaultFromName || '',
        defaultReplyTo: prefs.defaultReplyTo || '',
        emailSignature: prefs.emailSignature || ''
      }
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const {
      defaultTracking,
      emailNotifications,
      weeklyReports,
      lowCreditAlert,
      defaultFromName,
      defaultReplyTo,
      emailSignature
    } = req.body;

    const updateData = {
      'mailPreferences.defaultTracking': defaultTracking,
      'mailPreferences.emailNotifications': emailNotifications,
      'mailPreferences.weeklyReports': weeklyReports,
      'mailPreferences.lowCreditAlert': lowCreditAlert,
      'mailPreferences.defaultFromName': defaultFromName || '',
      'mailPreferences.defaultReplyTo': defaultReplyTo || '',
      'mailPreferences.emailSignature': emailSignature || ''
    };

    await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateData }
    );

    res.json({
      success: true,
      message: 'Preferences saved successfully'
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
