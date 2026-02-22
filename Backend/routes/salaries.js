const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const Salary = require('../models/Salary');
const User = require('../models/User');
const Company = require('../models/Company');
const Incentive = require('../models/Incentive');
const Attendance = require('../models/Attendance');
const LeaveApplication = require('../models/LeaveApplication');

// Helper: get working days count in a month
function getWorkingDaysInMonth(year, month, workingDayNames) {
  const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
  const workingDayNums = workingDayNames.map(d => dayMap[d]).filter(d => d !== undefined);
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (workingDayNums.includes(dow)) count++;
  }
  return count;
}

// Helper: compute attendance deduction for an employee for a given month
async function computeAttendanceDeduction(employeeId, companyId, month, year, perDaySalary, deductionSettings) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const attRecords = await Attendance.find({
    userId: employeeId,
    companyId,
    date: { $gte: startDate, $lte: endDate }
  }).lean();

  const leaves = await LeaveApplication.find({
    userId: employeeId,
    companyId,
    status: 'approved',
    startDate: { $lte: endDate },
    endDate: { $gte: startDate }
  }).lean();

  let halfDayCount = 0;
  let lateCount = 0;
  let paidLeaveDays = 0;
  let absentDays = 0;
  let daysPresent = 0;

  attRecords.forEach(r => {
    if (r.status === 'half-day') halfDayCount++;
    else if (r.status === 'late') lateCount++;
    else if (r.status === 'present') daysPresent++;
    else if (r.status === 'absent') absentDays++;
    else if (r.status === 'leave') paidLeaveDays++;
  });

  leaves.forEach(l => {
    if (l.leaveType !== 'unpaid') {
      const ls = new Date(Math.max(new Date(l.startDate), new Date(startDate)));
      const le = new Date(Math.min(new Date(l.endDate), new Date(endDate)));
      const days = Math.ceil((le - ls) / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) paidLeaveDays += days;
    }
  });

  const attLeaveDays = attRecords.filter(r => r.status === 'leave').length;
  paidLeaveDays = Math.max(paidLeaveDays - attLeaveDays, 0) + attLeaveDays;

  const pLeave = deductionSettings?.paidLeavePercent || 0;
  const pHalf = deductionSettings?.halfDayPercent || 50;
  const pLate = deductionSettings?.latePercent || 0;

  const paidLeaveDeduction = perDaySalary * paidLeaveDays * (pLeave / 100);
  const halfDayDeduction = perDaySalary * halfDayCount * (pHalf / 100);
  const lateDeduction = perDaySalary * lateCount * (pLate / 100);
  const totalDeduction = paidLeaveDeduction + halfDayDeduction + lateDeduction;

  return {
    attendanceDeduction: Math.round(totalDeduction * 100) / 100,
    attendanceBreakdown: {
      paidLeaveDays,
      halfDayCount,
      lateCount,
      absentDays,
      paidLeaveDeduction: Math.round(paidLeaveDeduction * 100) / 100,
      halfDayDeduction: Math.round(halfDayDeduction * 100) / 100,
      lateDeduction: Math.round(lateDeduction * 100) / 100,
      daysPresent,
      totalWorkingDays: 0
    }
  };
}

// GET /api/salaries/employees - list all employees for dropdown
router.get('/employees', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user || !user.companyId) return res.json({ success: true, employees: [] });

    const company = await Company.findById(user.companyId)
      .populate('members.user', 'fullName email department jobTitle')
      .lean();

    const employees = (company?.members || [])
      .filter(m => m.user)
      .map(m => ({
        _id: m.user._id,
        fullName: m.user.fullName,
        email: m.user.email,
        department: m.department || m.user.department || '',
        designation: m.jobTitle || m.user.jobTitle || '',
        roleInCompany: m.roleInCompany || 'Employee'
      }));

    res.json({ success: true, employees });
  } catch (err) {
    console.error('Error fetching employees for salary:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/salaries/deduction-settings - get salary deduction percentages
router.get('/deduction-settings', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.json({ success: true, settings: {} });

    const company = await Company.findById(user.companyId).select('hrSettings').lean();
    res.json({
      success: true,
      settings: company?.hrSettings?.salaryDeductions || {
        paidLeavePercent: 0,
        halfDayPercent: 50,
        latePercent: 0,
        absentPercent: 100
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/salaries/deduction-settings - update salary deduction percentages
router.put('/deduction-settings', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const { paidLeavePercent, halfDayPercent, latePercent, absentPercent } = req.body;

    await Company.findByIdAndUpdate(user.companyId, {
      'hrSettings.salaryDeductions.paidLeavePercent': parseFloat(paidLeavePercent) || 0,
      'hrSettings.salaryDeductions.halfDayPercent': parseFloat(halfDayPercent) || 50,
      'hrSettings.salaryDeductions.latePercent': parseFloat(latePercent) || 0,
      'hrSettings.salaryDeductions.absentPercent': parseFloat(absentPercent) || 100
    });

    res.json({ success: true, message: 'Deduction settings updated' });
  } catch (err) {
    console.error('Error updating deduction settings:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/salaries/stats - salary stats
router.get('/stats', auth, async (req, res) => {
  try {
    const companyId = req.user.company;
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    const salaries = await Salary.find({ company: companyId, month, year });

    const totalGross = salaries.reduce((s, r) => s + r.grossEarnings, 0);
    const totalNet = salaries.reduce((s, r) => s + r.netSalary, 0);
    const totalDeductions = salaries.reduce((s, r) => s + r.totalDeductions, 0);
    const totalAttendanceDeductions = salaries.reduce((s, r) => s + (r.attendanceDeduction || 0), 0);
    const totalIncentives = salaries.reduce((s, r) => s + (r.incentiveAmount || 0), 0);
    const paidCount = salaries.filter(r => r.status === 'paid').length;
    const pendingCount = salaries.filter(r => r.status === 'pending').length;

    res.json({
      success: true,
      stats: {
        totalEmployees: salaries.length,
        totalGross, totalNet, totalDeductions,
        totalAttendanceDeductions, totalIncentives,
        paidCount, pendingCount, month, year
      }
    });
  } catch (err) {
    console.error('Error fetching salary stats:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/salaries - list salaries
router.get('/', auth, async (req, res) => {
  try {
    const companyId = req.user.company;
    const { month, year, status, search } = req.query;
    const filter = { company: companyId };

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeEmail: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const salaries = await Salary.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, salaries });
  } catch (err) {
    console.error('Error fetching salaries:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/salaries/:id - single salary
router.get('/:id', auth, async (req, res) => {
  try {
    const salary = await Salary.findOne({ _id: req.params.id, company: req.user.company });
    if (!salary) return res.status(404).json({ success: false, message: 'Salary record not found' });
    res.json({ success: true, salary });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/salaries - create salary record (with auto-incentive and attendance deduction)
router.post('/', auth, async (req, res) => {
  try {
    const {
      employee, employeeName, employeeEmail, designation, department,
      basicSalary, hra, allowances, bonus, overtime, otherEarnings,
      tax, providentFund, insurance, loanDeduction, otherDeductions,
      currency, payPeriod, month, year, paymentDate, paymentMethod, status, notes,
      skipAttendanceCalc
    } = req.body;

    if (!employee || !employeeName || !basicSalary || !month || !year) {
      return res.status(400).json({ success: false, message: 'Employee, basic salary, month, and year are required' });
    }

    const companyId = req.user.company;

    // Fetch incentives for this employee for this month/year
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const incentives = await Incentive.find({
      companyId,
      userId: employee,
      status: { $in: ['approved', 'paid'] },
      awardedDate: { $gte: startOfMonth, $lte: endOfMonth }
    }).lean();

    const incentiveAmount = incentives.reduce((s, inc) => s + (inc.amount || 0), 0);
    const incentiveDetails = incentives.map(inc => ({
      title: inc.title, amount: inc.amount, type: inc.type, incentiveId: inc._id
    }));

    // Compute attendance deduction if not skipped
    let attendanceDeduction = 0;
    let attendanceBreakdown = {};
    if (!skipAttendanceCalc) {
      const company = await Company.findById(companyId).select('hrSettings').lean();
      const deductionSettings = company?.hrSettings?.salaryDeductions;
      const workingDays = company?.hrSettings?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const totalWorkingDays = getWorkingDaysInMonth(parseInt(year), parseInt(month), workingDays);
      const perDaySalary = (parseFloat(basicSalary) || 0) / totalWorkingDays;

      const attResult = await computeAttendanceDeduction(employee, companyId, parseInt(month), parseInt(year), perDaySalary, deductionSettings);
      attendanceDeduction = attResult.attendanceDeduction;
      attendanceBreakdown = { ...attResult.attendanceBreakdown, totalWorkingDays };
    }

    const salary = new Salary({
      company: companyId,
      employee, employeeName, employeeEmail, designation, department,
      basicSalary: parseFloat(basicSalary) || 0,
      hra: parseFloat(hra) || 0,
      allowances: parseFloat(allowances) || 0,
      bonus: parseFloat(bonus) || 0,
      overtime: parseFloat(overtime) || 0,
      otherEarnings: parseFloat(otherEarnings) || 0,
      incentiveAmount, incentiveDetails,
      tax: parseFloat(tax) || 0,
      providentFund: parseFloat(providentFund) || 0,
      insurance: parseFloat(insurance) || 0,
      loanDeduction: parseFloat(loanDeduction) || 0,
      otherDeductions: parseFloat(otherDeductions) || 0,
      attendanceDeduction, attendanceBreakdown,
      currency, payPeriod, month: parseInt(month), year: parseInt(year),
      paymentDate: paymentDate || null,
      paymentMethod, status: status || 'pending', notes,
      createdBy: req.user.userId
    });

    await salary.save();
    res.status(201).json({ success: true, salary });
  } catch (err) {
    console.error('Error creating salary:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/salaries/generate - auto-generate salary records for all employees
router.post('/generate', auth, async (req, res) => {
  try {
    const { month, year, currency, payPeriod } = req.body;
    if (!month || !year) return res.status(400).json({ success: false, message: 'Month and year required' });

    const userId = req.user.userId || req.user._id;
    const user = await User.findById(userId).select('companyId').lean();
    if (!user?.companyId) return res.status(400).json({ success: false, message: 'No company' });

    const companyId = user.companyId;
    const company = await Company.findById(companyId)
      .populate('members.user', 'fullName email department jobTitle')
      .lean();

    const deductionSettings = company?.hrSettings?.salaryDeductions;
    const workingDays = company?.hrSettings?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const totalWorkingDays = getWorkingDaysInMonth(parseInt(year), parseInt(month), workingDays);

    const employees = (company?.members || []).filter(m => m.user);

    const existingRecords = await Salary.find({
      company: companyId, month: parseInt(month), year: parseInt(year)
    }).select('employee').lean();
    const existingIds = new Set(existingRecords.map(r => r.employee.toString()));

    const newEmployees = employees.filter(m => !existingIds.has(m.user._id.toString()));

    const results = [];
    for (const m of newEmployees) {
      const emp = m.user;
      const lastSalary = await Salary.findOne({
        company: companyId, employee: emp._id
      }).sort({ year: -1, month: -1 }).lean();

      const basicSalary = lastSalary?.basicSalary || 0;
      if (basicSalary === 0) continue;

      const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      const incentives = await Incentive.find({
        companyId, userId: emp._id,
        status: { $in: ['approved', 'paid'] },
        awardedDate: { $gte: startOfMonth, $lte: endOfMonth }
      }).lean();

      const incentiveAmount = incentives.reduce((s, inc) => s + (inc.amount || 0), 0);
      const incentiveDetails = incentives.map(inc => ({
        title: inc.title, amount: inc.amount, type: inc.type, incentiveId: inc._id
      }));

      const perDaySalary = basicSalary / totalWorkingDays;
      const attResult = await computeAttendanceDeduction(emp._id, companyId, parseInt(month), parseInt(year), perDaySalary, deductionSettings);

      const salary = new Salary({
        company: companyId,
        employee: emp._id,
        employeeName: emp.fullName,
        employeeEmail: emp.email,
        designation: m.jobTitle || emp.jobTitle || '',
        department: m.department || emp.department || '',
        basicSalary, hra: lastSalary?.hra || 0, allowances: lastSalary?.allowances || 0,
        bonus: 0, overtime: 0, otherEarnings: 0,
        incentiveAmount, incentiveDetails,
        tax: lastSalary?.tax || 0, providentFund: lastSalary?.providentFund || 0,
        insurance: lastSalary?.insurance || 0,
        loanDeduction: lastSalary?.loanDeduction || 0, otherDeductions: 0,
        attendanceDeduction: attResult.attendanceDeduction,
        attendanceBreakdown: { ...attResult.attendanceBreakdown, totalWorkingDays },
        currency: currency || lastSalary?.currency || 'USD',
        payPeriod: payPeriod || lastSalary?.payPeriod || 'monthly',
        month: parseInt(month), year: parseInt(year),
        paymentMethod: lastSalary?.paymentMethod || 'bank-transfer',
        status: 'pending', createdBy: userId
      });

      await salary.save();
      results.push(salary);
    }

    res.json({ success: true, generated: results.length, message: `Generated ${results.length} salary records`, salaries: results });
  } catch (err) {
    console.error('Error generating salaries:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/salaries/:id/recalculate - recalculate attendance deductions & incentives
router.post('/:id/recalculate', auth, async (req, res) => {
  try {
    const salary = await Salary.findOne({ _id: req.params.id, company: req.user.company });
    if (!salary) return res.status(404).json({ success: false, message: 'Not found' });

    const companyId = req.user.company;
    const company = await Company.findById(companyId).select('hrSettings').lean();
    const deductionSettings = company?.hrSettings?.salaryDeductions;
    const workingDays = company?.hrSettings?.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const totalWorkingDays = getWorkingDaysInMonth(salary.year, salary.month, workingDays);
    const perDaySalary = (salary.basicSalary || 0) / totalWorkingDays;

    const attResult = await computeAttendanceDeduction(salary.employee, companyId, salary.month, salary.year, perDaySalary, deductionSettings);
    salary.attendanceDeduction = attResult.attendanceDeduction;
    salary.attendanceBreakdown = { ...attResult.attendanceBreakdown, totalWorkingDays };

    const startOfMonth = new Date(salary.year, salary.month - 1, 1);
    const endOfMonth = new Date(salary.year, salary.month, 0, 23, 59, 59, 999);
    const incentives = await Incentive.find({
      companyId, userId: salary.employee,
      status: { $in: ['approved', 'paid'] },
      awardedDate: { $gte: startOfMonth, $lte: endOfMonth }
    }).lean();

    salary.incentiveAmount = incentives.reduce((s, inc) => s + (inc.amount || 0), 0);
    salary.incentiveDetails = incentives.map(inc => ({
      title: inc.title, amount: inc.amount, type: inc.type, incentiveId: inc._id
    }));

    await salary.save();
    res.json({ success: true, salary });
  } catch (err) {
    console.error('Error recalculating salary:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/salaries/:id - update salary
router.put('/:id', auth, async (req, res) => {
  try {
    const salary = await Salary.findOne({ _id: req.params.id, company: req.user.company });
    if (!salary) return res.status(404).json({ success: false, message: 'Salary record not found' });

    const fields = [
      'employeeName', 'employeeEmail', 'designation', 'department',
      'basicSalary', 'hra', 'allowances', 'bonus', 'overtime', 'otherEarnings',
      'tax', 'providentFund', 'insurance', 'loanDeduction', 'otherDeductions',
      'currency', 'payPeriod', 'month', 'year', 'paymentDate', 'paymentMethod', 'status', 'notes'
    ];
    fields.forEach(f => { if (req.body[f] !== undefined) salary[f] = req.body[f]; });

    await salary.save();
    res.json({ success: true, salary });
  } catch (err) {
    console.error('Error updating salary:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/salaries/:id/status - update status only
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'paid', 'on-hold', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const salary = await Salary.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      { status, ...(status === 'paid' ? { paymentDate: new Date() } : {}) },
      { new: true }
    );
    if (!salary) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, salary });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/salaries/bulk-status - bulk status
router.post('/bulk-status', auth, async (req, res) => {
  try {
    const { ids, status } = req.body;
    if (!ids?.length || !status) return res.status(400).json({ success: false, message: 'ids and status required' });
    await Salary.updateMany(
      { _id: { $in: ids }, company: req.user.company },
      { status, ...(status === 'paid' ? { paymentDate: new Date() } : {}) }
    );
    res.json({ success: true, message: `${ids.length} records updated` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/salaries/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const salary = await Salary.findOneAndDelete({ _id: req.params.id, company: req.user.company });
    if (!salary) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Salary record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/salaries/employee/:employeeId - salary history for an employee
router.get('/employee/:employeeId', auth, async (req, res) => {
  try {
    const salaries = await Salary.find({
      company: req.user.company,
      employee: req.params.employeeId
    }).sort({ year: -1, month: -1 });
    res.json({ success: true, salaries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
