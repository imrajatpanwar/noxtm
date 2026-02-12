import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FiSearch, FiChevronLeft, FiChevronRight, FiX, FiCheck,
  FiPlus, FiMinus, FiMail, FiDollarSign, FiTrendingUp, FiChevronDown, FiChevronUp
} from 'react-icons/fi';
import { getAdminCompanies, adjustCompanyCredits, getAdminStats } from '../../services/adminApi';

function AdminCreditManagement({ preselectedCompany }) {
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Credit modal
  const [creditModal, setCreditModal] = useState(null);
  const [creditForm, setCreditForm] = useState({ action: 'add', amount: '', reason: '' });

  // Expanded rows for history
  const [expandedId, setExpandedId] = useState(null);

  const fetchCompanies = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await getAdminCompanies({ page, limit: 25, search });
      if (res.data.success) {
        setCompanies(res.data.companies);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      toast.error('Failed to fetch companies');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getAdminStats();
      if (res.data.success) setStats(res.data.stats);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const timer = setTimeout(() => fetchCompanies(1), 300);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  // Open credit modal, optionally from preselected company
  useEffect(() => {
    if (preselectedCompany) {
      openCreditModal(preselectedCompany);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedCompany]);

  const openCreditModal = (company) => {
    setCreditForm({ action: 'add', amount: '', reason: '' });
    setCreditModal(company);
  };

  const handleCreditSave = async () => {
    if (!creditForm.amount || parseInt(creditForm.amount) <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (!creditForm.reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      const res = await adjustCompanyCredits(creditModal._id, {
        action: creditForm.action,
        amount: parseInt(creditForm.amount),
        reason: creditForm.reason
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setCreditModal(null);
        fetchCompanies(pagination.page);
        fetchStats();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to adjust credits');
    }
  };

  const formatNumber = (n) => (n || 0).toLocaleString();
  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

  const getResultingBalance = () => {
    if (!creditModal || !creditForm.amount) return null;
    const current = creditModal.creditBalance || creditModal.billing?.emailCredits || 0;
    const amount = parseInt(creditForm.amount) || 0;
    return creditForm.action === 'add' ? current + amount : current - amount;
  };

  return (
    <div className="admin-credit-management">
      {/* Summary Cards */}
      {stats && (
        <div className="admin-stats-row">
          <div className="admin-stat-card admin-stat-card-large">
            <div className="admin-stat-icon"><FiMail /></div>
            <div>
              <div className="admin-stat-label">Total Credits Available</div>
              <div className="admin-stat-value">{formatNumber(stats.credits?.totalCredits)}</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon"><FiTrendingUp /></div>
            <div>
              <div className="admin-stat-label">Total Purchased</div>
              <div className="admin-stat-value">{formatNumber(stats.credits?.totalPurchased)}</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon"><FiDollarSign /></div>
            <div>
              <div className="admin-stat-label">Total Used</div>
              <div className="admin-stat-value">{formatNumber(stats.credits?.totalUsed)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <FiSearch className="admin-search-icon" />
          <input type="text" placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="admin-search-input" />
          {search && <FiX className="admin-search-clear" onClick={() => setSearch('')} />}
        </div>
      </div>

      {/* Credits Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading">Loading...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th></th>
                <th>Company</th>
                <th>Owner</th>
                <th>Current Balance</th>
                <th>Total Purchased</th>
                <th>Total Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr><td colSpan="7" className="admin-empty">No companies found</td></tr>
              ) : (
                companies.map(company => (
                  <React.Fragment key={company._id}>
                    <tr>
                      <td>
                        <button
                          className="admin-expand-btn"
                          onClick={() => setExpandedId(expandedId === company._id ? null : company._id)}
                        >
                          {expandedId === company._id ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                      </td>
                      <td>
                        <div className="admin-company-name">{company.companyName}</div>
                      </td>
                      <td>
                        {company.owner ? (
                          <div>
                            <div>{company.owner.fullName || '—'}</div>
                            <div className="admin-text-muted">{company.owner.email}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <span className={`admin-credit-balance ${(company.creditBalance || 0) === 0 ? 'admin-text-danger' : 'admin-text-success'}`}>
                          {formatNumber(company.creditBalance)}
                        </span>
                      </td>
                      <td>{formatNumber(company.totalPurchased)}</td>
                      <td>{formatNumber(company.totalUsed)}</td>
                      <td>
                        <div className="admin-actions">
                          <button className="admin-action-btn admin-action-btn-success" title="Add Credits" onClick={() => { setCreditForm({ action: 'add', amount: '', reason: '' }); setCreditModal(company); }}>
                            <FiPlus />
                          </button>
                          <button className="admin-action-btn admin-action-btn-danger" title="Remove Credits" onClick={() => { setCreditForm({ action: 'remove', amount: '', reason: '' }); setCreditModal(company); }}>
                            <FiMinus />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded purchase history row */}
                    {expandedId === company._id && (
                      <tr className="admin-expanded-row">
                        <td colSpan="7">
                          <div className="admin-history-container">
                            <h5>Purchase History</h5>
                            {company.billing?.purchaseHistory && company.billing.purchaseHistory.length > 0 ? (
                              <table className="admin-table admin-table-compact">
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Credits</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...company.billing.purchaseHistory].reverse().slice(0, 10).map((h, idx) => (
                                    <tr key={idx}>
                                      <td>{formatDate(h.date)}</td>
                                      <td>
                                        <span className={h.emailCredits > 0 ? 'admin-text-success' : 'admin-text-danger'}>
                                          {h.emailCredits > 0 ? '+' : ''}{formatNumber(h.emailCredits)}
                                        </span>
                                      </td>
                                      <td>{h.amount ? `$${h.amount.toFixed(2)}` : 'Free'}</td>
                                      <td><span className="admin-badge admin-badge-secondary">{h.paymentMethod || '—'}</span></td>
                                      <td><span className={`admin-badge ${h.status === 'completed' ? 'admin-badge-success' : 'admin-badge-warning'}`}>{h.status}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="admin-text-muted">No purchase history</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="admin-pagination">
          <button className="admin-btn admin-btn-sm" disabled={pagination.page <= 1} onClick={() => fetchCompanies(pagination.page - 1)}><FiChevronLeft /></button>
          <span className="admin-page-info">Page {pagination.page} of {pagination.pages}</span>
          <button className="admin-btn admin-btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchCompanies(pagination.page + 1)}><FiChevronRight /></button>
        </div>
      )}

      {/* ===== CREDIT ADJUSTMENT MODAL ===== */}
      {creditModal && (
        <div className="admin-modal-overlay" onClick={() => setCreditModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiDollarSign /> {creditForm.action === 'add' ? 'Add' : 'Remove'} Credits — {creditModal.companyName}</h3>
              <button className="admin-modal-close" onClick={() => setCreditModal(null)}><FiX /></button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-credit-info-box">
                <span>Current Balance:</span>
                <span className="admin-text-bold">{formatNumber(creditModal.creditBalance || creditModal.billing?.emailCredits || 0)}</span>
              </div>

              <div className="admin-form-group">
                <label>Action</label>
                <div className="admin-toggle-group">
                  <button
                    className={`admin-toggle-btn ${creditForm.action === 'add' ? 'active admin-toggle-success' : ''}`}
                    onClick={() => setCreditForm(f => ({ ...f, action: 'add' }))}
                  >
                    <FiPlus /> Add Credits
                  </button>
                  <button
                    className={`admin-toggle-btn ${creditForm.action === 'remove' ? 'active admin-toggle-danger' : ''}`}
                    onClick={() => setCreditForm(f => ({ ...f, action: 'remove' }))}
                  >
                    <FiMinus /> Remove Credits
                  </button>
                </div>
              </div>

              <div className="admin-form-group">
                <label>Amount</label>
                <input
                  type="number"
                  min="1"
                  value={creditForm.amount}
                  onChange={(e) => setCreditForm(f => ({ ...f, amount: e.target.value }))}
                  className="admin-input"
                  placeholder="Enter credit amount..."
                />
              </div>

              {creditForm.amount && (
                <div className="admin-credit-preview">
                  <span>Resulting Balance:</span>
                  <span className={`admin-text-bold ${(getResultingBalance() || 0) < 0 ? 'admin-text-danger' : 'admin-text-success'}`}>
                    {formatNumber(getResultingBalance())}
                  </span>
                </div>
              )}

              <div className="admin-form-group">
                <label>Reason <span className="admin-required">*</span></label>
                <textarea
                  value={creditForm.reason}
                  onChange={(e) => setCreditForm(f => ({ ...f, reason: e.target.value }))}
                  className="admin-textarea"
                  placeholder="Reason for credit adjustment (required)..."
                  rows={3}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setCreditModal(null)}>Cancel</button>
              <button
                className={`admin-btn ${creditForm.action === 'add' ? 'admin-btn-success' : 'admin-btn-danger'}`}
                onClick={handleCreditSave}
              >
                <FiCheck /> {creditForm.action === 'add' ? 'Add' : 'Remove'} Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCreditManagement;
