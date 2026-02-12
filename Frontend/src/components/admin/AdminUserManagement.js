import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FiSearch, FiEdit3, FiTrash2, FiShield, FiUser, FiChevronLeft,
  FiChevronRight, FiFilter, FiX, FiCheck, FiCreditCard
} from 'react-icons/fi';
import { getAdminUsers, updateAdminUser, deleteAdminUser, updateUserSubscription } from '../../services/adminApi';

const PERMISSION_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'dataCenter', label: 'Data Center' },
  { key: 'projects', label: 'Projects' },
  { key: 'teamCommunication', label: 'Team Communication' },
  { key: 'digitalMediaManagement', label: 'Digital Media' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'hrManagement', label: 'HR Management' },
  { key: 'financeManagement', label: 'Finance' },
  { key: 'seoManagement', label: 'SEO Management' },
  { key: 'internalPolicies', label: 'Internal Policies' },
  { key: 'settingsConfiguration', label: 'Settings & Config' }
];

const PERMISSION_TEMPLATES = {
  'Full Access': Object.fromEntries(PERMISSION_MODULES.map(m => [m.key, true])),
  'Basic User': Object.fromEntries(PERMISSION_MODULES.map(m => [m.key, m.key === 'dashboard'])),
  'Sales Team': { dashboard: true, dataCenter: true, projects: true, teamCommunication: true, marketing: true, digitalMediaManagement: false, hrManagement: false, financeManagement: false, seoManagement: false, internalPolicies: false, settingsConfiguration: false },
  'HR Team': { dashboard: true, hrManagement: true, internalPolicies: true, teamCommunication: true, dataCenter: false, projects: false, marketing: false, digitalMediaManagement: false, financeManagement: false, seoManagement: false, settingsConfiguration: false },
  'Finance Team': { dashboard: true, financeManagement: true, internalPolicies: true, dataCenter: false, projects: false, teamCommunication: false, marketing: false, digitalMediaManagement: false, hrManagement: false, seoManagement: false, settingsConfiguration: false },
  'Marketing Team': { dashboard: true, marketing: true, seoManagement: true, digitalMediaManagement: true, teamCommunication: true, dataCenter: false, projects: false, hrManagement: false, financeManagement: false, internalPolicies: false, settingsConfiguration: false },
  'Project Manager': { dashboard: true, projects: true, teamCommunication: true, dataCenter: true, marketing: false, digitalMediaManagement: false, hrManagement: false, financeManagement: false, seoManagement: false, internalPolicies: false, settingsConfiguration: false }
};

const PLANS = ['None', 'Trial', 'Starter', 'Pro+', 'Advance', 'Noxtm', 'Enterprise'];
const PLAN_STATUS = ['active', 'inactive', 'trial', 'expired', 'cancelled', 'suspended', 'pending'];
const ROLES = ['Admin', 'User'];
const STATUSES = ['Active', 'Inactive', 'Terminated', 'In Review'];
const BILLING_CYCLES = ['Monthly', 'Annual'];

const getPlanBadgeClass = (plan) => {
  const map = { 'Enterprise': 'admin-badge-purple', 'Noxtm': 'admin-badge-dark', 'Advance': 'admin-badge-info', 'Pro+': 'admin-badge-primary', 'Starter': 'admin-badge-success', 'Trial': 'admin-badge-warning', 'None': 'admin-badge-secondary' };
  return map[plan] || 'admin-badge-secondary';
};

const getStatusBadgeClass = (status) => {
  const map = { 'Active': 'admin-badge-success', 'Inactive': 'admin-badge-secondary', 'Terminated': 'admin-badge-danger', 'In Review': 'admin-badge-warning' };
  return map[status] || 'admin-badge-secondary';
};

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ role: '', status: '', plan: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [editModal, setEditModal] = useState(null);
  const [permModal, setPermModal] = useState(null);
  const [planModal, setPlanModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  // Edit form states
  const [editForm, setEditForm] = useState({});
  const [permForm, setPermForm] = useState({});
  const [planForm, setPlanForm] = useState({});
  const [deleteReason, setDeleteReason] = useState('');

  const fetchUsers = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = { page, limit: 25, search };
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;
      if (filters.plan) params.plan = filters.plan;

      const res = await getAdminUsers(params);
      if (res.data.success) {
        setUsers(res.data.users);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [search, filters]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // === EDIT USER ===
  const openEditModal = (user) => {
    setEditForm({ fullName: user.fullName || '', email: user.email, role: user.role, status: user.status || 'Active' });
    setEditModal(user);
  };

  const handleEditSave = async () => {
    try {
      const res = await updateAdminUser(editModal._id, editForm);
      if (res.data.success) {
        toast.success('User updated');
        setEditModal(null);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  };

  // === PERMISSIONS ===
  const openPermModal = (user) => {
    const perms = {};
    PERMISSION_MODULES.forEach(m => { perms[m.key] = user.permissions?.[m.key] === true; });
    setPermForm(perms);
    setPermModal(user);
  };

  const applyTemplate = (templateName) => {
    const tpl = PERMISSION_TEMPLATES[templateName];
    if (tpl) setPermForm({ ...tpl });
  };

  const handlePermSave = async () => {
    try {
      const res = await updateAdminUser(permModal._id, { permissions: permForm });
      if (res.data.success) {
        toast.success('Permissions updated');
        setPermModal(null);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error('Failed to update permissions');
    }
  };

  // === PLAN CHANGE ===
  const openPlanModal = (user) => {
    setPlanForm({
      plan: user.subscription?.plan || 'None',
      billingCycle: user.subscription?.billingCycle || 'Monthly',
      status: user.subscription?.status || 'active',
      startDate: user.subscription?.startDate ? new Date(user.subscription.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: user.subscription?.endDate ? new Date(user.subscription.endDate).toISOString().split('T')[0] : '',
      reason: ''
    });
    setPlanModal(user);
  };

  const handlePlanSave = async () => {
    try {
      const res = await updateUserSubscription(planModal._id, planForm);
      if (res.data.success) {
        toast.success('Subscription updated');
        setPlanModal(null);
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update subscription');
    }
  };

  // === DELETE ===
  const handleDelete = async () => {
    try {
      const res = await deleteAdminUser(deleteModal._id, deleteReason);
      if (res.data.success) {
        toast.success('User deleted');
        setDeleteModal(null);
        setDeleteReason('');
        fetchUsers(pagination.page);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const clearFilters = () => {
    setFilters({ role: '', status: '', plan: '' });
    setShowFilters(false);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="admin-user-management">
      {/* Search & Filter Bar */}
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <FiSearch className="admin-search-icon" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          {search && <FiX className="admin-search-clear" onClick={() => setSearch('')} />}
        </div>
        <button
          className={`admin-btn admin-btn-outline ${showFilters ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <FiFilter /> Filters {activeFilterCount > 0 && <span className="admin-filter-count">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="admin-filter-row">
          <select value={filters.role} onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))} className="admin-select">
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} className="admin-select">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.plan} onChange={(e) => setFilters(f => ({ ...f, plan: e.target.value }))} className="admin-select">
            <option value="">All Plans</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {activeFilterCount > 0 && (
            <button className="admin-btn admin-btn-text" onClick={clearFilters}>
              <FiX /> Clear
            </button>
          )}
        </div>
      )}

      {/* Users Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading">Loading users...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Company</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="7" className="admin-empty">No users found</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user._id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar">{(user.fullName || user.email || '?')[0].toUpperCase()}</div>
                        <span>{user.fullName || 'N/A'}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`admin-badge ${user.role === 'Admin' ? 'admin-badge-purple' : 'admin-badge-secondary'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${getStatusBadgeClass(user.status)}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${getPlanBadgeClass(user.subscription?.plan)}`}>
                        {user.subscription?.plan || 'None'}
                      </span>
                    </td>
                    <td>{user.companyId?.companyName || '—'}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-action-btn" title="Edit User" onClick={() => openEditModal(user)}>
                          <FiEdit3 />
                        </button>
                        <button className="admin-action-btn" title="Permissions" onClick={() => openPermModal(user)}>
                          <FiShield />
                        </button>
                        <button className="admin-action-btn" title="Change Plan" onClick={() => openPlanModal(user)}>
                          <FiCreditCard />
                        </button>
                        <button className="admin-action-btn admin-action-btn-danger" title="Delete" onClick={() => setDeleteModal(user)}>
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="admin-pagination">
          <button
            className="admin-btn admin-btn-sm"
            disabled={pagination.page <= 1}
            onClick={() => fetchUsers(pagination.page - 1)}
          >
            <FiChevronLeft />
          </button>
          <span className="admin-page-info">
            Page {pagination.page} of {pagination.pages} ({pagination.total} users)
          </span>
          <button
            className="admin-btn admin-btn-sm"
            disabled={pagination.page >= pagination.pages}
            onClick={() => fetchUsers(pagination.page + 1)}
          >
            <FiChevronRight />
          </button>
        </div>
      )}

      {/* ===== EDIT USER MODAL ===== */}
      {editModal && (
        <div className="admin-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiEdit3 /> Edit User</h3>
              <button className="admin-modal-close" onClick={() => setEditModal(null)}><FiX /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>Full Name</label>
                <input type="text" value={editForm.fullName} onChange={(e) => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="admin-input" />
              </div>
              <div className="admin-form-group">
                <label>Email</label>
                <input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} className="admin-input" />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Role</label>
                  <select value={editForm.role} onChange={(e) => setEditForm(f => ({ ...f, role: e.target.value }))} className="admin-select">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))} className="admin-select">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={handleEditSave}><FiCheck /> Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PERMISSIONS MODAL ===== */}
      {permModal && (
        <div className="admin-modal-overlay" onClick={() => setPermModal(null)}>
          <div className="admin-modal admin-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiShield /> Manage Permissions — {permModal.fullName || permModal.email}</h3>
              <button className="admin-modal-close" onClick={() => setPermModal(null)}><FiX /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-templates">
                <label className="admin-template-label">Quick Apply Template:</label>
                <div className="admin-template-btns">
                  {Object.keys(PERMISSION_TEMPLATES).map(t => (
                    <button key={t} className="admin-btn admin-btn-xs admin-btn-outline" onClick={() => applyTemplate(t)}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="admin-perm-grid">
                {PERMISSION_MODULES.map(m => (
                  <label key={m.key} className="admin-perm-item">
                    <input
                      type="checkbox"
                      checked={permForm[m.key] || false}
                      onChange={(e) => setPermForm(f => ({ ...f, [m.key]: e.target.checked }))}
                    />
                    <span>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setPermModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={handlePermSave}><FiCheck /> Save Permissions</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PLAN CHANGE MODAL ===== */}
      {planModal && (
        <div className="admin-modal-overlay" onClick={() => setPlanModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiCreditCard /> Change Plan — {planModal.fullName || planModal.email}</h3>
              <button className="admin-modal-close" onClick={() => setPlanModal(null)}><FiX /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Plan</label>
                  <select value={planForm.plan} onChange={(e) => setPlanForm(f => ({ ...f, plan: e.target.value }))} className="admin-select">
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Billing Cycle</label>
                  <select value={planForm.billingCycle} onChange={(e) => setPlanForm(f => ({ ...f, billingCycle: e.target.value }))} className="admin-select">
                    {BILLING_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label>Status</label>
                <select value={planForm.status} onChange={(e) => setPlanForm(f => ({ ...f, status: e.target.value }))} className="admin-select">
                  {PLAN_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Start Date</label>
                  <input type="date" value={planForm.startDate} onChange={(e) => setPlanForm(f => ({ ...f, startDate: e.target.value }))} className="admin-input" />
                </div>
                <div className="admin-form-group">
                  <label>End Date</label>
                  <input type="date" value={planForm.endDate} onChange={(e) => setPlanForm(f => ({ ...f, endDate: e.target.value }))} className="admin-input" />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Reason (for audit log)</label>
                <textarea
                  value={planForm.reason}
                  onChange={(e) => setPlanForm(f => ({ ...f, reason: e.target.value }))}
                  className="admin-textarea"
                  placeholder="Why is this plan being changed?"
                  rows={2}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setPlanModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={handlePlanSave}><FiCheck /> Update Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM MODAL ===== */}
      {deleteModal && (
        <div className="admin-modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header admin-modal-header-danger">
              <h3><FiTrash2 /> Delete User</h3>
              <button className="admin-modal-close" onClick={() => setDeleteModal(null)}><FiX /></button>
            </div>
            <div className="admin-modal-body">
              <p className="admin-delete-warning">
                Are you sure you want to delete <strong>{deleteModal.fullName || deleteModal.email}</strong>?
                This action cannot be undone.
              </p>
              <div className="admin-form-group">
                <label>Reason</label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="admin-textarea"
                  placeholder="Reason for deletion..."
                  rows={2}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => { setDeleteModal(null); setDeleteReason(''); }}>Cancel</button>
              <button className="admin-btn admin-btn-danger" onClick={handleDelete}><FiTrash2 /> Delete User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUserManagement;
