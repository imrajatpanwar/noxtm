const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Exhibitor = require('../models/Exhibitor');
const auth = require('../middleware/auth');

// Simpler POST endpoint for Chrome extension
router.post('/exhibitors', auth, async (req, res) => {
  try {
    const { tradeShowId, tradeShowName, companyName, boothNo, location, website, extractedAt, contacts } = req.body;
    const userId = req.user.userId;

    // Get User model and fetch user to get companyId
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const companyId = user.companyId;

    // Validate required fields
    if (!tradeShowId || !companyName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trade show ID and company name are required' 
      });
    }

    const exhibitor = new Exhibitor({
      tradeShowId,
      companyName,
      boothNo,
      location,
      website,
      contacts: contacts || [],
      extractedAt: extractedAt ? new Date(extractedAt) : new Date(),
      createdBy: userId,
      companyId
    });

    await exhibitor.save();

    res.status(201).json({
      success: true,
      message: 'Exhibitor created successfully',
      exhibitor
    });
  } catch (error) {
    console.error('Error creating exhibitor:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Get all exhibitors for a trade show
router.get('/trade-shows/:tradeShowId/exhibitors', auth, async (req, res) => {
  try {
    const { tradeShowId } = req.params;

    // Get User model and fetch user to get companyId
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const companyId = user.companyId;

    const exhibitors = await Exhibitor.find({
      tradeShowId,
      companyId
    }).sort({ createdAt: -1 });

    res.json({ exhibitors });
  } catch (error) {
    console.error('Error fetching exhibitors:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new exhibitor (with trade show in URL)
router.post('/trade-shows/:tradeShowId/exhibitors', auth, async (req, res) => {
  try {
    const { tradeShowId } = req.params;
    const { companyName, boothNo, location, website, options, contacts } = req.body;
    const userId = req.user.userId;

    // Get User model and fetch user to get companyId
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const companyId = user.companyId;

    // Validate required fields
    if (!companyName) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const exhibitor = new Exhibitor({
      tradeShowId,
      companyName,
      boothNo,
      location,
      website,
      options,
      contacts: contacts || [],
      createdBy: userId,
      companyId
    });

    await exhibitor.save();

    res.status(201).json({
      message: 'Exhibitor created successfully',
      exhibitor
    });
  } catch (error) {
    console.error('Error creating exhibitor:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update an exhibitor
router.put('/exhibitors/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, boothNo, location, website, options, contacts } = req.body;

    // Get User model and fetch user to get companyId
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const companyId = user.companyId;

    // Validate required fields
    if (!companyName) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const exhibitor = await Exhibitor.findOne({ _id: id, companyId });

    if (!exhibitor) {
      return res.status(404).json({ message: 'Exhibitor not found' });
    }

    exhibitor.companyName = companyName;
    exhibitor.boothNo = boothNo;
    exhibitor.location = location;
    exhibitor.website = website;
    exhibitor.options = options;
    if (contacts !== undefined) exhibitor.contacts = contacts;

    await exhibitor.save();

    res.json({
      message: 'Exhibitor updated successfully',
      exhibitor
    });
  } catch (error) {
    console.error('Error updating exhibitor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete an exhibitor
router.delete('/exhibitors/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Get User model and fetch user to get companyId
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const companyId = user.companyId;

    const exhibitor = await Exhibitor.findOneAndDelete({ _id: id, companyId });

    if (!exhibitor) {
      return res.status(404).json({ message: 'Exhibitor not found' });
    }

    res.json({ message: 'Exhibitor deleted successfully' });
  } catch (error) {
    console.error('Error deleting exhibitor:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
