import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  FiSearch, FiBriefcase, FiUsers, FiChevronLeft, FiChevronRight,
  FiX, FiEye, FiDollarSign, FiMail
} from 'react-icons/fi';
import { getAdminCompanies, getAdminCompany } from '../../services/adminApi';

function AdminCompanyManagement({ onNavigateCredits }) {
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => fetchCompanies(1), 300);
    return () => clearTimeout(timer);
  }, [fetchCompanies]);

  const openDetail = async (company) => {
    setDetailModal(company);
    setDetailLoading(true);
    try {
      const res = await getAdminCompany(company._id);
      if (res.data.success) {
        setDetailData(res.data.company);
      }
    } catch (err) {
      toast.error('Failed to load company details');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '—';
  const formatNumber = (n) => (n || 0).toLocaleString();

  return (
    <div className="admin-company-management">
      {/* Search */}
      <div className="admin-toolbar">
        <div className="admin-search-box">
          <FiSearch className="admin-search-icon" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
          {search && <FiX className="admin-search-clear" onClick={() => setSearch('')} />}
        </div>
      </div>

      {/* Companies Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="admin-loading">Loading companies...</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Owner</th>
                <th>Members</th>
                <th>Plan</th>
                <th>Email Credits</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr><td colSpan="7" className="admin-empty">No companies found</td></tr>
              ) : (
                companies.map(company => (
                  <tr key={company._id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-avatar admin-avatar-company"><FiBriefcase /></div>
                        <div>
                          <div className="admin-company-name">{company.companyName}</div>
                          {company.industry && <div className="admin-company-industry">{company.industry}</div>}
                        </div>
                      </div>
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
                      <span className="admin-badge admin-badge-secondary">
                        <FiUsers style={{ marginRight: 4 }} /> {company.memberCount}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${company.subscription?.plan === 'Noxtm' ? 'admin-badge-dark' : company.subscription?.plan === 'Enterprise' ? 'admin-badge-purple' : 'admin-badge-info'}`}>
                        {company.subscription?.plan || 'None'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-credits-cell">
                        <FiMail className="admin-credits-icon" />
                        <span>{formatNumber(company.creditBalance)}</span>
                      </div>
                    </td>
                    <td>{formatDate(company.createdAt)}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="admin-action-btn" title="View Details" onClick={() => openDetail(company)}>
                          <FiEye />
                        </button>
                        {onNavigateCredits && (
                          <button className="admin-action-btn" title="Manage Credits" onClick={() => onNavigateCredits(company)}>
                            <FiDollarSign />
                          </button>
                        )}
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
          <button className="admin-btn admin-btn-sm" disabled={pagination.page <= 1} onClick={() => fetchCompanies(pagination.page - 1)}>
            <FiChevronLeft />
          </button>
          <span className="admin-page-info">Page {pagination.page} of {pagination.pages} ({pagination.total} companies)</span>
          <button className="admin-btn admin-btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchCompanies(pagination.page + 1)}>
            <FiChevronRight />
          </button>
        </div>
      )}

      {/* ===== COMPANY DETAIL MODAL ===== */}
      {detailModal && (
        <div className="admin-modal-overlay" onClick={() => { setDetailModal(null); setDetailData(null); }}>
          <div className="admin-modal admin-modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3><FiBriefcase /> {detailModal.companyName}</h3>
              <button className="admin-modal-close" onClick={() => { setDetailModal(null); setDetailData(null); }}><FiX /></button>
            </div>
            <div className="admin-modal-body">
              {detailLoading ? (
                <div className="admin-loading">Loading details...</div>
              ) : detailData ? (
                <div className="admin-detail-grid">
                  {/* Info Card */}
                  <div className="admin-detail-card">
                    <h4>Company Info</h4>
                    <div className="admin-detail-row"><span>Name:</span><span>{detailData.companyName}</span></div>
                    <div className="admin-detail-row"><span>Industry:</span><span>{detailData.industry || '—'}</span></div>
                    <div className="admin-detail-row"><span>Size:</span><span>{detailData.size || '—'}</span></div>
                    <div className="admin-detail-row"><span>Plan:</span><span>{detailData.subscription?.plan || 'None'}</span></div>
                    <div className="admin-detail-row"><span>Status:</span><span>{detailData.subscription?.status || '—'}</span></div>
                    {detailData.owner && (
                      <div className="admin-detail-row"><span>Owner:</span><span>{detailData.owner.fullName} ({detailData.owner.email})</span></div>
                    )}
                  </div>

                  {/* Billing Card */}
                  <div className="admin-detail-card">
                    <h4>Billing & Credits</h4>
                    <div className="admin-detail-row"><span>Email Credits:</span><span className="admin-text-bold">{formatNumber(detailData.billing?.emailCredits || 0)}</span></div>
                    <div className="admin-detail-row"><span>Total Purchased:</span><span>{formatNumber(detailData.billing?.totalPurchased || 0)}</span></div>
                    <div className="admin-detail-row"><span>Total Used:</span><span>{formatNumber(detailData.billing?.totalUsed || 0)}</span></div>
                    {detailData.emailSettings?.primaryDomain && (
                      <div className="admin-detail-row"><span>Primary Domain:</span><span>{detailData.emailSettings.primaryDomain}</span></div>
                    )}
                  </div>

                  {/* Members List */}
                  <div className="admin-detail-card admin-detail-card-full">
                    <h4>Members ({detailData.members?.length || 0})</h4>
                    {detailData.members && detailData.members.length > 0 ? (
                      <table className="admin-table admin-table-compact">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Company Role</th>
                            <th>System Role</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailData.members.map((m, idx) => (
                            <tr key={idx}>
                              <td>{m.user?.fullName || '—'}</td>
                              <td>{m.user?.email || '—'}</td>
                              <td><span className="admin-badge admin-badge-info">{m.roleInCompany}</span></td>
                              <td><span className={`admin-badge ${m.user?.role === 'Admin' ? 'admin-badge-purple' : 'admin-badge-secondary'}`}>{m.user?.role || '—'}</span></td>
                              <td>{m.user?.status || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="admin-text-muted">No members</p>
                    )}
                  </div>
                </div>
              ) : (
                <p>Failed to load details</p>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => { setDetailModal(null); setDetailData(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCompanyManagement;
