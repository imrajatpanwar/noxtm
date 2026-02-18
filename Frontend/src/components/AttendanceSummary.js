import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { FiCalendar, FiClock, FiFilter, FiUser, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './AttendanceSummary.css';

function AttendanceSummary() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingHoursPerDay, setWorkingHoursPerDay] = useState(8);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('summary'); // summary or daily
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState([]);

  // Fetch employees for filter
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/hr/employees');
        if (response.data.success) {
          setEmployees(response.data.employees || []);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };
    fetchEmployees();
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const year = currentMonth.getFullYear();
      const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;

      // Get last day of month
      const lastDay = new Date(year, currentMonth.getMonth() + 1, 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const params = { startDate, endDate };
      if (selectedEmployee) params.employeeId = selectedEmployee;

      const response = await api.get('/attendance/summary', { params });
      if (response.data.success) {
        setRecords(response.data.records || []);
        setWorkingHoursPerDay(response.data.workingHoursPerDay || 8);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, selectedEmployee]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthStr = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Aggregate by employee for summary view
  const employeeSummary = {};
  records.forEach(r => {
    const empId = r.userId?._id || r.userId;
    if (!employeeSummary[empId]) {
      employeeSummary[empId] = {
        employee: r.userId,
        totalHours: 0,
        daysPresent: 0,
        daysHalfDay: 0,
        daysAbsent: 0,
        records: [],
      };
    }
    const summary = employeeSummary[empId];
    summary.totalHours += (r.totalMinutes || 0) / 60;
    if (r.status === 'present') summary.daysPresent++;
    else if (r.status === 'half-day') summary.daysHalfDay++;
    else if (r.status === 'absent') summary.daysAbsent++;
    summary.records.push(r);
  });

  const getStatusClass = (status) => {
    switch (status) {
      case 'present': return 'att-status-present';
      case 'half-day': return 'att-status-halfday';
      case 'absent': return 'att-status-absent';
      case 'leave': return 'att-status-leave';
      case 'holiday': return 'att-status-holiday';
      case 'late': return 'att-status-late';
      default: return '';
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="att-summary">
        <div className="att-loading">
          <div className="att-loading-spinner"></div>
          <p>Loading attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="att-summary">
      <div className="att-header">
        <div>
          <h2>Attendance Summary</h2>
          <p className="att-subtitle">Automated tracking based on dashboard activity</p>
        </div>
      </div>

      {/* Controls */}
      <div className="att-controls">
        <div className="att-month-nav">
          <button onClick={prevMonth} className="att-nav-btn"><FiChevronLeft /></button>
          <span className="att-month-label"><FiCalendar /> {monthStr}</span>
          <button onClick={nextMonth} className="att-nav-btn"><FiChevronRight /></button>
        </div>
        <div className="att-filters">
          <select
            className="att-emp-filter"
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
          >
            <option value="">All Employees</option>
            {employees.map(e => (
              <option key={e._id} value={e._id}>{e.fullName}</option>
            ))}
          </select>
          <div className="att-view-toggle">
            <button className={viewMode === 'summary' ? 'active' : ''} onClick={() => setViewMode('summary')}>
              <FiUser /> Summary
            </button>
            <button className={viewMode === 'daily' ? 'active' : ''} onClick={() => setViewMode('daily')}>
              <FiFilter /> Daily
            </button>
          </div>
        </div>
      </div>

      {/* Summary View - Per Employee */}
      {viewMode === 'summary' && (
        <div className="att-summary-grid">
          {Object.values(employeeSummary).length > 0 ? (
            Object.values(employeeSummary).map((emp, idx) => (
              <div key={idx} className="att-emp-card">
                <div className="att-emp-header">
                  <div className="att-emp-info">
                    <h4>{emp.employee?.fullName || 'Unknown'}</h4>
                    <p>{emp.employee?.department || 'No department'}</p>
                  </div>
                </div>
                <div className="att-emp-stats">
                  <div className="att-stat">
                    <span className="att-stat-value att-green">{emp.daysPresent}</span>
                    <span className="att-stat-label">Present</span>
                  </div>
                  <div className="att-stat">
                    <span className="att-stat-value att-yellow">{emp.daysHalfDay}</span>
                    <span className="att-stat-label">Half Day</span>
                  </div>
                  <div className="att-stat">
                    <span className="att-stat-value att-red">{emp.daysAbsent}</span>
                    <span className="att-stat-label">Absent</span>
                  </div>
                </div>
                <div className="att-emp-hours">
                  <div className="att-hours-header">
                    <span>Total Hours</span>
                    <span className="att-hours-value">{Math.round(emp.totalHours * 10) / 10}h</span>
                  </div>
                  <div className="att-progress-bar">
                    <div
                      className="att-progress-fill"
                      style={{
                        width: `${Math.min(100, (emp.totalHours / (workingHoursPerDay * emp.records.length || 1)) * 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="att-hours-expected">
                    Expected: {Math.round(workingHoursPerDay * emp.records.length * 10) / 10}h
                    ({workingHoursPerDay}h × {emp.records.length} days)
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="att-empty">
              <FiClock size={28} />
              <p>No attendance records for {monthStr}</p>
            </div>
          )}
        </div>
      )}

      {/* Daily View */}
      {viewMode === 'daily' && (
        <div className="att-table-container">
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
              {records.length > 0 ? records.map((r, i) => (
                <tr key={i}>
                  <td>
                    <span className="att-table-name">{r.userId?.fullName || 'Unknown'}</span>
                  </td>
                  <td>
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </td>
                  <td>{formatTime(r.firstLogin)}</td>
                  <td>{formatTime(r.lastLogout)}</td>
                  <td className="att-hours-cell">
                    <strong>{r.totalHours || 0}h</strong>
                    <span className="att-hours-sub">/ {workingHoursPerDay}h</span>
                  </td>
                  <td>
                    <div className="att-table-progress">
                      <div
                        className="att-table-progress-fill"
                        style={{ width: `${r.completionPercent || 0}%` }}
                      ></div>
                    </div>
                    <span className="att-progress-pct">{r.completionPercent || 0}%</span>
                  </td>
                  <td>
                    <span className={`att-status-badge ${getStatusClass(r.status)}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" className="att-empty-cell">No records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AttendanceSummary;
