import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import {
  FiSearch, FiMail, FiPhone, FiBriefcase, FiMapPin, FiCalendar,
  FiClock, FiUser, FiChevronUp, FiChevronDown, FiX, FiFilter,
  FiUsers, FiShield, FiActivity, FiAward, FiHash, FiGlobe,
  FiChevronRight, FiRefreshCw, FiChevronLeft, FiBarChart2,
  FiPercent, FiSettings, FiCheck, FiAlertCircle
} from 'react-icons/fi';
import './EmployeeDetails.css';

function EmployeeDetails() {
  // ── Employee list state ──────────────────────────
  const [pageTab, setPageTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [employeeDetail, setEmployeeDetail] = useState(null);
  const [sortBy, setSortBy] = useState('fullName');
  const [sortDir, setSortDir] = useState('asc');
  const [activeTab, setActiveTab] = useState('info');

  // ── Attendance state ─────────────────────────────
  const [attRecords, setAttRecords] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [workingHoursPerDay, setWorkingHoursPerDay] = useState(8);
  const [attCurrentMonth, setAttCurrentMonth] = useState(new Date());
  const [attViewMode, setAttViewMode] = useState('summary');
  const [attEmpFilter, setAttEmpFilter] = useState('');

  // ── Salary deduction settings ────────────────────
  const [showDeductionPanel, setShowDeductionPanel] = useState(false);
  const [deductionSettings, setDeductionSettings] = useState({ paidLeavePercent: 0, halfDayPercent: 50, latePercent: 0, absentPercent: 100 });
  const [deductionForm, setDeductionForm] = useState({ paidLeavePercent: 0, halfDayPercent: 50, latePercent: 0, absentPercent: 100 });
  const [deductionSaving, setDeductionSaving] = useState(false);

  // ── Fetch employees ──────────────────────────────
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (departmentFilter) params.department = departmentFilter;
      const response = await api.get('/hr/employees', { params });
      if (response.data.success) {
        const emps = response.data.employees || [];
        setEmployees(emps);
        const depts = [...new Set(emps.map(e => e.department).filter(Boolean))];
        setDepartments(depts);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // ── Fetch attendance ─────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      setAttLoading(true);
      const year = attCurrentMonth.getFullYear();
      const month = String(attCurrentMonth.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(year, attCurrentMonth.getMonth() + 1, 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      const params = { startDate, endDate };
      if (attEmpFilter) params.employeeId = attEmpFilter;
      const response = await api.get('/attendance/summary', { params });
      if (response.data.success) {
        setAttRecords(response.data.records || []);
        setWorkingHoursPerDay(response.data.workingHoursPerDay || 8);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setAttLoading(false);
    }
  }, [attCurrentMonth, attEmpFilter]);

  useEffect(() => {
    if (pageTab === 'attendance') fetchAttendance();
  }, [fetchAttendance, pageTab]);

  // ── Fetch deduction settings ─────────────────────
  const fetchDeductionSettings = useCallback(async () => {
    try {
      const res = await api.get('/salaries/deduction-settings');
      if (res.data.success && res.data.settings) {
        setDeductionSettings(res.data.settings);
        setDeductionForm(res.data.settings);
      }
    } catch (err) { console.error('Error loading deduction settings:', err); }
  }, []);

  useEffect(() => {
    if (pageTab === 'attendance') fetchDeductionSettings();
  }, [fetchDeductionSettings, pageTab]);

  const handleSaveDeductionSettings = async () => {
    setDeductionSaving(true);
    try {
      await api.put('/salaries/deduction-settings', deductionForm);
      setDeductionSettings(deductionForm);
      setShowDeductionPanel(false);
    } catch (err) { alert('Error saving deduction settings'); }
    setDeductionSaving(false);
  };

  // ── Employee detail ──────────────────────────────
  const fetchEmployeeDetail = async (id) => {
    try {
      setDetailLoading(true);
      setEmployeeDetail(null);
      const response = await api.get(`/hr/employees/${id}`);
      if (response.data.success) setEmployeeDetail(response.data);
    } catch (err) {
      console.error('Error fetching employee detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEmployeeClick = (emp) => {
    if (selectedEmployee === emp._id) {
      setSelectedEmployee(null);
      setEmployeeDetail(null);
    } else {
      setSelectedEmployee(emp._id);
      setActiveTab('info');
      fetchEmployeeDetail(emp._id);
    }
  };

  // ── Sort / filter ────────────────────────────────
  const handleSort = (field) => {
    if (sortBy === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  // ── Helpers ──────────────────────────────────────
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleClass = (role) => {
    if (role === 'Owner') return 'role-owner';
    if (role === 'Manager') return 'role-manager';
    return 'role-employee';
  };

  const getAvatarColor = (name) => {
    const colors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = (name.charCodeAt(i) + h * 31) % colors.length;
    return colors[h];
  };

  const getStatusClass = (status) => {
    const map = { present: 'att-present', 'half-day': 'att-halfday', absent: 'att-absent', leave: 'att-leave', holiday: 'att-holiday', late: 'att-late' };
    return map[status] || '';
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const prevMonth = () => setAttCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setAttCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const monthStr = attCurrentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Attendance derived data
  const empSummary = {};
  attRecords.forEach(r => {
    const id = r.userId?._id || r.userId;
    if (!empSummary[id]) empSummary[id] = { employee: r.userId, totalHours: 0, daysPresent: 0, daysHalfDay: 0, daysAbsent: 0, records: [] };
    const s = empSummary[id];
    s.totalHours += (r.totalMinutes || 0) / 60;
    if (r.status === 'present') s.daysPresent++;
    else if (r.status === 'half-day') s.daysHalfDay++;
    else if (r.status === 'absent') s.daysAbsent++;
    s.records.push(r);
  });

  const filteredEmployees = employees.filter(e => {
    if (roleFilter && (e.roleInCompany || 'Employee') !== roleFilter) return false;
    return true;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aVal = (a[sortBy] || '').toString().toLowerCase();
    const bVal = (b[sortBy] || '').toString().toLowerCase();
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const stats = {
    total: employees.length,
    managers: employees.filter(e => e.roleInCompany === 'Manager').length,
    owners: employees.filter(e => e.roleInCompany === 'Owner').length,
    departments: departments.length,
  };

  const SortIcon = ({ field }) => (
    sortBy === field ? (sortDir === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />) : null
  );

  if (loading) {
    return (
      <div className="emp">
        <div className="emp-loading">
          <div className="emp-spinner"></div>
          <p>Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="emp">

      {/* Page Header */}
      <div className="emp-header">
        <div className="emp-header-left">
          <h2>Employee Details</h2>
          <p className="emp-subtitle">Manage team members and track attendance</p>
        </div>
        <button className="emp-refresh-btn" onClick={pageTab === 'attendance' ? fetchAttendance : fetchEmployees} title="Refresh">
          <FiRefreshCw size={14} />
        </button>
      </div>

      {/* Page Tabs */}
      <div className="emp-page-tabs">
        <button className={pageTab === 'employees' ? 'active' : ''} onClick={() => setPageTab('employees')}>
          <FiUsers size={13} /> Employees
        </button>
        <button className={pageTab === 'attendance' ? 'active' : ''} onClick={() => setPageTab('attendance')}>
          <FiBarChart2 size={13} /> Attendance Summary
        </button>
      </div>

      {/* ══ EMPLOYEES TAB ══ */}
      {pageTab === 'employees' && (
        <>
          {/* Stats Row */}
          <div className="emp-stats">
            <div className="emp-stat-card">
              <div className="emp-stat-icon icon-blue"><FiUsers size={15} /></div>
              <div>
                <div className="emp-stat-value">{stats.total}</div>
                <div className="emp-stat-label">Total Members</div>
              </div>
            </div>
            <div className="emp-stat-card">
              <div className="emp-stat-icon icon-purple"><FiShield size={15} /></div>
              <div>
                <div className="emp-stat-value">{stats.managers + stats.owners}</div>
                <div className="emp-stat-label">Managers / Owners</div>
              </div>
            </div>
            <div className="emp-stat-card">
              <div className="emp-stat-icon icon-green"><FiBriefcase size={15} /></div>
              <div>
                <div className="emp-stat-value">{stats.departments}</div>
                <div className="emp-stat-label">Departments</div>
              </div>
            </div>
            <div className="emp-stat-card">
              <div className="emp-stat-icon icon-amber"><FiAward size={15} /></div>
              <div>
                <div className="emp-stat-value">{stats.owners}</div>
                <div className="emp-stat-label">Owners</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="emp-filters">
            <div className="emp-search-wrap">
              <FiSearch className="emp-search-icon" />
              <input
                className="emp-search"
                type="text"
                placeholder="Search by name, email, department..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <button className="emp-search-clear" onClick={() => setSearch('')}><FiX size={12} /></button>}
            </div>
            <div className="emp-filter-group">
              <FiFilter size={13} className="emp-filter-icon" />
              <select className="emp-select" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="emp-filter-group">
              <select className="emp-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <option value="">All Roles</option>
                <option value="Owner">Owner</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
              </select>
            </div>
            {(search || departmentFilter || roleFilter) && (
              <button className="emp-clear-all" onClick={() => { setSearch(''); setDepartmentFilter(''); setRoleFilter(''); }}>Clear filters</button>
            )}
            <span className="emp-count-badge">{sortedEmployees.length} member{sortedEmployees.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Layout */}
          <div className={`emp-layout ${selectedEmployee ? 'has-detail' : ''}`}>
            <div className="emp-list-wrap">
              <div className="emp-list-header">
                <button className="emp-col emp-col-name sortable" onClick={() => handleSort('fullName')}>Name <SortIcon field="fullName" /></button>
                <button className="emp-col emp-col-dept sortable" onClick={() => handleSort('department')}>Department <SortIcon field="department" /></button>
                <button className="emp-col emp-col-title sortable" onClick={() => handleSort('jobTitle')}>Job Title <SortIcon field="jobTitle" /></button>
                <span className="emp-col emp-col-role">Role</span>
                <span className="emp-col emp-col-contact">Contact</span>
                <span className="emp-col emp-col-last">Last Active</span>
              </div>
              <div className="emp-list">
                {sortedEmployees.length === 0 ? (
                  <div className="emp-empty">
                    <FiUser size={28} />
                    <p>No employees found</p>
                    {(search || departmentFilter || roleFilter) && (
                      <button className="emp-clear-all" style={{ marginTop: '10px' }} onClick={() => { setSearch(''); setDepartmentFilter(''); setRoleFilter(''); }}>Clear filters</button>
                    )}
                  </div>
                ) : sortedEmployees.map(emp => (
                  <div key={emp._id} className={`emp-row ${selectedEmployee === emp._id ? 'active' : ''}`} onClick={() => handleEmployeeClick(emp)}>
                    <div className="emp-col emp-col-name">
                      <div className="emp-avatar" style={{ background: getAvatarColor(emp.fullName) }}>
                        {emp.profileImage ? <img src={emp.profileImage} alt={emp.fullName} /> : <span>{getInitials(emp.fullName)}</span>}
                      </div>
                      <div className="emp-name-info">
                        <span className="emp-name">{emp.fullName}</span>
                        <span className="emp-email">{emp.email}</span>
                      </div>
                    </div>
                    <div className="emp-col emp-col-dept">
                      {emp.department ? <span className="emp-dept-chip">{emp.department}</span> : <span className="emp-na">—</span>}
                    </div>
                    <div className="emp-col emp-col-title">
                      <span className="emp-title-text">{emp.jobTitle || '—'}</span>
                    </div>
                    <div className="emp-col emp-col-role">
                      <span className={`emp-role-badge ${getRoleClass(emp.roleInCompany)}`}>{emp.roleInCompany || 'Employee'}</span>
                    </div>
                    <div className="emp-col emp-col-contact">
                      {emp.phoneNumber ? <span className="emp-contact-pill"><FiPhone size={11} /> {emp.phoneNumber}</span> : <span className="emp-na">—</span>}
                    </div>
                    <div className="emp-col emp-col-last">
                      <span className="emp-last-text">{emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString() : 'Never'}</span>
                    </div>
                    <FiChevronRight className="emp-row-arrow" size={14} />
                  </div>
                ))}
              </div>
            </div>

            {/* Detail Panel */}
            {selectedEmployee && (
              <div className="emp-detail">
                <div className="emp-detail-close-row">
                  <span className="emp-detail-title">Profile</span>
                  <button className="emp-detail-close" onClick={() => { setSelectedEmployee(null); setEmployeeDetail(null); }}><FiX size={14} /></button>
                </div>
                {detailLoading ? (
                  <div className="emp-detail-loading"><div className="emp-spinner"></div></div>
                ) : employeeDetail ? (
                  <>
                    <div className="emp-detail-hero">
                      <div className="emp-detail-avatar" style={{ background: getAvatarColor(employeeDetail.employee.fullName) }}>
                        {employeeDetail.employee.profileImage
                          ? <img src={employeeDetail.employee.profileImage} alt={employeeDetail.employee.fullName} />
                          : <span>{getInitials(employeeDetail.employee.fullName)}</span>}
                      </div>
                      <div className="emp-detail-name-block">
                        <h3>{employeeDetail.employee.fullName}</h3>
                        <p>{employeeDetail.employee.jobTitle || 'Team Member'}</p>
                        <span className={`emp-role-badge ${getRoleClass(employeeDetail.employee.roleInCompany)}`}>{employeeDetail.employee.roleInCompany || 'Employee'}</span>
                      </div>
                    </div>
                    <div className="emp-detail-tabs">
                      <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}>Info</button>
                      <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>Attendance</button>
                    </div>
                    {activeTab === 'info' && (
                      <div className="emp-detail-info">
                        <div className="emp-info-section">
                          <div className="emp-info-label">CONTACT</div>
                          <div className="emp-info-row"><FiMail size={13} /><span>{employeeDetail.employee.email}</span></div>
                          {employeeDetail.employee.phoneNumber && <div className="emp-info-row"><FiPhone size={13} /><span>{employeeDetail.employee.phoneNumber}</span></div>}
                        </div>
                        <div className="emp-info-section">
                          <div className="emp-info-label">WORK</div>
                          {employeeDetail.employee.department && <div className="emp-info-row"><FiBriefcase size={13} /><span>{employeeDetail.employee.department}</span></div>}
                          {employeeDetail.employee.jobTitle && <div className="emp-info-row"><FiHash size={13} /><span>{employeeDetail.employee.jobTitle}</span></div>}
                        </div>
                        {(employeeDetail.employee.city || employeeDetail.employee.country) && (
                          <div className="emp-info-section">
                            <div className="emp-info-label">LOCATION</div>
                            <div className="emp-info-row">
                              <FiMapPin size={13} />
                              <span>{[employeeDetail.employee.city, employeeDetail.employee.state, employeeDetail.employee.country].filter(Boolean).join(', ')}</span>
                            </div>
                            {employeeDetail.employee.country && <div className="emp-info-row"><FiGlobe size={13} /><span>{employeeDetail.employee.country}</span></div>}
                          </div>
                        )}
                        <div className="emp-info-section">
                          <div className="emp-info-label">ACCOUNT</div>
                          {employeeDetail.employee.createdAt && (
                            <div className="emp-info-row">
                              <FiCalendar size={13} />
                              <span>Joined {new Date(employeeDetail.employee.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                          )}
                          {employeeDetail.employee.lastLogin && (
                            <div className="emp-info-row">
                              <FiActivity size={13} />
                              <span>Last active {new Date(employeeDetail.employee.lastLogin).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {activeTab === 'attendance' && (
                      <div className="emp-detail-attendance">
                        <div className="emp-att-grid">
                          <div className="emp-att-card"><span className="emp-att-value">{employeeDetail.attendance?.daysPresent || 0}</span><span className="emp-att-label">Days Present</span></div>
                          <div className="emp-att-card"><span className="emp-att-value">{employeeDetail.attendance?.totalHoursThisMonth || 0}h</span><span className="emp-att-label">Hours This Month</span></div>
                          <div className="emp-att-card"><span className="emp-att-value">{employeeDetail.attendance?.daysAbsent || 0}</span><span className="emp-att-label">Days Absent</span></div>
                          <div className="emp-att-card"><span className="emp-att-value">{employeeDetail.attendance?.lateArrivals || 0}</span><span className="emp-att-label">Late Arrivals</span></div>
                        </div>
                        <div className="emp-att-note"><FiClock size={12} /> Showing current month's data</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="emp-detail-error">Failed to load profile.</div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ ATTENDANCE TAB ══ */}
      {pageTab === 'attendance' && (
        <div className="att-wrap">
          {/* Controls */}
          <div className="att-controls">
            <div className="att-month-nav">
              <button className="att-nav-btn" onClick={prevMonth}><FiChevronLeft size={14} /></button>
              <span className="att-month-label"><FiCalendar size={13} /> {monthStr}</span>
              <button className="att-nav-btn" onClick={nextMonth}><FiChevronRight size={14} /></button>
            </div>
            <div className="att-right-controls">
              <select className="emp-select" value={attEmpFilter} onChange={e => setAttEmpFilter(e.target.value)}>
                <option value="">All Employees</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.fullName}</option>)}
              </select>
              <div className="att-view-toggle">
                <button className={attViewMode === 'summary' ? 'active' : ''} onClick={() => setAttViewMode('summary')}>Summary</button>
                <button className={attViewMode === 'daily' ? 'active' : ''} onClick={() => setAttViewMode('daily')}>Daily</button>
              </div>
              <button className={`att-deduct-btn ${showDeductionPanel ? 'active' : ''}`} onClick={() => setShowDeductionPanel(!showDeductionPanel)} title="Salary Deduction Settings">
                <FiSettings size={13} /> Deductions
              </button>
            </div>
          </div>

          {/* Salary Deduction Settings Panel */}
          {showDeductionPanel && (
            <div className="att-deduct-panel">
              <div className="att-deduct-header">
                <div className="att-deduct-title">
                  <FiPercent size={14} />
                  <h4>Salary Deduction Rules</h4>
                </div>
                <p className="att-deduct-desc">Set the percentage of daily salary to deduct for each attendance type. These are applied automatically when generating monthly salary records.</p>
              </div>
              <div className="att-deduct-grid">
                <div className="att-deduct-card">
                  <div className="att-deduct-card-label"><FiCalendar size={12} /> Paid Leave</div>
                  <div className="att-deduct-input-row">
                    <input type="number" min="0" max="100" step="1" value={deductionForm.paidLeavePercent} onChange={e => setDeductionForm({...deductionForm, paidLeavePercent: e.target.value})} />
                    <span>%</span>
                  </div>
                  <span className="att-deduct-hint">{deductionForm.paidLeavePercent == 0 ? 'No deduction' : `${deductionForm.paidLeavePercent}% of daily salary`}</span>
                </div>
                <div className="att-deduct-card">
                  <div className="att-deduct-card-label"><FiClock size={12} /> Half Day</div>
                  <div className="att-deduct-input-row">
                    <input type="number" min="0" max="100" step="1" value={deductionForm.halfDayPercent} onChange={e => setDeductionForm({...deductionForm, halfDayPercent: e.target.value})} />
                    <span>%</span>
                  </div>
                  <span className="att-deduct-hint">{deductionForm.halfDayPercent}% of daily salary</span>
                </div>
                <div className="att-deduct-card">
                  <div className="att-deduct-card-label"><FiAlertCircle size={12} /> Late Arrival</div>
                  <div className="att-deduct-input-row">
                    <input type="number" min="0" max="100" step="1" value={deductionForm.latePercent} onChange={e => setDeductionForm({...deductionForm, latePercent: e.target.value})} />
                    <span>%</span>
                  </div>
                  <span className="att-deduct-hint">{deductionForm.latePercent == 0 ? 'No deduction' : `${deductionForm.latePercent}% of daily salary`}</span>
                </div>
                <div className="att-deduct-card">
                  <div className="att-deduct-card-label"><FiX size={12} /> Absent</div>
                  <div className="att-deduct-input-row">
                    <input type="number" min="0" max="100" step="1" value={deductionForm.absentPercent} onChange={e => setDeductionForm({...deductionForm, absentPercent: e.target.value})} />
                    <span>%</span>
                  </div>
                  <span className="att-deduct-hint">{deductionForm.absentPercent}% of daily salary</span>
                </div>
              </div>
              <div className="att-deduct-actions">
                <button className="att-deduct-cancel" onClick={() => { setDeductionForm(deductionSettings); setShowDeductionPanel(false); }}>Cancel</button>
                <button className="att-deduct-save" onClick={handleSaveDeductionSettings} disabled={deductionSaving}>
                  <FiCheck size={13} /> {deductionSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          )}

          {attLoading ? (
            <div className="emp-loading" style={{ minHeight: '200px' }}>
              <div className="emp-spinner"></div>
              <p>Loading attendance...</p>
            </div>
          ) : (
            <>
              {/* Summary View */}
              {attViewMode === 'summary' && (
                <div className="att-summary-grid">
                  {Object.values(empSummary).length > 0 ? Object.values(empSummary).map((emp, idx) => (
                    <div key={idx} className="att-emp-card">
                      <div className="att-emp-head">
                        <div className="att-emp-avatar" style={{ background: getAvatarColor(emp.employee?.fullName) }}>
                          {getInitials(emp.employee?.fullName)}
                        </div>
                        <div>
                          <div className="att-emp-name">{emp.employee?.fullName || 'Unknown'}</div>
                          <div className="att-emp-dept">{emp.employee?.department || '—'}</div>
                        </div>
                      </div>
                      <div className="att-emp-stats">
                        <div className="att-stat"><span className="att-val att-green">{emp.daysPresent}</span><span className="att-lbl">Present</span></div>
                        <div className="att-stat"><span className="att-val att-yellow">{emp.daysHalfDay}</span><span className="att-lbl">Half Day</span></div>
                        <div className="att-stat"><span className="att-val att-red">{emp.daysAbsent}</span><span className="att-lbl">Absent</span></div>
                      </div>
                      <div className="att-hours-row">
                        <span>Total Hours</span>
                        <span className="att-hours-val">{Math.round(emp.totalHours * 10) / 10}h</span>
                      </div>
                      <div className="att-progress-bar">
                        <div className="att-progress-fill" style={{ width: `${Math.min(100, (emp.totalHours / (workingHoursPerDay * (emp.records.length || 1))) * 100)}%` }}></div>
                      </div>
                      <div className="att-expected">Expected: {Math.round(workingHoursPerDay * emp.records.length * 10) / 10}h ({workingHoursPerDay}h × {emp.records.length} days)</div>
                    </div>
                  )) : (
                    <div className="emp-empty">
                      <FiClock size={28} /><p>No attendance records for {monthStr}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Daily View */}
              {attViewMode === 'daily' && (
                <div className="att-table-wrap">
                  <table className="att-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>First Login</th>
                        <th>Last Activity</th>
                        <th>Hours</th>
                        <th>Progress</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attRecords.length > 0 ? attRecords.map((r, i) => (
                        <tr key={i}>
                          <td className="att-name-cell">
                            <div className="att-row-avatar" style={{ background: getAvatarColor(r.userId?.fullName) }}>{getInitials(r.userId?.fullName)}</div>
                            {r.userId?.fullName || 'Unknown'}
                          </td>
                          <td>{new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                          <td>{formatTime(r.firstLogin)}</td>
                          <td>{formatTime(r.lastLogout)}</td>
                          <td><strong>{r.totalHours || 0}h</strong> <span className="att-of">/ {workingHoursPerDay}h</span></td>
                          <td>
                            <div className="att-tbl-bar"><div className="att-tbl-fill" style={{ width: `${r.completionPercent || 0}%` }}></div></div>
                            <span className="att-pct">{r.completionPercent || 0}%</span>
                          </td>
                          <td><span className={`att-badge ${getStatusClass(r.status)}`}>{r.status}</span></td>
                        </tr>
                      )) : (
                        <tr><td colSpan="7" className="att-empty-cell">No records found for {monthStr}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default EmployeeDetails;
