import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { FiMail, FiRefreshCw, FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './EmailLogs.css';

function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, sent, failed, queued
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (currentPage, currentFilter) => {
    try {
      setRefreshing(true);
      const params = {
        page: currentPage || 1,
        limit: 20
      };
      if (currentFilter && currentFilter !== 'all') {
        params.status = currentFilter;
      }

      const response = await api.get('/noxtm-mail/logs', { params });
      setLogs(response.data.logs || []);
      setTotalPages(response.data.totalPages || 1);
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
    fetchLogs(page, filter);
  }, [page, filter, fetchLogs]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchLogs(page, filter);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <FiCheckCircle className="status-icon status-icon-success" />;
      case 'failed':
      case 'bounced':
        return <FiXCircle className="status-icon status-icon-error" />;
      case 'queued':
        return <FiClock className="status-icon status-icon-warning" />;
      default:
        return <FiAlertCircle className="status-icon status-icon-default" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'sent':
        return 'status-badge-success';
      case 'failed':
      case 'bounced':
        return 'status-badge-error';
      case 'queued':
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

      {/* Filters */}
      <div className="logs-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
        >
          All
        </button>
        <button
          className={`filter-btn ${filter === 'sent' ? 'active' : ''}`}
          onClick={() => handleFilterChange('sent')}
        >
          <FiCheckCircle /> Sent
        </button>
        <button
          className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
          onClick={() => handleFilterChange('failed')}
        >
          <FiXCircle /> Failed
        </button>
        <button
          className={`filter-btn ${filter === 'queued' ? 'active' : ''}`}
          onClick={() => handleFilterChange('queued')}
        >
          <FiClock /> Queued
        </button>
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
                  <th>Status</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Sent At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div className="status-cell">
                        {getStatusIcon(log.status)}
                        <span className={`status-badge ${getStatusClass(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="email-cell">{log.from}</td>
                    <td className="email-cell">{log.to}</td>
                    <td className="subject-cell">{log.subject}</td>
                    <td className="date-cell">{formatDate(log.sentAt)}</td>
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
                <span className="detail-value">{selectedLog.to}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Subject:</span>
                <span className="detail-value">{selectedLog.subject}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Sent At:</span>
                <span className="detail-value">{formatDate(selectedLog.sentAt)}</span>
              </div>
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
