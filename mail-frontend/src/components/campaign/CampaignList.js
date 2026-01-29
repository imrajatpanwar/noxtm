import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/api';
import CreateCampaignModal from './CreateCampaignModal';
import './CampaignList.css';

function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [quota, setQuota] = useState({ used: 0, total: 0 });
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/campaigns');
      if (response.data.success) {
        setCampaigns(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuota = useCallback(async () => {
    try {
      const response = await api.get('/billing/info');
      console.log('Billing response:', response.data);
      if (response.data.success) {
        const billing = response.data.billing;
        console.log('Billing data:', billing);
        setQuota({
          used: billing?.totalUsed || 0,
          total: billing?.emailCredits || 0
        });
      }
    } catch (err) {
      console.error('Error fetching billing info:', err);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchQuota();
  }, [fetchCampaigns, fetchQuota]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCampaigns(campaigns.map(c => c._id));
    } else {
      setSelectedCampaigns([]);
    }
  };

  const handleSelectCampaign = (campaignId) => {
    setSelectedCampaigns(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      }
      return [...prev, campaignId];
    });
  };

  const handleCampaignClick = (campaign) => {
    // Only allow editing draft campaigns
    if (campaign.status === 'draft') {
      setEditCampaign(campaign);
      setShowCreateModal(true);
    }
  };

  const handleEditCampaign = () => {
    // Edit the first selected draft campaign
    const selectedDrafts = campaigns.filter(
      c => selectedCampaigns.includes(c._id) && c.status === 'draft'
    );
    if (selectedDrafts.length > 0) {
      setEditCampaign(selectedDrafts[0]);
      setShowCreateModal(true);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }
    try {
      await api.delete(`/campaigns/${campaignId}`);
      fetchCampaigns();
      setSelectedCampaigns(prev => prev.filter(id => id !== campaignId));
    } catch (err) {
      console.error('Error deleting campaign:', err);
      alert('Failed to delete campaign: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCampaigns.length === 0) return;

    if (!window.confirm(`Are you sure you want to delete ${selectedCampaigns.length} campaign(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedCampaigns.map(id => api.delete(`/campaigns/${id}`))
      );
      fetchCampaigns();
      setSelectedCampaigns([]);
    } catch (err) {
      console.error('Error deleting campaigns:', err);
      alert('Failed to delete some campaigns: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStatusBadge = (status, scheduledTime) => {
    if (scheduledTime && status === 'draft') {
      const date = new Date(scheduledTime);
      return (
        <span className="status-badge scheduled">
          {date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} - {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
        </span>
      );
    }

    const statusClasses = {
      draft: 'draft',
      running: 'running',
      completed: 'completed',
      paused: 'paused',
      cancelled: 'cancelled',
      canceled: 'cancelled'
    };

    const statusLabels = {
      draft: 'Draft',
      running: 'Running',
      completed: 'Completed',
      paused: 'Pause',
      cancelled: 'Canceled',
      canceled: 'Canceled'
    };

    return (
      <span className={`status-badge ${statusClasses[status] || 'draft'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const handleCampaignCreated = () => {
    setShowCreateModal(false);
    setEditCampaign(null);
    fetchCampaigns();
    fetchQuota();
  };

  const getRecipientStats = (campaign) => {
    const sent = campaign.stats?.sent || 0;
    const total = campaign.recipients?.length || 0;
    return `${sent.toLocaleString()} / ${total.toLocaleString()}`;
  };

  const handleViewStats = (campaign) => {
    setSelectedCampaign(campaign);
    setShowStatsModal(true);
  };

  if (loading) {
    return (
      <div className="campaign-list-container">
        <div className="campaign-list-loading">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="campaign-list-container">
      {/* Header */}
      <div className="campaign-list-header">
        <div className="header-left">
          <h1>E-mail Campaign</h1>
          <p>Create Campaign & Send Bulk Emails</p>
        </div>
        <div className="header-right">
          <div className="quota-display">
            <span className="quota-used">{quota.used.toLocaleString()}</span>
            <span className="quota-separator">/</span>
            <span className="quota-total">{quota.total.toLocaleString()}</span>
            <span className="quota-label">Used / Available Email Credits</span>
          </div>
          <button
            className="btn-create-campaign"
            onClick={() => {
              setEditCampaign(null);
              setShowCreateModal(true);
            }}
          >
            + Create Email Campaign
          </button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedCampaigns.length > 0 && (
        <div className="bulk-actions-toolbar">
          <span className="selected-count">
            {selectedCampaigns.length} campaign{selectedCampaigns.length > 1 ? 's' : ''} selected
          </span>
          <div className="bulk-actions-buttons">
            {campaigns.filter(c => selectedCampaigns.includes(c._id) && c.status === 'draft').length > 0 && (
              <button
                className="btn-bulk-edit"
                onClick={handleEditCampaign}
              >
                ✏️ Edit
              </button>
            )}
            <button
              className="btn-bulk-delete"
              onClick={handleDeleteSelected}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="campaign-list-error">
          {error}
        </div>
      )}

      {/* Campaign Table */}
      <div className="campaign-table-wrapper">
        <table className="campaign-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="col-name">Campaign Name</th>
              <th className="col-from-email">From Email</th>
              <th className="col-recipients">Recipients</th>
              <th className="col-status">Status</th>
              <th className="col-sent">Sent / Total</th>
              <th className="col-tracking">Tracking</th>
              <th className="col-opens">Opens</th>
              <th className="col-clicks">Clicks</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan="10" className="no-campaigns">
                  No campaigns found. Click "Create Email Campaign" to get started.
                </td>
              </tr>
            ) : (
              campaigns.map(campaign => (
                <tr
                  key={campaign._id}
                  className={campaign.status === 'draft' ? 'clickable-row' : ''}
                  onClick={() => handleCampaignClick(campaign)}
                >
                  <td className="col-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedCampaigns.includes(campaign._id)}
                      onChange={() => handleSelectCampaign(campaign._id)}
                    />
                  </td>
                  <td className="col-name">
                    <span className="campaign-name-text">{campaign.name}</span>
                    {campaign.status === 'draft' && (
                      <span className="edit-hint">Click to edit</span>
                    )}
                  </td>
                  <td className="col-from-email">
                    <span className="email-text">{campaign.fromEmail}</span>
                  </td>
                  <td className="col-recipients">
                    {campaign.recipients?.length || 0}
                  </td>
                  <td className="col-status">
                    {getStatusBadge(campaign.status, campaign.scheduledTime)}
                  </td>
                  <td className="col-sent">{getRecipientStats(campaign)}</td>
                  <td className="col-tracking">
                    {campaign.trackingEnabled ? (
                      <span className="tracking-badge enabled">Tracked</span>
                    ) : (
                      <span className="tracking-badge disabled">Not Tracked</span>
                    )}
                  </td>
                  <td className="col-opens">
                    {campaign.trackingEnabled ? (
                      <div className="stat-cell">
                        <span className="stat-value">{campaign.stats?.opened || 0}</span>
                        {campaign.stats?.sent > 0 && (
                          <span className="stat-rate">
                            ({((campaign.stats?.opened || 0) / campaign.stats.sent * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="stat-na">-</span>
                    )}
                  </td>
                  <td className="col-clicks">
                    {campaign.trackingEnabled ? (
                      <div className="stat-cell">
                        <span className="stat-value">{campaign.stats?.clicked || 0}</span>
                        {campaign.stats?.opened > 0 && (
                          <span className="stat-rate">
                            ({((campaign.stats?.clicked || 0) / campaign.stats.opened * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="stat-na">-</span>
                    )}
                  </td>
                  <td className="col-actions">
                    {campaign.trackingEnabled && (
                      <button
                        className="btn-view-stats"
                        onClick={() => handleViewStats(campaign)}
                      >
                        View Stats
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          onClose={() => {
            setShowCreateModal(false);
            setEditCampaign(null);
          }}
          onSuccess={handleCampaignCreated}
          editCampaign={editCampaign}
        />
      )}

      {/* Stats Modal */}
      {showStatsModal && selectedCampaign && (
        <CampaignStatsModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowStatsModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}
    </div>
  );
}

// Campaign Stats Modal Component
function CampaignStatsModal({ campaign, onClose }) {
  const [stats, setStats] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign._id]);

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign._id, filter]);

  const fetchStats = async () => {
    try {
      const response = await api.get(`/tracking/campaign/${campaign._id}/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/tracking/campaign/${campaign._id}/details?filter=${filter}`);
      if (response.data.success) {
        setDetails(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="stats-modal" onClick={e => e.stopPropagation()}>
        <div className="stats-modal-header">
          <h2>{campaign.name} - Email Statistics</h2>
          <button className="close-btn" onClick={onClose}>x</button>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-number">{stats?.total || campaign.stats?.sent || 0}</div>
            <div className="stat-label">Sent</div>
          </div>
          <div className="stat-card opened">
            <div className="stat-number">{stats?.opened || campaign.stats?.opened || 0}</div>
            <div className="stat-label">Opened</div>
            <div className="stat-percentage">{stats?.openRate || 0}%</div>
          </div>
          <div className="stat-card clicked">
            <div className="stat-number">{stats?.clicked || campaign.stats?.clicked || 0}</div>
            <div className="stat-label">Clicked</div>
            <div className="stat-percentage">{stats?.clickRate || 0}%</div>
          </div>
          <div className="stat-card bounced">
            <div className="stat-number">{stats?.bounced || 0}</div>
            <div className="stat-label">Bounced</div>
          </div>
          <div className="stat-card unsubscribed">
            <div className="stat-number">{stats?.unsubscribed || 0}</div>
            <div className="stat-label">Unsubscribed</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="stats-filters">
          {['all', 'opened', 'not-opened', 'clicked', 'bounced', 'unsubscribed'].map(f => (
            <button
              key={f}
              className={filter === f ? 'active' : ''}
              onClick={() => setFilter(f)}
            >
              {f === 'not-opened' ? 'Not Opened' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Details Table */}
        <div className="stats-details">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : details.length === 0 ? (
            <div className="no-data">No tracking data available</div>
          ) : (
            <table className="details-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Opened</th>
                  <th>Clicked</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {details.map(item => (
                  <tr key={item._id}>
                    <td>{item.recipientEmail}</td>
                    <td>
                      <span className={`status-badge ${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.opened ? (
                        <span className="yes">
                          Yes ({item.openCount}x)
                          <br />
                          <small>{new Date(item.openedAt).toLocaleString()}</small>
                        </span>
                      ) : (
                        <span className="no">No</span>
                      )}
                    </td>
                    <td>
                      {item.clicked ? (
                        <span className="yes">Yes ({item.clickCount}x)</span>
                      ) : (
                        <span className="no">No</span>
                      )}
                    </td>
                    <td>{item.openEvents?.[0]?.device || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignList;
