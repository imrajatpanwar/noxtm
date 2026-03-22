const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CompanyData = require('../models/CompanyData');
const ContactLabel = require('../models/ContactLabel');
const Company = require('../models/Company');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;

// ============ EXTENSION ACCESS SETTINGS ============
// NOTE: These must be defined BEFORE the /:id routes to avoid Express matching "access-settings" as an :id param

// Get extension access settings
router.get('/company-data/access-settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await Company.findById(user.companyId)
      .populate('extensionAccessPeople', 'fullName email profileImage')
      .populate('members.user', 'fullName email profileImage');

    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Check if user is Owner
    const member = company.members.find(m => m.user && m.user._id.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company.owner && company.owner.toString() === user._id.toString());

    if (!isOwner && user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only the workspace owner can manage extension access' });
    }

    res.json({
      extensionAccessPeople: company.extensionAccessPeople || [],
      members: company.members.map(m => ({
        user: m.user,
        roleInCompany: m.roleInCompany
      }))
    });
  } catch (error) {
    console.error('Error fetching access settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update extension access settings
router.put('/company-data/access-settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await Company.findById(user.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Check if user is Owner
    const member = company.members.find(m => m.user && m.user.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company.owner && company.owner.toString() === user._id.toString());

    if (!isOwner && user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only the workspace owner can manage extension access' });
    }

    const { extensionAccessPeople } = req.body;
    company.extensionAccessPeople = extensionAccessPeople || [];
    await company.save();

    const updated = await Company.findById(company._id)
      .populate('extensionAccessPeople', 'fullName email profileImage');

    res.json({ extensionAccessPeople: updated.extensionAccessPeople });
  } catch (error) {
    console.error('Error updating access settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ COMPANY DATA CRUD ============

// Get all company data entries for the user's workspace
// Owner/Admin sees all companies; other users see only companies they extracted
router.get('/company-data', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { search, industry, labelId } = req.query;
    const query = { companyId: user.companyId };

    // Non-owner users can only see companies they created
    const company = await Company.findById(user.companyId);
    if (company) {
      const member = company.members.find(m => m.user && m.user.toString() === user._id.toString());
      const isOwner = (member && member.roleInCompany === 'Owner') ||
        (company.owner && company.owner.toString() === user._id.toString());
      if (!isOwner && user.role !== 'Admin') {
        query.createdBy = user._id;
      }
    }

    if (industry) query.industry = industry;

    // If filtering by label, find companies whose contacts have this label
    if (labelId) {
      query['contacts.labels'] = labelId;
    }

    let companies = await CompanyData.find(query)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    if (search) {
      const q = search.toLowerCase();
      companies = companies.filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        (c.companyEmail && c.companyEmail.toLowerCase().includes(q)) ||
        (c.industry && c.industry.toLowerCase().includes(q))
      );
    }

    res.json(companies);
  } catch (error) {
    console.error('Error fetching company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single company data entry
router.get('/company-data/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await CompanyData.findOne({
      _id: req.params.id,
      companyId: user.companyId
    }).populate('createdBy', 'fullName email');

    if (!company) return res.status(404).json({ message: 'Company not found' });

    res.json(company);
  } catch (error) {
    console.error('Error fetching company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create company data entry — only via Chrome Extension (source must be 'extension')
// Also enforces extension access: user must be in extensionAccessPeople or be Owner
router.post('/company-data', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const {
      companyName, companyEmail, companyPhone, address,
      website, linkedin, industry, notes, contacts, source
    } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    // Only allow creation from extension
    if (source !== 'extension') {
      return res.status(403).json({ message: 'Companies can only be added via the Chrome Extension' });
    }

    // Check extension access permission
    const company = await Company.findById(user.companyId);
    if (company) {
      const member = company.members.find(m => m.user && m.user.toString() === user._id.toString());
      const isOwner = (member && member.roleInCompany === 'Owner') ||
        (company.owner && company.owner.toString() === user._id.toString());

      if (!isOwner && user.role !== 'Admin') {
        const hasAccess = (company.extensionAccessPeople || []).some(
          p => p.toString() === user._id.toString()
        );
        if (!hasAccess) {
          return res.status(403).json({ message: 'You do not have permission to add data via the extension. Contact your workspace owner.' });
        }
      }
    }

    const companyData = new CompanyData({
      companyName: companyName.trim(),
      companyEmail,
      companyPhone,
      address,
      website,
      linkedin,
      industry,
      notes,
      contacts: contacts || [],
      source: 'extension',
      createdBy: user._id,
      companyId: user.companyId
    });

    await companyData.save();
    res.status(201).json(companyData);
  } catch (error) {
    console.error('Error creating company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update company data entry
router.put('/company-data/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await CompanyData.findOne({
      _id: req.params.id,
      companyId: user.companyId
    });

    if (!company) return res.status(404).json({ message: 'Company not found' });

    const {
      companyName, companyEmail, companyPhone, address,
      website, linkedin, industry, notes, contacts
    } = req.body;

    if (companyName !== undefined) company.companyName = companyName;
    if (companyEmail !== undefined) company.companyEmail = companyEmail;
    if (companyPhone !== undefined) company.companyPhone = companyPhone;
    if (address !== undefined) company.address = address;
    if (website !== undefined) company.website = website;
    if (linkedin !== undefined) company.linkedin = linkedin;
    if (industry !== undefined) company.industry = industry;
    if (notes !== undefined) company.notes = notes;
    if (contacts !== undefined) company.contacts = contacts;

    await company.save();
    res.json(company);
  } catch (error) {
    console.error('Error updating company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete company data entry
router.delete('/company-data/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await CompanyData.findOneAndDelete({
      _id: req.params.id,
      companyId: user.companyId
    });

    if (!company) return res.status(404).json({ message: 'Company not found' });

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ CONTACTS FROM COMPANY DATA ============

// Get all contacts flattened from all company data entries
router.get('/company-data-contacts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { status, search, important, labelId } = req.query;

    const companies = await CompanyData.find({ companyId: user.companyId })
      .sort({ createdAt: -1 });

    const allLabels = await ContactLabel.find({ companyId: user.companyId }).lean();
    const labelMap = {};
    allLabels.forEach(l => { labelMap[l._id.toString()] = l; });

    const contacts = [];
    for (const comp of companies) {
      if (!comp.contacts || comp.contacts.length === 0) continue;
      for (let i = 0; i < comp.contacts.length; i++) {
        const c = comp.contacts[i];
        if (!c.fullName && !c.email) continue;

        const contactLabels = (c.labels || []).map(lid => labelMap[lid.toString()]).filter(Boolean);

        const contact = {
          _id: `${comp._id}_${i}`,
          companyDataId: comp._id,
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
          companyName: comp.companyName,
          website: comp.website,
          sourceType: 'company-data',
          createdAt: comp.createdAt
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
    console.error('Error fetching company data contacts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update contact status within company data
router.patch('/company-data-contacts/:companyDataId/:contactIndex/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { companyDataId, contactIndex } = req.params;
    const { status, followUp } = req.body;
    const idx = parseInt(contactIndex);

    const company = await CompanyData.findOne({ _id: companyDataId, companyId: user.companyId });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (!company.contacts || idx >= company.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (status) company.contacts[idx].status = status;
    if (followUp !== undefined) company.contacts[idx].followUp = followUp;

    await company.save();

    const c = company.contacts[idx];
    res.json({
      _id: `${company._id}_${idx}`,
      companyDataId: company._id,
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
      companyName: company.companyName,
      website: company.website,
      sourceType: 'company-data',
      createdAt: company.createdAt
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle important for contact within company data
router.patch('/company-data-contacts/:companyDataId/:contactIndex/important', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { companyDataId, contactIndex } = req.params;
    const idx = parseInt(contactIndex);

    const company = await CompanyData.findOne({ _id: companyDataId, companyId: user.companyId });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (!company.contacts || idx >= company.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    company.contacts[idx].isImportant = !company.contacts[idx].isImportant;
    await company.save();

    res.json({ isImportant: company.contacts[idx].isImportant });
  } catch (error) {
    console.error('Error toggling important:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add/remove label for contact within company data
router.patch('/company-data-contacts/:companyDataId/:contactIndex/labels', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { companyDataId, contactIndex } = req.params;
    const { labelId, action } = req.body;
    const idx = parseInt(contactIndex);

    const company = await CompanyData.findOne({ _id: companyDataId, companyId: user.companyId });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    if (!company.contacts || idx >= company.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (!company.contacts[idx].labels) company.contacts[idx].labels = [];

    if (action === 'add') {
      const label = await ContactLabel.findOne({ _id: labelId, companyId: user.companyId });
      if (!label) return res.status(404).json({ message: 'Label not found' });
      if (!company.contacts[idx].labels.some(l => l.toString() === labelId)) {
        company.contacts[idx].labels.push(labelId);
      }
    } else if (action === 'remove') {
      company.contacts[idx].labels = company.contacts[idx].labels.filter(l => l.toString() !== labelId);
    }

    await company.save();

    const allLabels = await ContactLabel.find({ companyId: user.companyId }).lean();
    const labelMap = {};
    allLabels.forEach(l => { labelMap[l._id.toString()] = l; });
    const contactLabels = company.contacts[idx].labels.map(lid => labelMap[lid.toString()]).filter(Boolean);

    res.json({ labels: contactLabels });
  } catch (error) {
    console.error('Error updating contact labels:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ LABELED CONTACTS AS PHONE LISTS ============
// Returns contacts grouped by label, formatted as phone lists for WhatsApp campaigns
router.get('/company-data-phone-lists', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const allLabels = await ContactLabel.find({ companyId: user.companyId }).lean();
    const companies = await CompanyData.find({ companyId: user.companyId }).lean();

    const phoneLists = allLabels.map(label => {
      const phones = [];
      for (const comp of companies) {
        if (!comp.contacts || comp.contacts.length === 0) continue;
        for (const contact of comp.contacts) {
          if (!contact.phone) continue;
          const hasLabel = (contact.labels || []).some(lid => lid.toString() === label._id.toString());
          if (hasLabel) {
            phones.push({
              phone: contact.phone,
              name: contact.fullName || '',
              companyName: comp.companyName,
              designation: contact.designation || '',
              email: contact.email || ''
            });
          }
        }
      }
      return {
        _id: `label_${label._id}`,
        labelId: label._id,
        name: `${label.name} (Company Data)`,
        description: `Auto-generated from labeled company contacts`,
        color: label.color,
        phones,
        phoneCount: phones.length,
        isLabelList: true
      };
    }).filter(pl => pl.phones.length > 0);

    res.json(phoneLists);
  } catch (error) {
    console.error('Error fetching labeled phone lists:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
