const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Exhibitor = require('../models/Exhibitor');
const ContactLabel = require('../models/ContactLabel');
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;

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

// ============ CONTACTS ENDPOINTS ============

// Get all contacts across all exhibitors for the user's company
router.get('/contacts', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const companyId = user.companyId;
    const { status, search, important, labelId } = req.query;

    // Get all exhibitors for this company
    const exhibitors = await Exhibitor.find({ companyId }).populate({
      path: 'tradeShowId',
      select: 'shortName fullName'
    }).sort({ createdAt: -1 });

    // Get all labels for this company for populating label names
    const allLabels = await ContactLabel.find({ companyId }).lean();
    const labelMap = {};
    allLabels.forEach(l => { labelMap[l._id.toString()] = l; });

    // Flatten contacts from all exhibitors
    const contacts = [];
    for (const ex of exhibitors) {
      if (!ex.contacts || ex.contacts.length === 0) continue;
      for (let i = 0; i < ex.contacts.length; i++) {
        const c = ex.contacts[i];
        if (!c.fullName && !c.email) continue; // skip empty contacts

        // Resolve label details
        const contactLabels = (c.labels || []).map(lid => labelMap[lid.toString()]).filter(Boolean);

        const contact = {
          _id: `${ex._id}_${i}`,
          exhibitorId: ex._id,
          contactIndex: i,
          fullName: c.fullName || '',
          designation: c.designation || '',
          phone: c.phone || '',
          email: c.email || '',
          location: c.location || '',
          socialLinks: c.socialLinks || [],
          status: c.status || 'Cold Lead',
          followUp: c.followUp || '',
          isImportant: c.isImportant || false,
          labels: contactLabels,
          companyName: ex.companyName,
          website: ex.website,
          tradeShowId: ex.tradeShowId?._id || ex.tradeShowId,
          tradeShowName: ex.tradeShowId?.shortName || ex.tradeShowId?.fullName || '',
          createdAt: ex.createdAt
        };

        // Apply filters
        if (status && status !== 'All' && contact.status !== status) continue;
        if (important === 'true' && !contact.isImportant) continue;
        if (labelId && !contact.labels.some(l => l._id.toString() === labelId)) continue;
        if (search) {
          const q = search.toLowerCase();
          const match = contact.fullName.toLowerCase().includes(q) ||
            contact.companyName.toLowerCase().includes(q) ||
            contact.email.toLowerCase().includes(q) ||
            contact.designation.toLowerCase().includes(q);
          if (!match) continue;
        }

        contacts.push(contact);
      }
    }

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update contact status/followUp within an exhibitor
router.patch('/contacts/:exhibitorId/:contactIndex/status', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { exhibitorId, contactIndex } = req.params;
    const { status, followUp } = req.body;
    const idx = parseInt(contactIndex);

    const exhibitor = await Exhibitor.findOne({ _id: exhibitorId, companyId: user.companyId });
    if (!exhibitor) return res.status(404).json({ message: 'Exhibitor not found' });
    if (!exhibitor.contacts || idx >= exhibitor.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (status) exhibitor.contacts[idx].status = status;
    if (followUp !== undefined) exhibitor.contacts[idx].followUp = followUp;

    await exhibitor.save();

    const c = exhibitor.contacts[idx];
    res.json({
      _id: `${exhibitor._id}_${idx}`,
      exhibitorId: exhibitor._id,
      contactIndex: idx,
      fullName: c.fullName || '',
      designation: c.designation || '',
      phone: c.phone || '',
      email: c.email || '',
      location: c.location || '',
      socialLinks: c.socialLinks || [],
      status: c.status || 'Cold Lead',
      followUp: c.followUp || '',
      isImportant: c.isImportant || false,
      labels: c.labels || [],
      companyName: exhibitor.companyName,
      website: exhibitor.website,
      tradeShowId: exhibitor.tradeShowId,
      createdAt: exhibitor.createdAt
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ TOGGLE IMPORTANT ============
router.patch('/contacts/:exhibitorId/:contactIndex/important', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { exhibitorId, contactIndex } = req.params;
    const idx = parseInt(contactIndex);

    const exhibitor = await Exhibitor.findOne({ _id: exhibitorId, companyId: user.companyId });
    if (!exhibitor) return res.status(404).json({ message: 'Exhibitor not found' });
    if (!exhibitor.contacts || idx >= exhibitor.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    exhibitor.contacts[idx].isImportant = !exhibitor.contacts[idx].isImportant;
    await exhibitor.save();

    res.json({ isImportant: exhibitor.contacts[idx].isImportant });
  } catch (error) {
    console.error('Error toggling important:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ ADD LABEL TO CONTACT ============
router.patch('/contacts/:exhibitorId/:contactIndex/labels', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { exhibitorId, contactIndex } = req.params;
    const { labelId, action } = req.body; // action: 'add' or 'remove'
    const idx = parseInt(contactIndex);

    const exhibitor = await Exhibitor.findOne({ _id: exhibitorId, companyId: user.companyId });
    if (!exhibitor) return res.status(404).json({ message: 'Exhibitor not found' });
    if (!exhibitor.contacts || idx >= exhibitor.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (!exhibitor.contacts[idx].labels) exhibitor.contacts[idx].labels = [];

    if (action === 'add') {
      // Verify label exists and belongs to company
      const label = await ContactLabel.findOne({ _id: labelId, companyId: user.companyId });
      if (!label) return res.status(404).json({ message: 'Label not found' });
      if (!exhibitor.contacts[idx].labels.some(l => l.toString() === labelId)) {
        exhibitor.contacts[idx].labels.push(labelId);
      }
    } else if (action === 'remove') {
      exhibitor.contacts[idx].labels = exhibitor.contacts[idx].labels.filter(l => l.toString() !== labelId);
    }

    await exhibitor.save();

    // Return populated labels
    const allLabels = await ContactLabel.find({ companyId: user.companyId }).lean();
    const labelMap = {};
    allLabels.forEach(l => { labelMap[l._id.toString()] = l; });
    const contactLabels = exhibitor.contacts[idx].labels.map(lid => labelMap[lid.toString()]).filter(Boolean);

    res.json({ labels: contactLabels });
  } catch (error) {
    console.error('Error updating contact labels:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ CONTACT LABELS CRUD ============

// Get all labels for company
router.get('/contact-labels', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const labels = await ContactLabel.find({ companyId: user.companyId }).sort({ name: 1 });
    res.json(labels);
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create label
router.post('/contact-labels', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Label name is required' });

    const existing = await ContactLabel.findOne({ companyId: user.companyId, name: name.trim() });
    if (existing) return res.status(400).json({ message: 'Label with this name already exists' });

    const label = await ContactLabel.create({
      name: name.trim(),
      color: color || '#6b7280',
      companyId: user.companyId,
      createdBy: req.user.userId
    });

    res.status(201).json(label);
  } catch (error) {
    console.error('Error creating label:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update label
router.put('/contact-labels/:id', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, color } = req.body;
    const label = await ContactLabel.findOneAndUpdate(
      { _id: req.params.id, companyId: user.companyId },
      { ...(name && { name: name.trim() }), ...(color && { color }) },
      { new: true }
    );
    if (!label) return res.status(404).json({ message: 'Label not found' });

    res.json(label);
  } catch (error) {
    console.error('Error updating label:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete label (also remove from all contacts)
router.delete('/contact-labels/:id', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const label = await ContactLabel.findOneAndDelete({ _id: req.params.id, companyId: user.companyId });
    if (!label) return res.status(404).json({ message: 'Label not found' });

    // Remove this label from all exhibitor contacts
    await Exhibitor.updateMany(
      { companyId: user.companyId, 'contacts.labels': req.params.id },
      { $pull: { 'contacts.$[].labels': mongoose.Types.ObjectId(req.params.id) } }
    );

    res.json({ message: 'Label deleted' });
  } catch (error) {
    console.error('Error deleting label:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
