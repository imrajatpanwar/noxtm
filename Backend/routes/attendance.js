const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Company = require('../models/Company');

// All routes require authentication
router.use(authenticateToken);

// ============================================
// GET /api/attendance/today - Get today's attendance for logged-in user
// ============================================
router.get('/today', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await User.findById(userId).select('companyId').lean();
        if (!user || !user.companyId) {
            return res.json({ success: true, attendance: null });
        }

        const today = new Date().toISOString().split('T')[0];
        const attendance = await Attendance.findOne({ userId, date: today }).lean();

        const company = await Company.findById(user.companyId).select('hrSettings').lean();
        const workingHoursPerDay = company?.hrSettings?.workingHoursPerDay || 8;

        if (!attendance) {
            return res.json({
                success: true,
                attendance: null,
                workingHoursPerDay,
                isClockedIn: false
            });
        }

        // Check if there's an active (open) session
        const lastSession = attendance.sessions?.[attendance.sessions.length - 1];
        const isClockedIn = lastSession && !lastSession.logoutAt;

        // Calculate total minutes including live active session
        let totalMinutes = 0;
        for (const session of attendance.sessions) {
            if (session.loginAt && session.logoutAt) {
                totalMinutes += Math.round((new Date(session.logoutAt) - new Date(session.loginAt)) / 60000);
            } else if (session.loginAt && !session.logoutAt) {
                totalMinutes += Math.round((new Date() - new Date(session.loginAt)) / 60000);
            }
        }

        res.json({
            success: true,
            attendance: {
                ...attendance,
                totalMinutes,
                totalHours: Math.round(totalMinutes / 6) / 10
            },
            workingHoursPerDay,
            isClockedIn,
            activeSessionStart: isClockedIn ? lastSession.loginAt : null
        });
    } catch (error) {
        console.error('Error fetching today attendance:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// POST /api/attendance/clock-in - Explicitly clock in
// ============================================
router.post('/clock-in', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await User.findById(userId).select('companyId').lean();
        if (!user || !user.companyId) {
            return res.json({ success: true, message: 'No company associated' });
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        let attendance = await Attendance.findOne({ userId, date: today });

        if (attendance) {
            // Check if already clocked in (open session)
            const lastSession = attendance.sessions[attendance.sessions.length - 1];
            if (lastSession && !lastSession.logoutAt) {
                return res.status(400).json({ success: false, message: 'Already clocked in' });
            }
            // Start new session
            attendance.sessions.push({ loginAt: now });
        } else {
            attendance = new Attendance({
                userId,
                companyId: user.companyId,
                date: today,
                sessions: [{ loginAt: now }],
                status: 'present'
            });
        }

        await attendance.save();

        res.json({
            success: true,
            message: 'Clocked in successfully',
            attendance: {
                date: today,
                totalMinutes: attendance.totalMinutes,
                sessionsCount: attendance.sessions.length,
                status: attendance.status
            },
            activeSessionStart: now
        });
    } catch (error) {
        console.error('Error clocking in:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// POST /api/attendance/clock-out - Explicitly clock out
// ============================================
router.post('/clock-out', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const user = await User.findById(userId).select('companyId').lean();
        if (!user || !user.companyId) {
            return res.status(400).json({ success: false, message: 'No company associated' });
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const attendance = await Attendance.findOne({ userId, date: today });
        if (!attendance) {
            return res.status(400).json({ success: false, message: 'No attendance record for today. Clock in first.' });
        }

        const lastSession = attendance.sessions[attendance.sessions.length - 1];
        if (!lastSession || lastSession.logoutAt) {
            return res.status(400).json({ success: false, message: 'Not currently clocked in' });
        }

        lastSession.logoutAt = now;
        lastSession.durationMinutes = Math.round((now - new Date(lastSession.loginAt)) / 60000);

        // Recalculate total
        let totalMinutes = 0;
        for (const session of attendance.sessions) {
            if (session.loginAt && session.logoutAt) {
                totalMinutes += Math.round((new Date(session.logoutAt) - new Date(session.loginAt)) / 60000);
            }
        }
        attendance.totalMinutes = totalMinutes;

        // Determine status
        const company = await Company.findById(user.companyId).select('hrSettings').lean();
        const workingHours = company?.hrSettings?.workingHoursPerDay || 8;
        const halfDayThreshold = company?.hrSettings?.halfDayThresholdHours || 4;
        const totalHours = totalMinutes / 60;

        if (totalHours >= workingHours) {
            attendance.status = 'present';
        } else if (totalHours >= halfDayThreshold) {
            attendance.status = 'half-day';
        } else {
            attendance.status = 'present';
        }

        await attendance.save();

        res.json({
            success: true,
            message: 'Clocked out successfully',
            attendance: {
                date: today,
                totalMinutes: attendance.totalMinutes,
                totalHours: Math.round(totalMinutes / 6) / 10,
                sessionsCount: attendance.sessions.length,
                status: attendance.status,
                lastSessionDuration: lastSession.durationMinutes
            }
        });
    } catch (error) {
        console.error('Error clocking out:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

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
        const SESSION_GAP_MINUTES = 10;

        const company = await Company.findById(user.companyId).select('hrSettings').lean();
        const workingHours = company?.hrSettings?.workingHoursPerDay || 8;
        const halfDayThreshold = company?.hrSettings?.halfDayThresholdHours || 4;

        // Fetch fresh copy each time to avoid VersionError on concurrent saves
        let attendance = await Attendance.findOne({ userId, date: today });

        if (!attendance) {
            try {
                attendance = await Attendance.create({
                    userId,
                    companyId: user.companyId,
                    date: today,
                    sessions: [{ loginAt: now, logoutAt: now }],
                    status: 'present',
                    totalMinutes: 0
                });
            } catch (createErr) {
                // Race condition: another request created it — fetch and continue
                if (createErr.code === 11000) {
                    attendance = await Attendance.findOne({ userId, date: today });
                } else {
                    throw createErr;
                }
            }
        }

        // Re-fetch fresh copy and apply update atomically
        const lastSession = attendance.sessions.length > 0
            ? attendance.sessions[attendance.sessions.length - 1]
            : null;
        const lastLogout = lastSession ? (lastSession.logoutAt || lastSession.loginAt) : null;
        const gapMinutes = lastLogout ? (now - new Date(lastLogout)) / 60000 : SESSION_GAP_MINUTES + 1;

        let updateOp;
        if (lastSession && gapMinutes <= SESSION_GAP_MINUTES) {
            // Extend the last session's logoutAt
            updateOp = {
                $set: { [`sessions.${attendance.sessions.length - 1}.logoutAt`]: now }
            };
        } else {
            // Push a new session
            updateOp = {
                $push: { sessions: { loginAt: now, logoutAt: now } }
            };
        }

        // Use findOneAndUpdate to avoid version conflicts
        const updated = await Attendance.findOneAndUpdate(
            { userId, date: today },
            updateOp,
            { new: true }
        );

        // Recalculate total minutes
        let totalMinutes = 0;
        for (const session of updated.sessions) {
            if (session.loginAt && session.logoutAt) {
                totalMinutes += Math.round((new Date(session.logoutAt) - new Date(session.loginAt)) / 60000);
            }
        }

        const totalHours = totalMinutes / 60;
        const status = totalHours >= halfDayThreshold ? 'present' : 'present';

        await Attendance.findOneAndUpdate(
            { userId, date: today },
            { $set: { totalMinutes, status } }
        );

        res.json({
            success: true,
            attendance: {
                date: today,
                totalMinutes,
                totalHours: Math.round(totalMinutes / 6) / 10,
                status,
                sessionsCount: updated.sessions.length
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
