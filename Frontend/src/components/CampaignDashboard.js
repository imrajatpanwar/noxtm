import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CampaignDashboard.css';

function CampaignDashboard() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    scheduled: 0,
    sending: 0,
    sent: 0,
    failed: 0
  });

  useEffect(() => {
    fetchCampaigns();
  }, [filter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const url = filter === 'all'
        ? 'http://localhost:5000/api/campaigns'
        : `http://localhost:5000/api/campaigns?status=${filter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const result = await response.json();
      setCampaigns(result.data || []);

      // Calculate stats
      const allCampaigns = result.data || [];
      setStats({
        total: allCampaigns.length,
        draft: allCampaigns.filter(c => c.status === 'draft').length,
        scheduled: allCampaigns.filter(c => c.status === 'scheduled').length,
        sending: allCampaigns.filter(c => c.status === 'sending').length,
        sent: allCampaigns.filter(c => c.status === 'sent').length,
        failed: allCampaigns.filter(c => c.status === 'failed').length
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      fetchCampaigns();
    } catch (err) {
      console.error('Error deleting campaign:', err);
      alert('Failed to delete campaign');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6B7280',
      scheduled: '#3B82F6',
      sending: '#F59E0B',
      sent: '#10B981',
      failed: '#EF4444',
      paused: '#8B5CF6'
    };
    return colors[status] || '#6B7280';
  };

  const getStatusBadge = (status) => {
    return (
      <span
        className="status-badge"
        style={{ backgroundColor: getStatusColor(status) }}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="campaign-dashboard-container">
        <div className="loading-state">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="campaign-dashboard-container">
      {/* Header */}
      <div className="campaign-dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Email Campaigns</h1>
            <p>Create and manage email marketing campaigns</p>
          </div>
          <button
            className="btn-primary"
            onClick={() => navigate('/campaign/wizard')}
          >
            + Create Campaign
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => setFilter('all')}>
          <div className="stat-header">
            <span className="stat-title">Total</span>
            <div className="stat-icon" style={{ backgroundColor: '#3B82F6' }}>📊</div>
          </div>
          <div className="stat-value">{stats.total}</div>
        </div>

        <div className="stat-card" onClick={() => setFilter('draft')}>
          <div className="stat-header">
            <span className="stat-title">Draft</span>
            <div className="stat-icon" style={{ backgroundColor: '#6B7280' }}>📝</div>
          </div>
          <div className="stat-value">{stats.draft}</div>
        </div>

        <div className="stat-card" onClick={() => setFilter('scheduled')}>
          <div className="stat-header">
            <span className="stat-title">Scheduled</span>
            <div className="stat-icon" style={{ backgroundColor: '#3B82F6' }}>📅</div>
          </div>
          <div className="stat-value">{stats.scheduled}</div>
        </div>

        <div className="stat-card" onClick={() => setFilter('sent')}>
          <div className="stat-header">
            <span className="stat-title">Sent</span>
            <div className="stat-icon" style={{ backgroundColor: '#10B981' }}>✅</div>
          </div>
          <div className="stat-value">{stats.sent}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-tabs">
          <button
            className={filter === 'all' ? 'filter-tab active' : 'filter-tab'}
            onClick={() => setFilter('all')}
          >
            All Campaigns
          </button>
          <button
            className={filter === 'draft' ? 'filter-tab active' : 'filter-tab'}
            onClick={() => setFilter('draft')}
          >
            Draft
          </button>
          <button
            className={filter === 'scheduled' ? 'filter-tab active' : 'filter-tab'}
            onClick={() => setFilter('scheduled')}
          >
            Scheduled
          </button>
          <button
            className={filter === 'sent' ? 'filter-tab active' : 'filter-tab'}
            onClick={() => setFilter('sent')}
          >
            Sent
          </button>
        </div>

        <button
          className="btn-secondary"
          onClick={() => navigate('/contact-lists')}
        >
          Manage Lists
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📧</div>
          <h3>No campaigns yet</h3>
          <p>Create your first email campaign to get started</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/campaign/wizard')}
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="campaigns-grid">
          {campaigns.map(campaign => (
            <div key={campaign._id} className="campaign-card">
              <div className="campaign-card-header">
                <h3 className="campaign-name">{campaign.name}</h3>
                {getStatusBadge(campaign.status)}
              </div>

              <p className="campaign-subject">
                <strong>Subject:</strong> {campaign.subject}
              </p>

              {campaign.description && (
                <p className="campaign-description">{campaign.description}</p>
              )}

              <div className="campaign-stats">
                <div className="campaign-stat">
                  <span className="stat-label">Recipients</span>
                  <span className="stat-number">{campaign.stats.totalRecipients}</span>
                </div>
                <div className="campaign-stat">
                  <span className="stat-label">Sent</span>
                  <span className="stat-number">{campaign.stats.sent}</span>
                </div>
                <div className="campaign-stat">
                  <span className="stat-label">Failed</span>
                  <span className="stat-number">{campaign.stats.failed}</span>
                </div>
              </div>

              <div className="campaign-meta">
                <span className="meta-item">
                  Created: {formatDate(campaign.createdAt)}
                </span>
                {campaign.sentAt && (
                  <span className="meta-item">
                    Sent: {formatDate(campaign.sentAt)}
                  </span>
                )}
              </div>

              <div className="campaign-actions">
                <button
                  className="btn-view"
                  onClick={() => navigate(`/campaign/${campaign._id}`)}
                >
                  View Details
                </button>
                {campaign.status === 'draft' && (
                  <button
                    className="btn-edit"
                    onClick={() => navigate(`/campaign/wizard/${campaign._id}`)}
                  >
                    Edit
                  </button>
                )}
                {campaign.status !== 'sending' && (
                  <button
                    className="btn-delete"
                    onClick={() => handleDeleteCampaign(campaign._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CampaignDashboard;
