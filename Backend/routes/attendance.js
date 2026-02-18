const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Company = require('../models/Company');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// POST /api/attendance/heartbeat - Auto-track dashboard session
// Called by frontend every 5 minutes while dashboard is open
// ============================================
router.post('/heartbeat', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await User.findById(userId).select('companyId').lean();
        if (!user || !user.companyId) {
            return res.json({ success: true, message: 'No company associated' });
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const SESSION_GAP_MINUTES = 10; // If gap > 10 min, start new session

        // Find or create today's attendance
        let attendance = await Attendance.findOne({ userId, date: today });

        if (!attendance) {
            // First heartbeat of the day - create new attendance record
            attendance = new Attendance({
                userId,
                companyId: user.companyId,
                date: today,
                sessions: [{ loginAt: now, logoutAt: now }],
                status: 'present'
            });
        } else {
            // Update existing attendance
            const sessions = attendance.sessions;
            const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;

            if (lastSession) {
                const lastLogout = lastSession.logoutAt || lastSession.loginAt;
                const gapMinutes = (now - new Date(lastLogout)) / 60000;

                if (gapMinutes <= SESSION_GAP_MINUTES) {
                    // Extend current session
                    lastSession.logoutAt = now;
                } else {
                    // Start new session
                    sessions.push({ loginAt: now, logoutAt: now });
                }
            } else {
                sessions.push({ loginAt: now, logoutAt: now });
            }

            attendance.sessions = sessions;
        }

        // Determine status based on company settings
        const company = await Company.findById(user.companyId).select('hrSettings').lean();
        const workingHours = company?.hrSettings?.workingHoursPerDay || 8;
        const halfDayThreshold = company?.hrSettings?.halfDayThresholdHours || 4;

        // Calculate total minutes
        let totalMinutes = 0;
        for (const session of attendance.sessions) {
            if (session.loginAt && session.logoutAt) {
                totalMinutes += Math.round((new Date(session.logoutAt) - new Date(session.loginAt)) / 60000);
            }
        }
        attendance.totalMinutes = totalMinutes;

        const totalHours = totalMinutes / 60;
        if (totalHours >= workingHours) {
            attendance.status = 'present';
        } else if (totalHours >= halfDayThreshold) {
            attendance.status = 'half-day';
        } else {
            attendance.status = 'present'; // Still present, just not full day yet
        }

        await attendance.save();

        res.json({
            success: true,
            attendance: {
                date: today,
                totalMinutes: attendance.totalMinutes,
                totalHours: Math.round(totalMinutes / 6) / 10, // 1 decimal
                status: attendance.status,
                sessionsCount: attendance.sessions.length
            }
        });
    } catch (error) {
        console.error('Error processing attendance heartbeat:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// GET /api/attendance/summary - Get attendance for all employees
// ============================================
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await User.findById(userId).select('companyId role').lean();
        if (!user || !user.companyId) {
            return res.json({ success: true, records: [] });
        }

        const { startDate, endDate, employeeId } = req.query;

        // Default: current month
        const now = new Date();
        const start = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const end = endDate || now.toISOString().split('T')[0];

        const filter = {
            companyId: user.companyId,
            date: { $gte: start, $lte: end }
        };

        if (employeeId) {
            filter.userId = employeeId;
        }

        const records = await Attendance.find(filter)
            .populate('userId', 'fullName email profileImage department jobTitle')
            .sort({ date: -1, 'userId': 1 })
            .lean();

        // Get company settings
        const company = await Company.findById(user.companyId).select('hrSettings').lean();
        const workingHoursPerDay = company?.hrSettings?.workingHoursPerDay || 8;

        // Enhance records with hours info
        const enhancedRecords = records.map(r => ({
            ...r,
            totalHours: Math.round((r.totalMinutes || 0) / 6) / 10,
            workingHoursPerDay,
            completionPercent: Math.min(100, Math.round(((r.totalMinutes || 0) / (workingHoursPerDay * 60)) * 100)),
            firstLogin: r.sessions?.[0]?.loginAt || null,
            lastLogout: r.sessions?.[r.sessions.length - 1]?.logoutAt || null
        }));

        res.json({ success: true, records: enhancedRecords, workingHoursPerDay });
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// GET /api/attendance/my - Get current user's attendance
// ============================================
router.get('/my', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await User.findById(userId).select('companyId').lean();
        if (!user || !user.companyId) {
            return res.json({ success: true, records: [] });
        }

        const { startDate, endDate } = req.query;
        const now = new Date();
        const start = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const end = endDate || now.toISOString().split('T')[0];

        const records = await Attendance.find({
            userId,
            companyId: user.companyId,
            date: { $gte: start, $lte: end }
        }).sort({ date: -1 }).lean();

        const company = await Company.findById(user.companyId).select('hrSettings').lean();
        const workingHoursPerDay = company?.hrSettings?.workingHoursPerDay || 8;

        const enhancedRecords = records.map(r => ({
            ...r,
            totalHours: Math.round((r.totalMinutes || 0) / 6) / 10,
            workingHoursPerDay,
            completionPercent: Math.min(100, Math.round(((r.totalMinutes || 0) / (workingHoursPerDay * 60)) * 100))
        }));

        res.json({ success: true, records: enhancedRecords, workingHoursPerDay });
    } catch (error) {
        console.error('Error fetching own attendance:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
