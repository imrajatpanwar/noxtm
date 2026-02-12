import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FiSearch, FiChevronLeft, FiChevronRight, FiX, FiFilter,
  FiActivity, FiClock
} from 'react-icons/fi';
import { getAdminAuditLog } from '../../services/adminApi';

const ACTION_TYPES = [
  { value: 'plan_change', label: 'Plan Change', color: 'admin-badge-primary' },
  { value: 'credit_adjustment', label: 'Credit Adjustment', color: 'admin-badge-info' },
  { value: 'role_change', label: 'Role Change', color: 'admin-badge-purple' },
  { value: 'status_change', label: 'Status Change', color: 'admin-badge-warning' },
  { value: 'user_delete', label: 'User Delete', color: 'admin-badge-danger' },
  { value: 'permission_change', label: 'Permission Change', color: 'admin-badge-secondary' },
  { value: 'company_update', label: 'Company Update', color: 'admin-badge-info' },
  { value: 'user_update', label: 'User Update', color: 'admin-badge-secondary' }
];

const getActionBadge = (action) => {
  const found = ACTION_TYPES.find(a => a.value === action);
  return found || { label: action, color: 'admin-badge-secondary' };
};

function AdminAuditLogComponent() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ action: '', startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = { page, limit: 25 };
      if (search) params.search = search;
      if (filters.action) params.action = filters.action;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await getAdminAuditLog(params);
      if (res.data.success) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to fetch audit log');
    } finally {
      setIsLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(1), 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const formatDateTime = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="admin-audit-log">
      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <FiSearch className="admin-search-icon" />
          <input type="text" placeholder="Search by target or description..." value={search} onChange={(e) => setSearch(e.target.value)} className="admin-search-input" />
          {search && <FiX className="admin-search-clear" onClick={() => setSearch('')} />}
        </div>
        <button className={`admin-btn admin-btn-outline ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <FiFilter /> Filters {activeFilterCount > 0 && <span className="admin-filter-count">{activeFilterCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="admin-filter-row">
          <select value={filters.action} onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))} className="admin-select">
            <option value="">All Actions</option>
            {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <input type="date" value={filters.startDate} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))} className="admin-input" placeholder="Start date" />
          <input type="date" value={filters.endDate} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))} className="admin-input" placeholder="End date" />
          {activeFilterCount > 0 && (
            <button className="admin-btn admin-btn-text" onClick={() => { setFilters({ action: '', startDate: '', endDate: '' }); setShowFilters(false); }}>
              <FiX /> Clear
            </button>
          )}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading">Loading audit log...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th><FiClock /> Timestamp</th>
                <th>Admin</th>
                <th>Action</th>
                <th>Target</th>
                <th>Description</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="6" className="admin-empty">
                  <FiActivity style={{ fontSize: 24, marginBottom: 8 }} /><br />
                  No audit log entries found
                </td></tr>
              ) : (
                logs.map(log => {
                  const actionInfo = getActionBadge(log.action);
                  return (
                    <tr key={log._id}>
                      <td className="admin-nowrap">{formatDateTime(log.timestamp)}</td>
                      <td>
                        {log.adminId ? (
                          <div>
                            <div>{log.adminId.fullName || '—'}</div>
                            <div className="admin-text-muted">{log.adminId.email}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`admin-badge ${actionInfo.color}`}>{actionInfo.label}</span>
                      </td>
                      <td>
                        <div>
                          <span className="admin-badge admin-badge-outline">{log.targetType}</span>
                          <div className="admin-text-sm">{log.targetName || '—'}</div>
                        </div>
                      </td>
                      <td className="admin-description-cell">{log.description || '—'}</td>
                      <td className="admin-description-cell">{log.reason || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="admin-pagination">
          <button className="admin-btn admin-btn-sm" disabled={pagination.page <= 1} onClick={() => fetchLogs(pagination.page - 1)}><FiChevronLeft /></button>
          <span className="admin-page-info">Page {pagination.page} of {pagination.pages} ({pagination.total} entries)</span>
          <button className="admin-btn admin-btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchLogs(pagination.page + 1)}><FiChevronRight /></button>
        </div>
      )}
    </div>
  );
}

export default AdminAuditLogComponent;
