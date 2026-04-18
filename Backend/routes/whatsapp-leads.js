const express = require('express');
const router = express.Router();
const WhatsAppLead = require('../models/WhatsAppLead');
const TargetedCompany = require('../models/TargetedCompany');
const { authenticateToken } = require('../middleware/auth');

const WA_TO_CONTACT_STATUS = {
  new:       'Cold Lead',
  active:    'Active',
  followup:  'Warm Lead',
  converted: 'Qualified (SQL)',
  dead:      'Dead Lead',
};

async function syncContactStatus(companyId, phone, waStatus) {
  try {
    const contactStatus = WA_TO_CONTACT_STATUS[waStatus];
    if (!contactStatus) return;
    const cleaned = phone?.replace(/[^0-9]/g, '');
    if (!cleaned) return;
    // Find all targeted companies for this company that have a contact with this phone
    const tcs = await TargetedCompany.find({ companyId });
    for (const tc of tcs) {
      let changed = false;
      (tc.contacts || []).forEach((c, i) => {
        if ((c.phone || '').replace(/[^0-9]/g, '') === cleaned) {
          tc.contacts[i].status = contactStatus;
          changed = true;
        }
      });
      if (changed) await tc.save();
    }
  } catch (e) {
    console.warn('[syncContactStatus] failed:', e.message);
  }
}

router.use(authenticateToken);

// GET /api/whatsapp-leads — list leads, filterable by campaignId, status
router.get('/', async (req, res) => {
  try {
    const { companyId } = req.user;
    if (!companyId) return res.status(400).json({ message: 'Company required' });

    const { campaignId, status, search } = req.query;
    const filter = { companyId };
    if (status && status !== 'all') filter.status = status;
    if (campaignId) filter['campaigns.campaignId'] = campaignId;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];

    const leads = await WhatsAppLead.find(filter)
      .sort({ lastCampaignAt: -1, createdAt: -1 })
      .limit(500)
      .lean();

    res.json({ leads });
  } catch (err) {
    console.error('[WhatsAppLeads] GET error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/whatsapp-leads/campaigns — distinct campaign list (for filter dropdown)
router.get('/campaigns', async (req, res) => {
  try {
    const { companyId } = req.user;
    const leads = await WhatsAppLead.find({ companyId }, 'campaigns').lean();
    const seen = new Map();
    leads.forEach(l => l.campaigns.forEach(c => {
      if (c.campaignId && !seen.has(c.campaignId.toString())) {
        seen.set(c.campaignId.toString(), { _id: c.campaignId, name: c.campaignName });
      }
    }));
    res.json({ campaigns: Array.from(seen.values()) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/whatsapp-leads/by-phone — get lead by phone (for chat status bar)
router.get('/by-phone', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { phone } = req.query;
    if (!phone) return res.json({ lead: null });
    const cleaned = phone.replace(/[^0-9]/g, '');
    const lead = await WhatsAppLead.findOne({ companyId, phone: cleaned }).lean();
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/whatsapp-leads/:id/status — update lead status
router.put('/:id/status', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { status } = req.body;
    const valid = ['new', 'active', 'dead', 'followup', 'converted'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const lead = await WhatsAppLead.findOneAndUpdate(
      { _id: req.params.id, companyId },
      { $set: { status } },
      { new: true }
    );
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    syncContactStatus(companyId, lead.phone, status); // fire-and-forget
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/whatsapp-leads/by-phone/status — update status by phone (from chat UI)
router.put('/by-phone/status', async (req, res) => {
  try {
    const { companyId } = req.user;
    const { phone, status } = req.body;
    const valid = ['new', 'active', 'dead', 'followup', 'converted'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const cleaned = phone?.replace(/[^0-9]/g, '');
    if (!cleaned) return res.status(400).json({ message: 'Phone required' });
    const lead = await WhatsAppLead.findOneAndUpdate(
      { companyId, phone: cleaned },
      { $set: { status } },
      { new: true }
    );
    syncContactStatus(companyId, cleaned, status); // fire-and-forget
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/whatsapp-leads/stats — summary counts by status
router.get('/stats', async (req, res) => {
  try {
    const { companyId } = req.user;
    const agg = await WhatsAppLead.aggregate([
      { $match: { companyId: require('mongoose').Types.ObjectId.createFromHexString(companyId.toString()) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const stats = { total: 0, new: 0, active: 0, followup: 0, converted: 0, dead: 0 };
    agg.forEach(({ _id, count }) => { if (_id in stats) stats[_id] = count; stats.total += count; });
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
