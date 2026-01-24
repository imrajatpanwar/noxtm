import React, { useState, useEffect } from 'react';
import {
  MdInbox, MdRefresh, MdMoreVert, MdStar, MdStarBorder,
  MdArchive, MdDelete, MdEdit, MdSearch, MdSettings,
  MdChevronLeft, MdChevronRight, MdInfo,
  MdSend, MdAttachFile, MdClose, MdMinimize,
  MdMaximize, MdPersonAdd, MdDownload, MdArrowDropDown
} from 'react-icons/md';
import api from '../config/api';
import { getMainAppUrl } from '../config/authConfig';
import CreateEmailModal from './CreateEmailModal';
import EmailConnectionForm from './EmailConnectionForm';
import ProfileSettings from './mailbox/ProfileSettings';
import Checkbox from './ui/Checkbox';
import IconButton from './ui/IconButton';
import Tab from './ui/Tab';
import './MainstreamInbox.css';

function MainstreamInbox({ user, onNavigateToDomains, onLogout }) {  // Receive user and navigation callback as props from parent (Inbox)
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('primary'); // 'primary' | 'promotions' | 'social' | 'updates' | 'sent' | 'settings'
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true); // NEW: Track initial account fetch
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
  const [loginMailModalOpen, setLoginMailModalOpen] = useState(false); // NEW: Control Login Mail modal
  const [currentUser, setCurrentUser] = useState(user);  // Initialize with prop
  const [avatarUploadState, setAvatarUploadState] = useState({ uploading: false, error: null, success: null });
  const emailsPerPage = 14;

  // Gmail-style checkbox selection
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [starredEmails, setStarredEmails] = useState(new Set());
  const [selectDropdownOpen, setSelectDropdownOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

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
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountDropdownOpen && !event.target.closest('.mail-account-dropdown-gmail')) {
        setAccountDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountDropdownOpen]);

  const fetchHostedAccounts = async () => {
    console.log('[MAINSTREAM_INBOX] Starting account fetch...');
    setAccountsLoading(true); // Set loading state
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
    } finally {
      console.log('[MAINSTREAM_INBOX] Account fetch complete');
      setAccountsLoading(false); // Clear loading state
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

        // Update the email with full body data and mark as seen
        const fullEmail = {
          ...email,
          ...response.data.email,
          bodyLoaded: true,
          seen: true  // Mark as read when opened
        };

        setSelectedEmail(fullEmail);

        // Update the email in the list as well
        setEmails(prevEmails =>
          prevEmails.map(e => e.uid === email.uid ? fullEmail : e)
        );

        // Mark email as read on server (fire and forget)
        try {
          await api.post('/email-accounts/mark-as-read', {
            accountId: selectedAccount._id,
            uid: email.uid,
            folder: folder
          });
        } catch (markReadError) {
          console.error('Failed to mark email as read on server:', markReadError);
          // Don't show error to user - email is already marked as read in UI
        }
      } catch (error) {
        console.error('Error fetching email body:', error);
        setError('Failed to load email content');
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedEmail(email);
      // If email was unread, mark it as read
      if (!email.seen && email.uid) {
        const updatedEmail = { ...email, seen: true };
        setSelectedEmail(updatedEmail);
        setEmails(prevEmails =>
          prevEmails.map(e => e.uid === email.uid ? updatedEmail : e)
        );

        // Mark email as read on server (fire and forget)
        try {
          const folder = activeTab === 'sent' ? 'Sent' : 'INBOX';
          await api.post('/email-accounts/mark-as-read', {
            accountId: selectedAccount._id,
            uid: email.uid,
            folder: folder
          });
        } catch (markReadError) {
          console.error('Failed to mark email as read on server:', markReadError);
        }
      }
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

  const getEmailPreview = (email) => {
    // Use preview from backend if available
    if (email.preview) {
      // Remove [html content] and [plain content] tags from preview
      let cleanPreview = email.preview.replace(/\s*-?\s*\[(html|plain)\s+content\]/gi, '').trim();
      
      // Remove empty parentheses and brackets patterns like "( )", "- ( )", etc.
      cleanPreview = cleanPreview.replace(/\s*-?\s*\(\s*\)\s*/g, '').trim();
      cleanPreview = cleanPreview.replace(/^\s*-\s+/, '').trim(); // Remove leading dash
      
      // Only remove standalone URLs (tracking links that are the only content)
      const urlPattern = /^https?:\/\/[^\s]+$/;
      if (urlPattern.test(cleanPreview)) {
        // This is just a URL, try to get text from body
        const body = email.text || email.html || '';
        if (body) {
          let text = body.replace(/<[^>]*>/g, '').trim();
          text = text.replace(/\s*-?\s*\(\s*\)\s*/g, '').replace(/^\s*-\s+/, '').trim();
          // Remove standalone URLs from body text too
          text = text.replace(/^https?:\/\/\S+\s*/g, '').trim();
          if (text && text.length >= 3) {
            return text.substring(0, 150);
          }
        }
        return '';
      }
      
      // If after cleaning we have meaningful content, return it
      if (cleanPreview && cleanPreview.length >= 3 && !/^[\s\-()]+$/.test(cleanPreview)) {
        return cleanPreview.substring(0, 150);
      }
    }
    
    // Fallback to text/html if preview not available or empty
    const body = email.text || email.html || '';
    if (body) {
      let text = body.replace(/<[^>]*>/g, '').trim();
      text = text.replace(/\s*-?\s*\(\s*\)\s*/g, '').replace(/^\s*-\s+/, '').trim();
      // Remove leading URLs
      text = text.replace(/^https?:\/\/\S+\s*/g, '').trim();
      if (text && text.length >= 3) {
        return text.substring(0, 150);
      }
    }
    
    return '';
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
            <button 
              className="account-avatar-button"
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
            >
              {selectedAccount?.email?.charAt(0).toUpperCase() || 'U'}
            </button>
            {accountDropdownOpen && (
              <div className="account-dropdown-menu">
                {/* User Header */}
                <div className="account-dropdown-header">
                  <div className="account-dropdown-user-info">
                    <div className="account-dropdown-user-avatar">
                      {user?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="account-dropdown-user-details">
                      <div className="account-dropdown-user-greeting">Hello, {user?.fullName || 'User'}</div>
                      <div className="account-dropdown-user-email">{user?.email || ''}</div>
                    </div>
                  </div>
                  <div 
                    className="account-dropdown-link"
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      window.open(getMainAppUrl(), '_blank');
                    }}
                  >
                    Back to the Dashboard
                  </div>
                </div>

                {/* Email Accounts List */}
                {accounts.length > 0 && (
                  <>
                    <div className="account-dropdown-section">
                      {accounts.map(account => (
                        <div
                          key={account._id}
                          className={`account-dropdown-account-item ${selectedAccount?._id === account._id ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedAccount(account);
                            setSelectedEmail(null);
                            setSelectedEmails(new Set());
                            setAccountDropdownOpen(false);
                          }}
                        >
                          <div className="account-dropdown-account-avatar">
                            {account.email?.charAt(0).toUpperCase()}
                          </div>
                          <div className="account-dropdown-account-info">
                            <div className="account-dropdown-account-name">{account.displayName || account.email?.split('@')[0]}</div>
                            <div className="account-dropdown-account-email">{account.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="account-dropdown-divider"></div>
                  </>
                )}

                {/* Footer Menu */}
                <div className="account-dropdown-menu-section">
                  <div
                    className="account-dropdown-menu-item"
                    onClick={() => {
                      setActiveTab('settings');
                      setAccountDropdownOpen(false);
                    }}
                  >
                    <MdSettings className="account-dropdown-menu-icon" />
                    Mail Settings & Privacy
                  </div>
                  <div
                    className="account-dropdown-menu-item"
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      window.open('https://help.noxtm.com', '_blank');
                    }}
                  >
                    <MdInfo className="account-dropdown-menu-icon" />
                    Help
                  </div>
                  <div
                    className="account-dropdown-menu-item"
                    onClick={() => {
                      setLoginMailModalOpen(true);
                      setAccountDropdownOpen(false);
                    }}
                  >
                    <MdPersonAdd className="account-dropdown-menu-icon" />
                    Login Mail
                  </div>
                </div>

                <div className="account-dropdown-divider"></div>

                {/* Sign Out */}
                <div className="account-dropdown-sign-out-section">
                  <div
                    className="account-dropdown-sign-out"
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      onLogout && onLogout();
                    }}
                  >
                    Sign Out
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gmail-style Tabs with Toolbar */}
      <div className="mail-gmail-tabs">
        {activeTab !== 'settings' && (
          <>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={selectAll}
                indeterminate={selectedEmails.size > 0 && selectedEmails.size < emails.length}
                onChange={handleSelectAllChange}
              />
              <button
                onClick={() => setSelectDropdownOpen(!selectDropdownOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#5f6368'
                }}
              >
                <MdArrowDropDown size={20} />
              </button>
              {selectDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'white',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    minWidth: '120px',
                    marginTop: '4px'
                  }}
                >
                  <div
                    onClick={() => { handleSelectOption('all'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    All
                  </div>
                  <div
                    onClick={() => { handleSelectOption('none'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    None
                  </div>
                  <div
                    onClick={() => { handleSelectOption('read'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    Read
                  </div>
                  <div
                    onClick={() => { handleSelectOption('unread'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    Unread
                  </div>
                  <div
                    onClick={() => { handleSelectOption('starred'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    Starred
                  </div>
                </div>
              )}
            </div>
            {selectedEmails.size > 0 && (
              <div style={{
                fontSize: '13px',
                color: '#5f6368',
                marginLeft: '8px',
                marginRight: '8px'
              }}>
                {selectedEmails.size} selected
              </div>
            )}
          </>
        )}
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
        {activeTab !== 'settings' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconButton icon={MdRefresh} onClick={fetchEmails} title="Refresh" />
            {selectedEmails.size > 0 && (
              <>
                <div className="mail-toolbar-divider"></div>
                <IconButton icon={MdArchive} onClick={handleBulkArchive} title="Archive" />
                <IconButton icon={MdDelete} onClick={handleBulkDelete} title="Delete" />
              </>
            )}
            {totalEmails > 0 && (
              <>
                <div className="mail-toolbar-divider"></div>
                <span className="email-count">
                  {((currentPage - 1) * emailsPerPage) + 1}-{Math.min(currentPage * emailsPerPage, totalEmails)} of {totalEmails}
                </span>
                <IconButton icon={MdMoreVert} title="More options" />
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
        )}
      </div>

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
              {accountsLoading ? (
                // Show loading state while fetching accounts - prevents form flash
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading accounts...</p>
                </div>
              ) : accounts.length === 0 ? (
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
            emails.map((email, index) => {
              const preview = getEmailPreview(email);
              return (
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
                    {(email.subject || '(No Subject)').replace(/\s*-\s*\[(html|plain)\s+content\]/gi, '')}
                  </span>
                  <span className="mail-email-preview-gmail">
                    {preview ? ' - ' + preview : ''}
                  </span>
                </div>

                <div className="mail-email-timestamp-gmail">
                  {formatDate(email.date)}
                  {email.hasAttachments && <MdAttachFile className="attachment-icon-gmail" />}
                </div>
              </div>
              );
            })
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

      {/* Login Mail Modal */}
      {loginMailModalOpen && (
        <div className="modal-overlay" onClick={() => setLoginMailModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setLoginMailModalOpen(false)}>
              <MdClose />
            </button>
            <EmailConnectionForm
              onSuccess={(account) => {
                console.log('[MainstreamInbox] External email connected:', account);
                setLoginMailModalOpen(false);
                // Refresh accounts list
                fetchHostedAccounts();
                // Auto-select the newly connected account
                setSelectedAccount(account);
              }}
              onCancel={() => setLoginMailModalOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default MainstreamInbox;
