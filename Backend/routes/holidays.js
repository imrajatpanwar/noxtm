const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Holiday = require('../models/Holiday');
const User = require('../models/User');

// All routes require authentication
router.use(authenticateToken);

// Helper: get companyId
const getCompanyId = async (userId) => {
    const user = await User.findById(userId).select('companyId role').lean();
    return user;
};

// ============================================
// GET /api/holidays - List all holidays for company
// ============================================
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) return res.json({ success: true, holidays: [] });

        const { year, month, type } = req.query;
        const filter = { companyId: user.companyId };

        if (year) {
            const start = `${year}-01-01`;
            const end = `${year}-12-31`;
            filter.date = { $gte: start, $lte: end };
        }

        if (month && year) {
            const paddedMonth = String(month).padStart(2, '0');
            filter.date = {
                $gte: `${year}-${paddedMonth}-01`,
                $lte: `${year}-${paddedMonth}-31`
            };
        }

        if (type) filter.type = type;

        const holidays = await Holiday.find(filter)
            .populate('createdBy', 'fullName email')
            .sort({ date: 1 })
            .lean();

        res.json({ success: true, holidays });
    } catch (error) {
        console.error('Error fetching holidays:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// POST /api/holidays - Add a holiday (Admin/Business Admin/HR only)
// ============================================
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getCompanyId(userId);
        if (!user?.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        // Permission check
        if (user.role !== 'Admin' && user.role !== 'Business Admin') {
            return res.status(403).json({ success: false, message: 'Only Admin or Business Admin can add holidays' });
        }

        const { name, date, type, description, isRecurring } = req.body;

        if (!name || !date) {
            return res.status(400).json({ success: false, message: 'Name and date are required' });
        }

        const holiday = new Holiday({
            companyId: user.companyId,
            name: name.trim(),
            date,
            type: type || 'company',
            description: description?.trim(),
            isRecurring: isRecurring || false,
            createdBy: userId
        });

        await holiday.save();

        const populated = await Holiday.findById(holiday._id)
            .populate('createdBy', 'fullName email')
            .lean();

        res.status(201).json({ success: true, holiday: populated });
    } catch (error) {
        console.error('Error adding holiday:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// PUT /api/holidays/:id - Update a holiday
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

        const holiday = await Holiday.findOne({ _id: req.params.id, companyId: user.companyId });
        if (!holiday) {
            return res.status(404).json({ success: false, message: 'Holiday not found' });
        }

        const { name, date, type, description, isRecurring } = req.body;
        if (name) holiday.name = name.trim();
        if (date) holiday.date = date;
        if (type) holiday.type = type;
        if (description !== undefined) holiday.description = description?.trim();
        if (isRecurring !== undefined) holiday.isRecurring = isRecurring;

        await holiday.save();

        const populated = await Holiday.findById(holiday._id)
            .populate('createdBy', 'fullName email')
            .lean();

        res.json({ success: true, holiday: populated });
    } catch (error) {
        console.error('Error updating holiday:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// DELETE /api/holidays/:id - Delete a holiday
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

        const result = await Holiday.findOneAndDelete({ _id: req.params.id, companyId: user.companyId });
        if (!result) {
            return res.status(404).json({ success: false, message: 'Holiday not found' });
        }

        res.json({ success: true, message: 'Holiday deleted' });
    } catch (error) {
        console.error('Error deleting holiday:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
