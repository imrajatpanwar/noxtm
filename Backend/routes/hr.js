const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Company = require('../models/Company');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');
const Incentive = require('../models/Incentive');

// All routes require authentication
router.use(authenticateToken);

// Helper: get user's company
const getUserCompany = async (userId) => {
    const user = await User.findById(userId).select('companyId role').lean();
    if (!user || !user.companyId) return null;
    return { user, companyId: user.companyId };
};

// ============================================
// GET /api/hr/overview - HR Dashboard overview stats
// ============================================
router.get('/overview', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const result = await getUserCompany(userId);
        if (!result) return res.json({ success: true, stats: {} });

        const { companyId } = result;
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Get company with members
        const company = await Company.findById(companyId)
            .populate('members.user', 'fullName email profileImage role department jobTitle lastLogin')
            .lean();

        const totalEmployees = company?.members?.length || 0;

        // Today's attendance
        const todayAttendance = await Attendance.countDocuments({
            companyId,
            date: today,
            status: { $in: ['present', 'half-day', 'late'] }
        });

        // Absent today (total - present - on holiday/leave)
        const onLeave = await Attendance.countDocuments({
            companyId,
            date: today,
            status: 'leave'
        });

        // Upcoming holidays (next 30 days)
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        const upcomingHolidays = await Holiday.find({
            companyId,
            date: { $gte: today, $lte: thirtyDaysLater.toISOString().split('T')[0] }
        }).sort({ date: 1 }).limit(5).lean();

        // Pending incentives
        const pendingIncentives = await Incentive.countDocuments({
            companyId,
            status: 'pending'
        });

        // Total incentives this month
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const totalIncentivesThisMonth = await Incentive.countDocuments({
            companyId,
            awardedDate: { $gte: monthStart }
        });

        // Department breakdown
        const departmentMap = {};
        if (company?.members) {
            for (const member of company.members) {
                const dept = member.department || 'Unassigned';
                departmentMap[dept] = (departmentMap[dept] || 0) + 1;
            }
        }

        // HR Settings
        const hrSettings = company?.hrSettings || { workingHoursPerDay: 8, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], halfDayThresholdHours: 4 };

        res.json({
            success: true,
            stats: {
                totalEmployees,
                presentToday: todayAttendance,
                absentToday: Math.max(0, totalEmployees - todayAttendance - onLeave),
                onLeave,
                upcomingHolidays,
                pendingIncentives,
                totalIncentivesThisMonth,
                departments: departmentMap,
                hrSettings
            }
        });
    } catch (error) {
        console.error('Error fetching HR overview:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// GET /api/hr/employees - List all company members
// ============================================
router.get('/employees', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const result = await getUserCompany(userId);
        if (!result) return res.json({ success: true, employees: [] });

        const { companyId } = result;
        const { search, department } = req.query;

        const company = await Company.findById(companyId)
            .populate('members.user', 'fullName email profileImage role department jobTitle phoneNumber lastLogin dateOfBirth address city state country linkedIn bio qualification institute yearOfPassing emergencyContact createdAt')
            .lean();

        let employees = (company?.members || [])
            .filter(m => m.user) // Filter out null user refs
            .map(m => ({
                _id: m.user._id,
                fullName: m.user.fullName,
                email: m.user.email,
                profileImage: m.user.profileImage,
                role: m.user.role,
                roleInCompany: m.roleInCompany,
                department: m.department || m.user.department,
                jobTitle: m.jobTitle || m.user.jobTitle,
                phoneNumber: m.user.phoneNumber,
                lastLogin: m.user.lastLogin,
                dateOfBirth: m.user.dateOfBirth,
                address: m.user.address,
                city: m.user.city,
                state: m.user.state,
                country: m.user.country,
                linkedIn: m.user.linkedIn,
                bio: m.user.bio,
                qualification: m.user.qualification,
                institute: m.user.institute,
                yearOfPassing: m.user.yearOfPassing,
                emergencyContact: m.user.emergencyContact,
                joinedAt: m.joinedAt,
                invitedAt: m.invitedAt,
                createdAt: m.user.createdAt
            }));

        // Search filter
        if (search) {
            const q = search.toLowerCase();
            employees = employees.filter(e =>
                e.fullName?.toLowerCase().includes(q) ||
                e.email?.toLowerCase().includes(q) ||
                e.department?.toLowerCase().includes(q) ||
                e.jobTitle?.toLowerCase().includes(q)
            );
        }

        // Department filter
        if (department) {
            employees = employees.filter(e => e.department === department);
        }

        res.json({ success: true, employees, total: employees.length });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// GET /api/hr/employees/:id - Single employee detail
// ============================================
router.get('/employees/:id', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const result = await getUserCompany(userId);
        if (!result) return res.status(404).json({ success: false, message: 'Company not found' });

        const employee = await User.findById(req.params.id)
            .select('-password')
            .lean();

        if (!employee || employee.companyId?.toString() !== result.companyId.toString()) {
            return res.status(404).json({ success: false, message: 'Employee not found' });
        }

        // Get attendance data for this month
        const monthStart = new Date();
        monthStart.setDate(1);
        const today = new Date().toISOString().split('T')[0];
        const monthStartStr = monthStart.toISOString().split('T')[0];

        const attendance = await Attendance.find({
            userId: req.params.id,
            companyId: result.companyId,
            date: { $gte: monthStartStr, $lte: today }
        }).sort({ date: -1 }).lean();

        const totalHoursThisMonth = attendance.reduce((sum, a) => sum + (a.totalMinutes || 0), 0) / 60;

        res.json({
            success: true,
            employee,
            attendance: {
                records: attendance,
                totalHoursThisMonth: Math.round(totalHoursThisMonth * 10) / 10,
                daysPresent: attendance.filter(a => a.status === 'present' || a.status === 'half-day').length
            }
        });
    } catch (error) {
        console.error('Error fetching employee detail:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// GET /api/hr/settings - Get HR settings
// ============================================
router.get('/settings', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const result = await getUserCompany(userId);
        if (!result) return res.status(404).json({ success: false, message: 'Company not found' });

        const company = await Company.findById(result.companyId).select('hrSettings').lean();
        res.json({
            success: true,
            settings: company?.hrSettings || { workingHoursPerDay: 8, workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], halfDayThresholdHours: 4 }
        });
    } catch (error) {
        console.error('Error fetching HR settings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ============================================
// PUT /api/hr/settings - Update HR settings (Admin/Business Admin only)
// ============================================
router.put('/settings', async (req, res) => {
    try {
        const userId = req.user.userId || req.user._id;
        const result = await getUserCompany(userId);
        if (!result) return res.status(404).json({ success: false, message: 'Company not found' });

        // Check permission
        const user = await User.findById(userId).select('role').lean();
        if (user?.role !== 'Admin' && user?.role !== 'Business Admin') {
            return res.status(403).json({ success: false, message: 'Only Admin or Business Admin can update HR settings' });
        }

        const { workingHoursPerDay, workingDays, halfDayThresholdHours } = req.body;
        const update = {};
        if (workingHoursPerDay !== undefined) update['hrSettings.workingHoursPerDay'] = workingHoursPerDay;
        if (workingDays !== undefined) update['hrSettings.workingDays'] = workingDays;
        if (halfDayThresholdHours !== undefined) update['hrSettings.halfDayThresholdHours'] = halfDayThresholdHours;

        const company = await Company.findByIdAndUpdate(
            result.companyId,
            { $set: update },
            { new: true }
        ).select('hrSettings').lean();

        res.json({ success: true, settings: company.hrSettings });
    } catch (error) {
        console.error('Error updating HR settings:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
