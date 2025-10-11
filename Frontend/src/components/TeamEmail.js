import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiMail, FiSend, FiRefreshCw, FiLogIn, FiLogOut, FiTrash2, FiEye } from 'react-icons/fi';
import './TeamEmail.css';

function TeamEmail() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [view, setView] = useState('inbox'); // inbox, compose, view
  const [composeData, setComposeData] = useState({ to: '', subject: '', text: '' });

  // Load saved credentials from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('webmail_credentials');
    if (saved) {
      const creds = JSON.parse(saved);
      setCredentials(creds);
      // Try to auto-login silently without showing errors
      autoLogin(creds);
    }
  }, []);

  const autoLogin = async (creds) => {
    try {
      const response = await api.post('/webmail/connect', creds);
      if (response.data.success) {
        setIsLoggedIn(true);
        fetchEmails(creds);
      }
    } catch (err) {
      // Silent fail - clear saved credentials and let user login manually
      localStorage.removeItem('webmail_credentials');
      console.log('Auto-login failed, credentials cleared');
    }
  };

  const handleLogin = async (creds = credentials) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/webmail/connect', creds);
      if (response.data.success) {
        setIsLoggedIn(true);
        localStorage.setItem('webmail_credentials', JSON.stringify(creds));
        setSuccess('Connected successfully!');
        fetchEmails(creds);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed. Please check your username and password.';
      setError(errorMsg.replace('Invalid credentials or connection error', 'Invalid email credentials. Please verify your username and password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setEmails([]);
    setSelectedEmail(null);
    localStorage.removeItem('webmail_credentials');
    setCredentials({ username: '', password: '' });
  };

  const fetchEmails = async (creds = credentials) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/webmail/inbox', { ...creds, limit: 100 });
      if (response.data.success) {
        setEmails(response.data.emails);
        setSuccess('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  };

  const viewEmail = async (uid) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post(`/webmail/email/${uid}`, credentials);
      if (response.data.success) {
        setSelectedEmail(response.data.email);
        setView('view');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!composeData.to || !composeData.subject) {
      setError('To and Subject are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post('/webmail/send', { ...credentials, ...composeData });
      if (response.data.success) {
        setSuccess('Email sent successfully!');
        setComposeData({ to: '', subject: '', text: '' });
        setView('inbox');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const deleteEmail = async (uid) => {
    if (!window.confirm('Are you sure you want to delete this email?')) return;

    setLoading(true);
    try {
      const response = await api.post(`/webmail/delete/${uid}`, credentials);
      if (response.data.success) {
        setSuccess('Email deleted');
        fetchEmails();
        setView('inbox');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete email');
    } finally {
      setLoading(false);
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="webmail-container">
        <div className="webmail-login">
          <div className="login-card">
            <FiMail className="login-icon" />
            <h2>Team Email Login</h2>
            <p>Sign in to access your email</p>

            {error && <div className="message message-error">{error}</div>}

            <div className="login-form">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="e.g., noreply"
                  disabled={loading}
                />
                <small>Enter your email username (without @noxtm.com)</small>
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Your password"
                  disabled={loading}
                />
              </div>

              <button
                onClick={() => handleLogin()}
                disabled={loading || !credentials.username || !credentials.password}
                className="btn-login"
              >
                <FiLogIn /> {loading ? 'Connecting...' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Webmail Interface
  return (
    <div className="webmail-container">
      {/* Header */}
      <div className="webmail-header">
        <h2><FiMail /> Team Email - {credentials.username}@noxtm.com</h2>
        <div className="header-actions">
          <button onClick={() => fetchEmails()} className="btn-refresh" disabled={loading}>
            <FiRefreshCw className={loading ? 'spinning' : ''} /> Refresh
          </button>
          <button onClick={handleLogout} className="btn-logout">
            <FiLogOut /> Logout
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && <div className="message message-error">{error}</div>}
      {success && <div className="message message-success">{success}</div>}

      {/* Navigation */}
      <div className="webmail-nav">
        <button
          className={view === 'inbox' ? 'active' : ''}
          onClick={() => setView('inbox')}
        >
          <FiMail /> Inbox ({emails.length})
        </button>
        <button
          className={view === 'compose' ? 'active' : ''}
          onClick={() => setView('compose')}
        >
          <FiSend /> Compose
        </button>
      </div>

      {/* Content Area */}
      <div className="webmail-content">
        {/* Inbox View */}
        {view === 'inbox' && (
          <div className="inbox-view">
            {loading && <div className="loading-message">Loading emails...</div>}

            {!loading && emails.length === 0 && (
              <div className="empty-inbox">
                <FiMail className="empty-icon" />
                <p>No emails in inbox</p>
              </div>
            )}

            {!loading && emails.length > 0 && (
              <div className="email-list">
                {emails.map((email) => (
                  <div key={email.uid} className="email-item">
                    <div className="email-from">{email.from}</div>
                    <div className="email-subject">{email.subject}</div>
                    <div className="email-date">{new Date(email.date).toLocaleDateString()}</div>
                    <div className="email-actions">
                      <button onClick={() => viewEmail(email.uid)} className="btn-view">
                        <FiEye /> View
                      </button>
                      <button onClick={() => deleteEmail(email.uid)} className="btn-delete">
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Compose View */}
        {view === 'compose' && (
          <div className="compose-view">
            <h3>Compose New Email</h3>

            <div className="compose-form">
              <div className="form-group">
                <label>To:</label>
                <input
                  type="email"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  placeholder="recipient@example.com"
                />
              </div>

              <div className="form-group">
                <label>Subject:</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="Email subject"
                />
              </div>

              <div className="form-group">
                <label>Message:</label>
                <textarea
                  value={composeData.text}
                  onChange={(e) => setComposeData({ ...composeData, text: e.target.value })}
                  placeholder="Type your message here..."
                  rows={10}
                />
              </div>

              <div className="compose-actions">
                <button onClick={sendEmail} disabled={loading} className="btn-send">
                  <FiSend /> {loading ? 'Sending...' : 'Send Email'}
                </button>
                <button onClick={() => setView('inbox')} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email View */}
        {view === 'view' && selectedEmail && (
          <div className="email-view">
            <div className="email-view-header">
              <button onClick={() => setView('inbox')} className="btn-back">
                ← Back to Inbox
              </button>
              <button onClick={() => deleteEmail(selectedEmail.uid)} className="btn-delete">
                <FiTrash2 /> Delete
              </button>
            </div>

            <div className="email-details">
              <div className="email-detail-row">
                <strong>From:</strong> {selectedEmail.from}
              </div>
              <div className="email-detail-row">
                <strong>To:</strong> {selectedEmail.to}
              </div>
              <div className="email-detail-row">
                <strong>Subject:</strong> {selectedEmail.subject}
              </div>
              <div className="email-detail-row">
                <strong>Date:</strong> {new Date(selectedEmail.date).toLocaleString()}
              </div>
            </div>

            <div className="email-body">
              {selectedEmail.html ? (
                <div dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
              ) : (
                <pre>{selectedEmail.text}</pre>
              )}
            </div>

            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div className="email-attachments">
                <h4>Attachments ({selectedEmail.attachments.length})</h4>
                {selectedEmail.attachments.map((att, idx) => (
                  <div key={idx} className="attachment-item">
                    {att.filename} ({Math.round(att.size / 1024)} KB)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamEmail;
