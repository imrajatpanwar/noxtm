import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiShield } from 'react-icons/fi';
import './EmailManagement.css';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/audit-logs?page=1&limit=50');
      setLogs(response.data.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="email-management-page"><h1>Loading...</h1></div>;

  return (
    <div className="email-management-page">
      <div className="page-header">
        <h1><FiShield /> Audit Trail</h1>
      </div>

      <div className="content-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Resource</th>
              <th>Performed By</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td><span className={`action-badge ${log.action}`}>{log.action.replace(/_/g, ' ')}</span></td>
                <td>
                  <div>
                    <strong>{log.resourceIdentifier}</strong>
                    <br />
                    <small>{log.resourceType}</small>
                  </div>
                </td>
                <td>{log.performedByName || log.performedByEmail}</td>
                <td><code>{log.ipAddress}</code></td>
                <td><span className={`status-badge ${log.status}`}>{log.status}</span></td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AuditLogs;
