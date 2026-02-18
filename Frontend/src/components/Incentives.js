import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { FiPlus, FiEdit2, FiTrash2, FiAward, FiX, FiDollarSign, FiCheck, FiXCircle, FiClock } from 'react-icons/fi';
import './Incentives.css';

function Incentives() {
  const [incentives, setIncentives] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncentive, setEditingIncentive] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [form, setForm] = useState({
    employeeId: '', type: 'bonus', title: '', amount: '', currency: 'INR', reason: '', notes: ''
  });

  const types = [
    { value: 'bonus', label: 'Bonus', icon: '💰' },
    { value: 'recognition', label: 'Recognition', icon: '🏆' },
    { value: 'reward', label: 'Reward', icon: '🎁' },
    { value: 'commission', label: 'Commission', icon: '📈' },
    { value: 'other', label: 'Other', icon: '✨' }
  ];

  const fetchIncentives = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const [incRes, statsRes] = await Promise.all([
        api.get('/incentives', { params }),
        api.get('/incentives/stats')
      ]);

      if (incRes.data.success) setIncentives(incRes.data.incentives || []);
      if (statsRes.data.success) setStats(statsRes.data.stats);
    } catch (err) {
      console.error('Error fetching incentives:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchIncentives();
  }, [fetchIncentives]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await api.get('/hr/employees');
        if (response.data.success) setEmployees(response.data.employees || []);
      } catch (err) { console.error(err); }
    };
    fetchEmployees();
  }, []);

  const openAddModal = () => {
    setForm({ employeeId: '', type: 'bonus', title: '', amount: '', currency: 'INR', reason: '', notes: '' });
    setEditingIncentive(null);
    setShowModal(true);
  };

  const openEditModal = (incentive) => {
    setForm({
      employeeId: incentive.userId?._id || '',
      type: incentive.type,
      title: incentive.title,
      amount: incentive.amount || '',
      currency: incentive.currency || 'INR',
      reason: incentive.reason || '',
      notes: incentive.notes || ''
    });
    setEditingIncentive(incentive);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.employeeId || !form.title) return;
    try {
      setSaving(true);
      if (editingIncentive) {
        await api.put(`/incentives/${editingIncentive._id}`, form);
      } else {
        await api.post('/incentives', form);
      }
      setShowModal(false);
      fetchIncentives();
    } catch (err) {
      console.error('Error saving incentive:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this incentive?')) return;
    try {
      await api.delete(`/incentives/${id}`);
      fetchIncentives();
    } catch (err) {
      console.error('Error deleting incentive:', err);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/incentives/${id}`, { status });
      fetchIncentives();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'inc-status-pending';
      case 'approved': return 'inc-status-approved';
      case 'paid': return 'inc-status-paid';
      case 'rejected': return 'inc-status-rejected';
      default: return '';
    }
  };

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="inc"><div className="inc-loading"><div className="inc-loading-spinner"></div><p>Loading incentives...</p></div></div>
    );
  }

  return (
    <div className="inc">
      <div className="inc-header">
        <div>
          <h2>Incentives</h2>
          <p className="inc-subtitle">Manage employee bonuses, rewards, and recognition</p>
        </div>
        <button className="inc-add-btn" onClick={openAddModal}><FiPlus /> New Incentive</button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="inc-stats">
          <div className="inc-stat-card">
            <div className="inc-stat-icon inc-stat-total"><FiAward /></div>
            <div><span className="inc-stat-value">{stats.total}</span><span className="inc-stat-label">Total</span></div>
          </div>
          <div className="inc-stat-card">
            <div className="inc-stat-icon inc-stat-pending"><FiClock /></div>
            <div><span className="inc-stat-value">{stats.pending}</span><span className="inc-stat-label">Pending</span></div>
          </div>
          <div className="inc-stat-card">
            <div className="inc-stat-icon inc-stat-approved"><FiCheck /></div>
            <div><span className="inc-stat-value">{stats.approved}</span><span className="inc-stat-label">Approved</span></div>
          </div>
          <div className="inc-stat-card">
            <div className="inc-stat-icon inc-stat-amount"><FiDollarSign /></div>
            <div><span className="inc-stat-value">{formatCurrency(stats.totalAmountThisMonth)}</span><span className="inc-stat-label">This Month</span></div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="inc-filters">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="inc-filter-select">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="inc-filter-select">
          <option value="">All Types</option>
          {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Incentives Table */}
      <div className="inc-table-container">
        <table className="inc-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Title</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {incentives.length > 0 ? incentives.map(inc => (
              <tr key={inc._id}>
                <td>
                  <div className="inc-emp-cell">
                    <span className="inc-emp-name">{inc.userId?.fullName || 'Unknown'}</span>
                    <span className="inc-emp-dept">{inc.userId?.department || ''}</span>
                  </div>
                </td>
                <td>
                  <span className="inc-title">{inc.title}</span>
                  {inc.reason && <span className="inc-reason">{inc.reason}</span>}
                </td>
                <td>
                  <span className="inc-type-badge">
                    {types.find(t => t.value === inc.type)?.icon} {inc.type}
                  </span>
                </td>
                <td className="inc-amount">{formatCurrency(inc.amount, inc.currency)}</td>
                <td className="inc-date">{new Date(inc.awardedDate).toLocaleDateString()}</td>
                <td>
                  <span className={`inc-status-badge ${getStatusClass(inc.status)}`}>{inc.status}</span>
                </td>
                <td>
                  <div className="inc-actions">
                    {inc.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatusChange(inc._id, 'approved')} className="inc-approve" title="Approve"><FiCheck /></button>
                        <button onClick={() => handleStatusChange(inc._id, 'rejected')} className="inc-reject" title="Reject"><FiXCircle /></button>
                      </>
                    )}
                    {inc.status === 'approved' && (
                      <button onClick={() => handleStatusChange(inc._id, 'paid')} className="inc-pay" title="Mark Paid"><FiDollarSign /></button>
                    )}
                    <button onClick={() => openEditModal(inc)} title="Edit"><FiEdit2 /></button>
                    <button onClick={() => handleDelete(inc._id)} className="inc-delete" title="Delete"><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="7" className="inc-empty-cell"><FiAward /> No incentives found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="inc-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="inc-modal" onClick={e => e.stopPropagation()}>
            <div className="inc-modal-header">
              <h3>{editingIncentive ? 'Edit Incentive' : 'New Incentive'}</h3>
              <button onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="inc-modal-body">
              <div className="inc-form-group">
                <label>Employee *</label>
                <select value={form.employeeId} onChange={e => setForm(prev => ({ ...prev, employeeId: e.target.value }))}>
                  <option value="">Select Employee</option>
                  {employees.map(e => <option key={e._id} value={e._id}>{e.fullName}</option>)}
                </select>
              </div>
              <div className="inc-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Q4 Performance Bonus"
                />
              </div>
              <div className="inc-form-row">
                <div className="inc-form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}>
                    {types.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div className="inc-form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="inc-form-group">
                <label>Reason</label>
                <input
                  type="text"
                  value={form.reason}
                  onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Why is this incentive awarded?"
                />
              </div>
              <div className="inc-form-group">
                <label>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <div className="inc-modal-footer">
              <button className="inc-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="inc-save-btn" onClick={handleSave} disabled={saving || !form.employeeId || !form.title}>
                {saving ? 'Saving...' : (editingIncentive ? 'Update' : 'Create Incentive')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Incentives;
