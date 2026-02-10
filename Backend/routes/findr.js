const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const LeadCampaign = require('../models/LeadCampaign');
const LeadDirectory = require('../models/Lead');
const User = require('../models/User');
const InstalledModule = require('../models/InstalledModule');
const TradeShow = require('../models/TradeShow');
const Exhibitor = require('../models/Exhibitor');
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;

// GET /findr/settings - Get user's assigned campaigns for Chrome Extension
// Returns campaigns where user is owner or assignee, plus ExhibitOS status and trade shows
router.get('/settings', auth, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user to check permissions and get saved preferences
        const user = await User.findById(userId).select('permissions role fullName email findrSettings companyId');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user has dataCenter permission or is Admin
        const isAdmin = user.role === 'Admin';
        const hasDataCenterPermission = user.permissions?.dataCenter === true;

        // Check if ExhibitOS module is active for this user
        let exhibitOSActive = false;
        try {
            const exhibitModule = await InstalledModule.findOne({
                userId: userId,
                moduleId: 'ExhibitOS',
                status: 'active'
            });
            exhibitOSActive = !!exhibitModule;
        } catch (e) {
            console.error('Error checking ExhibitOS module:', e);
        }

        // Fetch trade shows if ExhibitOS is active
        let tradeShows = [];
        if (exhibitOSActive) {
            try {
                const query = user.companyId
                    ? { companyId: user.companyId }
                    : { createdBy: user._id };

                tradeShows = await TradeShow.find(query)
                    .select('shortName fullName showDate location industry')
                    .sort({ showDate: -1 });

                // Add exhibitor count for each trade show
                for (let i = 0; i < tradeShows.length; i++) {
                    const count = await Exhibitor.countDocuments({
                        tradeShowId: tradeShows[i]._id,
                        companyId: user.companyId
                    });
                    tradeShows[i] = {
                        ...tradeShows[i].toObject(),
                        exhibitorCount: count
                    };
                }
            } catch (e) {
                console.error('Error fetching trade shows for findr:', e);
            }
        }

        // Build query for campaigns
        // Find extension campaigns where user is owner OR assignee
        let query = {
            method: 'extension',
            status: { $in: ['active', 'draft'] },
            $or: [
                { userId: userId },  // User owns the campaign
                { 'assignees.user': userId }  // User is assigned to the campaign
            ]
        };

        const campaigns = await LeadCampaign.find(query)
            .populate('userId', 'fullName email')
            .populate('assignees.user', 'fullName email role')
            .populate('tradeShow', 'shortName fullName')
            .select('name leadType status tags sourceNotes expectedLeadCount stats tradeShow dataTypeAssignments createdAt')
            .sort({ createdAt: -1 });

        // If no campaigns found and user doesn't have dataCenter permission, return empty with warning
        if (campaigns.length === 0 && !isAdmin && !hasDataCenterPermission) {
            return res.json({
                success: true,
                user: {
                    id: user._id,
                    name: user.fullName,
                    email: user.email,
                    role: user.role,
                    isAdmin,
                    hasDataCenterPermission
                },
                campaigns: [],
                selectedCampaignId: null,
                exhibitOSActive,
                tradeShows,
                message: 'No campaigns found. Create a Chrome Extension campaign in the dashboard.'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.fullName,
                email: user.email,
                role: user.role,
                isAdmin,
                hasDataCenterPermission
            },
            campaigns: campaigns.map(c => {
                const isOwner = c.userId && c.userId._id && c.userId._id.toString() === userId.toString();
                // Filter dataTypeAssignments: owner sees all, assignees see only their assigned types
                const filteredDTA = (c.dataTypeAssignments || []).filter(dta => {
                    if (isOwner) return true;
                    return dta.assignees && dta.assignees.some(a => {
                        const aid = a._id ? a._id.toString() : a.toString();
                        return aid === userId.toString();
                    });
                });
                return {
                    _id: c._id,
                    name: c.name,
                    leadType: c.leadType,
                    status: c.status,
                    tags: c.tags,
                    expectedLeadCount: c.expectedLeadCount,
                    stats: c.stats,
                    tradeShow: c.tradeShow,
                    dataTypeAssignments: filteredDTA,
                    isOwner,
                    owner: c.userId,
                    createdAt: c.createdAt
                };
            }),
            selectedCampaignId: user.findrSettings?.selectedCampaignId || null,
            exhibitOSActive,
            tradeShows
        });
    } catch (error) {
        console.error('Error fetching findr settings:', error);
        res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
    }
});

// GET /findr/user-settings - Get user's Chrome Extension preferences
router.get('/user-settings', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId)
            .select('findrSettings')
            .populate('findrSettings.selectedCampaignId', 'name status');

        res.json({
            success: true,
            settings: user?.findrSettings || {}
        });
    } catch (error) {
        console.error('Error fetching user findr settings:', error);
        res.status(500).json({ message: 'Failed to fetch settings', error: error.message });
    }
});

// PUT /findr/user-settings - Update user's Chrome Extension preferences
router.put('/user-settings', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { selectedCampaignId } = req.body;

        // Validate campaign exists and user has access
        if (selectedCampaignId) {
            const campaign = await LeadCampaign.findById(selectedCampaignId);
            if (!campaign) {
                return res.status(404).json({ message: 'Campaign not found' });
            }

            // Check user has access to this campaign
            const isOwner = campaign.userId.toString() === userId;
            const isAssignee = campaign.assignees.some(a => a.user?.toString() === userId);
            if (!isOwner && !isAssignee) {
                return res.status(403).json({ message: 'You do not have access to this campaign' });
            }
        }

        // Update user settings
        const user = await User.findByIdAndUpdate(
            userId,
            { 'findrSettings.selectedCampaignId': selectedCampaignId || null },
            { new: true }
        ).select('findrSettings').populate('findrSettings.selectedCampaignId', 'name status');

        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: user?.findrSettings || {}
        });
    } catch (error) {
        console.error('Error updating user findr settings:', error);
        res.status(500).json({ message: 'Failed to update settings', error: error.message });
    }
});


// POST /findr/leads - Add lead to a campaign from Chrome Extension
router.post('/leads', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { campaignId, lead } = req.body;

        if (!campaignId) {
            return res.status(400).json({ message: 'Campaign ID is required' });
        }

        if (!lead || !lead.clientName || !lead.email) {
            return res.status(400).json({ message: 'Lead must have clientName and email' });
        }

        // Get user to check permissions
        const user = await User.findById(userId).select('permissions role');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isAdmin = user.role === 'Admin';
        const hasDataCenterPermission = user.permissions?.dataCenter === true;

        if (!isAdmin && !hasDataCenterPermission) {
            return res.status(403).json({ message: 'Access denied. Data Center permission required.' });
        }

        // Find the campaign
        const campaign = await LeadCampaign.findById(campaignId);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Check if user has access to this campaign
        const isOwner = campaign.userId.toString() === userId;
        const isAssignee = campaign.assignees.some(a =>
            a.user?.toString() === userId
        );

        if (!isOwner && !isAssignee) {
            return res.status(403).json({ message: 'You are not assigned to this campaign' });
        }

        // Create the lead with addedBy and campaignId
        const leadData = {
            companyName: lead.companyName || '',
            clientName: lead.clientName,
            email: lead.email,
            phone: lead.phone || '',
            designation: lead.designation || '',
            location: lead.location || '',
            linkedIn: lead.linkedIn || '',
            website: lead.website || '',
            requirements: lead.requirements || '',
            status: 'Cold Lead',
            userId: campaign.userId, // Lead belongs to campaign owner
            addedBy: userId, // Track who added this lead
            campaignId: campaignId
        };

        const newLead = new LeadDirectory(leadData);
        await newLead.save();

        // Add lead to campaign's leads array
        campaign.leads.push(newLead._id);
        await campaign.recalculateStats();
        await campaign.save();

        res.status(201).json({
            success: true,
            message: 'Lead added successfully',
            lead: newLead
        });
    } catch (error) {
        console.error('Error adding lead from findr:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: messages.join(', ') });
        }

        res.status(500).json({ message: 'Failed to add lead', error: error.message });
    }
});

// GET /findr/campaigns/:id/leads - Get leads for a specific campaign
router.get('/campaigns/:id/leads', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const campaignId = req.params.id;

        // Get user to check permissions
        const user = await User.findById(userId).select('permissions role');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isAdmin = user.role === 'Admin';

        // Find the campaign
        const campaign = await LeadCampaign.findById(campaignId)
            .populate('leads');

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Check if user has access to this campaign
        const isOwner = campaign.userId.toString() === userId;
        const isAssignee = campaign.assignees.some(a =>
            a.user?.toString() === userId
        );

        if (!isOwner && !isAssignee) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get leads - owners/admins see all, assignees see only their leads
        let leads;
        if (isOwner || isAdmin) {
            leads = await LeadDirectory.find({ _id: { $in: campaign.leads } })
                .populate('addedBy', 'fullName email');
        } else {
            leads = await LeadDirectory.find({
                _id: { $in: campaign.leads },
                addedBy: userId
            }).populate('addedBy', 'fullName email');
        }

        res.json({
            success: true,
            campaign: {
                _id: campaign._id,
                name: campaign.name,
                stats: campaign.stats
            },
            leads,
            isOwner: isOwner || isAdmin,
            totalInCampaign: campaign.leads.length,
            yourLeadsCount: leads.length
        });
    } catch (error) {
        console.error('Error fetching campaign leads:', error);
        res.status(500).json({ message: 'Failed to fetch leads', error: error.message });
    }
});

// GET /findr/trade-shows/:tradeShowId/exhibitors - Get exhibitors for a trade show (Chrome Extension)
router.get('/trade-shows/:tradeShowId/exhibitors', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tradeShowId } = req.params;

        const user = await User.findById(userId).select('companyId');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const exhibitors = await Exhibitor.find({
            tradeShowId,
            companyId: user.companyId
        }).sort({ createdAt: -1 });

        const tradeShow = await TradeShow.findById(tradeShowId)
            .select('shortName fullName showDate location');

        res.json({
            success: true,
            tradeShow: tradeShow || {},
            exhibitors
        });
    } catch (error) {
        console.error('Error fetching exhibitors for findr:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch exhibitors', error: error.message });
    }
});

// POST /findr/trade-shows/:tradeShowId/exhibitors - Add exhibitor from Chrome Extension
router.post('/trade-shows/:tradeShowId/exhibitors', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { tradeShowId } = req.params;
        const { companyName, companyEmail, phone, address, boothNo, website, linkedIn, contacts } = req.body;

        const user = await User.findById(userId).select('companyId');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!companyName) {
            return res.status(400).json({ success: false, message: 'Company name is required' });
        }

        const exhibitor = new Exhibitor({
            tradeShowId,
            companyName,
            companyEmail: companyEmail || '',
            location: address || '',
            boothNo: boothNo || '',
            website: website || '',
            contacts: contacts || [],
            createdBy: userId,
            companyId: user.companyId,
            extractedAt: new Date()
        });

        await exhibitor.save();

        res.status(201).json({
            success: true,
            message: 'Exhibitor added successfully',
            exhibitor
        });
    } catch (error) {
        console.error('Error adding exhibitor from findr:', error);
        res.status(500).json({ success: false, message: 'Failed to add exhibitor', error: error.message });
    }
});

// PUT /findr/exhibitors/:id - Update exhibitor from Chrome Extension
router.put('/exhibitors/:id', auth, async (req, res) => {
    try {
        const userId = req.user.userId;
        const exhibitorId = req.params.id;

        const user = await User.findById(userId).select('companyId');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const exhibitor = await Exhibitor.findOne({
            _id: exhibitorId,
            companyId: user.companyId
        });

        if (!exhibitor) {
            return res.status(404).json({ success: false, message: 'Exhibitor not found' });
        }

        // Update fields
        const { companyName, companyEmail, location, boothNo, website, contacts } = req.body;
        if (companyName !== undefined) exhibitor.companyName = companyName;
        if (companyEmail !== undefined) exhibitor.companyEmail = companyEmail;
        if (location !== undefined) exhibitor.location = location;
        if (boothNo !== undefined) exhibitor.boothNo = boothNo;
        if (website !== undefined) exhibitor.website = website;
        if (contacts !== undefined) exhibitor.contacts = contacts;

        await exhibitor.save();

        res.json({
            success: true,
            message: 'Exhibitor updated successfully',
            exhibitor
        });
    } catch (error) {
        console.error('Error updating exhibitor from findr:', error);
        res.status(500).json({ success: false, message: 'Failed to update exhibitor', error: error.message });
    }
});

module.exports = router;
