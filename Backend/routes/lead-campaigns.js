const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const LeadCampaign = require('../models/LeadCampaign');
const LeadDirectory = require('../models/Lead');
const User = require('../models/User');
const TradeShow = require('../models/TradeShow');
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;

// Get all lead campaigns for current user
router.get('/', auth, async (req, res) => {
  try {
    const { status, method, search } = req.query;
    const query = { userId: req.user.userId };

    if (status && status !== 'all') query.status = status;
    if (method && method !== 'all') query.method = method;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { leadType: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    const campaigns = await LeadCampaign.find(query)
      .populate('assignees.user', 'name email role avatar')
      .populate('tradeShow', 'shortName fullName showDate location')
      .sort({ createdAt: -1 });

    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching lead campaigns:', error);
    res.status(500).json({ message: 'Failed to fetch campaigns', error: error.message });
  }
});

// Get campaign stats summary
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const campaigns = await LeadCampaign.find({ userId });
    const total = campaigns.length;
    const active = campaigns.filter(c => c.status === 'active').length;
    const draft = campaigns.filter(c => c.status === 'draft').length;
    const completed = campaigns.filter(c => c.status === 'completed').length;
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.stats?.total || 0), 0);
    const methodBreakdown = {
      manual: campaigns.filter(c => c.method === 'manual').length,
      csv: campaigns.filter(c => c.method === 'csv').length,
      extension: campaigns.filter(c => c.method === 'extension').length,
      'third-party': campaigns.filter(c => c.method === 'third-party').length
    };

    res.json({ total, active, draft, completed, totalLeads, methodBreakdown });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
});

// Get team members for assignment (must be before /:id)
router.get('/team/members', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    // Get users from same company
    const query = currentUser.companyId
      ? { companyId: currentUser.companyId }
      : { _id: req.user.userId };

    const members = await User.find(query).select('name email role avatar');
    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ message: 'Failed to fetch team members', error: error.message });
  }
});

// Get campaigns by trade show
router.get('/by-trade-show/:tradeShowId', auth, async (req, res) => {
  try {
    const campaigns = await LeadCampaign.find({
      userId: req.user.userId,
      tradeShow: req.params.tradeShowId
    })
      .populate('assignees.user', 'name email role avatar')
      .populate('leads')
      .populate('tradeShow', 'shortName fullName showDate location')
      .sort({ createdAt: -1 });

    // Gather all leads from these campaigns
    const allLeads = [];
    for (const campaign of campaigns) {
      if (campaign.leads && campaign.leads.length > 0) {
        campaign.leads.forEach(lead => {
          allLeads.push({ ...lead.toObject(), campaignName: campaign.name, campaignId: campaign._id });
        });
      }
    }

    res.json({ campaigns, leads: allLeads, totalLeads: allLeads.length });
  } catch (error) {
    console.error('Error fetching campaigns by trade show:', error);
    res.status(500).json({ message: 'Failed to fetch trade show campaigns', error: error.message });
  }
});

// Get single campaign
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await LeadCampaign.findOne({
      _id: req.params.id,
      userId: req.user.userId
    })
      .populate('assignees.user', 'name email role avatar')
      .populate('leads')
      .populate('tradeShow', 'shortName fullName showDate location');

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ message: 'Failed to fetch campaign', error: error.message });
  }
});

// Create campaign
router.post('/', auth, async (req, res) => {
  try {
    const { name, method, leadType, tags, sourceNotes, expectedLeadCount, priority, assignees, status, tradeShow, dataType } = req.body;

    if (!name || !method || !leadType) {
      return res.status(400).json({ message: 'Name, method, and lead type are required' });
    }

    // Process assignees - ensure current user is always included
    const processedAssignees = [{ user: req.user.userId, role: 'owner', percentage: 0 }];
    if (assignees && Array.isArray(assignees)) {
      for (const a of assignees) {
        const uid = a.user || a;
        if (uid.toString() !== req.user.userId.toString()) {
          processedAssignees.push({ user: uid, role: a.role || 'member', percentage: a.percentage || 0 });
        }
      }
    }

    const campaign = new LeadCampaign({
      name,
      method,
      leadType,
      tags: tags || [],
      sourceNotes: sourceNotes || '',
      expectedLeadCount: expectedLeadCount || 0,
      priority: priority || 'medium',
      status: status || 'active',
      assignees: processedAssignees,
      dataType: (method === 'extension' && dataType) ? dataType : 'lead-mining',
      tradeShow: tradeShow || null,
      userId: req.user.userId
    });

    await campaign.save();
    await campaign.populate('assignees.user', 'name email role avatar');
    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ message: 'Failed to create campaign', error: error.message });
  }
});

// Update campaign
router.put('/:id', auth, async (req, res) => {
  try {
    const campaign = await LeadCampaign.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const allowed = ['name', 'leadType', 'tags', 'sourceNotes', 'expectedLeadCount', 'priority', 'status', 'assignees', 'tradeShow', 'dataType'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) campaign[field] = req.body[field];
    });

    await campaign.save();
    await campaign.populate('assignees.user', 'name email role avatar');
    await campaign.populate('tradeShow', 'shortName fullName showDate location');
    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ message: 'Failed to update campaign', error: error.message });
  }
});

// Delete campaign
router.delete('/:id', auth, async (req, res) => {
  try {
    const campaign = await LeadCampaign.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ message: 'Failed to delete campaign', error: error.message });
  }
});

// Add leads to campaign (manual or bulk)
router.post('/:id/leads', auth, async (req, res) => {
  try {
    const campaign = await LeadCampaign.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const { leads } = req.body; // Array of lead objects
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: 'Leads array is required' });
    }

    const created = [];
    const errors = [];

    for (const leadData of leads) {
      try {
        // Check for duplicates by email within user's leads
        if (leadData.email) {
          const existing = await LeadDirectory.findOne({
            email: leadData.email,
            userId: req.user.userId
          });
          if (existing) {
            // Add existing lead to campaign if not already there
            if (!campaign.leads.includes(existing._id)) {
              campaign.leads.push(existing._id);
              created.push({ ...existing.toObject(), duplicate: true });
            } else {
              errors.push({ email: leadData.email, error: 'Already in campaign' });
            }
            continue;
          }
        }

        const lead = new LeadDirectory({
          clientName: leadData.clientName || leadData.name || '',
          companyName: leadData.companyName || leadData.company || '',
          email: leadData.email || '',
          phone: leadData.phone || '',
          designation: leadData.designation || leadData.title || '',
          location: leadData.location || '',
          requirements: leadData.requirements || leadData.notes || '',
          status: leadData.status || 'Cold Lead',
          social: leadData.social || {},
          userId: req.user.userId
        });

        await lead.save();
        campaign.leads.push(lead._id);
        created.push(lead);
      } catch (err) {
        errors.push({ email: leadData.email, error: err.message });
      }
    }

    await campaign.recalculateStats();
    await campaign.populate('assignees.user', 'name email role avatar');

    res.json({
      campaign,
      summary: {
        total: leads.length,
        created: created.length,
        errors: errors.length,
        errorDetails: errors
      }
    });
  } catch (error) {
    console.error('Error adding leads to campaign:', error);
    res.status(500).json({ message: 'Failed to add leads', error: error.message });
  }
});

// Get leads for a campaign
router.get('/:id/leads', auth, async (req, res) => {
  try {
    const campaign = await LeadCampaign.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).populate('leads');

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign.leads);
  } catch (error) {
    console.error('Error fetching campaign leads:', error);
    res.status(500).json({ message: 'Failed to fetch leads', error: error.message });
  }
});

// Duplicate campaign
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await LeadCampaign.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!original) return res.status(404).json({ message: 'Campaign not found' });

    const duplicate = new LeadCampaign({
      name: `${original.name} (Copy)`,
      method: original.method,
      leadType: original.leadType,
      tags: original.tags,
      sourceNotes: original.sourceNotes,
      expectedLeadCount: original.expectedLeadCount,
      priority: original.priority,
      status: 'draft',
      assignees: original.assignees,
      assignmentRule: original.assignmentRule,
      userId: req.user.userId
    });

    await duplicate.save();
    await duplicate.populate('assignees.user', 'name email role avatar');
    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Error duplicating campaign:', error);
    res.status(500).json({ message: 'Failed to duplicate campaign', error: error.message });
  }
});

// Update campaign status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const campaign = await LeadCampaign.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { status },
      { new: true }
    ).populate('assignees.user', 'name email role avatar');

    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    res.json(campaign);
  } catch (error) {
    console.error('Error updating campaign status:', error);
    res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
});

module.exports = router;
