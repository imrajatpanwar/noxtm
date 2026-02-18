const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Incentive = require('../models/Incentive');
const User = require('../models/User');

// All routes require authentication
router.use(authenticateToken);

const getCompanyId = async (userId) => {
    const user = await User.findById(userId).select('companyId role').lean();
    return user;
};

// ============================================
// GET /api/incentives - List incentives
// ============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) return res.json({ success: true, incentives: [] });

        const { status, type, employeeId, startDate, endDate } = req.query;
        const filter = { companyId: user.companyId };

        if (status) filter.status = status;
        if (type) filter.type = type;
        if (employeeId) filter.userId = employeeId;
        if (startDate || endDate) {
            filter.awardedDate = {};
            if (startDate) filter.awardedDate.$gte = new Date(startDate);
            if (endDate) filter.awardedDate.$lte = new Date(endDate);
        }

        const incentives = await Incentive.find(filter)
            .populate('userId', 'fullName email profileImage department jobTitle')
            .populate('awardedBy', 'fullName email')
            .populate('approvedBy', 'fullName email')
            .sort({ awardedDate: -1 })
            .lean();

        res.json({ success: true, incentives });
    } catch (error) {
        console.error('Error fetching incentives:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// GET /api/incentives/stats - Incentive statistics
// ============================================
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) return res.json({ success: true, stats: {} });

        const filter = { companyId: user.companyId };

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const [total, pending, approved, paid, thisMonth] = await Promise.all([
            Incentive.countDocuments(filter),
            Incentive.countDocuments({ ...filter, status: 'pending' }),
            Incentive.countDocuments({ ...filter, status: 'approved' }),
            Incentive.countDocuments({ ...filter, status: 'paid' }),
            Incentive.countDocuments({ ...filter, awardedDate: { $gte: monthStart } })
        ]);

        // Total amount awarded this month
        const monthIncentives = await Incentive.find({
            ...filter,
            awardedDate: { $gte: monthStart },
            status: { $in: ['approved', 'paid'] }
        }).select('amount').lean();
        const totalAmountThisMonth = monthIncentives.reduce((sum, i) => sum + (i.amount || 0), 0);

        res.json({
            success: true,
            stats: { total, pending, approved, paid, thisMonth, totalAmountThisMonth }
        });
    } catch (error) {
        console.error('Error fetching incentive stats:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// POST /api/incentives - Create incentive
// ============================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        if (user.role !== 'Admin' && user.role !== 'Business Admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const { employeeId, type, title, amount, currency, reason, awardedDate, notes } = req.body;

        if (!employeeId || !title) {
            return res.status(400).json({ success: false, message: 'Employee and title are required' });
        }

        const incentive = new Incentive({
            companyId: user.companyId,
            userId: employeeId,
            type: type || 'bonus',
            title: title.trim(),
            amount: amount || 0,
            currency: currency || 'INR',
            reason: reason?.trim(),
            awardedDate: awardedDate ? new Date(awardedDate) : new Date(),
            awardedBy: userId,
            notes: notes?.trim()
        });

        await incentive.save();

        const populated = await Incentive.findById(incentive._id)
            .populate('userId', 'fullName email profileImage department')
            .populate('awardedBy', 'fullName email')
            .lean();

        res.status(201).json({ success: true, incentive: populated });
    } catch (error) {
        console.error('Error creating incentive:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// PUT /api/incentives/:id - Update incentive
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        if (user.role !== 'Admin' && user.role !== 'Business Admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const incentive = await Incentive.findOne({ _id: req.params.id, companyId: user.companyId });
        if (!incentive) {
            return res.status(404).json({ success: false, message: 'Incentive not found' });
        }

        const { type, title, amount, currency, reason, status, notes } = req.body;
        if (type) incentive.type = type;
        if (title) incentive.title = title.trim();
        if (amount !== undefined) incentive.amount = amount;
        if (currency) incentive.currency = currency;
        if (reason !== undefined) incentive.reason = reason?.trim();
        if (notes !== undefined) incentive.notes = notes?.trim();

        if (status && status !== incentive.status) {
            incentive.status = status;
            if (status === 'approved') {
                incentive.approvedBy = userId;
                incentive.approvedAt = new Date();
            }
        }

        await incentive.save();

        const populated = await Incentive.findById(incentive._id)
            .populate('userId', 'fullName email profileImage department')
            .populate('awardedBy', 'fullName email')
            .populate('approvedBy', 'fullName email')
            .lean();

        res.json({ success: true, incentive: populated });
    } catch (error) {
        console.error('Error updating incentive:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// DELETE /api/incentives/:id - Delete incentive
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        if (user.role !== 'Admin' && user.role !== 'Business Admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const result = await Incentive.findOneAndDelete({ _id: req.params.id, companyId: user.companyId });
        if (!result) {
            return res.status(404).json({ success: false, message: 'Incentive not found' });
        }

        res.json({ success: true, message: 'Incentive deleted' });
    } catch (error) {
        console.error('Error deleting incentive:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
