const express = require('express');
const router = express.Router();
const { authenticateToken: auth } = require('../middleware/auth');
const Expense = require('../models/Expense');

// GET /api/expenses/stats - expense stats
router.get('/stats', auth, async (req, res) => {
  try {
    const companyId = req.user.company;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const allExpenses = await Expense.find({ company: companyId, status: { $ne: 'rejected' } });
    const monthExpenses = allExpenses.filter(e => e.date >= startOfMonth);
    const yearExpenses = allExpenses.filter(e => e.date >= startOfYear);

    // Category breakdown
    const categoryBreakdown = {};
    yearExpenses.forEach(e => {
      categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const total = allExpenses
        .filter(e => e.date >= d && e.date <= end)
        .reduce((s, e) => s + e.amount, 0);
      monthlyTrend.push({
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        total
      });
    }

    res.json({
      success: true,
      stats: {
        totalAllTime: allExpenses.reduce((s, e) => s + e.amount, 0),
        totalThisMonth: monthExpenses.reduce((s, e) => s + e.amount, 0),
        totalThisYear: yearExpenses.reduce((s, e) => s + e.amount, 0),
        count: allExpenses.length,
        pendingCount: allExpenses.filter(e => e.status === 'pending').length,
        categoryBreakdown,
        monthlyTrend
      }
    });
  } catch (err) {
    console.error('Error fetching expense stats:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/expenses - list expenses
router.get('/', auth, async (req, res) => {
  try {
    const companyId = req.user.company;
    const { category, status, search, startDate, endDate } = req.query;
    const filter = { company: companyId };

    if (category && category !== 'all') filter.category = category;
    if (status && status !== 'all') filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json({ success: true, expenses });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/expenses/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, company: req.user.company });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/expenses - create expense
router.post('/', auth, async (req, res) => {
  try {
    const {
      title, description, category, amount, currency, date,
      paymentMethod, vendor, receiptUrl, status,
      isRecurring, recurringInterval, tags, notes
    } = req.body;

    if (!title || !category || !amount || !date) {
      return res.status(400).json({ success: false, message: 'Title, category, amount, and date are required' });
    }

    const expense = new Expense({
      company: req.user.company,
      title, description, category, amount, currency, date,
      paymentMethod, vendor, receiptUrl,
      status: status || 'approved',
      isRecurring, recurringInterval, tags, notes,
      submittedBy: req.user.userId
    });

    await expense.save();
    res.status(201).json({ success: true, expense });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/expenses/:id - update expense
router.put('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, company: req.user.company });
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const fields = [
      'title', 'description', 'category', 'amount', 'currency', 'date',
      'paymentMethod', 'vendor', 'receiptUrl', 'status',
      'isRecurring', 'recurringInterval', 'tags', 'notes'
    ];
    fields.forEach(f => { if (req.body[f] !== undefined) expense[f] = req.body[f]; });

    await expense.save();
    res.json({ success: true, expense });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/expenses/:id/status - update status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected', 'reimbursed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const update = { status };
    if (status === 'approved') update.approvedBy = req.user.userId;
    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, company: req.user.company },
      update, { new: true }
    );
    if (!expense) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, company: req.user.company });
    if (!expense) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/expenses/bulk-delete
router.post('/bulk-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: 'ids required' });
    await Expense.deleteMany({ _id: { $in: ids }, company: req.user.company });
    res.json({ success: true, message: `${ids.length} expenses deleted` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
