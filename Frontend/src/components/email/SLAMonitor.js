import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import SLAPolicyForm from './SLAPolicyForm';
import { exportSLAPoliciesToCSV, exportSLAViolationsToCSV } from '../../utils/csvExport';
import './SLAMonitor.css';

const SLAMonitor = () => {
  const [policies, setPolicies] = useState([]);
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [activeTab, setActiveTab] = useState('policies'); // policies, violations

  useEffect(() => {
    fetchAllData();

    // Refresh violations every minute
    const interval = setInterval(fetchViolations, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPolicies(),
        fetchViolations(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching SLA data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const res = await api.get('/sla-policies');
      setPolicies(res.data.policies || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  };

  const fetchViolations = async () => {
    try {
      const res = await api.get('/sla-policies/violations/active');
      setViolations(res.data.violations || []);
    } catch (error) {
      console.error('Error fetching violations:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/sla-policies/stats/overview');
      setStats(res.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleTogglePolicy = async (policyId) => {
    try {
      const res = await api.patch(`/sla-policies/${policyId}/toggle`);
      setPolicies(policies.map(p =>
        p._id === policyId ? { ...p, enabled: res.data.enabled } : p
      ));
    } catch (error) {
      console.error('Error toggling policy:', error);
      alert('Failed to toggle policy');
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (!window.confirm('Are you sure you want to delete this SLA policy?')) {
      return;
    }

    try {
      await api.delete(`/sla-policies/${policyId}`);
      setPolicies(policies.filter(p => p._id !== policyId));
      fetchStats();
    } catch (error) {
      console.error('Error deleting policy:', error);
      alert('Failed to delete policy');
    }
  };

  const handleEditPolicy = (policy) => {
    setEditingPolicy(policy);
    setShowCreateModal(true);
  };

  const handleCreateNew = () => {
    setEditingPolicy(null);
    setShowCreateModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingPolicy(null);
    fetchAllData();
  };

  const formatTime = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getViolationSeverity = (violation) => {
    const percent = Math.max(
      violation.violation.firstResponsePercentElapsed || 0,
      violation.violation.resolutionPercentElapsed || 0
    );

    if (percent >= 150) return 'critical';
    if (percent >= 100) return 'high';
    if (percent >= 75) return 'warning';
    return 'normal';
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="sla-monitor">
        <div className="sla-loading">Loading SLA data...</div>
      </div>
    );
  }

  return (
    <div className="sla-monitor">
      {/* Header */}
      <div className="sla-header">
        <div className="sla-title">
          <h2>SLA Monitor</h2>
          <p>Service Level Agreement tracking and violations</p>
        </div>
        <button className="btn-create-policy" onClick={handleCreateNew}>
          + Create SLA Policy
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="sla-stats">
          <div className="sla-stat-card">
            <div className="stat-value">{stats.totalPolicies || 0}</div>
            <div className="stat-label">Total Policies</div>
          </div>
          <div className="sla-stat-card">
            <div className="stat-value">{stats.enabledPolicies || 0}</div>
            <div className="stat-label">Active Policies</div>
          </div>
          <div className="sla-stat-card">
            <div className="stat-value">{violations.length}</div>
            <div className="stat-label">Active Violations</div>
          </div>
          <div className="sla-stat-card">
            <div className="stat-value">
              {stats.avgComplianceRate ? `${Math.round(stats.avgComplianceRate)}%` : 'N/A'}
            </div>
            <div className="stat-label">Avg Compliance</div>
          </div>
        </div>
      )}

      {/* Violations Alert */}
      {violations.length > 0 && (
        <div className="violations-alert">
          <div className="alert-icon">�</div>
          <div className="alert-content">
            <strong>{violations.length} Active SLA Violation{violations.length !== 1 ? 's' : ''}</strong>
            <p>Some emails are breaching their SLA targets</p>
          </div>
          <button
            className="alert-action"
            onClick={() => setActiveTab('violations')}
          >
            View Details
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="sla-tabs">
        <button
          className={`tab-btn ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          SLA Policies ({policies.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'violations' ? 'active' : ''}`}
          onClick={() => setActiveTab('violations')}
        >
          Active Violations ({violations.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'policies' && (
        <div className="tab-content">
          {policies.length === 0 ? (
            <div className="no-policies">
              <div className="no-policies-icon">=�</div>
              <h3>No SLA policies yet</h3>
              <p>Create your first SLA policy to start tracking service levels</p>
              <button className="btn-create-first" onClick={handleCreateNew}>
                Create Your First Policy
              </button>
            </div>
          ) : (
            <div className="policies-list">
              {policies.map(policy => (
                <div key={policy._id} className={`policy-card ${!policy.enabled ? 'disabled' : ''}`}>
                  <div className="policy-header">
                    <div className="policy-priority">#{policy.priority}</div>
                    <div className="policy-info">
                      <h3>{policy.name}</h3>
                      {policy.description && <p>{policy.description}</p>}
                    </div>
                    <div className="policy-actions">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={policy.enabled}
                          onChange={() => handleTogglePolicy(policy._id)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                      <button
                        className="btn-icon"
                        onClick={() => handleEditPolicy(policy)}
                        title="Edit policy"
                      >
                        
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDeletePolicy(policy._id)}
                        title="Delete policy"
                      >
                        =�
                      </button>
                    </div>
                  </div>

                  <div className="policy-body">
                    <div className="policy-section">
                      <div className="section-label">First Response Targets</div>
                      <div className="targets-grid">
                        <div className="target-item">
                          <span className="target-priority urgent">Urgent</span>
                          <span className="target-time">{formatTime(policy.targets.firstResponseTime.urgent)}</span>
                        </div>
                        <div className="target-item">
                          <span className="target-priority high">High</span>
                          <span className="target-time">{formatTime(policy.targets.firstResponseTime.high)}</span>
                        </div>
                        <div className="target-item">
                          <span className="target-priority normal">Normal</span>
                          <span className="target-time">{formatTime(policy.targets.firstResponseTime.normal)}</span>
                        </div>
                        <div className="target-item">
                          <span className="target-priority low">Low</span>
                          <span className="target-time">{formatTime(policy.targets.firstResponseTime.low)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="policy-section">
                      <div className="section-label">Resolution Targets</div>
                      <div className="targets-grid">
                        <div className="target-item">
                          <span className="target-priority urgent">Urgent</span>
                          <span className="target-time">{formatTime(policy.targets.resolutionTime.urgent)}</span>
                        </div>
                        <div className="target-item">
                          <span className="target-priority high">High</span>
                          <span className="target-time">{formatTime(policy.targets.resolutionTime.high)}</span>
                        </div>
                        <div className="target-item">
                          <span className="target-priority normal">Normal</span>
                          <span className="target-time">{formatTime(policy.targets.resolutionTime.normal)}</span>
                        </div>
                        <div className="target-item">
                          <span className="target-priority low">Low</span>
                          <span className="target-time">{formatTime(policy.targets.resolutionTime.low)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="policy-footer">
                    <div className="policy-stat">
                      <span className="stat-icon"></span>
                      {policy.totalCompliance || 0} compliant
                    </div>
                    <div className="policy-stat">
                      <span className="stat-icon"></span>
                      {policy.totalViolations || 0} violations
                    </div>
                    {policy.complianceRate !== null && policy.complianceRate !== undefined && (
                      <div className="policy-stat">
                        <span className="stat-icon">=�</span>
                        {Math.round(policy.complianceRate)}% compliance
                      </div>
                    )}
                    {policy.escalation?.enabled && (
                      <div className="policy-badge">
                        Escalation at {policy.escalation.escalateAtPercent}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="tab-content">
          {violations.length === 0 ? (
            <div className="no-violations">
              <div className="no-violations-icon"></div>
              <h3>No active violations</h3>
              <p>All emails are within SLA targets</p>
            </div>
          ) : (
            <div className="violations-list">
              {violations.map((v, index) => {
                const severity = getViolationSeverity(v);
                return (
                  <div key={index} className={`violation-card ${severity}`}>
                    <div className="violation-header">
                      <div className={`severity-badge ${severity}`}>
                        {severity === 'critical' && '=4 Critical'}
                        {severity === 'high' && '=� High'}
                        {severity === 'warning' && '=� Warning'}
                      </div>
                      <div className="violation-policy">{v.policyName}</div>
                    </div>

                    <div className="violation-body">
                      <div className="violation-subject">
                        {v.assignment.subject || 'No subject'}
                      </div>
                      <div className="violation-meta">
                        Priority: <strong>{v.assignment.priority}</strong> "
                        Created: {formatDate(v.assignment.createdAt)}
                      </div>
                    </div>

                    <div className="violation-stats">
                      {v.violation.firstResponseViolation && (
                        <div className="violation-stat">
                          <div className="stat-label">First Response</div>
                          <div className="stat-bar">
                            <div
                              className="stat-fill"
                              style={{
                                width: `${Math.min(v.violation.firstResponsePercentElapsed, 100)}%`,
                                background: v.violation.firstResponsePercentElapsed >= 100 ? '#e53e3e' : '#ed8936'
                              }}
                            ></div>
                          </div>
                          <div className="stat-value">
                            {Math.round(v.violation.firstResponsePercentElapsed)}%
                          </div>
                        </div>
                      )}

                      {v.violation.resolutionViolation && (
                        <div className="violation-stat">
                          <div className="stat-label">Resolution</div>
                          <div className="stat-bar">
                            <div
                              className="stat-fill"
                              style={{
                                width: `${Math.min(v.violation.resolutionPercentElapsed, 100)}%`,
                                background: v.violation.resolutionPercentElapsed >= 100 ? '#e53e3e' : '#ed8936'
                              }}
                            ></div>
                          </div>
                          <div className="stat-value">
                            {Math.round(v.violation.resolutionPercentElapsed)}%
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPolicy ? 'Edit SLA Policy' : 'Create SLA Policy'}</h2>
              <button className="btn-close" onClick={handleModalClose}>�</button>
            </div>
            <div className="modal-body">
              <SLAPolicyForm
                policy={editingPolicy}
                onClose={handleModalClose}
                onSave={handleModalClose}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SLAMonitor;
