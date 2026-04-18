const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const TargetedCompany = require('../models/TargetedCompany');
const ContactLabel = require('../models/ContactLabel');
const WhatsAppLead = require('../models/WhatsAppLead');
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;

// WhatsApp lead status values are the same as contact status now — direct pass-through
const WA_TO_CONTACT_STATUS = {
  new:       'new',
  active:    'active',
  followup:  'followup',
  converted: 'converted',
  dead:      'dead',
};

// Normalize legacy status values stored in DB
const LEGACY_STATUS_MAP = {
  'Cold Lead':       'new',
  'Warm Lead':       'followup',
  'Qualified (SQL)': 'converted',
  'Active':          'active',
  'Dead Lead':       'dead',
};
function normalizeStatus(s) {
  return LEGACY_STATUS_MAP[s] || s || 'new';
}

// Simpler POST endpoint for Chrome extension

// Get ALL targeted companies for the user's company (used by Leads Flow dropdown)
router.get('/targeted-companies/all', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const companies = await TargetedCompany.find({ companyId: user.companyId })
      .select('companyName location companyEmail website contacts')
      .sort({ companyName: 1 })
      .lean();

    res.json({ success: true, companies });
  } catch (error) {
    console.error('Error fetching all targeted companies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/targeted-companies', auth, async (req, res) => {
  try {
    const { trendingServiceId, trendingServiceName, companyName, location, website, extractedAt, contacts } = req.body;
    const userId = req.user.userId;

    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const companyId = user.companyId;

    if (!trendingServiceId || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Trending service ID and company name are required'
      });
    }

    const targetedCompany = new TargetedCompany({
      trendingServiceId,
      companyName,
      location,
      website,
      contacts: contacts || [],
      extractedAt: extractedAt ? new Date(extractedAt) : new Date(),
      createdBy: userId,
      companyId
    });

    await targetedCompany.save();

    res.status(201).json({
      success: true,
      message: 'Targeted company created successfully',
      targetedCompany
    });
  } catch (error) {
    console.error('Error creating targeted company:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get all targeted companies for a trending service
router.get('/trending-services/:trendingServiceId/targeted-companies', auth, async (req, res) => {
  try {
    const { trendingServiceId } = req.params;

    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const companyId = user.companyId;

    const targetedCompanies = await TargetedCompany.find({
      trendingServiceId,
      companyId
    }).sort({ createdAt: -1 });

    res.json({ targetedCompanies });
  } catch (error) {
    console.error('Error fetching targeted companies:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new targeted company (with trending service in URL)
router.post('/trending-services/:trendingServiceId/targeted-companies', auth, async (req, res) => {
  try {
    const { trendingServiceId } = req.params;
    const { companyName, location, website, options, contacts } = req.body;
    const userId = req.user.userId;

    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const companyId = user.companyId;

    if (!companyName) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const targetedCompany = new TargetedCompany({
      trendingServiceId,
      companyName,
      location,
      website,
      options,
      contacts: contacts || [],
      createdBy: userId,
      companyId
    });

    await targetedCompany.save();

    res.status(201).json({
      message: 'Targeted company created successfully',
      targetedCompany
    });
  } catch (error) {
    console.error('Error creating targeted company:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a targeted company
router.put('/targeted-companies/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { companyName, location, website, options, contacts } = req.body;

    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const companyId = user.companyId;

    if (!companyName) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const targetedCompany = await TargetedCompany.findOne({ _id: id, companyId });

    if (!targetedCompany) {
      return res.status(404).json({ message: 'Targeted company not found' });
    }

    targetedCompany.companyName = companyName;
    targetedCompany.location = location;
    targetedCompany.website = website;
    targetedCompany.options = options;
    if (contacts !== undefined) targetedCompany.contacts = contacts;

    await targetedCompany.save();

    res.json({
      message: 'Targeted company updated successfully',
      targetedCompany
    });
  } catch (error) {
    console.error('Error updating targeted company:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a targeted company
router.delete('/targeted-companies/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const companyId = user.companyId;

    const targetedCompany = await TargetedCompany.findOneAndDelete({ _id: id, companyId });

    if (!targetedCompany) {
      return res.status(404).json({ message: 'Targeted company not found' });
    }

    res.json({ message: 'Targeted company deleted successfully' });
  } catch (error) {
    console.error('Error deleting targeted company:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ CONTACTS ENDPOINTS ============

// Get all contacts across all targeted companies for the user's company
router.get('/contacts', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const companyId = user.companyId;
    const { status, search, important, labelId } = req.query;

    const targetedCompanies = await TargetedCompany.find({ companyId }).populate({
      path: 'trendingServiceId',
      select: 'serviceName fullName'
    }).sort({ createdAt: -1 });

    const allLabels = await ContactLabel.find({ companyId }).lean();
    const labelMap = {};
    allLabels.forEach(l => { labelMap[l._id.toString()] = l; });

    // Build phone → WhatsAppLead status map for this company
    const allPhones = [];
    for (const tc of targetedCompanies) {
      for (const c of (tc.contacts || [])) {
        if (c.phone) allPhones.push(c.phone.replace(/[^0-9]/g, ''));
      }
    }
    const waLeads = await WhatsAppLead.find({ companyId, phone: { $in: allPhones } }).select('phone status').lean();
    const phoneStatusMap = {};
    waLeads.forEach(l => { phoneStatusMap[l.phone] = l.status; });

    const contacts = [];
    for (const tc of targetedCompanies) {
      if (!tc.contacts || tc.contacts.length === 0) continue;
      for (let i = 0; i < tc.contacts.length; i++) {
        const c = tc.contacts[i];
        if (!c.fullName && !c.email) continue;

        const contactLabels = (c.labels || []).map(lid => labelMap[lid.toString()]).filter(Boolean);

        // If this contact has a WhatsApp lead, use its status; else normalize stored status
        const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
        const waStatus = cleanPhone && phoneStatusMap[cleanPhone];
        const resolvedStatus = waStatus
          ? (WA_TO_CONTACT_STATUS[waStatus] || normalizeStatus(c.status))
          : normalizeStatus(c.status);

        const contact = {
          _id: `${tc._id}_${i}`,
          targetedCompanyId: tc._id,
          contactIndex: i,
          fullName: c.fullName || '',
          designation: c.designation || '',
          phone: c.phone || '',
          email: c.email || '',
          location: c.location || '',
          socialLinks: c.socialLinks || [],
          status: resolvedStatus,
          followUp: c.followUp || '',
          isImportant: c.isImportant || false,
          labels: contactLabels,
          companyName: tc.companyName,
          website: tc.website,
          trendingServiceId: tc.trendingServiceId?._id || tc.trendingServiceId,
          trendingServiceName: tc.trendingServiceId?.serviceName || tc.trendingServiceId?.fullName || '',
          createdAt: tc.createdAt
        };

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

// Update contact status/followUp within a targeted company
router.patch('/contacts/:targetedCompanyId/:contactIndex/status', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { targetedCompanyId, contactIndex } = req.params;
    const { status, followUp } = req.body;
    const idx = parseInt(contactIndex);

    const targetedCompany = await TargetedCompany.findOne({ _id: targetedCompanyId, companyId: user.companyId });
    if (!targetedCompany) return res.status(404).json({ message: 'Targeted company not found' });
    if (!targetedCompany.contacts || idx >= targetedCompany.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (status) targetedCompany.contacts[idx].status = status;
    if (followUp !== undefined) targetedCompany.contacts[idx].followUp = followUp;

    await targetedCompany.save();

    const c = targetedCompany.contacts[idx];
    res.json({
      _id: `${targetedCompany._id}_${idx}`,
      targetedCompanyId: targetedCompany._id,
      contactIndex: idx,
      fullName: c.fullName || '',
      designation: c.designation || '',
      phone: c.phone || '',
      email: c.email || '',
      location: c.location || '',
      socialLinks: c.socialLinks || [],
      status: normalizeStatus(c.status),
      followUp: c.followUp || '',
      isImportant: c.isImportant || false,
      labels: c.labels || [],
      companyName: targetedCompany.companyName,
      website: targetedCompany.website,
      trendingServiceId: targetedCompany.trendingServiceId,
      createdAt: targetedCompany.createdAt
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ TOGGLE IMPORTANT ============
router.patch('/contacts/:targetedCompanyId/:contactIndex/important', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { targetedCompanyId, contactIndex } = req.params;
    const idx = parseInt(contactIndex);

    const targetedCompany = await TargetedCompany.findOne({ _id: targetedCompanyId, companyId: user.companyId });
    if (!targetedCompany) return res.status(404).json({ message: 'Targeted company not found' });
    if (!targetedCompany.contacts || idx >= targetedCompany.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    targetedCompany.contacts[idx].isImportant = !targetedCompany.contacts[idx].isImportant;
    await targetedCompany.save();

    res.json({ isImportant: targetedCompany.contacts[idx].isImportant });
  } catch (error) {
    console.error('Error toggling important:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ ADD LABEL TO CONTACT ============
router.patch('/contacts/:targetedCompanyId/:contactIndex/labels', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { targetedCompanyId, contactIndex } = req.params;
    const { labelId, action } = req.body;
    const idx = parseInt(contactIndex);

    const targetedCompany = await TargetedCompany.findOne({ _id: targetedCompanyId, companyId: user.companyId });
    if (!targetedCompany) return res.status(404).json({ message: 'Targeted company not found' });
    if (!targetedCompany.contacts || idx >= targetedCompany.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (!targetedCompany.contacts[idx].labels) targetedCompany.contacts[idx].labels = [];

    if (action === 'add') {
      const label = await ContactLabel.findOne({ _id: labelId, companyId: user.companyId });
      if (!label) return res.status(404).json({ message: 'Label not found' });
      if (!targetedCompany.contacts[idx].labels.some(l => l.toString() === labelId)) {
        targetedCompany.contacts[idx].labels.push(labelId);
      }
    } else if (action === 'remove') {
      targetedCompany.contacts[idx].labels = targetedCompany.contacts[idx].labels.filter(l => l.toString() !== labelId);
    }

    await targetedCompany.save();

    const allLabels = await ContactLabel.find({ companyId: user.companyId }).lean();
    const labelMap = {};
    allLabels.forEach(l => { labelMap[l._id.toString()] = l; });
    const contactLabels = targetedCompany.contacts[idx].labels.map(lid => labelMap[lid.toString()]).filter(Boolean);

    res.json({ labels: contactLabels });
  } catch (error) {
    console.error('Error updating contact labels:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ CONTACT LABELS CRUD (shared with exhibitors) ============

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

// Delete label (also remove from all targeted company contacts)
router.delete('/contact-labels/:id', auth, async (req, res) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const label = await ContactLabel.findOneAndDelete({ _id: req.params.id, companyId: user.companyId });
    if (!label) return res.status(404).json({ message: 'Label not found' });

    // Remove this label from all targeted company contacts
    await TargetedCompany.updateMany(
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
