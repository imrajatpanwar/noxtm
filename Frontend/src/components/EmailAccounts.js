import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiUsers, FiPlus, FiEdit2, FiTrash2, FiKey, FiMail } from 'react-icons/fi';
import './EmailManagement.css';

function EmailAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/email-accounts');
      setAccounts(response.data.data || []);
      setError('');
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load email accounts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="email-management-page">
        <h1><FiUsers /> Email Accounts</h1>
        <div className="loading-message">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className="email-management-page">
      <div className="page-header">
        <h1><FiUsers /> Email Accounts</h1>
        <button className="btn-primary">
          <FiPlus /> Create Account
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="content-card">
        <div className="card-header">
          <h3>All Email Accounts ({accounts.length})</h3>
          <input type="text" placeholder="Search accounts..." className="search-input" />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Display Name</th>
                <th>Domain</th>
                <th>Quota</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    <FiMail size={48} />
                    <p>No email accounts yet</p>
                    <button className="btn-secondary">
                      <FiPlus /> Create your first account
                    </button>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account._id}>
                    <td>{account.email}</td>
                    <td>{account.displayName || '-'}</td>
                    <td>{account.domain}</td>
                    <td>{account.quota} MB</td>
                    <td>
                      <span className={`status-badge ${account.enabled ? 'active' : 'inactive'}`}>
                        {account.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>{new Date(account.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" title="Edit">
                          <FiEdit2 />
                        </button>
                        <button className="btn-icon" title="Credentials">
                          <FiKey />
                        </button>
                        <button className="btn-icon danger" title="Delete">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default EmailAccounts;
