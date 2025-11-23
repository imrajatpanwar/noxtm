import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiChevronDown, FiSearch, FiX, FiMinus, FiMaximize2, FiSend, FiPaperclip, FiUserPlus } from 'react-icons/fi';
import api from '../config/api';
import CreateEmailModal from './CreateEmailModal';
import ProfileSettings from './mailbox/ProfileSettings';
import './MainstreamInbox.css';

function MainstreamInbox() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('mainstream'); // 'mainstream' | 'team' | 'settings'
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [createEmailModalOpen, setCreateEmailModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [avatarUploadState, setAvatarUploadState] = useState({ uploading: false, error: null, success: null });
  const emailsPerPage = 5;

  // Fetch hosted email accounts
  useEffect(() => {
    fetchHostedAccounts();
  }, []);

  // Fetch emails when account or tab changes
  useEffect(() => {
    if (selectedAccount && activeTab !== 'settings') {
      fetchEmails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, activeTab, currentPage]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/profile');
        setCurrentUser(response.data);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, []);

  const fetchHostedAccounts = async () => {
    try {
      const response = await api.get('/email-accounts', {
        params: {
          limit: 1000 // Fetch all accounts
        }
      });
      const allAccounts = response.data.data || response.data || [];
      const hostedAccounts = allAccounts.filter(account => {
        if (account.accountType !== 'noxtm-hosted') {
          return false;
        }
        return Boolean(account.imapSettings && account.imapSettings.encryptedPassword);
      });
      console.log('Hosted accounts found:', hostedAccounts.length, hostedAccounts);
      setAccounts(hostedAccounts);
      if (hostedAccounts.length > 0) {
        setSelectedAccount(hostedAccounts[0]);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchEmails = async () => {
    if (!selectedAccount || activeTab === 'settings') {
      console.log('No account selected');
      return;
    }

    console.log('Fetching emails for:', selectedAccount.email, 'Page:', currentPage);
    setLoading(true);
    setError(null);
    try {
      const folder = activeTab === 'mainstream' ? 'INBOX' : 'INBOX';
      const response = await api.get('/email-accounts/fetch-inbox', {
        params: {
          accountId: selectedAccount._id,
          folder: folder,
          page: currentPage,
          limit: emailsPerPage
        }
      });

      console.log('Response received:', response.data);

      let fetchedEmails = response.data.emails || [];
      const total = response.data.total || 0;

      console.log(`Fetched ${fetchedEmails.length} emails out of ${total} total`);

      // Filter out emails sent by the current user (self-sent emails in Inbox)
      if (activeTab === 'mainstream') {
        const originalLength = fetchedEmails.length;
        fetchedEmails = fetchedEmails.filter(email => {
          const fromAddress = email.from?.address || '';
          return fromAddress.toLowerCase() !== selectedAccount.email.toLowerCase();
        });
        console.log(`Filtered ${originalLength - fetchedEmails.length} self-sent emails`);
      }

      setEmails(fetchedEmails);
      setTotalEmails(total);
      
      console.log('Set emails state with', fetchedEmails.length, 'emails');
    } catch (error) {
      console.error('Error fetching emails:', error);
      console.error('Error response:', error.response?.data);

      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;

      if (status === 404) {
        // Account was deleted or recreated on the server. Refresh list so we pick the new ID.
        setError('Email account was refreshed. Reloading account list...');
        await fetchHostedAccounts();
      } else if (status === 500 && serverMessage?.toLowerCase().includes('decrypt')) {
        setError('Stored mailbox credentials are invalid. Please recreate this email account.');
      } else {
        setError(serverMessage || 'Failed to load emails. Please try again.');
      }

      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = async (email) => {
    setSelectedEmail(email);
    
    // Fetch full email body only when clicked (if not already loaded)
    if (!email.bodyLoaded && email.uid) {
      try {
        setLoading(true);
        const response = await api.get('/email-accounts/fetch-email-body', {
          params: {
            accountId: selectedAccount._id,
            uid: email.uid
          }
        });
        
        // Update the email with full body data
        const fullEmail = {
          ...email,
          ...response.data.email,
          bodyLoaded: true
        };
        
        setSelectedEmail(fullEmail);
        
        // Update the email in the list as well
        setEmails(prevEmails => 
          prevEmails.map(e => e.uid === email.uid ? fullEmail : e)
        );
      } catch (error) {
        console.error('Error fetching email body:', error);
        setError('Failed to load email content');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCompose = () => {
    setComposeOpen(true);
    setComposeMinimized(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  };

  const handleSendEmail = async () => {
    if (!selectedAccount || !composeTo || !composeSubject) {
      alert('Please fill in recipient and subject');
      return;
    }

    try {
      await api.post('/email-accounts/send-email', {
        accountId: selectedAccount._id,
        to: composeTo,
        subject: composeSubject,
        body: composeBody
      });

      alert('Email sent successfully!');
      setComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAvatarUpload = async (file) => {
    try {
      setAvatarUploadState({ uploading: true, error: null, success: null });
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { imageUrl, user } = response.data || {};
      if (user) {
        setCurrentUser(user);
      } else if (imageUrl) {
        setCurrentUser(prev => (prev ? { ...prev, emailAvatar: imageUrl } : prev));
      }

      setAvatarUploadState({ uploading: false, error: null, success: 'Avatar updated successfully!' });
    } catch (uploadError) {
      console.error('Avatar upload failed:', uploadError);
      const message = uploadError.response?.data?.message || 'Failed to upload avatar';
      setAvatarUploadState({ uploading: false, error: message, success: null });
    }
  };

  useEffect(() => {
    if (avatarUploadState.success || avatarUploadState.error) {
      const timer = setTimeout(() => {
        setAvatarUploadState(prev => ({ ...prev, error: null, success: null }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [avatarUploadState.success, avatarUploadState.error]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'settings') {
      setSelectedEmail(null);
    }
  };

  const getEmailPreview = (email) => {
    // Use preview from backend if available
    if (email.preview) return email.preview;
    
    // Fallback to text/html if body was loaded
    const body = email.text || email.html || '';
    if (!body) return 'No preview available';
    
    const text = body.replace(/<[^>]*>/g, ''); // Strip HTML tags
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const today = new Date();

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleCreateEmailSuccess = (data) => {
    console.log('Email account created successfully:', data);
    // Refresh the accounts list
    fetchHostedAccounts();
    // Show success message
    alert(`Email account ${data.email} created successfully!`);
  };

  return (
    <div className="mainstream-inbox">
      {/* Header */}
      <div className="inbox-header">
        <div className="inbox-title-section">
          <h2>Mail Inbox</h2>
          <button className="refresh-btn" onClick={fetchEmails} disabled={loading}>
            <FiRefreshCw className={loading ? 'spinning' : ''} />
          </button>
        </div>

        <div className="inbox-actions">
          <button className="create-account-btn" onClick={() => setCreateEmailModalOpen(true)}>
            <FiUserPlus /> Create Email Account
          </button>
          <button className="compose-btn" onClick={handleCompose}>
            + Compose E-mail
          </button>
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="account-dropdown">
            <select
              value={selectedAccount?._id || ''}
              onChange={(e) => {
                const account = accounts.find(a => a._id === e.target.value);
                setSelectedAccount(account);
                setSelectedEmail(null);
              }}
            >
              {accounts.length === 0 && (
                <option value="">No accounts available</option>
              )}
              {accounts.map(account => (
                <option key={account._id} value={account._id}>
                  {account.email}
                </option>
              ))}
            </select>
            <FiChevronDown className="dropdown-icon" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="inbox-tabs">
        <button
          className={`tab ${activeTab === 'mainstream' ? 'active' : ''}`}
          onClick={() => handleTabChange('mainstream')}
        >
          Mainstream
        </button>
        <button
          className={`tab ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => handleTabChange('team')}
        >
          Team
        </button>
        <button
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleTabChange('settings')}
        >
          Settings
        </button>
        {activeTab !== 'settings' && (
          <div className="tab-pagination">
            {totalEmails > 0 && (
              <>
                {((currentPage - 1) * emailsPerPage) + 1} - {Math.min(currentPage * emailsPerPage, totalEmails)} of {totalEmails}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  ‹
                </button>
                <button
                  disabled={currentPage * emailsPerPage >= totalEmails}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  ›
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="inbox-content">
        {/* Email List */}
        <div className="email-list">
          {activeTab === 'settings' ? (
            <div className="settings-placeholder">
              <h4>Mailbox settings</h4>
              <p>Select a hosted mailbox on the right to update its display avatar and review connection details.</p>
            </div>
          ) : loading && emails.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading emails...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={fetchEmails} className="retry-btn">Retry</button>
            </div>
          ) : !selectedAccount ? (
            <div className="empty-state">
              <p>No email account selected</p>
            </div>
          ) : emails.length === 0 ? (
            <div className="empty-state">
              <p>No emails found in {activeTab === 'mainstream' ? 'Mainstream' : 'Team'}</p>
              <small>Try refreshing or selecting a different account</small>
            </div>
          ) : (
            emails.map((email, index) => (
              <div
                key={index}
                className={`email-item ${selectedEmail === email ? 'selected' : ''} ${email.seen ? '' : 'unread'}`}
                onClick={() => handleEmailClick(email)}
              >
                <div className="email-avatar">
                  {getInitials(email.from?.name || email.from?.address)}
                </div>
                <div className="email-info">
                  <div className="email-header-row">
                    <span className="email-sender">{email.from?.name || email.from?.address}</span>
                    <span className="email-time">{formatDate(email.date)}</span>
                  </div>
                  <div className="email-subject">
                    {email.subject || '(No Subject)'}
                    {email.hasAttachments && <span className="attachment-icon"> 📎</span>}
                  </div>
                  <div className="email-preview">{getEmailPreview(email)}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Email Detail View */}
        <div className="email-detail">
          {activeTab === 'settings' ? (
            profileLoading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading settings...</p>
              </div>
            ) : (
              <ProfileSettings
                account={selectedAccount}
                user={currentUser}
                onAvatarUpload={handleAvatarUpload}
                uploading={avatarUploadState.uploading}
                uploadError={avatarUploadState.error}
                uploadSuccess={avatarUploadState.success}
              />
            )
          ) : selectedEmail ? (
            <>
              <div className="detail-header">
                <h3>{selectedEmail.subject || '(No Subject)'}</h3>
                <div className="detail-actions">
                  <button>Reply</button>
                  <button>Forward</button>
                  <button>Delete</button>
                </div>
              </div>
              <div className="detail-meta">
                <div className="sender-info">
                  <div className="email-avatar large">
                    {getInitials(selectedEmail.from?.name || selectedEmail.from?.address)}
                  </div>
                  <div>
                    <div className="sender-name">{selectedEmail.from?.name || selectedEmail.from?.address}</div>
                    <div className="sender-email">&lt;{selectedEmail.from?.address}&gt;</div>
                    <div className="recipient-info">to {selectedEmail.to?.[0]?.address}</div>
                  </div>
                </div>
                <div className="email-date">{new Date(selectedEmail.date).toLocaleString()}</div>
              </div>
              <div className="detail-body">
                {selectedEmail.html ? (
                  <iframe
                    srcDoc={selectedEmail.html}
                    title="Email Content"
                    sandbox="allow-same-origin"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                ) : (
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                    {selectedEmail.text}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select an email to view</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Popup */}
      {composeOpen && (
        <div className={`compose-popup ${composeMinimized ? 'minimized' : ''}`}>
          <div className="compose-header">
            <span>New Message</span>
            <div className="compose-controls">
              <button onClick={() => setComposeMinimized(!composeMinimized)}>
                {composeMinimized ? <FiMaximize2 size={14} /> : <FiMinus size={14} />}
              </button>
              <button onClick={() => setComposeOpen(false)}>
                <FiX size={16} />
              </button>
            </div>
          </div>
          {!composeMinimized && (
            <div className="compose-body">
              <div className="compose-field">
                <label>To:</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="compose-field">
                <label>Subject:</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                />
              </div>
              <div className="compose-field full">
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Compose your message..."
                  rows="10"
                />
              </div>
              <div className="compose-footer">
                <button className="send-btn" onClick={handleSendEmail}>
                  <FiSend /> Send
                </button>
                <button className="attach-btn">
                  <FiPaperclip /> Attach
                </button>
                <span className="from-info">From: {selectedAccount?.email}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Email Account Modal */}
      <CreateEmailModal
        isOpen={createEmailModalOpen}
        onClose={() => setCreateEmailModalOpen(false)}
        onSuccess={handleCreateEmailSuccess}
      />
    </div>
  );
}

export default MainstreamInbox;
