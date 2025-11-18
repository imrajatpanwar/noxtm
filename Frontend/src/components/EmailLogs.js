import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { FiMail, FiRefreshCw, FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './EmailLogs.css';

function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // all, sent, failed, queued, delivered, bounced
  const [directionFilter, setDirectionFilter] = useState('all'); // all, sent, received
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [stats, setStats] = useState({ total: 0, sent: 0, received: 0, failed: 0 });

  const fetchLogs = useCallback(async (currentPage, currentStatusFilter, currentDirectionFilter) => {
    try {
      setRefreshing(true);
      const params = {
        page: currentPage || 1,
        limit: 20
      };
      if (currentStatusFilter && currentStatusFilter !== 'all') {
        params.status = currentStatusFilter;
      }
      if (currentDirectionFilter && currentDirectionFilter !== 'all') {
        params.direction = currentDirectionFilter;
      }

      const response = await api.get('/noxtm-mail/logs', { params });
      const logsData = response.data.logs || [];
      setLogs(logsData);
      setTotalPages(response.data.pagination?.totalPages || 1);
      
      // Calculate stats
      const total = response.data.pagination?.totalLogs || 0;
      const sentCount = logsData.filter(log => log.direction === 'sent').length;
      const receivedCount = logsData.filter(log => log.direction === 'received').length;
      const failedCount = logsData.filter(log => log.status === 'failed' || log.status === 'bounced').length;
      setStats({ total, sent: sentCount, received: receivedCount, failed: failedCount });
      
      setError('');
    } catch (err) {
      console.error('Failed to fetch email logs:', err);
      setError('Failed to load email logs. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, statusFilter, directionFilter);
  }, [page, statusFilter, directionFilter, fetchLogs]);

  const handleStatusFilterChange = (newFilter) => {
    setStatusFilter(newFilter);
    setPage(1);
  };

  const handleDirectionFilterChange = (newFilter) => {
    setDirectionFilter(newFilter);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchLogs(page, statusFilter, directionFilter);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <FiCheckCircle className="status-icon status-icon-success" />;
      case 'failed':
      case 'bounced':
        return <FiXCircle className="status-icon status-icon-error" />;
      case 'queued':
        return <FiClock className="status-icon status-icon-warning" />;
      case 'spam':
      case 'quarantined':
        return <FiAlertCircle className="status-icon status-icon-warning" />;
      default:
        return <FiAlertCircle className="status-icon status-icon-default" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return 'status-badge-success';
      case 'failed':
      case 'bounced':
        return 'status-badge-error';
      case 'queued':
        return 'status-badge-warning';
      case 'spam':
      case 'quarantined':
        return 'status-badge-warning';
      default:
        return 'status-badge-default';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="email-logs">
        <div className="logs-header">
          <h2>Email Logs</h2>
        </div>
        <div className="logs-loading">
          <FiRefreshCw className="loading-spinner" />
          <p>Loading email logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-logs">
      {/* Header */}
      <div className="logs-header">
        <h2>
          <FiMail className="header-icon" />
          Email Logs
        </h2>
        <button
          onClick={handleRefresh}
          className={`btn-refresh ${refreshing ? 'refreshing' : ''}`}
          disabled={refreshing}
        >
          <FiRefreshCw className={refreshing ? 'spinning' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="logs-stats">
        <div className="stat-card">
          <span className="stat-label">Total</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sent</span>
          <span className="stat-value stat-success">{stats.sent}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Received</span>
          <span className="stat-value stat-info">{stats.received}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Failed</span>
          <span className="stat-value stat-error">{stats.failed}</span>
        </div>
      </div>

      {/* Direction Filters */}
      <div className="logs-filters">
        <div className="filter-group">
          <label className="filter-label">Direction:</label>
          <button
            className={`filter-btn ${directionFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleDirectionFilterChange('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${directionFilter === 'sent' ? 'active' : ''}`}
            onClick={() => handleDirectionFilterChange('sent')}
          >
            <FiMail /> Sent
          </button>
          <button
            className={`filter-btn ${directionFilter === 'received' ? 'active' : ''}`}
            onClick={() => handleDirectionFilterChange('received')}
          >
            <FiMail /> Received
          </button>
        </div>

        <div className="filter-group">
          <label className="filter-label">Status:</label>
          <button
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${statusFilter === 'sent' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('sent')}
          >
            <FiCheckCircle /> Sent
          </button>
          <button
            className={`filter-btn ${statusFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('delivered')}
          >
            <FiCheckCircle /> Delivered
          </button>
          <button
            className={`filter-btn ${statusFilter === 'failed' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('failed')}
          >
            <FiXCircle /> Failed
          </button>
          <button
            className={`filter-btn ${statusFilter === 'queued' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('queued')}
          >
            <FiClock /> Queued
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="logs-error">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* Logs Table */}
      {logs.length === 0 ? (
        <div className="no-logs">
          <FiMail className="no-logs-icon" />
          <p>No email logs found</p>
        </div>
      ) : (
        <>
          <div className="logs-table-container">
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Direction</th>
                  <th>Status</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <span className={`direction-badge ${log.direction === 'sent' ? 'direction-sent' : 'direction-received'}`}>
                        {log.direction === 'sent' ? '↑ Sent' : '↓ Received'}
                      </span>
                    </td>
                    <td>
                      <div className="status-cell">
                        {getStatusIcon(log.status)}
                        <span className={`status-badge ${getStatusClass(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="email-cell">{log.from}</td>
                    <td className="email-cell">{Array.isArray(log.to) ? log.to.join(', ') : log.to}</td>
                    <td className="subject-cell">{log.subject}</td>
                    <td className="date-cell">{formatDate(log.sentAt || log.createdAt)}</td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => setSelectedLog(log)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="logs-pagination">
            <button
              className="pagination-btn"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <FiChevronLeft /> Previous
            </button>
            <span className="pagination-info">
              Page {page} of {totalPages}
            </span>
            <button
              className="pagination-btn"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              Next <FiChevronRight />
            </button>
          </div>
        </>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Email Details</h3>
              <button className="modal-close" onClick={() => setSelectedLog(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Direction:</span>
                <span className={`direction-badge ${selectedLog.direction === 'sent' ? 'direction-sent' : 'direction-received'}`}>
                  {selectedLog.direction === 'sent' ? '↑ Sent' : '↓ Received'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status:</span>
                <div className="status-cell">
                  {getStatusIcon(selectedLog.status)}
                  <span className={`status-badge ${getStatusClass(selectedLog.status)}`}>
                    {selectedLog.status}
                  </span>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-label">From:</span>
                <span className="detail-value">{selectedLog.from}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To:</span>
                <span className="detail-value">{Array.isArray(selectedLog.to) ? selectedLog.to.join(', ') : selectedLog.to}</span>
              </div>
              {selectedLog.cc && selectedLog.cc.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">CC:</span>
                  <span className="detail-value">{Array.isArray(selectedLog.cc) ? selectedLog.cc.join(', ') : selectedLog.cc}</span>
                </div>
              )}
              {selectedLog.bcc && selectedLog.bcc.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">BCC:</span>
                  <span className="detail-value">{Array.isArray(selectedLog.bcc) ? selectedLog.bcc.join(', ') : selectedLog.bcc}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Subject:</span>
                <span className="detail-value">{selectedLog.subject}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{formatDate(selectedLog.sentAt || selectedLog.createdAt)}</span>
              </div>
              {selectedLog.size && (
                <div className="detail-row">
                  <span className="detail-label">Size:</span>
                  <span className="detail-value">{(selectedLog.size / 1024).toFixed(2)} KB</span>
                </div>
              )}
              {selectedLog.spamScore !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">Spam Score:</span>
                  <span className="detail-value">{selectedLog.spamScore}</span>
                </div>
              )}
              {selectedLog.messageId && (
                <div className="detail-row">
                  <span className="detail-label">Message ID:</span>
                  <span className="detail-value detail-value-mono">{selectedLog.messageId}</span>
                </div>
              )}
              {selectedLog.error && (
                <div className="detail-row detail-row-error">
                  <span className="detail-label">Error:</span>
                  <span className="detail-value">{selectedLog.error}</span>
                </div>
              )}
              {selectedLog.body && (
                <div className="detail-section">
                  <span className="detail-label">Message Body:</span>
                  <div className="detail-body">
                    {selectedLog.htmlBody ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedLog.htmlBody }} />
                    ) : (
                      <pre>{selectedLog.body}</pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailLogs;
