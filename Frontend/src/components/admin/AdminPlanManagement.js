import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FiSearch, FiChevronLeft, FiChevronRight, FiX, FiCheck,
  FiCreditCard, FiFilter, FiAlertCircle, FiTrendingUp
} from 'react-icons/fi';
import { getAdminUsers, updateUserSubscription, getAdminStats } from '../../services/adminApi';

const PLANS = ['None', 'Trial', 'Starter', 'Pro+', 'Advance', 'Noxtm', 'Enterprise'];
const PLAN_STATUS = ['active', 'inactive', 'trial', 'expired', 'cancelled', 'suspended', 'pending'];
const BILLING_CYCLES = ['Monthly', 'Annual'];

const PLAN_PRICES = {
  'Starter': { monthly: '₹1,699', annual: '₹1,359' },
  'Pro+': { monthly: '₹2,699', annual: '₹2,159' },
  'Advance': { monthly: '₹4,699', annual: '₹3,759' },
  'Noxtm': { monthly: '₹12,999', annual: '₹10,399' },
  'Enterprise': { monthly: 'Contact Sales', annual: 'Contact Sales' },
  'Trial': { monthly: 'Free', annual: 'Free' },
  'None': { monthly: '—', annual: '—' }
};

const getPlanBadgeClass = (plan) => {
  const map = { 'Enterprise': 'admin-badge-purple', 'Noxtm': 'admin-badge-dark', 'Advance': 'admin-badge-info', 'Pro+': 'admin-badge-primary', 'Starter': 'admin-badge-success', 'Trial': 'admin-badge-warning', 'None': 'admin-badge-secondary' };
  return map[plan] || 'admin-badge-secondary';
};

const getSubStatusBadge = (status) => {
  const map = { 'active': 'admin-badge-success', 'trial': 'admin-badge-warning', 'expired': 'admin-badge-danger', 'cancelled': 'admin-badge-danger', 'inactive': 'admin-badge-secondary', 'suspended': 'admin-badge-danger', 'pending': 'admin-badge-warning' };
  return map[status] || 'admin-badge-secondary';
};

function AdminPlanManagement() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ plan: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Plan change modal
  const [planModal, setPlanModal] = useState(null);
  const [planForm, setPlanForm] = useState({});

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({ plan: 'Starter', billingCycle: 'Monthly', status: 'active', reason: '' });

  const fetchUsers = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = { page, limit: 25, search };
      if (filters.plan) params.plan = filters.plan;
      // Filter by subscription status needs backend query param support
      const res = await getAdminUsers(params);
      if (res.data.success) {
        let filtered = res.data.users;
        // Client-side filter by subscription status if needed
        if (filters.status) {
          filtered = filtered.filter(u => u.subscription?.status === filters.status);
        }
        setUsers(filtered);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [search, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getAdminStats();
      if (res.data.success) setStats(res.data.stats);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Single plan change
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
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  // Bulk plan change
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map(u => u._id));
    }
  };

  const handleBulkSave = async () => {
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        await updateUserSubscription(id, bulkForm);
        successCount++;
      } catch { /* skip */ }
    }
    toast.success(`Updated ${successCount} of ${selectedIds.length} users`);
    setBulkModal(false);
    setSelectedIds([]);
    fetchUsers(pagination.page);
    fetchStats();
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return '—';
    const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="admin-text-danger">Expired</span>;
    if (days <= 7) return <span className="admin-text-warning">{days}d left</span>;
    return `${days}d`;
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="admin-plan-management">
      {/* Summary Cards */}
      {stats && (
        <div className="admin-stats-row">
          {PLANS.filter(p => p !== 'None').map(plan => (
            <div key={plan} className="admin-stat-card">
              <div className="admin-stat-label">{plan}</div>
              <div className="admin-stat-value">{stats.planBreakdown?.[plan] || 0}</div>
            </div>
          ))}
          <div className="admin-stat-card admin-stat-card-highlight">
            <div className="admin-stat-label"><FiTrendingUp /> Active</div>
            <div className="admin-stat-value">{stats.statusBreakdown?.active || 0}</div>
          </div>
          <div className="admin-stat-card admin-stat-card-warning">
            <div className="admin-stat-label"><FiAlertCircle /> Expired</div>
            <div className="admin-stat-value">{stats.statusBreakdown?.expired || 0}</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <FiSearch className="admin-search-icon" />
          <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="admin-search-input" />
          {search && <FiX className="admin-search-clear" onClick={() => setSearch('')} />}
        </div>
        <div className="admin-toolbar-right">
          <button className={`admin-btn admin-btn-outline ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <FiFilter /> Filters {activeFilterCount > 0 && <span className="admin-filter-count">{activeFilterCount}</span>}
          </button>
          {selectedIds.length > 0 && (
            <button className="admin-btn admin-btn-primary" onClick={() => setBulkModal(true)}>
              <FiCreditCard /> Change Plan ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="admin-filter-row">
          <select value={filters.plan} onChange={(e) => setFilters(f => ({ ...f, plan: e.target.value }))} className="admin-select">
            <option value="">All Plans</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))} className="admin-select">
            <option value="">All Status</option>
            {PLAN_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {activeFilterCount > 0 && (
            <button className="admin-btn admin-btn-text" onClick={() => { setFilters({ plan: '', status: '' }); setShowFilters(false); }}>
              <FiX /> Clear
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading">Loading...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={selectedIds.length === users.length && users.length > 0} onChange={toggleSelectAll} />
                </th>
                <th>User</th>
                <th>Current Plan</th>
                <th>Status</th>
                <th>Billing</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Remaining</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="10" className="admin-empty">No users found</td></tr>
              ) : (
                users.map(user => {
                  const plan = user.subscription?.plan || 'None';
                  const cycle = user.subscription?.billingCycle || 'Monthly';
                  const price = PLAN_PRICES[plan]?.[cycle === 'Annual' ? 'annual' : 'monthly'] || '—';
                  return (
                    <tr key={user._id} className={selectedIds.includes(user._id) ? 'admin-row-selected' : ''}>
                      <td><input type="checkbox" checked={selectedIds.includes(user._id)} onChange={() => toggleSelect(user._id)} /></td>
                      <td>
                        <div>
                          <div>{user.fullName || 'N/A'}</div>
                          <div className="admin-text-muted">{user.email}</div>
                        </div>
                      </td>
                      <td><span className={`admin-badge ${getPlanBadgeClass(plan)}`}>{plan}</span></td>
                      <td><span className={`admin-badge ${getSubStatusBadge(user.subscription?.status)}`}>{user.subscription?.status || 'none'}</span></td>
                      <td>{cycle}</td>
                      <td>{formatDate(user.subscription?.startDate)}</td>
                      <td>{formatDate(user.subscription?.endDate)}</td>
                      <td>{getDaysRemaining(user.subscription?.endDate)}</td>
                      <td>{price}</td>
                      <td>
                        <button className="admin-action-btn" title="Change Plan" onClick={() => openPlanModal(user)}>
                          <FiCreditCard />
                        </button>
                      </td>
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
          <button className="admin-btn admin-btn-sm" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}><FiChevronLeft /></button>
          <span className="admin-page-info">Page {pagination.page} of {pagination.pages}</span>
          <button className="admin-btn admin-btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchUsers(pagination.page + 1)}><FiChevronRight /></button>
        </div>
      )}

      {/* ===== SINGLE PLAN MODAL ===== */}
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
              {planForm.plan && planForm.plan !== 'None' && (
                <div className="admin-plan-price-info">
                  Price: {PLAN_PRICES[planForm.plan]?.[planForm.billingCycle === 'Annual' ? 'annual' : 'monthly'] || '—'} / {planForm.billingCycle === 'Annual' ? 'year' : 'month'}
                </div>
              )}
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
                <label>Reason</label>
                <textarea value={planForm.reason} onChange={(e) => setPlanForm(f => ({ ...f, reason: e.target.value }))} className="admin-textarea" placeholder="Reason for plan change..." rows={2} />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setPlanModal(null)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={handlePlanSave}><FiCheck /> Update Plan</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== BULK PLAN MODAL ===== */}
      {bulkModal && (
        <div className="admin-modal-overlay" onClick={() => setBulkModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiCreditCard /> Bulk Plan Change — {selectedIds.length} users</h3>
              <button className="admin-modal-close" onClick={() => setBulkModal(false)}><FiX /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Plan</label>
                  <select value={bulkForm.plan} onChange={(e) => setBulkForm(f => ({ ...f, plan: e.target.value }))} className="admin-select">
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Billing Cycle</label>
                  <select value={bulkForm.billingCycle} onChange={(e) => setBulkForm(f => ({ ...f, billingCycle: e.target.value }))} className="admin-select">
                    {BILLING_CYCLES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="admin-form-group">
                <label>Status</label>
                <select value={bulkForm.status} onChange={(e) => setBulkForm(f => ({ ...f, status: e.target.value }))} className="admin-select">
                  {PLAN_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Reason</label>
                <textarea value={bulkForm.reason} onChange={(e) => setBulkForm(f => ({ ...f, reason: e.target.value }))} className="admin-textarea" placeholder="Reason for bulk change..." rows={2} />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setBulkModal(false)}>Cancel</button>
              <button className="admin-btn admin-btn-primary" onClick={handleBulkSave}><FiCheck /> Apply to {selectedIds.length} Users</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPlanManagement;
