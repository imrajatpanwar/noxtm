import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiActivity, FiSend, FiInbox, FiAlertTriangle } from 'react-icons/fi';
import './EmailManagement.css';

function EmailLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const fetchLogs = async () => {
    try {
      let url = '/email-logs?page=1&limit=50';
      if (filter !== 'all') {
        url += `&direction=${filter}`;
      }
      const response = await api.get(url);
      setLogs(response.data.data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="email-management-page"><h1>Loading...</h1></div>;

  return (
    <div className="email-management-page">
      <div className="page-header">
        <h1><FiActivity /> Email Logs</h1>
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'sent' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter('sent')}
          >
            <FiSend /> Sent
          </button>
          <button
            className={filter === 'received' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setFilter('received')}
          >
            <FiInbox /> Received
          </button>
        </div>
      </div>

      <div className="content-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Direction</th>
              <th>From</th>
              <th>To</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td>
                  {log.direction === 'sent' ? <FiSend color="#10b981" /> : <FiInbox color="#3b82f6" />}
                </td>
                <td>{log.from}</td>
                <td>{Array.isArray(log.to) ? log.to[0] : log.to}</td>
                <td>{log.subject}</td>
                <td>
                  <span className={`status-badge ${log.status}`}>{log.status}</span>
                  {log.isSpam && <FiAlertTriangle color="#ef4444" title="Spam" />}
                </td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmailLogViewer;
