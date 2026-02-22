const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const LeaveApplication = require('../models/LeaveApplication');
const User = require('../models/User');

router.use(authenticateToken);

const getUser = async (userId) => User.findById(userId).select('companyId role fullName email').lean();

// Business day count (Mon–Fri) between two YYYY-MM-DD strings
function countDays(start, end) {
    let count = 0;
    const cur = new Date(start + 'T00:00:00');
    const last = new Date(end + 'T00:00:00');
    while (cur <= last) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++;
        cur.setDate(cur.getDate() + 1);
    }
    return Math.max(count, 1);
}

// ─── GET /api/leaves ───────────────────────────────────────────────────────────
// Returns own leaves (all roles) or all company leaves if Admin/HR
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getUser(userId);
        if (!user?.companyId) return res.json({ success: true, leaves: [] });

        const { year, status, all } = req.query;
        const isAdmin = ['Admin', 'Business Admin', 'HR'].includes(user.role);
        const filter = { companyId: user.companyId };

        // Non-admin only sees own leaves; admin can pass ?all=true
        if (!isAdmin || all !== 'true') filter.userId = userId;
        if (status) filter.status = status;
        if (year) {
            filter.startDate = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
        }

        const leaves = await LeaveApplication.find(filter)
            .populate('userId', 'fullName email')
            .populate('reviewedBy', 'fullName email')
            .sort({ startDate: -1 })
            .lean();

        res.json({ success: true, leaves });
    } catch (err) {
        console.error('leaves GET error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── POST /api/leaves ──────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getUser(userId);
        if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company found' });

        const { startDate, endDate, leaveType, reason } = req.body;
        if (!startDate || !endDate) return res.status(400).json({ success: false, message: 'Dates required' });
        if (startDate > endDate) return res.status(400).json({ success: false, message: 'Start must be before end' });

        const days = countDays(startDate, endDate);
        const leave = new LeaveApplication({ userId, companyId: user.companyId, startDate, endDate, days, leaveType: leaveType || 'casual', reason: reason || '' });
        await leave.save();
        const populated = await LeaveApplication.findById(leave._id).populate('userId', 'fullName email').lean();
        res.json({ success: true, leave: populated });
    } catch (err) {
        console.error('leaves POST error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── PUT /api/leaves/:id/status ───────────────────────────────────────────────
// Admin/HR: approve or reject
router.put('/:id/status', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getUser(userId);
        const isAdmin = ['Admin', 'Business Admin', 'HR'].includes(user.role);
        if (!isAdmin) return res.status(403).json({ success: false, message: 'Forbidden' });

        const { status, reviewNote } = req.body;
        if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

        const leave = await LeaveApplication.findOneAndUpdate(
            { _id: req.params.id, companyId: user.companyId },
            { status, reviewNote: reviewNote || '', reviewedBy: userId, updatedAt: new Date() },
            { new: true }
        ).populate('userId', 'fullName email').populate('reviewedBy', 'fullName email').lean();

        if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });
        res.json({ success: true, leave });
    } catch (err) {
        console.error('leaves status PUT error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── DELETE /api/leaves/:id ────────────────────────────────────────────────────
// Owner can delete only pending; admin can delete any
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await getUser(userId);
        const isAdmin = ['Admin', 'Business Admin', 'HR'].includes(user.role);

        const filter = { _id: req.params.id, companyId: user.companyId };
        if (!isAdmin) { filter.userId = userId; filter.status = 'pending'; }

        const deleted = await LeaveApplication.findOneAndDelete(filter);
        if (!deleted) return res.status(404).json({ success: false, message: 'Leave not found or cannot be deleted' });
        res.json({ success: true });
    } catch (err) {
        console.error('leaves DELETE error', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
