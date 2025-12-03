import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './TeamInbox.css';

const TeamInbox = () => {
  const [teamAccounts, setTeamAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [currentFolder, setCurrentFolder] = useState('INBOX');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [emailsPerPage] = useState(50);

  useEffect(() => {
    fetchTeamAccounts();
  }, []);

  const fetchTeamAccounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/email-accounts/my-team-accounts');
      const accounts = res.data.accounts || [];
      setTeamAccounts(accounts);

      if (accounts.length > 0) {
        selectAccount(accounts[0]);
      }
    } catch (error) {
      console.error('Error fetching team accounts:', error);
      alert('Error loading team accounts: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const selectAccount = async (account) => {
    setSelectedAccount(account);
    setPermissions(account.permissions || {});
    setSelectedEmail(null);
    setShowCompose(false);
    setCurrentFolder('INBOX');
    await fetchEmails(account._id, 1, 'INBOX');
  };

  const fetchEmails = async (accountId, page = 1, folder = currentFolder) => {
    setLoadingEmails(true);
    try {
      const res = await api.get(`/email-accounts/team-inbox/${accountId}`, {
        params: {
          page,
          limit: emailsPerPage,
          folder: folder
        }
      });

      setEmails(res.data.emails || []);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching emails:', error);
      alert('Error loading emails: ' + (error.response?.data?.error || error.message));
      setEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleFolderChange = (folder) => {
    setCurrentFolder(folder);
    setSelectedEmail(null);
    setShowCompose(false);
    if (selectedAccount) {
      fetchEmails(selectedAccount._id, 1, folder);
    }
  };

  const handleEmailClick = (email) => {
    setSelectedEmail(email);
    setShowCompose(false);
  };

  const handleCompose = () => {
    if (!permissions.canSend) {
      alert('You do not have permission to send emails from this account');
      return;
    }
    setShowCompose(true);
    setSelectedEmail(null);
  };

  const handleReply = (email) => {
    if (!permissions.canSend) {
      alert('You do not have permission to send emails from this account');
      return;
    }
    setShowCompose(true);
    setSelectedEmail(email);
  };

  const handleRefresh = () => {
    if (selectedAccount) {
      fetchEmails(selectedAccount._id, currentPage, currentFolder);
    }
  };

  if (loading) {
    return (
      <div className="team-inbox">
        <div className="loading">Loading team accounts...</div>
      </div>
    );
  }

  if (teamAccounts.length === 0) {
    return (
      <div className="team-inbox">
        <div className="no-accounts">
          <h3>No Team Accounts Available</h3>
          <p>You don't have access to any team email accounts yet.</p>
          <p>Contact your company owner to get access to shared inboxes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="team-inbox">
      {/* Account Selector Sidebar */}
      <div className="accounts-sidebar">
        <div className="sidebar-header">
          <h3>Team Accounts</h3>
        </div>

        <div className="accounts-list">
          {teamAccounts.map(account => (
            <div
              key={account._id}
              className={`account-item ${selectedAccount?._id === account._id ? 'active' : ''}`}
              onClick={() => selectAccount(account)}
            >
              <div className="account-info">
                <div className="account-name">{account.displayName || account.email}</div>
                <div className="account-email">{account.email}</div>
                {account.purpose && (
                  <div className="account-purpose">{account.purpose}</div>
                )}
              </div>
              {account.unreadCount > 0 && (
                <div className="unread-badge">{account.unreadCount}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="inbox-main">
        {selectedAccount && (
          <>
            {/* Inbox Header */}
            <div className="inbox-header">
              <div className="header-info">
                <h2>{selectedAccount.displayName || selectedAccount.email}</h2>
                <p className="header-email">{selectedAccount.email}</p>
              </div>

              <div className="header-actions">
                <button
                  className="btn-icon"
                  onClick={handleRefresh}
                  title="Refresh"
                  disabled={loadingEmails}
                >
                  🔄
                </button>
                {permissions.canSend && (
                  <button
                    className="btn-primary"
                    onClick={handleCompose}
                  >
                    ✉️ Compose
                  </button>
                )}
              </div>
            </div>

            {/* Folder Tabs */}
            <div className="folder-tabs">
              <button
                className={`folder-tab ${currentFolder === 'INBOX' ? 'active' : ''}`}
                onClick={() => handleFolderChange('INBOX')}
              >
                📥 Inbox
              </button>
              <button
                className={`folder-tab ${currentFolder === 'Junk' ? 'active' : ''}`}
                onClick={() => handleFolderChange('Junk')}
              >
                🗑️ Spam
              </button>
            </div>

            {/* Permissions Banner */}
            <div className="permissions-banner">
              <span className="permission-item">
                {permissions.canRead ? '✅' : '❌'} Read
              </span>
              <span className="permission-item">
                {permissions.canSend ? '✅' : '❌'} Send
              </span>
              <span className="permission-item">
                {permissions.canDelete ? '✅' : '❌'} Delete
              </span>
              <span className="permission-item">
                {permissions.canManage ? '✅' : '❌'} Manage
              </span>
            </div>

            {/* Content Area */}
            <div className="inbox-content">
              {/* Email List */}
              <div className="emails-list">
                {loadingEmails ? (
                  <div className="loading">Loading emails...</div>
                ) : emails.length === 0 ? (
                  <div className="no-emails">
                    <p>No emails in this inbox</p>
                  </div>
                ) : (
                  <>
                    {emails.map((email, idx) => (
                      <div
                        key={idx}
                        className={`email-item ${selectedEmail === email ? 'active' : ''} ${email.flags?.includes('\\Seen') ? 'read' : 'unread'}`}
                        onClick={() => handleEmailClick(email)}
                      >
                        <div className="email-header-row">
                          <span className="email-from">{email.from?.text || 'Unknown'}</span>
                          <span className="email-date">{formatDate(email.date)}</span>
                        </div>
                        <div className="email-subject">{email.subject || '(No Subject)'}</div>
                        <div className="email-preview">{email.text?.substring(0, 100) || ''}</div>
                      </div>
                    ))}

                    {/* Pagination */}
                    <div className="pagination">
                      <button
                        className="btn-secondary"
                        onClick={() => fetchEmails(selectedAccount._id, currentPage - 1, currentFolder)}
                        disabled={currentPage === 1 || loadingEmails}
                      >
                        ← Previous
                      </button>
                      <span className="page-info">Page {currentPage}</span>
                      <button
                        className="btn-secondary"
                        onClick={() => fetchEmails(selectedAccount._id, currentPage + 1, currentFolder)}
                        disabled={emails.length < emailsPerPage || loadingEmails}
                      >
                        Next →
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Email Viewer / Compose */}
              <div className="email-viewer">
                {showCompose ? (
                  <ComposeEmail
                    account={selectedAccount}
                    replyTo={selectedEmail}
                    onClose={() => setShowCompose(false)}
                    onSent={() => {
                      setShowCompose(false);
                      handleRefresh();
                    }}
                  />
                ) : selectedEmail ? (
                  <EmailDetail
                    email={selectedEmail}
                    canSend={permissions.canSend}
                    canDelete={permissions.canDelete}
                    onReply={handleReply}
                  />
                ) : (
                  <div className="no-selection">
                    <p>Select an email to view</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Email Detail Component
const EmailDetail = ({ email, canSend, canDelete, onReply }) => {
  return (
    <div className="email-detail">
      <div className="detail-header">
        <h3>{email.subject || '(No Subject)'}</h3>
        <div className="detail-actions">
          {canSend && (
            <button className="btn-secondary" onClick={() => onReply(email)}>
              ↩️ Reply
            </button>
          )}
          {canDelete && (
            <button className="btn-danger" onClick={() => alert('Delete functionality coming soon')}>
              🗑️ Delete
            </button>
          )}
        </div>
      </div>

      <div className="detail-meta">
        <div className="meta-row">
          <strong>From:</strong> {email.from?.text || 'Unknown'}
        </div>
        {email.to && (
          <div className="meta-row">
            <strong>To:</strong> {email.to.text}
          </div>
        )}
        {email.cc && (
          <div className="meta-row">
            <strong>CC:</strong> {email.cc.text}
          </div>
        )}
        <div className="meta-row">
          <strong>Date:</strong> {formatDate(email.date)}
        </div>
      </div>

      <div className="detail-body">
        {email.html ? (
          <iframe
            srcDoc={email.html}
            title="Email content"
            sandbox="allow-same-origin"
            className="email-html-frame"
          />
        ) : (
          <pre className="email-text">{email.text || '(No content)'}</pre>
        )}
      </div>

      {email.attachments && email.attachments.length > 0 && (
        <div className="detail-attachments">
          <h4>Attachments ({email.attachments.length})</h4>
          {email.attachments.map((att, idx) => (
            <div key={idx} className="attachment-item">
              📎 {att.filename} ({formatBytes(att.size)})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Compose Email Component
const ComposeEmail = ({ account, replyTo, onClose, onSent }) => {
  const [formData, setFormData] = useState({
    to: replyTo ? (replyTo.from?.text || '') : '',
    cc: '',
    bcc: '',
    subject: replyTo ? `Re: ${replyTo.subject}` : '',
    body: ''
  });
  const [sending, setSending] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.to || !formData.subject) {
      alert('Recipient and subject are required');
      return;
    }

    setSending(true);

    try {
      await api.post(`/email-accounts/team-send/${account._id}`, {
        to: formData.to,
        cc: formData.cc || undefined,
        bcc: formData.bcc || undefined,
        subject: formData.subject,
        body: formData.body
      });

      alert('✅ Email sent successfully!');
      onSent();

    } catch (error) {
      console.error('Error sending email:', error);
      alert('❌ Error sending email: ' + (error.response?.data?.error || error.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="compose-email">
      <div className="compose-header">
        <h3>{replyTo ? 'Reply' : 'New Email'}</h3>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="compose-fields">
          <div className="field-row">
            <label>From:</label>
            <input
              type="text"
              value={account.email}
              disabled
              className="from-field"
            />
          </div>

          <div className="field-row">
            <label>To: *</label>
            <input
              type="text"
              name="to"
              value={formData.to}
              onChange={handleChange}
              placeholder="recipient@example.com"
              required
            />
          </div>

          <div className="field-row">
            <label>CC:</label>
            <input
              type="text"
              name="cc"
              value={formData.cc}
              onChange={handleChange}
              placeholder="cc@example.com"
            />
          </div>

          <div className="field-row">
            <label>BCC:</label>
            <input
              type="text"
              name="bcc"
              value={formData.bcc}
              onChange={handleChange}
              placeholder="bcc@example.com"
            />
          </div>

          <div className="field-row">
            <label>Subject: *</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Email subject"
              required
            />
          </div>

          <div className="field-row">
            <label>Message:</label>
            <textarea
              name="body"
              value={formData.body}
              onChange={handleChange}
              rows="12"
              placeholder="Write your message here..."
            />
          </div>
        </div>

        <div className="compose-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={sending}>
            {sending ? 'Sending...' : '📤 Send Email'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Utility Functions
const formatDate = (date) => {
  if (!date) return '';

  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const hours = diff / (1000 * 60 * 60);

  if (hours < 24) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (hours < 48) {
    return 'Yesterday';
  } else if (hours < 168) {
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export default TeamInbox;
