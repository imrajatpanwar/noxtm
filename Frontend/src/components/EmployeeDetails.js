import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { FiSearch, FiMail, FiPhone, FiBriefcase, FiMapPin, FiCalendar, FiClock, FiUser, FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';
import './EmployeeDetails.css';

function EmployeeDetails() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [employeeDetail, setEmployeeDetail] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or table
  const [sortBy, setSortBy] = useState('fullName');
  const [sortDir, setSortDir] = useState('asc');

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

        // Extract unique departments
        const depts = [...new Set(emps.map(e => e.department).filter(Boolean))];
        setDepartments(depts);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const fetchEmployeeDetail = async (id) => {
    try {
      setDetailLoading(true);
      const response = await api.get(`/hr/employees/${id}`);
      if (response.data.success) {
        setEmployeeDetail(response.data);
      }
    } catch (err) {
      console.error('Error fetching employee detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEmployeeClick = (emp) => {
    setSelectedEmployee(emp._id);
    fetchEmployeeDetail(emp._id);
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    const aVal = (a[sortBy] || '').toString().toLowerCase();
    const bVal = (b[sortBy] || '').toString().toLowerCase();
    return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return null;
    return sortDir === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Owner': return 'role-owner';
      case 'Manager': return 'role-manager';
      default: return 'role-employee';
    }
  };

  if (loading) {
    return (
      <div className="emp-details">
        <div className="emp-loading">
          <div className="emp-loading-spinner"></div>
          <p>Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="emp-details">
      <div className="emp-header">
        <div>
          <h2>Employees</h2>
          <p className="emp-subtitle">{employees.length} team member{employees.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="emp-header-actions">
          <div className="emp-view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
            <button className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')}>Table</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="emp-filters">
        <div className="emp-search-box">
          <FiSearch className="emp-search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="emp-dept-filter"
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="emp-grid">
          {sortedEmployees.map(emp => (
            <div
              key={emp._id}
              className={`emp-card ${selectedEmployee === emp._id ? 'selected' : ''}`}
              onClick={() => handleEmployeeClick(emp)}
            >
              <div className="emp-card-avatar">
                {emp.profileImage ? (
                  <img src={emp.profileImage} alt={emp.fullName} />
                ) : (
                  <div className="emp-card-initials">{getInitials(emp.fullName)}</div>
                )}
              </div>
              <div className="emp-card-info">
                <h4>{emp.fullName}</h4>
                <p className="emp-card-title">{emp.jobTitle || 'No title'}</p>
                <p className="emp-card-dept">{emp.department || 'No department'}</p>
              </div>
              <span className={`emp-role-badge ${getRoleBadgeClass(emp.roleInCompany)}`}>
                {emp.roleInCompany || 'Employee'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="emp-table-container">
          <table className="emp-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('fullName')} className="sortable">
                  Name <SortIcon field="fullName" />
                </th>
                <th>Email</th>
                <th onClick={() => handleSort('department')} className="sortable">
                  Department <SortIcon field="department" />
                </th>
                <th onClick={() => handleSort('jobTitle')} className="sortable">
                  Job Title <SortIcon field="jobTitle" />
                </th>
                <th>Role</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map(emp => (
                <tr
                  key={emp._id}
                  className={selectedEmployee === emp._id ? 'selected' : ''}
                  onClick={() => handleEmployeeClick(emp)}
                >
                  <td>
                    <div className="emp-table-name">
                      <div className="emp-table-avatar">
                        {emp.profileImage ? (
                          <img src={emp.profileImage} alt={emp.fullName} />
                        ) : (
                          <span>{getInitials(emp.fullName)}</span>
                        )}
                      </div>
                      {emp.fullName}
                    </div>
                  </td>
                  <td className="emp-table-email">{emp.email}</td>
                  <td>{emp.department || '—'}</td>
                  <td>{emp.jobTitle || '—'}</td>
                  <td>
                    <span className={`emp-role-badge ${getRoleBadgeClass(emp.roleInCompany)}`}>
                      {emp.roleInCompany || 'Employee'}
                    </span>
                  </td>
                  <td className="emp-table-date">
                    {emp.lastLogin ? new Date(emp.lastLogin).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {employees.length === 0 && (
        <div className="emp-empty">
          <FiUser size={32} />
          <p>No employees found</p>
        </div>
      )}

      {/* Detail Sidebar */}
      {selectedEmployee && (
        <div className="emp-detail-overlay" onClick={() => setSelectedEmployee(null)}>
          <div className="emp-detail-panel" onClick={e => e.stopPropagation()}>
            <button className="emp-detail-close" onClick={() => setSelectedEmployee(null)}>
              <FiX />
            </button>

            {detailLoading ? (
              <div className="emp-loading" style={{ minHeight: '200px' }}>
                <div className="emp-loading-spinner"></div>
              </div>
            ) : employeeDetail ? (
              <>
                <div className="emp-detail-header">
                  <div className="emp-detail-avatar">
                    {employeeDetail.employee.profileImage ? (
                      <img src={employeeDetail.employee.profileImage} alt={employeeDetail.employee.fullName} />
                    ) : (
                      <div className="emp-detail-initials">{getInitials(employeeDetail.employee.fullName)}</div>
                    )}
                  </div>
                  <h3>{employeeDetail.employee.fullName}</h3>
                  <p className="emp-detail-role">{employeeDetail.employee.jobTitle || 'Team Member'}</p>
                </div>

                <div className="emp-detail-info">
                  <div className="emp-detail-row">
                    <FiMail /> <span>{employeeDetail.employee.email}</span>
                  </div>
                  {employeeDetail.employee.phoneNumber && (
                    <div className="emp-detail-row">
                      <FiPhone /> <span>{employeeDetail.employee.phoneNumber}</span>
                    </div>
                  )}
                  {employeeDetail.employee.department && (
                    <div className="emp-detail-row">
                      <FiBriefcase /> <span>{employeeDetail.employee.department}</span>
                    </div>
                  )}
                  {(employeeDetail.employee.city || employeeDetail.employee.country) && (
                    <div className="emp-detail-row">
                      <FiMapPin /> <span>{[employeeDetail.employee.city, employeeDetail.employee.state, employeeDetail.employee.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {employeeDetail.employee.createdAt && (
                    <div className="emp-detail-row">
                      <FiCalendar /> <span>Joined {new Date(employeeDetail.employee.createdAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Attendance Summary */}
                <div className="emp-detail-attendance">
                  <h4><FiClock /> This Month's Attendance</h4>
                  <div className="emp-att-stats">
                    <div className="emp-att-stat">
                      <span className="emp-att-value">{employeeDetail.attendance?.daysPresent || 0}</span>
                      <span className="emp-att-label">Days Present</span>
                    </div>
                    <div className="emp-att-stat">
                      <span className="emp-att-value">{employeeDetail.attendance?.totalHoursThisMonth || 0}h</span>
                      <span className="emp-att-label">Total Hours</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeDetails;
