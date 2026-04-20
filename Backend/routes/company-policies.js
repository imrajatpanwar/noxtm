const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const CompanyPolicy = require('../models/CompanyPolicy');
const Company = require('../models/Company');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Notify all company members except the actor
const notifyTeam = async ({ companyId, actorId, title, message }) => {
  try {
    const company = await Company.findById(companyId).select('owner members').lean();
    if (!company) return;
    const memberIds = new Set();
    if (company.owner) memberIds.add(String(company.owner));
    (company.members || []).forEach(m => { if (m.user) memberIds.add(String(m.user)); });
    memberIds.delete(String(actorId));
    if (!memberIds.size) return;
    const docs = [...memberIds].map(uid => ({
      userId: uid,
      companyId,
      type: 'company_policy',
      title,
      message,
      icon: 'policy',
      link: 'company-policies',
      read: false,
    }));
    await Notification.insertMany(docs);
  } catch (err) {
    console.error('notifyTeam error:', err);
  }
};

router.use(authenticateToken);

const getUser = async (req) => {
  const userId = req.user.userId || req.user._id;
  const user = await User.findById(userId).select('companyId role').lean();
  return { userId, user };
};

const canManagePolicy = async (user, userId) => {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  if (!user.companyId) return false;
  const company = await Company.findById(user.companyId).select('owner members').lean();
  if (!company) return false;
  if (company.owner && company.owner.toString() === userId.toString()) return true;
  const member = company.members?.find(m => m.user && m.user.toString() === userId.toString());
  return member?.roleInCompany === 'Owner';
};

// ============================================
// GET /api/company-policies — Get single company policy
// ============================================
router.get('/', async (req, res) => {
  try {
    const { userId, user } = await getUser(req);
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const policy = await CompanyPolicy.findOne({ companyId: user.companyId })
      .populate('createdBy', 'fullName')
      .populate('acknowledgments.userId', 'fullName role roleInCompany')
      .lean();

    if (!policy) return res.json({ success: true, policy: null });

    // Find current user's acknowledgment
    const userAck = policy.acknowledgments?.find(
      a => String(a.userId?._id || a.userId) === String(userId)
    );
    const isAcknowledged = !!userAck;
    const userAcknowledgment = userAck
      ? { signatureImage: userAck.signatureImage, acknowledgedAt: userAck.acknowledgedAt, fullName: userAck.userId?.fullName || '' }
      : null;

    // Find company owner's acknowledgment for Authorized Signatory section
    const company = await Company.findById(user.companyId).select('owner members').lean();
    const ownerUserId = company?.owner;
    const ownerAck = policy.acknowledgments?.find(a => {
      const ackUserId = a.userId?._id || a.userId;
      if (ownerUserId && String(ackUserId) === String(ownerUserId)) return true;
      // Also match by roleInCompany Owner in members
      const member = company?.members?.find(m => m.user && String(m.user) === String(ackUserId));
      return member?.roleInCompany === 'Owner';
    });
    const ownerAcknowledgment = ownerAck
      ? { signatureImage: ownerAck.signatureImage, acknowledgedAt: ownerAck.acknowledgedAt, fullName: ownerAck.userId?.fullName || '' }
      : null;

    res.json({ success: true, policy: { ...policy, isAcknowledged, userAcknowledgment, ownerAcknowledgment } });
  } catch (err) {
    console.error('Error fetching policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/company-policies — Create policy (owner/admin only)
// ============================================
router.post('/', async (req, res) => {
  try {
    const { userId, user } = await getUser(req);
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });
    if (!await canManagePolicy(user, userId)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { title, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content is required' });

    const existing = await CompanyPolicy.findOne({ companyId: user.companyId });
    if (existing) return res.status(400).json({ success: false, message: 'Policy already exists. Use append to add more.' });

    const policy = new CompanyPolicy({
      companyId: user.companyId,
      title: title?.trim() || 'Company Policy',
      blocks: [{ content: content.trim(), date: new Date() }],
      createdBy: userId,
      lastUpdatedBy: userId
    });

    await policy.save();
    const populated = await CompanyPolicy.findById(policy._id).populate('createdBy', 'fullName').lean();
    notifyTeam({ companyId: user.companyId, actorId: userId, title: 'Company Policy Created', message: `A new company policy "${policy.title}" has been published. Tap to review.` });
    res.status(201).json({ success: true, policy: populated });
  } catch (err) {
    console.error('Error creating policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/company-policies/:id/append — Append new block (owner/admin only)
// ============================================
router.post('/:id/append', async (req, res) => {
  try {
    const { userId, user } = await getUser(req);
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });
    if (!await canManagePolicy(user, userId)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content is required' });

    const policy = await CompanyPolicy.findOne({ _id: req.params.id, companyId: user.companyId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    policy.blocks.push({ content: content.trim(), date: new Date() });
    policy.lastUpdatedBy = userId;
    await policy.save();

    const populated = await CompanyPolicy.findById(policy._id).populate('createdBy', 'fullName').lean();
    notifyTeam({ companyId: user.companyId, actorId: userId, title: 'Company Policy Updated', message: `The company policy "${policy.title}" has been updated. Tap to review.` });
    res.json({ success: true, policy: populated });
  } catch (err) {
    console.error('Error appending to policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// POST /api/company-policies/:id/acknowledge — Accept policy with signature
// ============================================
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { userId, user } = await getUser(req);
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const { signatureImage } = req.body;
    if (!signatureImage) return res.status(400).json({ success: false, message: 'Signature is required' });

    const policy = await CompanyPolicy.findOne({ _id: req.params.id, companyId: user.companyId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    const alreadyAcked = policy.acknowledgments.some(a => String(a.userId) === String(userId));
    if (alreadyAcked) return res.json({ success: true, message: 'Already accepted' });

    policy.acknowledgments.push({ userId, signatureImage, acknowledgedAt: new Date() });
    await policy.save();

    res.json({ success: true, message: 'Policy accepted' });
  } catch (err) {
    console.error('Error accepting policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PATCH /api/company-policies/:id/blocks/:index — Edit an existing block (owner/admin only)
// ============================================
router.patch('/:id/blocks/:index', async (req, res) => {
  try {
    const { userId, user } = await getUser(req);
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });
    if (!await canManagePolicy(user, userId)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Content is required' });

    const blockIndex = parseInt(req.params.index, 10);
    const policy = await CompanyPolicy.findOne({ _id: req.params.id, companyId: user.companyId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });
    if (blockIndex < 0 || blockIndex >= policy.blocks.length) {
      return res.status(400).json({ success: false, message: 'Invalid block index' });
    }

    policy.blocks[blockIndex].content = content.trim();
    policy.lastUpdatedBy = userId;
    await policy.save();

    const populated = await CompanyPolicy.findById(policy._id).populate('createdBy', 'fullName').lean();
    notifyTeam({ companyId: user.companyId, actorId: userId, title: 'Company Policy Updated', message: `The company policy "${policy.title}" has been updated. Tap to review.` });
    res.json({ success: true, policy: populated });
  } catch (err) {
    console.error('Error editing policy block:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PATCH /api/company-policies/:id/title — Update policy title (owner/admin only)
// ============================================
router.patch('/:id/title', async (req, res) => {
  try {
    const { userId, user } = await getUser(req);
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });
    if (!await canManagePolicy(user, userId)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { title } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Title is required' });

    const policy = await CompanyPolicy.findOne({ _id: req.params.id, companyId: user.companyId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    policy.title = title.trim();
    policy.lastUpdatedBy = userId;
    await policy.save();

    res.json({ success: true, title: policy.title });
  } catch (err) {
    console.error('Error updating policy title:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// PATCH /api/company-policies/:id/owner-signature — Set owner signature
// ============================================
router.patch('/:id/owner-signature', async (req, res) => {
  try {
    const { userId, user } = await getUser(req);
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });
    if (!await canManagePolicy(user, userId)) return res.status(403).json({ success: false, message: 'Not authorized' });

    const { signatureImage } = req.body;
    if (!signatureImage) return res.status(400).json({ success: false, message: 'Signature is required' });

    const policy = await CompanyPolicy.findOne({ _id: req.params.id, companyId: user.companyId });
    if (!policy) return res.status(404).json({ success: false, message: 'Policy not found' });

    policy.ownerSignatureImage = signatureImage;
    policy.ownerSignedAt = new Date();

    // Also update the owner's acknowledgment entry if it exists
    const company = await Company.findById(user.companyId).select('owner members').lean();
    const ownerAck = policy.acknowledgments.find(a => {
      if (company?.owner && String(a.userId) === String(company.owner)) return true;
      const member = company?.members?.find(m => m.user && String(m.user) === String(a.userId));
      return member?.roleInCompany === 'Owner';
    });
    if (ownerAck) {
      ownerAck.signatureImage = signatureImage;
      ownerAck.acknowledgedAt = policy.ownerSignedAt;
    }

    await policy.save();

    res.json({ success: true, ownerSignatureImage: policy.ownerSignatureImage, ownerSignedAt: policy.ownerSignedAt });
  } catch (err) {
    console.error('Error saving owner signature:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================
// DELETE /api/company-policies/:id — Delete policy (owner/admin only)
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const { userId, user } = await getUser(req);
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });
    if (!await canManagePolicy(user, userId)) return res.status(403).json({ success: false, message: 'Not authorized' });

    await CompanyPolicy.findOneAndDelete({ _id: req.params.id, companyId: user.companyId });
    res.json({ success: true, message: 'Policy deleted' });
  } catch (err) {
    console.error('Error deleting policy:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
