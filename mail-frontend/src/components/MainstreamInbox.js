import React, { useState, useEffect } from 'react';
import {
  MdInbox, MdRefresh, MdMoreVert, MdStar, MdStarBorder,
  MdArchive, MdDelete, MdEdit, MdSearch, MdSettings,
  MdChevronLeft, MdChevronRight, MdLocalOffer, MdPeople,
  MdInfo, MdSend, MdAttachFile, MdClose, MdMinimize,
  MdMaximize, MdPersonAdd, MdDownload
} from 'react-icons/md';
import api from '../config/api';
import CreateEmailModal from './CreateEmailModal';
import EmailConnectionForm from './EmailConnectionForm';
import ProfileSettings from './mailbox/ProfileSettings';
import Checkbox from './ui/Checkbox';
import IconButton from './ui/IconButton';
import Tab from './ui/Tab';
import './MainstreamInbox.css';

function MainstreamInbox({ user, onNavigateToDomains }) {  // Receive user and navigation callback as props from parent (Inbox)
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('primary'); // 'primary' | 'promotions' | 'social' | 'updates' | 'sent' | 'settings'
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
  const [currentUser, setCurrentUser] = useState(user);  // Initialize with prop
  const [profileLoading, setProfileLoading] = useState(!user);  // Not loading if user prop exists
  const [avatarUploadState, setAvatarUploadState] = useState({ uploading: false, error: null, success: null });
  const emailsPerPage = 5;

  // Gmail-style checkbox selection
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [starredEmails, setStarredEmails] = useState(new Set());

  // Fetch hosted email accounts - only after user is ready
  useEffect(() => {
    if (user) {
      // Small delay to ensure token is stable and auth loading flag is cleared
      console.log('[MAINSTREAM_INBOX] User ready, fetching accounts in 200ms...');
      const timer = setTimeout(() => {
        fetchHostedAccounts();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Fetch emails when account or tab changes
  useEffect(() => {
    if (selectedAccount && activeTab !== 'settings') {
      fetchEmails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, activeTab, currentPage]);

  // Update currentUser when prop changes
  useEffect(() => {
    if (user) {
      console.log('[MAINSTREAM_INBOX] Received user from parent:', user.email);
      setCurrentUser(user);
      setProfileLoading(false);
    }
  }, [user]);

  const fetchHostedAccounts = async () => {
    try {
      // Fetch both owned accounts and connected accounts
      const [ownedResponse, connectedResponse] = await Promise.all([
        api.get('/email-accounts/by-verified-domain'),
        api.get('/email-accounts/connected')
      ]);

      const ownedAccounts = ownedResponse.data?.accounts || [];
      const connectedAccounts = connectedResponse.data?.accounts || [];
      const verifiedDomains = ownedResponse.data?.verifiedDomains || [];

      console.log('[MainstreamInbox] User verified domains:', verifiedDomains);
      console.log('[MainstreamInbox] Owned accounts:', ownedAccounts.length);
      console.log('[MainstreamInbox] Connected accounts:', connectedAccounts.length);

      // Merge both lists, avoiding duplicates
      const accountMap = new Map();

      [...ownedAccounts, ...connectedAccounts].forEach(account => {
        if (account.accountType === 'noxtm-hosted' &&
            account.imapSettings &&
            account.imapSettings.encryptedPassword) {
          accountMap.set(account._id, account);
        }
      });

      const allAccounts = Array.from(accountMap.values());
      console.log('[MainstreamInbox] Total available accounts:', allAccounts.length);

      setAccounts(allAccounts);

      // Check if user just created a new account (Phase 3A: Auto-switch)
      const lastCreatedDomain = localStorage.getItem('lastCreatedDomain');

      if (lastCreatedDomain && allAccounts.length > 0) {
        // Try to find account on the newly created domain
        const newAccount = allAccounts.find(acc =>
          acc.domain?.toLowerCase() === lastCreatedDomain.toLowerCase()
        );

        if (newAccount) {
          console.log('[MainstreamInbox] Auto-switching to newly created account:', newAccount.email);
          setSelectedAccount(newAccount);
          localStorage.removeItem('lastCreatedDomain'); // Clear flag
        } else {
          // Fallback to first account
          setSelectedAccount(allAccounts[0]);
        }
      } else if (allAccounts.length > 0) {
        // No auto-switch, select first account (already sorted by verified domain priority)
        setSelectedAccount(allAccounts[0]);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
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
      // Map Gmail tabs to folders (all tabs currently use INBOX, can be extended later)
      const folder = activeTab === 'sent' ? 'Sent' : 'INBOX';

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
      if (activeTab !== 'sent') {
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
    // Gmail-style: Open email in full view by setting it as selected
    // Fetch full email body only when clicked (if not already loaded)
    if (!email.bodyLoaded && email.uid) {
      try {
        setLoading(true);
        const folder = activeTab === 'sent' ? 'Sent' : 'INBOX';
        const response = await api.get('/email-accounts/fetch-email-body', {
          params: {
            accountId: selectedAccount._id,
            uid: email.uid,
            folder: folder
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
    } else {
      setSelectedEmail(email);
    }
  };

  const handleBackToList = () => {
    setSelectedEmail(null);
  };

  const handleDownloadAttachment = async (attachment, index) => {
    try {
      const folder = activeTab === 'sent' ? 'Sent' : 'INBOX';
      const response = await api.get('/email-accounts/download-attachment', {
        params: {
          accountId: selectedAccount._id,
          uid: selectedEmail.uid,
          folder: folder,
          index: index
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download attachment');
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
    // Clear selections when switching tabs
    setSelectedEmails(new Set());
    setSelectAll(false);
  };

  // Checkbox selection handlers
  const handleCheckboxClick = (emailUid) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailUid)) {
      newSelected.delete(emailUid);
    } else {
      newSelected.add(emailUid);
    }
    setSelectedEmails(newSelected);
    setSelectAll(newSelected.size === emails.length && emails.length > 0);
  };

  const handleSelectAllChange = (checked) => {
    if (checked) {
      setSelectedEmails(new Set(emails.map(e => e.uid)));
      setSelectAll(true);
    } else {
      setSelectedEmails(new Set());
      setSelectAll(false);
    }
  };

  const handleSelectOption = (option) => {
    if (option === 'all') {
      setSelectedEmails(new Set(emails.map(e => e.uid)));
      setSelectAll(true);
    } else if (option === 'none') {
      setSelectedEmails(new Set());
      setSelectAll(false);
    } else if (option === 'read') {
      setSelectedEmails(new Set(emails.filter(e => e.seen).map(e => e.uid)));
      setSelectAll(false);
    } else if (option === 'unread') {
      setSelectedEmails(new Set(emails.filter(e => !e.seen).map(e => e.uid)));
      setSelectAll(false);
    } else if (option === 'starred') {
      setSelectedEmails(new Set(emails.filter(e => starredEmails.has(e.uid)).map(e => e.uid)));
      setSelectAll(false);
    }
  };

  const handleStarToggle = (emailUid) => {
    const newStarred = new Set(starredEmails);
    if (newStarred.has(emailUid)) {
      newStarred.delete(emailUid);
    } else {
      newStarred.add(emailUid);
    }
    setStarredEmails(newStarred);
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) {
      alert('No emails selected');
      return;
    }

    if (!window.confirm(`Delete ${selectedEmails.size} selected email(s)?`)) {
      return;
    }

    try {
      // Delete emails one by one
      const deletePromises = Array.from(selectedEmails).map(uid =>
        api.delete(`/email-accounts/hosted/${selectedAccount._id}/emails/${uid}`)
      );

      await Promise.all(deletePromises);

      alert(`${selectedEmails.size} email(s) deleted successfully`);
      setSelectedEmails(new Set());
      setSelectAll(false);
      await fetchEmails();
    } catch (error) {
      console.error('Error deleting emails:', error);
      alert('Failed to delete emails: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedEmails.size === 0) {
      alert('No emails selected');
      return;
    }
    alert(`Archive functionality for ${selectedEmails.size} email(s) - to be implemented`);
  };

  const handleBulkMarkRead = async () => {
    if (selectedEmails.size === 0) {
      alert('No emails selected');
      return;
    }
    alert(`Mark as read functionality for ${selectedEmails.size} email(s) - to be implemented`);
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
    <div className="mail-mainstream-inbox mail-gmail-style">
      {/* Gmail-style Header */}
      <div className="mail-gmail-header">
        <div className="mail-gmail-header-left">
          <h2 className="mail-gmail-logo">Mail</h2>
          <div className="mail-gmail-search-box">
            <MdSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search mail"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mail-gmail-header-right">
          <button className="mail-create-account-btn-header" onClick={() => setCreateEmailModalOpen(true)}>
            <MdPersonAdd /> Create Email
          </button>
          <div className="mail-account-dropdown-gmail">
            <select
              value={selectedAccount?._id || ''}
              onChange={(e) => {
                const account = accounts.find(a => a._id === e.target.value);
                setSelectedAccount(account);
                setSelectedEmail(null);
                setSelectedEmails(new Set());
              }}
            >
              {accounts.length === 0 && (
                <option value="">No accounts</option>
              )}
              {accounts.map(account => (
                <option key={account._id} value={account._id}>
                  {account.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Gmail-style Tabs */}
      <div className="mail-gmail-tabs">
        <Tab
          icon={MdInbox}
          label="Primary"
          active={activeTab === 'primary'}
          onClick={() => handleTabChange('primary')}
          count={activeTab === 'primary' ? totalEmails : 0}
        />
        <Tab
          label="Sent"
          active={activeTab === 'sent'}
          onClick={() => handleTabChange('sent')}
        />
        <Tab
          icon={MdSettings}
          label="Settings"
          active={activeTab === 'settings'}
          onClick={() => handleTabChange('settings')}
        />
      </div>

      {/* Gmail-style Toolbar */}
      {activeTab !== 'settings' && (
        <div className="mail-gmail-toolbar">
          <div className="mail-toolbar-left">
            <Checkbox
              checked={selectAll}
              indeterminate={selectedEmails.size > 0 && selectedEmails.size < emails.length}
              onChange={handleSelectAllChange}
            />
            <select
              className="mail-gmail-select-dropdown"
              value=""
              onChange={(e) => handleSelectOption(e.target.value)}
            >
              <option value="" disabled>Select...</option>
              <option value="all">All</option>
              <option value="none">None</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
              <option value="starred">Starred</option>
            </select>
            <IconButton icon={MdRefresh} onClick={fetchEmails} title="Refresh" />
            <IconButton icon={MdMoreVert} title="More options" />
            {selectedEmails.size > 0 && (
              <>
                <div className="mail-toolbar-divider"></div>
                <IconButton icon={MdArchive} onClick={handleBulkArchive} title="Archive" />
                <IconButton icon={MdDelete} onClick={handleBulkDelete} title="Delete" />
              </>
            )}
          </div>

          <div className="mail-toolbar-right">
            {totalEmails > 0 && (
              <>
                <span className="email-count">
                  {((currentPage - 1) * emailsPerPage) + 1}-{Math.min(currentPage * emailsPerPage, totalEmails)} of {totalEmails}
                </span>
                <IconButton
                  icon={MdChevronLeft}
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                  title="Newer"
                />
                <IconButton
                  icon={MdChevronRight}
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage * emailsPerPage >= totalEmails}
                  title="Older"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Content - Gmail Full Width Style */}
      <div className="mail-inbox-content-fullwidth">
        {/* Show Email Detail in Full Width when email is selected */}
        {selectedEmail && activeTab !== 'settings' ? (
          <div className="mail-email-detail-fullwidth">
            <div className="mail-detail-header-gmail">
              <IconButton icon={MdChevronLeft} onClick={handleBackToList} title="Back to list" />
              <h3>{selectedEmail.subject || '(No Subject)'}</h3>
              <div className="mail-detail-actions-gmail">
                <IconButton icon={MdArchive} title="Archive" />
                <IconButton icon={MdDelete} title="Delete" />
                <IconButton icon={MdMoreVert} title="More" />
              </div>
            </div>
            <div className="mail-detail-meta-gmail">
              <div className="mail-sender-info-gmail">
                <div className="mail-email-avatar-gmail large">
                  {getInitials(selectedEmail.from?.name || selectedEmail.from?.address)}
                </div>
                <div>
                  <div className="mail-sender-name-gmail">
                    {selectedEmail.from?.name || selectedEmail.from?.address?.split('@')[0]}
                  </div>
                  <div className="mail-sender-email-gmail">{selectedEmail.from?.address}</div>
                  <div className="mail-recipient-info-gmail">to {selectedEmail.to?.[0]?.address}</div>
                </div>
              </div>
              <div className="mail-email-date-gmail">{new Date(selectedEmail.date).toLocaleString()}</div>
            </div>
            <div className="mail-detail-body-gmail">
              {selectedEmail.html ? (
                <iframe
                  srcDoc={selectedEmail.html}
                  title="Email Content"
                  sandbox="allow-same-origin"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Roboto, Arial, sans-serif', color: '#202124' }}>
                  {selectedEmail.text}
                </pre>
              )}
            </div>

            {/* Attachments Section */}
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div className="mail-attachments-section" style={{ padding: '16px 24px', borderTop: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: '#5f6368' }}>
                  {selectedEmail.attachments.length} Attachment{selectedEmail.attachments.length > 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {selectedEmail.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="attachment-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        border: '1px solid #dadce0',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                        minWidth: '250px',
                        gap: '12px',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e8f0fe';
                        e.currentTarget.style.borderColor = '#1a73e8';
                        e.currentTarget.querySelector('.download-btn').style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#dadce0';
                        e.currentTarget.querySelector('.download-btn').style.opacity = '0';
                      }}
                      onClick={() => handleDownloadAttachment(attachment, index)}
                    >
                      <MdAttachFile style={{ fontSize: '24px', color: '#5f6368' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#202124',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {attachment.filename}
                        </div>
                        <div style={{ fontSize: '12px', color: '#5f6368' }}>
                          {attachment.contentType} • {(attachment.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <div
                        className="download-btn"
                        style={{
                          opacity: '0',
                          transition: 'opacity 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#1a73e8',
                          color: 'white'
                        }}
                      >
                        <MdDownload style={{ fontSize: '20px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Email List in Full Width */
          <div className="mail-email-list-fullwidth">
          {activeTab === 'settings' ? (
            <ProfileSettings
              account={selectedAccount}
              user={currentUser}
              onAvatarUpload={handleAvatarUpload}
              uploading={avatarUploadState.uploading}
              uploadError={avatarUploadState.error}
              uploadSuccess={avatarUploadState.success}
            />
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
              {accounts.length === 0 ? (
                // Check if user is a workspace member
                currentUser?.companyId ? (
                  <div className="empty-state-connect">
                    <EmailConnectionForm
                      onSuccess={(account) => {
                        // Refresh accounts list
                        fetchHostedAccounts();
                        // Auto-select the newly connected account
                        setSelectedAccount(account);
                      }}
                      onCancel={null}
                    />
                  </div>
                ) : (
                  <div className="empty-state-create">
                    <h3>No Email Accounts Found</h3>
                    <p>You don't have any email accounts yet on your verified domain.</p>
                    <p>Create an email account to start sending and receiving emails.</p>
                    <button
                      onClick={() => onNavigateToDomains && onNavigateToDomains()}
                      className="btn-create-email"
                      style={{
                        marginTop: '15px',
                        padding: '10px 20px',
                        backgroundColor: '#1a73e8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Go to Domain Management
                    </button>
                  </div>
                )
              ) : (
                <p>No email account selected</p>
              )}
            </div>
          ) : emails.length === 0 ? (
            <div className="empty-state">
              <p>No emails found in {activeTab === 'sent' ? 'Sent' : 'Inbox'}</p>
              <small>Try refreshing or selecting a different account</small>
            </div>
          ) : (
            emails.map((email, index) => (
              <div
                key={email.uid || index}
                className={`gmail-email-item ${selectedEmail === email ? 'selected' : ''} ${email.seen ? '' : 'unread'} ${selectedEmails.has(email.uid) ? 'checked' : ''}`}
                onClick={() => handleEmailClick(email)}
              >
                <div className="email-checkbox">
                  <Checkbox
                    checked={selectedEmails.has(email.uid)}
                    onChange={() => handleCheckboxClick(email.uid)}
                  />
                </div>

                <div className="email-star">
                  <IconButton
                    icon={starredEmails.has(email.uid) ? MdStar : MdStarBorder}
                    onClick={() => handleStarToggle(email.uid)}
                    className={starredEmails.has(email.uid) ? 'starred' : ''}
                  />
                </div>

                <div className="mail-email-sender-gmail">
                  {activeTab === 'sent'
                    ? (typeof email.to?.[0] === 'string' ? email.to[0] : (email.to?.[0]?.name || email.to?.[0]?.address || 'Unknown'))
                    : (email.from?.name || email.from?.address?.split('@')[0] || 'Unknown')}
                </div>

                <div className="mail-email-content-gmail">
                  <span className="mail-email-subject-gmail">
                    {email.subject || '(No Subject)'}
                  </span>
                  <span className="mail-email-preview-gmail">
                    {' - ' + getEmailPreview(email)}
                  </span>
                </div>

                <div className="mail-email-timestamp-gmail">
                  {formatDate(email.date)}
                  {email.hasAttachments && <MdAttachFile className="attachment-icon-gmail" />}
                </div>
              </div>
            ))
          )}
          </div>
        )}
      </div>

      {/* Gmail-style Compose Button */}
      <button className="mail-compose-btn-gmail" onClick={handleCompose}>
        <MdEdit size={24} />
        Compose
      </button>

      {/* Compose Popup */}
      {composeOpen && (
        <div className={`compose-popup ${composeMinimized ? 'minimized' : ''}`}>
          <div className="compose-header">
            <span>New Message</span>
            <div className="compose-controls">
              <button onClick={() => setComposeMinimized(!composeMinimized)}>
                {composeMinimized ? <MdMaximize size={18} /> : <MdMinimize size={18} />}
              </button>
              <button onClick={() => setComposeOpen(false)}>
                <MdClose size={20} />
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
                <button className="send-btn-gmail" onClick={handleSendEmail}>
                  <MdSend /> Send
                </button>
                <button className="attach-btn-gmail">
                  <MdAttachFile /> Attach
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
