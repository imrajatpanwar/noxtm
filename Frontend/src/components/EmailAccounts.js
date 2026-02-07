import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiUsers, FiPlus, FiTrash2, FiKey, FiMail, FiRefreshCw, FiServer, FiCloud, FiX, FiCheck, FiAlertCircle, FiCopy, FiEye, FiEyeOff } from 'react-icons/fi';
import './EmailManagement.css';

function EmailAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateNoxtmModal, setShowCreateNoxtmModal] = useState(false);
  const [showAddExternalModal, setShowAddExternalModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [quotaData, setQuotaData] = useState({});

  // Form states for Create Noxtm Account
  const [noxtmUsername, setNoxtmUsername] = useState('');
  const [noxtmQuota, setNoxtmQuota] = useState(1024);
  const [createdNoxtmAccount, setCreatedNoxtmAccount] = useState(null);

  // Form states for Add External Account
  const [externalEmail, setExternalEmail] = useState('');
  const [externalDisplayName, setExternalDisplayName] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(993);
  const [imapSecure, setImapSecure] = useState(true);
  const [imapUsername, setImapUsername] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/email-accounts');
      setAccounts(response.data.data || []);
      setError('');
      
      // Fetch quota for each account
      response.data.data.forEach(account => {
        fetchQuota(account._id);
      });
    } catch (err) {
      console.error('Error fetching accounts:', err);
      setError('Failed to load email accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuota = async (accountId) => {
    try {
      const response = await api.get(`/email-accounts/${accountId}/quota`);
      setQuotaData(prev => ({
        ...prev,
        [accountId]: response.data.data
      }));
    } catch (err) {
      console.error('Error fetching quota:', err);
    }
  };

  const handleCreateNoxtmAccount = async () => {
    if (!noxtmUsername) {
      setError('Username is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await api.post('/email-accounts/create-noxtm', {
        username: noxtmUsername,
        quotaMB: noxtmQuota
      });

      setCreatedNoxtmAccount(response.data.data);
      setNoxtmUsername('');
      setNoxtmQuota(1024);
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    setError('');

    try {
      const response = await api.post('/email-accounts/test-connection', {
        email: externalEmail,
        imapHost,
        imapPort: parseInt(imapPort),
        imapSecure,
        imapUsername: imapUsername || externalEmail,
        imapPassword,
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpSecure
      });

      setConnectionTestResult(response.data);
    } catch (err) {
      setConnectionTestResult({
        success: false,
        message: err.response?.data?.message || 'Connection test failed'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleAddExternalAccount = async () => {
    if (!externalEmail || !imapPassword) {
      setError('Email and password are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/email-accounts/add-external', {
        email: externalEmail,
        displayName: externalDisplayName,
        imapHost,
        imapPort: parseInt(imapPort),
        imapSecure,
        imapUsername: imapUsername || externalEmail,
        imapPassword,
        smtpHost,
        smtpPort: parseInt(smtpPort),
        smtpSecure,
        smtpUsername: externalEmail,
        smtpPassword: imapPassword
      });

      // Reset form
      setExternalEmail('');
      setExternalDisplayName('');
      setImapHost('');
      setImapPort(993);
      setImapSecure(true);
      setImapUsername('');
      setImapPassword('');
      setSmtpHost('');
      setSmtpPort(587);
      setSmtpSecure(false);
      setConnectionTestResult(null);
      setShowAddExternalModal(false);
      
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncInbox = async (accountId) => {
    try {
      await api.post(`/email-accounts/${accountId}/sync-inbox`);
      fetchAccounts();
      fetchQuota(accountId);
    } catch (err) {
      console.error('Error syncing inbox:', err);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getQuotaColor = (percentage) => {
    if (percentage >= 90) return '#ff4444';
    if (percentage >= 75) return '#ff9944';
    return '#44ff44';
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-primary" onClick={() => setShowCreateNoxtmModal(true)}>
            <FiServer /> Create @noxtm.com
          </button>
          <button className="btn-secondary" onClick={() => setShowAddExternalModal(true)}>
            <FiCloud /> Add Existing Email
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="content-card">
        <div className="card-header">
          <h3>All Email Accounts ({accounts.length})</h3>
          <button className="btn-icon" onClick={fetchAccounts} title="Refresh">
            <FiRefreshCw />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Type</th>
                <th>Display Name</th>
                <th>Quota Usage</th>
                <th>Status</th>
                <th>Messages</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="empty-state">
                    <FiMail size={48} />
                    <p>No email accounts yet</p>
                    <button className="btn-secondary" onClick={() => setShowCreateNoxtmModal(true)}>
                      <FiPlus /> Create your first account
                    </button>
                  </td>
                </tr>
              ) : (
                accounts.map((account) => {
                  const quota = quotaData[account._id];
                  return (
                    <tr key={account._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {account.accountType === 'noxtm-hosted' ? <FiServer color="#4CAF50" /> : <FiCloud color="#2196F3" />}
                          {account.email}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${account.accountType === 'noxtm-hosted' ? 'hosted' : 'external'}`}>
                          {account.accountType === 'noxtm-hosted' ? 'Hosted' : 'External'}
                        </span>
                      </td>
                      <td>{account.displayName || '-'}</td>
                      <td>
                        {quota ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ 
                                width: '100px', 
                                height: '8px', 
                                backgroundColor: '#eee', 
                                borderRadius: '4px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${quota.percentage}%`,
                                  height: '100%',
                                  backgroundColor: getQuotaColor(quota.percentage),
                                  transition: 'width 0.3s'
                                }} />
                              </div>
                              <span style={{ fontSize: '12px' }}>{quota.percentage}%</span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#666' }}>
                              {quota.used} MB / {quota.limit} MB
                            </span>
                          </div>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${account.isVerified ? 'active' : 'inactive'}`}>
                          {account.isVerified ? 'Verified' : 'Not Verified'}
                        </span>
                      </td>
                      <td>
                        {account.accountType === 'external-imap' && account.inboxStats ? (
                          <div style={{ fontSize: '12px' }}>
                            <div>{account.inboxStats.totalMessages || 0} total</div>
                            <div style={{ color: '#2196F3' }}>{account.inboxStats.unreadMessages || 0} unread</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td>{new Date(account.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          {account.accountType === 'external-imap' && (
                            <button 
                              className="btn-icon" 
                              title="Sync Inbox" 
                              onClick={() => handleSyncInbox(account._id)}
                            >
                              <FiRefreshCw />
                            </button>
                          )}
                          <button 
                            className="btn-icon" 
                            title="View Credentials"
                            onClick={() => {
                              setSelectedAccount(account);
                              setShowCredentialsModal(true);
                            }}
                          >
                            <FiKey />
                          </button>
                          <button className="btn-icon danger" title="Delete">
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create @noxtm.com Account Modal */}
      {showCreateNoxtmModal && (
        <div className="noxtm-overlay" onClick={() => !submitting && setShowCreateNoxtmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiServer /> Create @noxtm.com Email Account</h2>
              <button className="btn-icon" onClick={() => setShowCreateNoxtmModal(false)} disabled={submitting}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {createdNoxtmAccount ? (
                <div className="success-message" style={{ textAlign: 'center', padding: '20px' }}>
                  <FiCheck size={48} color="#4CAF50" />
                  <h3>Account Created Successfully!</h3>
                  <p style={{ marginTop: '20px', marginBottom: '20px' }}>
                    Save these credentials - the password won't be shown again!
                  </p>

                  <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', textAlign: 'left' }}>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>Email:</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <code style={{ flex: 1, padding: '10px', backgroundColor: '#fff', borderRadius: '4px' }}>
                          {createdNoxtmAccount.email}
                        </code>
                        <button className="btn-icon" onClick={() => copyToClipboard(createdNoxtmAccount.email)}>
                          <FiCopy />
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <strong>Password:</strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <code style={{ flex: 1, padding: '10px', backgroundColor: '#fff', borderRadius: '4px' }}>
                          {createdNoxtmAccount.password}
                        </code>
                        <button className="btn-icon" onClick={() => copyToClipboard(createdNoxtmAccount.password)}>
                          <FiCopy />
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <strong>IMAP Server:</strong>
                      <div style={{ marginTop: '5px' }}>
                        <code>{createdNoxtmAccount.imapHost}:{createdNoxtmAccount.imapPort} (SSL/TLS)</code>
                      </div>
                    </div>

                    <div>
                      <strong>SMTP Server:</strong>
                      <div style={{ marginTop: '5px' }}>
                        <code>{createdNoxtmAccount.smtpHost}:{createdNoxtmAccount.smtpPort} (STARTTLS)</code>
                      </div>
                    </div>
                  </div>

                  <button 
                    className="btn-primary" 
                    style={{ marginTop: '20px' }}
                    onClick={() => {
                      setCreatedNoxtmAccount(null);
                      setShowCreateNoxtmModal(false);
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Username</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <input
                        type="text"
                        value={noxtmUsername}
                        onChange={(e) => setNoxtmUsername(e.target.value.toLowerCase())}
                        placeholder="john.doe"
                        disabled={submitting}
                      />
                      <span style={{ color: '#666' }}>@noxtm.com</span>
                    </div>
                    <small>Only letters, numbers, dots, hyphens, and underscores</small>
                  </div>

                  <div className="form-group">
                    <label>Mailbox Quota (MB)</label>
                    <input
                      type="number"
                      value={noxtmQuota}
                      onChange={(e) => setNoxtmQuota(parseInt(e.target.value))}
                      min="100"
                      max="10240"
                      disabled={submitting}
                    />
                    <small>Maximum mailbox size: {noxtmQuota} MB ({(noxtmQuota / 1024).toFixed(2)} GB)</small>
                  </div>

                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setShowCreateNoxtmModal(false)} disabled={submitting}>
                      Cancel
                    </button>
                    <button className="btn-primary" onClick={handleCreateNoxtmAccount} disabled={submitting}>
                      {submitting ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add External Email Modal */}
      {showAddExternalModal && (
        <div className="noxtm-overlay" onClick={() => !submitting && setShowAddExternalModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiCloud /> Add Existing Email Account</h2>
              <button className="btn-icon" onClick={() => setShowAddExternalModal(false)} disabled={submitting}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={externalEmail}
                  onChange={(e) => setExternalEmail(e.target.value)}
                  placeholder="user@gmail.com"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>Display Name (Optional)</label>
                <input
                  type="text"
                  value={externalDisplayName}
                  onChange={(e) => setExternalDisplayName(e.target.value)}
                  placeholder="John Doe"
                  disabled={submitting}
                />
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>IMAP Settings (Incoming Mail)</h4>
              
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>IMAP Server</label>
                  <input
                    type="text"
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.gmail.com"
                    disabled={submitting}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Port</label>
                  <input
                    type="number"
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>SSL/TLS</label>
                  <select value={imapSecure} onChange={(e) => setImapSecure(e.target.value === 'true')} disabled={submitting}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>IMAP Username (if different from email)</label>
                <input
                  type="text"
                  value={imapUsername}
                  onChange={(e) => setImapUsername(e.target.value)}
                  placeholder="Leave empty to use email address"
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label>Password / App Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={imapPassword}
                    onChange={(e) => setImapPassword(e.target.value)}
                    placeholder="Your email password or app-specific password"
                    disabled={submitting}
                    style={{ paddingRight: '40px' }}
                  />
                  <button 
                    className="btn-icon"
                    style={{ position: 'absolute', right: '5px', top: '50%', transform: 'translateY(-50%)' }}
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                <small>For Gmail/Outlook, use an App Password, not your regular password</small>
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>SMTP Settings (Outgoing Mail - Optional)</h4>
              
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>SMTP Server</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.gmail.com"
                    disabled={submitting}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>SSL/TLS</label>
                  <select value={smtpSecure} onChange={(e) => setSmtpSecure(e.target.value === 'true')} disabled={submitting}>
                    <option value="false">STARTTLS</option>
                    <option value="true">SSL/TLS</option>
                  </select>
                </div>
              </div>

              {connectionTestResult && (
                <div className={`alert ${connectionTestResult.success ? 'success' : 'error'}`}>
                  {connectionTestResult.success ? <FiCheck /> : <FiAlertCircle />}
                  {connectionTestResult.message}
                  {connectionTestResult.results?.imap && (
                    <div style={{ marginTop: '10px', fontSize: '12px' }}>
                      IMAP: {connectionTestResult.results.imap.success ? '✓ Connected' : '✗ Failed'}
                      {connectionTestResult.results.imap.stats && (
                        <span> - {connectionTestResult.results.imap.stats.totalMessages} messages, {connectionTestResult.results.imap.stats.unreadMessages} unread</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowAddExternalModal(false)} disabled={submitting || testingConnection}>
                  Cancel
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={handleTestConnection} 
                  disabled={submitting || testingConnection || !externalEmail || !imapPassword}
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
                <button 
                  className="btn-primary" 
                  onClick={handleAddExternalAccount} 
                  disabled={submitting || testingConnection || !connectionTestResult?.success}
                >
                  {submitting ? 'Adding...' : 'Add Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Credentials Modal */}
      {showCredentialsModal && selectedAccount && (
        <div className="noxtm-overlay" onClick={() => setShowCredentialsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FiKey /> Account Credentials</h2>
              <button className="btn-icon" onClick={() => setShowCredentialsModal(false)}>
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                <div style={{ marginBottom: '15px' }}>
                  <strong>Email:</strong>
                  <div style={{ marginTop: '5px' }}>
                    <code>{selectedAccount.email}</code>
                  </div>
                </div>

                {selectedAccount.accountType === 'noxtm-hosted' ? (
                  <>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>IMAP Server:</strong>
                      <div style={{ marginTop: '5px' }}>
                        <code>mail.noxtm.com:993 (SSL/TLS)</code>
                      </div>
                    </div>

                    <div>
                      <strong>SMTP Server:</strong>
                      <div style={{ marginTop: '5px' }}>
                        <code>mail.noxtm.com:587 (STARTTLS)</code>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ marginBottom: '15px' }}>
                      <strong>IMAP Server:</strong>
                      <div style={{ marginTop: '5px' }}>
                        <code>{selectedAccount.imapSettings?.host}:{selectedAccount.imapSettings?.port}</code>
                      </div>
                    </div>

                    <div>
                      <strong>SMTP Server:</strong>
                      <div style={{ marginTop: '5px' }}>
                        <code>{selectedAccount.smtpSettings?.host}:{selectedAccount.smtpSettings?.port}</code>
                      </div>
                    </div>
                  </>
                )}

                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                  <FiAlertCircle size={16} style={{ marginRight: '8px' }} />
                  Password is stored securely and cannot be displayed. Reset password if needed.
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn-primary" onClick={() => setShowCredentialsModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailAccounts;
