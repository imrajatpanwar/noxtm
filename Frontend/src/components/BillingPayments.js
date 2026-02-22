import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiDollarSign, FiUsers, FiTrendingUp, FiTrendingDown, FiSearch,
  FiPlus, FiEdit3, FiTrash2, FiFilter, FiX, FiCheck, FiClock,
  FiCalendar, FiChevronUp, FiChevronDown, FiMoreVertical,
  FiFileText, FiPieChart, FiCreditCard, FiAlertCircle,
  FiCheckCircle, FiXCircle, FiPause, FiRepeat, FiEye, FiBriefcase,
  FiRefreshCw, FiAward, FiUserCheck, FiSettings, FiPercent
} from 'react-icons/fi';
import api from '../config/api';
import './BillingPayments.css';

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$' };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EXPENSE_CATEGORIES = [
  { value: 'office-supplies', label: 'Office Supplies' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'software', label: 'Software' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'meals', label: 'Meals' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'professional-services', label: 'Professional Services' },
  { value: 'training', label: 'Training' },
  { value: 'miscellaneous', label: 'Miscellaneous' }
];

function BillingPayments() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Employee list (real employees from HR)
  const [allEmployees, setAllEmployees] = useState([]);

  // Salary state
  const [salaries, setSalaries] = useState([]);
  const [salaryStats, setSalaryStats] = useState(null);
  const [salarySearch, setSalarySearch] = useState('');
  const [salaryFilter, setSalaryFilter] = useState('all');
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [selectedSalaryIds, setSelectedSalaryIds] = useState([]);
  const [salarySortConfig, setSalarySortConfig] = useState({ key: null, dir: 'asc' });
  const [generating, setGenerating] = useState(false);

  // Deduction settings
  const [deductionSettings, setDeductionSettings] = useState({ paidLeavePercent: 0, halfDayPercent: 50, latePercent: 0, absentPercent: 100 });
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [deductionForm, setDeductionForm] = useState({ paidLeavePercent: 0, halfDayPercent: 50, latePercent: 0, absentPercent: 100 });

  // Expense state
  const [expenses, setExpenses] = useState([]);
  const [expenseStats, setExpenseStats] = useState(null);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseFilter, setExpenseFilter] = useState('all');
  const [expenseCatFilter, setExpenseCatFilter] = useState('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);

  // Invoice state
  const [paidInvoices, setPaidInvoices] = useState([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // Modals
  const [showPreview, setShowPreview] = useState(null);
  const [actionMenu, setActionMenu] = useState(null);

  // Salary form
  const emptySalaryForm = {
    employee: '', employeeName: '', employeeEmail: '', designation: '', department: '',
    basicSalary: '', hra: '', allowances: '', bonus: '', overtime: '', otherEarnings: '',
    tax: '', providentFund: '', insurance: '', loanDeduction: '', otherDeductions: '',
    currency: 'USD', payPeriod: 'monthly', month: new Date().getMonth() + 1,
    year: new Date().getFullYear(), paymentMethod: 'bank-transfer', status: 'pending', notes: ''
  };
  const [salaryForm, setSalaryForm] = useState(emptySalaryForm);

  // Expense form
  const emptyExpenseForm = {
    title: '', description: '', category: 'office-supplies', amount: '',
    currency: 'USD', date: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank-transfer', vendor: '', status: 'approved',
    isRecurring: false, recurringInterval: 'monthly', notes: ''
  };
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);

  // ===== FETCH DATA =====
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/salaries/employees');
      if (res.data.success) setAllEmployees(res.data.employees || []);
    } catch (err) { console.error('Error loading employees:', err); }
  }, []);

  const fetchDeductionSettings = useCallback(async () => {
    try {
      const res = await api.get('/salaries/deduction-settings');
      if (res.data.success && res.data.settings) {
        setDeductionSettings(res.data.settings);
        setDeductionForm(res.data.settings);
      }
    } catch (err) { console.error('Error loading deduction settings:', err); }
  }, []);

  const fetchSalaries = useCallback(async () => {
    try {
      const [salRes, statRes] = await Promise.all([
        api.get('/salaries', { params: { month: salaryMonth, year: salaryYear } }),
        api.get('/salaries/stats', { params: { month: salaryMonth, year: salaryYear } })
      ]);
      if (salRes.data.success) setSalaries(salRes.data.salaries);
      if (statRes.data.success) setSalaryStats(statRes.data.stats);
    } catch (err) { console.error('Error loading salaries:', err); }
  }, [salaryMonth, salaryYear]);

  const fetchExpenses = useCallback(async () => {
    try {
      const [expRes, statRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/expenses/stats')
      ]);
      if (expRes.data.success) setExpenses(expRes.data.expenses);
      if (statRes.data.success) setExpenseStats(statRes.data.stats);
    } catch (err) { console.error('Error loading expenses:', err); }
  }, []);

  const fetchPaidInvoices = useCallback(async () => {
    try {
      const res = await api.get('/invoices', { params: { status: 'paid' } });
      if (res.data.success) setPaidInvoices(res.data.invoices || []);
      else if (Array.isArray(res.data)) setPaidInvoices(res.data.filter(i => i.status === 'paid'));
    } catch (err) { console.error('Error loading invoices:', err); }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchEmployees(), fetchDeductionSettings(), fetchSalaries(), fetchExpenses(), fetchPaidInvoices()]);
      setLoading(false);
    };
    load();
  }, [fetchEmployees, fetchDeductionSettings, fetchSalaries, fetchExpenses, fetchPaidInvoices]);

  // ===== EMPLOYEE DROPDOWN HANDLER =====
  const handleEmployeeSelect = (empId) => {
    if (!empId) {
      setSalaryForm(prev => ({ ...prev, employee: '', employeeName: '', employeeEmail: '', designation: '', department: '' }));
      return;
    }
    const emp = allEmployees.find(e => e._id === empId);
    if (emp) {
      // Check if employee had a previous salary record to auto-fill salary details
      const lastRecord = salaries.find(s => s.employee === empId) ||
        salaries.find(s => s.employeeEmail === emp.email);
      setSalaryForm(prev => ({
        ...prev,
        employee: emp._id,
        employeeName: emp.fullName,
        employeeEmail: emp.email,
        designation: emp.designation || '',
        department: emp.department || '',
        basicSalary: lastRecord?.basicSalary || prev.basicSalary || '',
        hra: lastRecord?.hra || prev.hra || '',
        allowances: lastRecord?.allowances || prev.allowances || '',
        tax: lastRecord?.tax || prev.tax || '',
        providentFund: lastRecord?.providentFund || prev.providentFund || '',
        insurance: lastRecord?.insurance || prev.insurance || '',
        currency: lastRecord?.currency || prev.currency || 'USD'
      }));
    }
  };

  // ===== SALARY HANDLERS =====
  const handleSaveSalary = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...salaryForm };
      ['basicSalary','hra','allowances','bonus','overtime','otherEarnings','tax','providentFund','insurance','loanDeduction','otherDeductions'].forEach(f => {
        payload[f] = parseFloat(payload[f]) || 0;
      });
      payload.month = parseInt(payload.month);
      payload.year = parseInt(payload.year);

      if (editingSalary) {
        await api.put(`/salaries/${editingSalary._id}`, payload);
      } else {
        await api.post('/salaries', payload);
      }
      setShowSalaryModal(false);
      setEditingSalary(null);
      setSalaryForm(emptySalaryForm);
      fetchSalaries();
    } catch (err) { alert(err.response?.data?.message || 'Error saving salary'); }
  };

  const handleEditSalary = (sal) => {
    setEditingSalary(sal);
    setSalaryForm({
      employee: sal.employee || '', employeeName: sal.employeeName || '', employeeEmail: sal.employeeEmail || '',
      designation: sal.designation || '', department: sal.department || '',
      basicSalary: sal.basicSalary || '', hra: sal.hra || '', allowances: sal.allowances || '',
      bonus: sal.bonus || '', overtime: sal.overtime || '', otherEarnings: sal.otherEarnings || '',
      tax: sal.tax || '', providentFund: sal.providentFund || '', insurance: sal.insurance || '',
      loanDeduction: sal.loanDeduction || '', otherDeductions: sal.otherDeductions || '',
      currency: sal.currency || 'USD', payPeriod: sal.payPeriod || 'monthly',
      month: sal.month, year: sal.year,
      paymentMethod: sal.paymentMethod || 'bank-transfer', status: sal.status, notes: sal.notes || ''
    });
    setShowSalaryModal(true);
  };

  const handleDeleteSalary = async (id) => {
    if (!window.confirm('Delete this salary record?')) return;
    try { await api.delete(`/salaries/${id}`); fetchSalaries(); } catch (err) { alert('Error deleting'); }
  };

  const handleSalaryStatusChange = async (id, status) => {
    try { await api.patch(`/salaries/${id}/status`, { status }); fetchSalaries(); } catch (err) { alert('Error updating status'); }
  };

  const handleBulkSalaryStatus = async (status) => {
    if (!selectedSalaryIds.length) return;
    try { await api.post('/salaries/bulk-status', { ids: selectedSalaryIds, status }); setSelectedSalaryIds([]); fetchSalaries(); } catch (err) { alert('Error'); }
  };

  const handleGenerateSalaries = async () => {
    if (!window.confirm(`Generate salary records for all employees for ${MONTHS[salaryMonth - 1]} ${salaryYear}? This will use last month's salary details and auto-compute attendance deductions and incentives.`)) return;
    setGenerating(true);
    try {
      const res = await api.post('/salaries/generate', { month: salaryMonth, year: salaryYear });
      if (res.data.success) {
        alert(`Generated ${res.data.generated} salary records.`);
        fetchSalaries();
      }
    } catch (err) { alert(err.response?.data?.message || 'Error generating'); }
    setGenerating(false);
  };

  const handleRecalculate = async (id) => {
    try {
      await api.post(`/salaries/${id}/recalculate`);
      fetchSalaries();
    } catch (err) { alert('Error recalculating'); }
  };

  const handleSaveDeductionSettings = async () => {
    try {
      await api.put('/salaries/deduction-settings', deductionForm);
      setDeductionSettings(deductionForm);
      setShowDeductionModal(false);
    } catch (err) { alert('Error saving settings'); }
  };

  // ===== EXPENSE HANDLERS =====
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...expenseForm, amount: parseFloat(expenseForm.amount) || 0 };
      if (editingExpense) {
        await api.put(`/expenses/${editingExpense._id}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setShowExpenseModal(false);
      setEditingExpense(null);
      setExpenseForm(emptyExpenseForm);
      fetchExpenses();
    } catch (err) { alert(err.response?.data?.message || 'Error saving expense'); }
  };

  const handleEditExpense = (exp) => {
    setEditingExpense(exp);
    setExpenseForm({
      title: exp.title || '', description: exp.description || '',
      category: exp.category, amount: exp.amount,
      currency: exp.currency || 'USD', date: exp.date ? exp.date.split('T')[0] : '',
      paymentMethod: exp.paymentMethod || 'bank-transfer', vendor: exp.vendor || '',
      status: exp.status, isRecurring: exp.isRecurring || false,
      recurringInterval: exp.recurringInterval || 'monthly', notes: exp.notes || ''
    });
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await api.delete(`/expenses/${id}`); fetchExpenses(); } catch (err) { alert('Error deleting'); }
  };

  const handleBulkDeleteExpenses = async () => {
    if (!selectedExpenseIds.length || !window.confirm(`Delete ${selectedExpenseIds.length} expenses?`)) return;
    try { await api.post('/expenses/bulk-delete', { ids: selectedExpenseIds }); setSelectedExpenseIds([]); fetchExpenses(); } catch (err) { alert('Error'); }
  };

  // ===== FILTERED / SORTED DATA =====
  const filteredSalaries = useMemo(() => {
    let data = [...salaries];
    if (salaryFilter !== 'all') data = data.filter(s => s.status === salaryFilter);
    if (salarySearch) {
      const q = salarySearch.toLowerCase();
      data = data.filter(s => s.employeeName?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q) || s.designation?.toLowerCase().includes(q));
    }
    if (salarySortConfig.key) {
      data.sort((a, b) => {
        let va = a[salarySortConfig.key], vb = b[salarySortConfig.key];
        if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb || '').toLowerCase(); }
        if (va < vb) return salarySortConfig.dir === 'asc' ? -1 : 1;
        if (va > vb) return salarySortConfig.dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [salaries, salaryFilter, salarySearch, salarySortConfig]);

  // Build employee salary status map (which employees have/don't have salary this month)
  const employeeSalaryMap = useMemo(() => {
    const map = {};
    salaries.forEach(s => { map[s.employee] = s; });
    return map;
  }, [salaries]);

  const employeesWithoutSalary = useMemo(() => {
    return allEmployees.filter(e => !employeeSalaryMap[e._id]);
  }, [allEmployees, employeeSalaryMap]);

  const filteredExpenses = useMemo(() => {
    let data = [...expenses];
    if (expenseFilter !== 'all') data = data.filter(e => e.status === expenseFilter);
    if (expenseCatFilter !== 'all') data = data.filter(e => e.category === expenseCatFilter);
    if (expenseSearch) {
      const q = expenseSearch.toLowerCase();
      data = data.filter(e => e.title?.toLowerCase().includes(q) || e.vendor?.toLowerCase().includes(q));
    }
    return data;
  }, [expenses, expenseFilter, expenseCatFilter, expenseSearch]);

  const filteredPaidInvoices = useMemo(() => {
    if (!invoiceSearch) return paidInvoices;
    const q = invoiceSearch.toLowerCase();
    return paidInvoices.filter(i => i.clientName?.toLowerCase().includes(q) || i.invoiceNumber?.toLowerCase().includes(q));
  }, [paidInvoices, invoiceSearch]);

  const cs = (currency) => CURRENCY_SYMBOLS[currency] || '$';

  const handleSalarySort = (key) => {
    setSalarySortConfig(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ col }) => {
    if (salarySortConfig.key !== col) return <FiChevronUp className="bp-sort-icon bp-sort-idle" />;
    return salarySortConfig.dir === 'asc'
      ? <FiChevronUp className="bp-sort-icon bp-sort-active" />
      : <FiChevronDown className="bp-sort-icon bp-sort-active" />;
  };

  const statusIcon = (status) => {
    switch (status) {
      case 'paid': case 'approved': return <FiCheckCircle />;
      case 'pending': return <FiClock />;
      case 'on-hold': return <FiPause />;
      case 'cancelled': case 'rejected': return <FiXCircle />;
      case 'reimbursed': return <FiCreditCard />;
      default: return <FiAlertCircle />;
    }
  };

  const catLabel = (val) => EXPENSE_CATEGORIES.find(c => c.value === val)?.label || val;

  // ===== COMPUTED STATS =====
  const salaryFormGross = useMemo(() => {
    return ['basicSalary','hra','allowances','bonus','overtime','otherEarnings'].reduce((s, f) => s + (parseFloat(salaryForm[f]) || 0), 0);
  }, [salaryForm]);

  const salaryFormDeductions = useMemo(() => {
    return ['tax','providentFund','insurance','loanDeduction','otherDeductions'].reduce((s, f) => s + (parseFloat(salaryForm[f]) || 0), 0);
  }, [salaryForm]);

  const salaryFormNet = salaryFormGross - salaryFormDeductions;

  const overviewTotalSalary = salaryStats?.totalNet || 0;
  const overviewTotalExpenses = expenseStats?.totalThisMonth || 0;
  const overviewTotalInvoiceRevenue = paidInvoices.reduce((s, i) => s + (i.total || 0), 0);
  const overviewNetCashflow = overviewTotalInvoiceRevenue - overviewTotalSalary - overviewTotalExpenses;

  // ===== RENDER =====
  if (loading) {
    return <div className="bp"><div className="bp-loading"><div className="bp-spinner" /> Loading billing data...</div></div>;
  }

  return (
    <div className="bp">
      {/* Header */}
      <div className="bp-header">
        <div>
          <h1 className="bp-title">Billing & Payments</h1>
          <p className="bp-subtitle">Manage salaries, expenses, and track paid invoices</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bp-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: <FiPieChart /> },
          { id: 'salaries', label: 'Employee Salaries', icon: <FiUsers /> },
          { id: 'expenses', label: 'Company Expenses', icon: <FiCreditCard /> },
          { id: 'invoices', label: 'Paid Invoices', icon: <FiFileText /> }
        ].map(t => (
          <button key={t.id} className={`bp-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* === OVERVIEW TAB === */}
      {activeTab === 'overview' && (
        <div className="bp-tab-content">
          <div className="bp-overview-cards">
            <div className="bp-ov-card bp-ov-revenue">
              <div className="bp-ov-icon"><FiTrendingUp /></div>
              <div className="bp-ov-body">
                <span className="bp-ov-val">${overviewTotalInvoiceRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="bp-ov-label">Invoice Revenue (Paid)</span>
                <span className="bp-ov-sub">{paidInvoices.length} paid invoices</span>
              </div>
            </div>
            <div className="bp-ov-card bp-ov-salary">
              <div className="bp-ov-icon"><FiUsers /></div>
              <div className="bp-ov-body">
                <span className="bp-ov-val">${overviewTotalSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="bp-ov-label">Salary Outflow ({MONTHS[salaryMonth - 1]})</span>
                <span className="bp-ov-sub">{salaryStats?.totalEmployees || 0} employees • {salaryStats?.totalIncentives > 0 ? `Incl. ${cs('USD')}${salaryStats.totalIncentives.toLocaleString()} incentives` : 'No incentives'}</span>
              </div>
            </div>
            <div className="bp-ov-card bp-ov-expense">
              <div className="bp-ov-icon"><FiTrendingDown /></div>
              <div className="bp-ov-body">
                <span className="bp-ov-val">${overviewTotalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="bp-ov-label">Expenses (This Month)</span>
                <span className="bp-ov-sub">{expenseStats?.pendingCount || 0} pending approval</span>
              </div>
            </div>
            <div className={`bp-ov-card ${overviewNetCashflow >= 0 ? 'bp-ov-positive' : 'bp-ov-negative'}`}>
              <div className="bp-ov-icon"><FiDollarSign /></div>
              <div className="bp-ov-body">
                <span className="bp-ov-val">{overviewNetCashflow < 0 ? '-' : ''}${Math.abs(overviewNetCashflow).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="bp-ov-label">Net Cash Flow</span>
                <span className="bp-ov-sub">{overviewNetCashflow >= 0 ? 'Positive' : 'Negative'} balance</span>
              </div>
            </div>
          </div>

          {/* Quick breakdowns */}
          <div className="bp-overview-grid">
            <div className="bp-ov-section">
              <h3 className="bp-ov-section-title"><FiUsers /> Salary Summary — {MONTHS[salaryMonth - 1]} {salaryYear}</h3>
              <div className="bp-ov-table-wrap">
                <table className="bp-ov-table">
                  <thead><tr><th>Metric</th><th>Amount</th></tr></thead>
                  <tbody>
                    <tr><td>Total Gross</td><td className="bp-ov-amt">${(salaryStats?.totalGross || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                    <tr><td>Total Incentives</td><td className="bp-ov-amt" style={{color:'#16a34a'}}>+${(salaryStats?.totalIncentives || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                    <tr><td>Total Deductions</td><td className="bp-ov-amt bp-ov-deduct">-${(salaryStats?.totalDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                    <tr><td>Attendance Deductions</td><td className="bp-ov-amt bp-ov-deduct">-${(salaryStats?.totalAttendanceDeductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                    <tr className="bp-ov-total-row"><td>Total Net Pay</td><td className="bp-ov-amt">${(salaryStats?.totalNet || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>
                    <tr><td>Paid</td><td>{salaryStats?.paidCount || 0} employees</td></tr>
                    <tr><td>Pending</td><td>{salaryStats?.pendingCount || 0} employees</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bp-ov-section">
              <h3 className="bp-ov-section-title"><FiCreditCard /> Expense Breakdown (This Year)</h3>
              <div className="bp-ov-table-wrap">
                {expenseStats?.categoryBreakdown && Object.keys(expenseStats.categoryBreakdown).length > 0 ? (
                  <table className="bp-ov-table">
                    <thead><tr><th>Category</th><th>Amount</th></tr></thead>
                    <tbody>
                      {Object.entries(expenseStats.categoryBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                        <tr key={cat}>
                          <td>{catLabel(cat)}</td>
                          <td className="bp-ov-amt">${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                      <tr className="bp-ov-total-row">
                        <td>Year Total</td>
                        <td className="bp-ov-amt">${(expenseStats?.totalThisYear || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="bp-ov-empty">No expenses recorded yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Monthly trend */}
          {expenseStats?.monthlyTrend?.length > 0 && (
            <div className="bp-ov-section bp-ov-trend">
              <h3 className="bp-ov-section-title"><FiTrendingUp /> Monthly Expense Trend</h3>
              <div className="bp-trend-bars">
                {expenseStats.monthlyTrend.map((m, i) => {
                  const max = Math.max(...expenseStats.monthlyTrend.map(x => x.total), 1);
                  return (
                    <div key={i} className="bp-trend-col">
                      <span className="bp-trend-val">${m.total.toLocaleString()}</span>
                      <div className="bp-trend-bar" style={{ height: `${(m.total / max) * 100}%` }} />
                      <span className="bp-trend-label">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* === SALARIES TAB === */}
      {activeTab === 'salaries' && (
        <div className="bp-tab-content">
          {/* Salary stats */}
          <div className="bp-mini-stats">
            <div className="bp-ms"><span className="bp-ms-val">{allEmployees.length}</span><span className="bp-ms-label">Total Employees</span></div>
            <div className="bp-ms"><span className="bp-ms-val">{salaryStats?.totalEmployees || 0}</span><span className="bp-ms-label">Records</span></div>
            <div className="bp-ms"><span className="bp-ms-val">${(salaryStats?.totalGross || 0).toLocaleString()}</span><span className="bp-ms-label">Gross</span></div>
            <div className="bp-ms"><span className="bp-ms-val">${(salaryStats?.totalNet || 0).toLocaleString()}</span><span className="bp-ms-label">Net Pay</span></div>
            <div className="bp-ms bp-ms-paid"><span className="bp-ms-val">{salaryStats?.paidCount || 0}</span><span className="bp-ms-label">Paid</span></div>
            <div className="bp-ms bp-ms-pending"><span className="bp-ms-val">{salaryStats?.pendingCount || 0}</span><span className="bp-ms-label">Pending</span></div>
            {(salaryStats?.totalIncentives || 0) > 0 && (
              <div className="bp-ms bp-ms-incentive"><span className="bp-ms-val">${salaryStats.totalIncentives.toLocaleString()}</span><span className="bp-ms-label">Incentives</span></div>
            )}
          </div>

          {/* Employees without salary this month */}
          {employeesWithoutSalary.length > 0 && (
            <div className="bp-missing-banner">
              <FiAlertCircle />
              <span><strong>{employeesWithoutSalary.length}</strong> employee{employeesWithoutSalary.length > 1 ? 's' : ''} don't have salary records for {MONTHS[salaryMonth - 1]} {salaryYear}:</span>
              <span className="bp-missing-names">{employeesWithoutSalary.slice(0, 5).map(e => e.fullName).join(', ')}{employeesWithoutSalary.length > 5 ? ` +${employeesWithoutSalary.length - 5} more` : ''}</span>
            </div>
          )}

          {/* Toolbar */}
          <div className="bp-toolbar">
            <div className="bp-search">
              <FiSearch />
              <input placeholder="Search employees..." value={salarySearch} onChange={e => setSalarySearch(e.target.value)} />
            </div>
            <div className="bp-toolbar-right">
              <select className="bp-month-select" value={salaryMonth} onChange={e => setSalaryMonth(parseInt(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <select className="bp-year-select" value={salaryYear} onChange={e => setSalaryYear(parseInt(e.target.value))}>
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="bp-filters">
                <FiFilter className="bp-filter-icon" />
                {['all', 'pending', 'paid', 'on-hold', 'cancelled'].map(s => (
                  <button key={s} className={`bp-filter-btn ${salaryFilter === s ? 'active' : ''}`} onClick={() => setSalaryFilter(s)}>{s === 'all' ? 'All' : s}</button>
                ))}
              </div>
              <button className="bp-secondary-btn" onClick={() => setShowDeductionModal(true)} title="Salary Deduction Settings"><FiSettings /> Deductions</button>
              <button className="bp-secondary-btn" onClick={handleGenerateSalaries} disabled={generating} title="Auto-generate salary records for all employees">
                <FiRefreshCw className={generating ? 'bp-spin' : ''} /> {generating ? 'Generating...' : 'Auto-Generate'}
              </button>
              <button className="bp-primary-btn" onClick={() => { setSalaryForm({...emptySalaryForm, month: salaryMonth, year: salaryYear}); setEditingSalary(null); setShowSalaryModal(true); }}>
                <FiPlus /> Add Salary
              </button>
            </div>
          </div>

          {/* Bulk bar */}
          {selectedSalaryIds.length > 0 && (
            <div className="bp-bulk-bar">
              <span>{selectedSalaryIds.length} selected</span>
              <div className="bp-bulk-actions">
                <button className="bp-bulk-btn paid" onClick={() => handleBulkSalaryStatus('paid')}>Mark Paid</button>
                <button className="bp-bulk-btn pending" onClick={() => handleBulkSalaryStatus('pending')}>Mark Pending</button>
              </div>
              <button className="bp-bulk-clear" onClick={() => setSelectedSalaryIds([])}>Clear</button>
            </div>
          )}

          {/* Salary table */}
          <div className="bp-table-wrap">
            {filteredSalaries.length === 0 ? (
              <div className="bp-empty">
                <FiUsers style={{ fontSize: '1.6rem', color: '#d1d5db' }} />
                <p>No salary records for {MONTHS[salaryMonth - 1]} {salaryYear}</p>
                <button className="bp-primary-btn sm" onClick={handleGenerateSalaries} disabled={generating}>
                  <FiRefreshCw /> Auto-Generate from Employee Data
                </button>
              </div>
            ) : (
              <table className="bp-table">
                <thead>
                  <tr>
                    <th className="bp-th-check">
                      <input type="checkbox" checked={selectedSalaryIds.length === filteredSalaries.length && filteredSalaries.length > 0} onChange={e => setSelectedSalaryIds(e.target.checked ? filteredSalaries.map(s => s._id) : [])} />
                    </th>
                    <th className="bp-sortable" onClick={() => handleSalarySort('employeeName')}>Employee <SortIcon col="employeeName" /></th>
                    <th>Department</th>
                    <th className="bp-sortable" onClick={() => handleSalarySort('grossEarnings')}>Gross <SortIcon col="grossEarnings" /></th>
                    <th>Incentive</th>
                    <th>Att. Deduct</th>
                    <th>Deductions</th>
                    <th className="bp-sortable" onClick={() => handleSalarySort('netSalary')}>Net Pay <SortIcon col="netSalary" /></th>
                    <th className="bp-sortable" onClick={() => handleSalarySort('status')}>Status <SortIcon col="status" /></th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalaries.map(sal => (
                    <tr key={sal._id} className={selectedSalaryIds.includes(sal._id) ? 'bp-row-selected' : ''}>
                      <td>
                        <input type="checkbox" checked={selectedSalaryIds.includes(sal._id)} onChange={e => setSelectedSalaryIds(e.target.checked ? [...selectedSalaryIds, sal._id] : selectedSalaryIds.filter(x => x !== sal._id))} />
                      </td>
                      <td>
                        <div className="bp-emp-cell">
                          <span className="bp-emp-name">{sal.employeeName}</span>
                          <span className="bp-emp-role">{sal.designation}</span>
                        </div>
                      </td>
                      <td><span className="bp-dept">{sal.department || '—'}</span></td>
                      <td><span className="bp-money">{cs(sal.currency)}{sal.grossEarnings?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td>
                        {(sal.incentiveAmount || 0) > 0 ? (
                          <span className="bp-money bp-incentive-val" title={sal.incentiveDetails?.map(d => `${d.title}: ${cs(sal.currency)}${d.amount}`).join('\n')}>
                            <FiAward style={{ fontSize: '0.7rem', marginRight: 3 }} />
                            +{cs(sal.currency)}{sal.incentiveAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : <span className="bp-tax">—</span>}
                      </td>
                      <td>
                        {(sal.attendanceDeduction || 0) > 0 ? (
                          <span className="bp-money bp-deduct" title={`Leaves: ${sal.attendanceBreakdown?.paidLeaveDays || 0}, Half-days: ${sal.attendanceBreakdown?.halfDayCount || 0}, Late: ${sal.attendanceBreakdown?.lateCount || 0}`}>
                            -{cs(sal.currency)}{sal.attendanceDeduction.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        ) : <span className="bp-tax">—</span>}
                      </td>
                      <td><span className="bp-money bp-deduct">-{cs(sal.currency)}{sal.totalDeductions?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td><span className="bp-money bp-net">{cs(sal.currency)}{sal.netSalary?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td>
                        <span className={`bp-badge ${sal.status}`}>{statusIcon(sal.status)} {sal.status}</span>
                      </td>
                      <td>
                        <div className="bp-actions">
                          <button className="bp-act-btn" title="View Payslip" onClick={() => setShowPreview({ type: 'salary', data: sal })}><FiEye /></button>
                          <button className="bp-act-btn" title="Edit" onClick={() => handleEditSalary(sal)}><FiEdit3 /></button>
                          <div className="bp-more-wrap">
                            <button className="bp-act-btn" onClick={e => { e.stopPropagation(); setActionMenu(actionMenu === sal._id ? null : sal._id); }}><FiMoreVertical /></button>
                            {actionMenu === sal._id && (
                              <div className="bp-action-dropdown" onClick={e => e.stopPropagation()}>
                                {sal.status !== 'paid' && <button onClick={() => { handleSalaryStatusChange(sal._id, 'paid'); setActionMenu(null); }}><FiCheck /> Mark Paid</button>}
                                {sal.status !== 'pending' && <button onClick={() => { handleSalaryStatusChange(sal._id, 'pending'); setActionMenu(null); }}><FiClock /> Mark Pending</button>}
                                {sal.status !== 'on-hold' && <button onClick={() => { handleSalaryStatusChange(sal._id, 'on-hold'); setActionMenu(null); }}><FiPause /> Put On Hold</button>}
                                <button onClick={() => { handleRecalculate(sal._id); setActionMenu(null); }}><FiRefreshCw /> Recalculate</button>
                                <button className="bp-dd-danger" onClick={() => { handleDeleteSalary(sal._id); setActionMenu(null); }}><FiTrash2 /> Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3" className="bp-foot-label">Total ({filteredSalaries.length} employees)</td>
                    <td className="bp-foot-total">${filteredSalaries.reduce((s, r) => s + r.grossEarnings, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="bp-foot-total bp-incentive-val">+${filteredSalaries.reduce((s, r) => s + (r.incentiveAmount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="bp-foot-total bp-deduct">-${filteredSalaries.reduce((s, r) => s + (r.attendanceDeduction || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="bp-foot-total bp-deduct">-${filteredSalaries.reduce((s, r) => s + r.totalDeductions, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="bp-foot-total">${filteredSalaries.reduce((s, r) => s + r.netSalary, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* === EXPENSES TAB === */}
      {activeTab === 'expenses' && (
        <div className="bp-tab-content">
          <div className="bp-mini-stats">
            <div className="bp-ms"><span className="bp-ms-val">${(expenseStats?.totalThisMonth || 0).toLocaleString()}</span><span className="bp-ms-label">This Month</span></div>
            <div className="bp-ms"><span className="bp-ms-val">${(expenseStats?.totalThisYear || 0).toLocaleString()}</span><span className="bp-ms-label">This Year</span></div>
            <div className="bp-ms"><span className="bp-ms-val">${(expenseStats?.totalAllTime || 0).toLocaleString()}</span><span className="bp-ms-label">All Time</span></div>
            <div className="bp-ms"><span className="bp-ms-val">{expenseStats?.count || 0}</span><span className="bp-ms-label">Total Records</span></div>
          </div>

          <div className="bp-toolbar">
            <div className="bp-search">
              <FiSearch />
              <input placeholder="Search expenses..." value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} />
            </div>
            <div className="bp-toolbar-right">
              <select className="bp-cat-select" value={expenseCatFilter} onChange={e => setExpenseCatFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <div className="bp-filters">
                <FiFilter className="bp-filter-icon" />
                {['all', 'approved', 'pending', 'rejected', 'reimbursed'].map(s => (
                  <button key={s} className={`bp-filter-btn ${expenseFilter === s ? 'active' : ''}`} onClick={() => setExpenseFilter(s)}>{s === 'all' ? 'All' : s}</button>
                ))}
              </div>
              <button className="bp-primary-btn" onClick={() => { setExpenseForm(emptyExpenseForm); setEditingExpense(null); setShowExpenseModal(true); }}>
                <FiPlus /> Add Expense
              </button>
            </div>
          </div>

          {selectedExpenseIds.length > 0 && (
            <div className="bp-bulk-bar">
              <span>{selectedExpenseIds.length} selected</span>
              <div className="bp-bulk-actions">
                <button className="bp-bulk-btn delete" onClick={handleBulkDeleteExpenses}>Delete Selected</button>
              </div>
              <button className="bp-bulk-clear" onClick={() => setSelectedExpenseIds([])}>Clear</button>
            </div>
          )}

          <div className="bp-table-wrap">
            {filteredExpenses.length === 0 ? (
              <div className="bp-empty">
                <FiCreditCard style={{ fontSize: '1.6rem', color: '#d1d5db' }} />
                <p>No expenses found</p>
                <button className="bp-primary-btn sm" onClick={() => { setExpenseForm(emptyExpenseForm); setEditingExpense(null); setShowExpenseModal(true); }}><FiPlus /> Add Expense</button>
              </div>
            ) : (
              <table className="bp-table">
                <thead>
                  <tr>
                    <th className="bp-th-check">
                      <input type="checkbox" checked={selectedExpenseIds.length === filteredExpenses.length && filteredExpenses.length > 0} onChange={e => setSelectedExpenseIds(e.target.checked ? filteredExpenses.map(x => x._id) : [])} />
                    </th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Vendor</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map(exp => (
                    <tr key={exp._id} className={selectedExpenseIds.includes(exp._id) ? 'bp-row-selected' : ''}>
                      <td>
                        <input type="checkbox" checked={selectedExpenseIds.includes(exp._id)} onChange={e => setSelectedExpenseIds(e.target.checked ? [...selectedExpenseIds, exp._id] : selectedExpenseIds.filter(x => x !== exp._id))} />
                      </td>
                      <td>
                        <div className="bp-exp-title-cell">
                          <span className="bp-exp-title">{exp.title}</span>
                          {exp.isRecurring && <span className="bp-recurring-badge"><FiRepeat /> Recurring</span>}
                        </div>
                      </td>
                      <td><span className="bp-cat-badge">{catLabel(exp.category)}</span></td>
                      <td><span className="bp-vendor">{exp.vendor || '—'}</span></td>
                      <td><span className="bp-money">{cs(exp.currency)}{exp.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td><span className="bp-date"><FiCalendar /> {exp.date ? new Date(exp.date).toLocaleDateString() : '—'}</span></td>
                      <td><span className={`bp-badge ${exp.status}`}>{statusIcon(exp.status)} {exp.status}</span></td>
                      <td>
                        <div className="bp-actions">
                          <button className="bp-act-btn" title="Edit" onClick={() => handleEditExpense(exp)}><FiEdit3 /></button>
                          <button className="bp-act-btn bp-act-danger" title="Delete" onClick={() => handleDeleteExpense(exp._id)}><FiTrash2 /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" className="bp-foot-label">Total ({filteredExpenses.length} expenses)</td>
                    <td className="bp-foot-total">${filteredExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td colSpan="3"></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* === PAID INVOICES TAB === */}
      {activeTab === 'invoices' && (
        <div className="bp-tab-content">
          <div className="bp-mini-stats">
            <div className="bp-ms bp-ms-paid"><span className="bp-ms-val">{paidInvoices.length}</span><span className="bp-ms-label">Paid Invoices</span></div>
            <div className="bp-ms"><span className="bp-ms-val">${overviewTotalInvoiceRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span><span className="bp-ms-label">Total Revenue</span></div>
          </div>

          <div className="bp-toolbar">
            <div className="bp-search">
              <FiSearch />
              <input placeholder="Search paid invoices..." value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} />
            </div>
          </div>

          <div className="bp-table-wrap">
            {filteredPaidInvoices.length === 0 ? (
              <div className="bp-empty">
                <FiFileText style={{ fontSize: '1.6rem', color: '#d1d5db' }} />
                <p>No paid invoices found</p>
              </div>
            ) : (
              <table className="bp-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Client</th>
                    <th>Amount</th>
                    <th>Tax</th>
                    <th>Total</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPaidInvoices.map(inv => (
                    <tr key={inv._id}>
                      <td><span className="bp-inv-id">{inv.invoiceNumber}</span></td>
                      <td>
                        <div className="bp-emp-cell">
                          <span className="bp-emp-name">{inv.clientName}</span>
                          <span className="bp-emp-role">{inv.companyName}</span>
                        </div>
                      </td>
                      <td><span className="bp-money">{cs(inv.currency)}{(inv.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td><span className="bp-money bp-tax">{cs(inv.currency)}{(inv.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td><span className="bp-money bp-net">{cs(inv.currency)}{(inv.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                      <td><span className="bp-date"><FiCalendar /> {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}</span></td>
                      <td><span className="bp-badge paid"><FiCheckCircle /> Paid</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" className="bp-foot-label">Total ({filteredPaidInvoices.length} invoices)</td>
                    <td className="bp-foot-total">${filteredPaidInvoices.reduce((s, i) => s + (i.total || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* === SALARY MODAL === */}
      {showSalaryModal && (
        <div className="bp-overlay" onClick={() => { setShowSalaryModal(false); setEditingSalary(null); setSalaryForm(emptySalaryForm); }}>
          <div className="bp-modal bp-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="bp-modal-head">
              <h2>{editingSalary ? 'Edit Salary Record' : 'Add Salary Record'}</h2>
              <button className="bp-modal-close" onClick={() => { setShowSalaryModal(false); setEditingSalary(null); setSalaryForm(emptySalaryForm); }}><FiX /></button>
            </div>

            <form onSubmit={handleSaveSalary} className="bp-modal-body">
              {/* Employee Selection */}
              <div className="bp-section">
                <h3 className="bp-section-title"><FiUserCheck /> Employee Details</h3>
                <div className="bp-form-grid">
                  <div className="bp-field bp-full">
                    <label>Select Employee *</label>
                    <select
                      required
                      value={salaryForm.employee}
                      onChange={e => handleEmployeeSelect(e.target.value)}
                    >
                      <option value="">— Choose Employee —</option>
                      {allEmployees.map(emp => (
                        <option key={emp._id} value={emp._id}>
                          {emp.fullName} — {emp.email} {emp.department ? `(${emp.department})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bp-field"><label>Employee Name</label><input readOnly value={salaryForm.employeeName} className="bp-readonly" /></div>
                  <div className="bp-field"><label>Email</label><input readOnly value={salaryForm.employeeEmail} className="bp-readonly" /></div>
                  <div className="bp-field"><label>Designation</label><input value={salaryForm.designation} onChange={e => setSalaryForm({ ...salaryForm, designation: e.target.value })} /></div>
                  <div className="bp-field"><label>Department</label><input value={salaryForm.department} onChange={e => setSalaryForm({ ...salaryForm, department: e.target.value })} /></div>
                </div>
              </div>

              {/* Earnings */}
              <div className="bp-section">
                <h3 className="bp-section-title bp-section-earn"><FiTrendingUp /> Earnings</h3>
                <div className="bp-form-grid cols-3">
                  <div className="bp-field"><label>Basic Salary *</label><input type="number" min="0" step="0.01" required value={salaryForm.basicSalary} onChange={e => setSalaryForm({ ...salaryForm, basicSalary: e.target.value })} /></div>
                  <div className="bp-field"><label>HRA</label><input type="number" min="0" step="0.01" value={salaryForm.hra} onChange={e => setSalaryForm({ ...salaryForm, hra: e.target.value })} /></div>
                  <div className="bp-field"><label>Allowances</label><input type="number" min="0" step="0.01" value={salaryForm.allowances} onChange={e => setSalaryForm({ ...salaryForm, allowances: e.target.value })} /></div>
                  <div className="bp-field"><label>Bonus</label><input type="number" min="0" step="0.01" value={salaryForm.bonus} onChange={e => setSalaryForm({ ...salaryForm, bonus: e.target.value })} /></div>
                  <div className="bp-field"><label>Overtime</label><input type="number" min="0" step="0.01" value={salaryForm.overtime} onChange={e => setSalaryForm({ ...salaryForm, overtime: e.target.value })} /></div>
                  <div className="bp-field"><label>Other Earnings</label><input type="number" min="0" step="0.01" value={salaryForm.otherEarnings} onChange={e => setSalaryForm({ ...salaryForm, otherEarnings: e.target.value })} /></div>
                </div>
              </div>

              {/* Deductions */}
              <div className="bp-section">
                <h3 className="bp-section-title bp-section-deduct"><FiTrendingDown /> Deductions</h3>
                <div className="bp-form-grid cols-3">
                  <div className="bp-field"><label>Tax</label><input type="number" min="0" step="0.01" value={salaryForm.tax} onChange={e => setSalaryForm({ ...salaryForm, tax: e.target.value })} /></div>
                  <div className="bp-field"><label>Provident Fund</label><input type="number" min="0" step="0.01" value={salaryForm.providentFund} onChange={e => setSalaryForm({ ...salaryForm, providentFund: e.target.value })} /></div>
                  <div className="bp-field"><label>Insurance</label><input type="number" min="0" step="0.01" value={salaryForm.insurance} onChange={e => setSalaryForm({ ...salaryForm, insurance: e.target.value })} /></div>
                  <div className="bp-field"><label>Loan Deduction</label><input type="number" min="0" step="0.01" value={salaryForm.loanDeduction} onChange={e => setSalaryForm({ ...salaryForm, loanDeduction: e.target.value })} /></div>
                  <div className="bp-field"><label>Other Deductions</label><input type="number" min="0" step="0.01" value={salaryForm.otherDeductions} onChange={e => setSalaryForm({ ...salaryForm, otherDeductions: e.target.value })} /></div>
                </div>
                <p className="bp-deduct-note"><FiAlertCircle /> Attendance deductions & incentives are auto-calculated when saving.</p>
              </div>

              {/* Totals */}
              <div className="bp-salary-totals">
                <div className="bp-sal-total-row"><span>Gross Earnings</span><span className="bp-sal-earn">{cs(salaryForm.currency)}{salaryFormGross.toFixed(2)}</span></div>
                <div className="bp-sal-total-row"><span>Total Deductions</span><span className="bp-sal-deduct">-{cs(salaryForm.currency)}{salaryFormDeductions.toFixed(2)}</span></div>
                <div className="bp-sal-total-row bp-sal-net"><span>Net Salary (excl. auto deductions)</span><span>{cs(salaryForm.currency)}{salaryFormNet.toFixed(2)}</span></div>
              </div>

              {/* Settings */}
              <div className="bp-section">
                <h3 className="bp-section-title"><FiSettings /> Payment Settings</h3>
                <div className="bp-form-grid cols-3">
                  <div className="bp-field">
                    <label>Currency</label>
                    <select value={salaryForm.currency} onChange={e => setSalaryForm({ ...salaryForm, currency: e.target.value })}>
                      {Object.entries(CURRENCY_SYMBOLS).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
                    </select>
                  </div>
                  <div className="bp-field">
                    <label>Pay Period</label>
                    <select value={salaryForm.payPeriod} onChange={e => setSalaryForm({ ...salaryForm, payPeriod: e.target.value })}>
                      <option value="monthly">Monthly</option>
                      <option value="bi-weekly">Bi-Weekly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div className="bp-field">
                    <label>Payment Method</label>
                    <select value={salaryForm.paymentMethod} onChange={e => setSalaryForm({ ...salaryForm, paymentMethod: e.target.value })}>
                      <option value="bank-transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="bp-field">
                    <label>Month</label>
                    <select value={salaryForm.month} onChange={e => setSalaryForm({ ...salaryForm, month: e.target.value })}>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="bp-field">
                    <label>Year</label>
                    <select value={salaryForm.year} onChange={e => setSalaryForm({ ...salaryForm, year: e.target.value })}>
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="bp-field">
                    <label>Status</label>
                    <select value={salaryForm.status} onChange={e => setSalaryForm({ ...salaryForm, status: e.target.value })}>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="on-hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bp-field bp-full">
                <label>Notes</label>
                <textarea value={salaryForm.notes} onChange={e => setSalaryForm({ ...salaryForm, notes: e.target.value })} placeholder="Optional notes..." />
              </div>

              <div className="bp-modal-foot">
                <button type="button" className="bp-cancel-btn" onClick={() => { setShowSalaryModal(false); setEditingSalary(null); setSalaryForm(emptySalaryForm); }}>Cancel</button>
                <button type="submit" className="bp-primary-btn">{editingSalary ? 'Update' : 'Create'} Salary Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === DEDUCTION SETTINGS MODAL === */}
      {showDeductionModal && (
        <div className="bp-overlay" onClick={() => setShowDeductionModal(false)}>
          <div className="bp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="bp-modal-head">
              <h2>Salary Deduction Settings</h2>
              <button className="bp-modal-close" onClick={() => setShowDeductionModal(false)}><FiX /></button>
            </div>
            <div className="bp-modal-body">
              <p className="bp-deduct-desc">Configure what percentage of daily salary to deduct for attendance issues. These percentages are applied to the per-day salary amount and auto-calculated when generating or recalculating salary records.</p>

              <div className="bp-deduct-grid">
                <div className="bp-deduct-card">
                  <div className="bp-deduct-card-head">
                    <FiCalendar />
                    <span>Paid Leave</span>
                  </div>
                  <p>Deduction % per day of paid leave</p>
                  <div className="bp-deduct-input-wrap">
                    <input type="number" min="0" max="100" step="1" value={deductionForm.paidLeavePercent} onChange={e => setDeductionForm({ ...deductionForm, paidLeavePercent: e.target.value })} />
                    <FiPercent />
                  </div>
                  <span className="bp-deduct-hint">{deductionForm.paidLeavePercent == 0 ? 'No deduction for paid leaves' : `${deductionForm.paidLeavePercent}% of daily salary deducted`}</span>
                </div>

                <div className="bp-deduct-card">
                  <div className="bp-deduct-card-head">
                    <FiClock />
                    <span>Half Day</span>
                  </div>
                  <p>Deduction % per half-day attendance</p>
                  <div className="bp-deduct-input-wrap">
                    <input type="number" min="0" max="100" step="1" value={deductionForm.halfDayPercent} onChange={e => setDeductionForm({ ...deductionForm, halfDayPercent: e.target.value })} />
                    <FiPercent />
                  </div>
                  <span className="bp-deduct-hint">{deductionForm.halfDayPercent}% of daily salary deducted per half-day</span>
                </div>

                <div className="bp-deduct-card">
                  <div className="bp-deduct-card-head">
                    <FiAlertCircle />
                    <span>Late Arrival</span>
                  </div>
                  <p>Deduction % per day of late arrival</p>
                  <div className="bp-deduct-input-wrap">
                    <input type="number" min="0" max="100" step="1" value={deductionForm.latePercent} onChange={e => setDeductionForm({ ...deductionForm, latePercent: e.target.value })} />
                    <FiPercent />
                  </div>
                  <span className="bp-deduct-hint">{deductionForm.latePercent == 0 ? 'No deduction for late arrivals' : `${deductionForm.latePercent}% of daily salary deducted`}</span>
                </div>

                <div className="bp-deduct-card">
                  <div className="bp-deduct-card-head">
                    <FiXCircle />
                    <span>Absent</span>
                  </div>
                  <p>Deduction % per absent day</p>
                  <div className="bp-deduct-input-wrap">
                    <input type="number" min="0" max="100" step="1" value={deductionForm.absentPercent} onChange={e => setDeductionForm({ ...deductionForm, absentPercent: e.target.value })} />
                    <FiPercent />
                  </div>
                  <span className="bp-deduct-hint">{deductionForm.absentPercent}% of daily salary deducted per absent day</span>
                </div>
              </div>
            </div>
            <div className="bp-modal-foot">
              <button type="button" className="bp-cancel-btn" onClick={() => setShowDeductionModal(false)}>Cancel</button>
              <button type="button" className="bp-primary-btn" onClick={handleSaveDeductionSettings}><FiCheck /> Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* === EXPENSE MODAL === */}
      {showExpenseModal && (
        <div className="bp-overlay" onClick={() => { setShowExpenseModal(false); setEditingExpense(null); setExpenseForm(emptyExpenseForm); }}>
          <div className="bp-modal" onClick={e => e.stopPropagation()}>
            <div className="bp-modal-head">
              <h2>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button className="bp-modal-close" onClick={() => { setShowExpenseModal(false); setEditingExpense(null); setExpenseForm(emptyExpenseForm); }}><FiX /></button>
            </div>

            <form onSubmit={handleSaveExpense} className="bp-modal-body">
              <div className="bp-section">
                <h3 className="bp-section-title">Expense Details</h3>
                <div className="bp-form-grid">
                  <div className="bp-field"><label>Title *</label><input required value={expenseForm.title} onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })} /></div>
                  <div className="bp-field">
                    <label>Category *</label>
                    <select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}>
                      {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="bp-field"><label>Amount *</label><input type="number" min="0" step="0.01" required value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} /></div>
                  <div className="bp-field">
                    <label>Currency</label>
                    <select value={expenseForm.currency} onChange={e => setExpenseForm({ ...expenseForm, currency: e.target.value })}>
                      {Object.entries(CURRENCY_SYMBOLS).map(([k, v]) => <option key={k} value={k}>{k} ({v})</option>)}
                    </select>
                  </div>
                  <div className="bp-field"><label>Date *</label><input type="date" required value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} /></div>
                  <div className="bp-field">
                    <label>Payment Method</label>
                    <select value={expenseForm.paymentMethod} onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}>
                      <option value="bank-transfer">Bank Transfer</option>
                      <option value="credit-card">Credit Card</option>
                      <option value="debit-card">Debit Card</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="cheque">Cheque</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="bp-field"><label>Vendor</label><input value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} /></div>
                  <div className="bp-field">
                    <label>Status</label>
                    <select value={expenseForm.status} onChange={e => setExpenseForm({ ...expenseForm, status: e.target.value })}>
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                      <option value="reimbursed">Reimbursed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bp-section">
                <div className="bp-form-grid">
                  <div className="bp-field bp-toggle-field">
                    <label className="bp-toggle-label">
                      <input type="checkbox" checked={expenseForm.isRecurring} onChange={e => setExpenseForm({ ...expenseForm, isRecurring: e.target.checked })} />
                      Recurring Expense
                    </label>
                  </div>
                  {expenseForm.isRecurring && (
                    <div className="bp-field">
                      <label>Interval</label>
                      <select value={expenseForm.recurringInterval} onChange={e => setExpenseForm({ ...expenseForm, recurringInterval: e.target.value })}>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="bp-field bp-full">
                <label>Description / Notes</label>
                <textarea value={expenseForm.notes || expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value, notes: e.target.value })} placeholder="Additional details..." />
              </div>

              <div className="bp-modal-foot">
                <button type="button" className="bp-cancel-btn" onClick={() => { setShowExpenseModal(false); setEditingExpense(null); setExpenseForm(emptyExpenseForm); }}>Cancel</button>
                <button type="submit" className="bp-primary-btn">{editingExpense ? 'Update' : 'Create'} Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === PREVIEW MODAL === */}
      {showPreview && (
        <div className="bp-overlay" onClick={() => setShowPreview(null)}>
          <div className="bp-preview" onClick={e => e.stopPropagation()}>
            <div className="bp-modal-head">
              <h2>Salary Details</h2>
              <button className="bp-modal-close" onClick={() => setShowPreview(null)}><FiX /></button>
            </div>
            <div className="bp-preview-body">
              {showPreview.type === 'salary' && (() => {
                const s = showPreview.data;
                return (
                  <>
                    <div className="bp-preview-top">
                      <div>
                        <h1 className="bp-preview-title">PAYSLIP</h1>
                        <span className="bp-preview-sub">{MONTHS[s.month - 1]} {s.year}</span>
                      </div>
                      <span className={`bp-badge lg ${s.status}`}>{statusIcon(s.status)} {s.status}</span>
                    </div>
                    <div className="bp-preview-info">
                      <div>
                        <h4>Employee</h4>
                        <p className="bp-preview-name">{s.employeeName}</p>
                        <p>{s.designation}</p>
                        <p>{s.department}</p>
                        <p>{s.employeeEmail}</p>
                      </div>
                      <div className="bp-preview-dates">
                        <p><strong>Pay Period:</strong> {s.payPeriod}</p>
                        <p><strong>Payment Method:</strong> {s.paymentMethod}</p>
                        {s.paymentDate && <p><strong>Paid On:</strong> {new Date(s.paymentDate).toLocaleDateString()}</p>}
                      </div>
                    </div>

                    <div className="bp-preview-split">
                      <div>
                        <h4>Earnings</h4>
                        <table className="bp-preview-table">
                          <tbody>
                            <tr><td>Basic Salary</td><td>{cs(s.currency)}{s.basicSalary?.toFixed(2)}</td></tr>
                            {s.hra > 0 && <tr><td>HRA</td><td>{cs(s.currency)}{s.hra.toFixed(2)}</td></tr>}
                            {s.allowances > 0 && <tr><td>Allowances</td><td>{cs(s.currency)}{s.allowances.toFixed(2)}</td></tr>}
                            {s.bonus > 0 && <tr><td>Bonus</td><td>{cs(s.currency)}{s.bonus.toFixed(2)}</td></tr>}
                            {s.overtime > 0 && <tr><td>Overtime</td><td>{cs(s.currency)}{s.overtime.toFixed(2)}</td></tr>}
                            {s.otherEarnings > 0 && <tr><td>Other</td><td>{cs(s.currency)}{s.otherEarnings.toFixed(2)}</td></tr>}
                            {(s.incentiveAmount || 0) > 0 && (
                              <>
                                <tr style={{borderTop:'1px solid #e5e7eb'}}><td colSpan="2" style={{fontWeight:600,color:'#16a34a',fontSize:'0.72rem',paddingTop:8}}>INCENTIVES</td></tr>
                                {(s.incentiveDetails || []).map((inc, idx) => (
                                  <tr key={idx}><td style={{paddingLeft:12}}>{inc.title} ({inc.type})</td><td style={{color:'#16a34a'}}>+{cs(s.currency)}{inc.amount?.toFixed(2)}</td></tr>
                                ))}
                              </>
                            )}
                            <tr className="bp-preview-subtotal"><td>Total Earnings</td><td>{cs(s.currency)}{s.grossEarnings?.toFixed(2)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <h4>Deductions</h4>
                        <table className="bp-preview-table">
                          <tbody>
                            {s.tax > 0 && <tr><td>Tax</td><td>{cs(s.currency)}{s.tax.toFixed(2)}</td></tr>}
                            {s.providentFund > 0 && <tr><td>Provident Fund</td><td>{cs(s.currency)}{s.providentFund.toFixed(2)}</td></tr>}
                            {s.insurance > 0 && <tr><td>Insurance</td><td>{cs(s.currency)}{s.insurance.toFixed(2)}</td></tr>}
                            {s.loanDeduction > 0 && <tr><td>Loan</td><td>{cs(s.currency)}{s.loanDeduction.toFixed(2)}</td></tr>}
                            {s.otherDeductions > 0 && <tr><td>Other</td><td>{cs(s.currency)}{s.otherDeductions.toFixed(2)}</td></tr>}
                            {(s.attendanceDeduction || 0) > 0 && (
                              <>
                                <tr style={{borderTop:'1px solid #e5e7eb'}}><td colSpan="2" style={{fontWeight:600,color:'#dc2626',fontSize:'0.72rem',paddingTop:8}}>ATTENDANCE DEDUCTIONS</td></tr>
                                {s.attendanceBreakdown?.paidLeaveDeduction > 0 && (
                                  <tr><td style={{paddingLeft:12}}>Paid Leave ({s.attendanceBreakdown.paidLeaveDays} days)</td><td style={{color:'#dc2626'}}>{cs(s.currency)}{s.attendanceBreakdown.paidLeaveDeduction.toFixed(2)}</td></tr>
                                )}
                                {s.attendanceBreakdown?.halfDayDeduction > 0 && (
                                  <tr><td style={{paddingLeft:12}}>Half Days ({s.attendanceBreakdown.halfDayCount})</td><td style={{color:'#dc2626'}}>{cs(s.currency)}{s.attendanceBreakdown.halfDayDeduction.toFixed(2)}</td></tr>
                                )}
                                {s.attendanceBreakdown?.lateDeduction > 0 && (
                                  <tr><td style={{paddingLeft:12}}>Late Arrivals ({s.attendanceBreakdown.lateCount})</td><td style={{color:'#dc2626'}}>{cs(s.currency)}{s.attendanceBreakdown.lateDeduction.toFixed(2)}</td></tr>
                                )}
                              </>
                            )}
                            <tr className="bp-preview-subtotal"><td>Total Deductions</td><td>{cs(s.currency)}{s.totalDeductions?.toFixed(2)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Attendance summary bar */}
                    {s.attendanceBreakdown?.totalWorkingDays > 0 && (
                      <div className="bp-att-summary">
                        <h4><FiUserCheck /> Attendance Summary</h4>
                        <div className="bp-att-grid">
                          <div className="bp-att-item"><span>{s.attendanceBreakdown.totalWorkingDays}</span><label>Working Days</label></div>
                          <div className="bp-att-item bp-att-good"><span>{s.attendanceBreakdown.daysPresent}</span><label>Present</label></div>
                          <div className="bp-att-item bp-att-warn"><span>{s.attendanceBreakdown.paidLeaveDays}</span><label>Paid Leave</label></div>
                          <div className="bp-att-item bp-att-warn"><span>{s.attendanceBreakdown.halfDayCount}</span><label>Half Days</label></div>
                          <div className="bp-att-item bp-att-bad"><span>{s.attendanceBreakdown.lateCount}</span><label>Late</label></div>
                          <div className="bp-att-item bp-att-bad"><span>{s.attendanceBreakdown.absentDays}</span><label>Absent</label></div>
                        </div>
                      </div>
                    )}

                    <div className="bp-preview-net">
                      <span>Net Salary</span>
                      <span>{cs(s.currency)}{s.netSalary?.toFixed(2)}</span>
                    </div>
                    {s.notes && <div className="bp-preview-notes"><h4>Notes</h4><p>{s.notes}</p></div>}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillingPayments;
