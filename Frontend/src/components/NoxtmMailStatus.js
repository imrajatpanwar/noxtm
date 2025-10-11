import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiServer, FiCheckCircle, FiAlertCircle, FiMail, FiRefreshCw } from 'react-icons/fi';
import './NoxtmMailStatus.css';

function NoxtmMailStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/noxtm-mail/status');
      setStatus(response.data);
      setError('');
    } catch (err) {
      console.error('Failed to fetch mail server status:', err);
      setError('Failed to load mail server status. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    return status === 'running' || status === 'healthy' ? (
      <FiCheckCircle className="status-icon status-icon-success" />
    ) : (
      <FiAlertCircle className="status-icon status-icon-error" />
    );
  };

  const getStatusClass = (status) => {
    return status === 'running' || status === 'healthy' ? 'status-badge-success' : 'status-badge-error';
  };

  if (loading) {
    return (
      <div className="noxtm-mail-status">
        <div className="status-header">
          <h2>Mail Server Status</h2>
        </div>
        <div className="status-loading">
          <FiRefreshCw className="loading-spinner" />
          <p>Loading server status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="noxtm-mail-status">
        <div className="status-header">
          <h2>Mail Server Status</h2>
        </div>
        <div className="status-error">
          <FiAlertCircle className="error-icon" />
          <p>{error}</p>
          <button onClick={fetchStatus} className="btn-retry">
            <FiRefreshCw /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="noxtm-mail-status">
      {/* Header */}
      <div className="status-header">
        <h2>
          <FiServer className="header-icon" />
          Mail Server Status
        </h2>
        <button
          onClick={fetchStatus}
          className={`btn-refresh ${refreshing ? 'refreshing' : ''}`}
          disabled={refreshing}
        >
          <FiRefreshCw className={refreshing ? 'spinning' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Overall Status Card */}
      <div className="status-card status-card-main">
        <h3>Overall System Status</h3>
        <div className="status-indicator">
          {getStatusIcon(status?.status?.overall)}
          <span className={`status-badge ${getStatusClass(status?.status?.overall)}`}>
            {status?.status?.overall?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="status-grid">
        {/* Postfix Status */}
        <div className="status-card">
          <div className="card-header">
            <FiMail className="card-icon" />
            <h3>Postfix SMTP</h3>
          </div>
          <div className="card-content">
            <div className="status-indicator">
              {getStatusIcon(status?.status?.postfix)}
              <span className={`status-badge ${getStatusClass(status?.status?.postfix)}`}>
                {status?.status?.postfix?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
          </div>
        </div>

        {/* OpenDKIM Status */}
        <div className="status-card">
          <div className="card-header">
            <FiCheckCircle className="card-icon" />
            <h3>OpenDKIM</h3>
          </div>
          <div className="card-content">
            <div className="status-indicator">
              {getStatusIcon(status?.status?.opendkim)}
              <span className={`status-badge ${getStatusClass(status?.status?.opendkim)}`}>
                {status?.status?.opendkim?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
          </div>
        </div>

        {/* Queue Size */}
        <div className="status-card">
          <div className="card-header">
            <FiMail className="card-icon" />
            <h3>Mail Queue</h3>
          </div>
          <div className="card-content">
            <div className="stat-value">{status?.stats?.queueSize || 0}</div>
            <div className="stat-label">Messages in Queue</div>
          </div>
        </div>
      </div>

      {/* Email Statistics */}
      <div className="status-section">
        <h3>Email Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Sent Today</div>
            <div className="stat-value stat-value-success">{status?.stats?.sentToday || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed Today</div>
            <div className="stat-value stat-value-error">{status?.stats?.failedToday || 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Sent</div>
            <div className="stat-value">{status?.stats?.totalSent || 0}</div>
          </div>
        </div>
      </div>

      {/* Server Information */}
      <div className="status-section">
        <h3>Server Information</h3>
        <div className="server-info">
          <div className="info-row">
            <span className="info-label">Hostname:</span>
            <span className="info-value">{status?.server?.hostname || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">IP Address:</span>
            <span className="info-value">{status?.server?.ip || 'N/A'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">From Address:</span>
            <span className="info-value">{status?.server?.from || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoxtmMailStatus;
