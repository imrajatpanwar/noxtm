import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../config/api';
import { getGravatarUrl, hasGravatar, openGravatarSetup } from '../../utils/gravatar';
import './ProfileSettings.css';

const buildFallbackAvatar = (name, email) => {
  const label = name || email || 'User';
  return `https://ui-avatars.com/api/?background=3B82F6&color=fff&name=${encodeURIComponent(label)}`;
};

const ProfileSettings = ({ account, user, onAvatarUpload, uploading, uploadError, uploadSuccess }) => {
  const fileInputRef = useRef(null);
  const displayName = user?.fullName || account?.displayName || account?.email || 'Mailbox User';
  const avatarSrc = user?.emailAvatar || user?.profileImage || buildFallbackAvatar(displayName, account?.email || user?.email);

  const [signature, setSignature] = useState('');
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [signatureError, setSignatureError] = useState(null);
  const [signatureSuccess, setSignatureSuccess] = useState(null);

  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState(null);
  const [displayNameSuccess, setDisplayNameSuccess] = useState(null);

  const [editingQuota, setEditingQuota] = useState(false);
  const [newQuota, setNewQuota] = useState('');
  const [quotaSaving, setQuotaSaving] = useState(false);
  const [quotaError, setQuotaError] = useState(null);
  const [quotaSuccess, setQuotaSuccess] = useState(null);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);

  // Email forwarding state
  const [showForwardingSection, setShowForwardingSection] = useState(false);
  const [forwardingEnabled, setForwardingEnabled] = useState(false);
  const [forwardTo, setForwardTo] = useState('');
  const [forwardingSaving, setForwardingSaving] = useState(false);
  const [forwardingError, setForwardingError] = useState(null);
  const [forwardingSuccess, setForwardingSuccess] = useState(null);

  // Blocked senders state
  const [showBlockedSendersSection, setShowBlockedSendersSection] = useState(false);
  const [blockedSenders, setBlockedSenders] = useState([]);
  const [newBlockedEmail, setNewBlockedEmail] = useState('');
  const [blockedSendersLoading, setBlockedSendersLoading] = useState(false);
  const [blockedSendersError, setBlockedSendersError] = useState(null);
  const [blockedSendersSuccess, setBlockedSendersSuccess] = useState(null);

  // Storage usage state
  const [storageUsage, setStorageUsage] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);

  // Gravatar state
  const [gravatarChecking, setGravatarChecking] = useState(false);
  const [hasCustomGravatar, setHasCustomGravatar] = useState(false);
  const [gravatarUrl, setGravatarUrl] = useState(null);

  // Password strength checker function
  const checkPasswordStrength = (password) => {
    if (!password) return '';
    if (password.length < 8) return 'weak';
    if (password.length < 10) return 'medium';
    if (password.length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[!@#$%^&*]/.test(password)) {
      return 'strong';
    }
    return 'medium';
  };

  useEffect(() => {
    // Fetch user's current signature
    api.get('/email-accounts/signature')
      .then(res => {
        if (res.data.success) {
          setSignature(res.data.signature || '');
        }
      })
      .catch(err => console.error('Failed to fetch signature:', err));
  }, []);

  // Update password strength on password input change
  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(newPassword));
  }, [newPassword]);

  // Fetch forwarding settings on mount
  useEffect(() => {
    if (account?._id && showForwardingSection) {
      api.get(`/email-accounts/${account._id}/forwarding`)
        .then(res => {
          if (res.data.success) {
            setForwardingEnabled(res.data.forwardingEnabled || false);
            setForwardTo(res.data.forwardTo || '');
          }
        })
        .catch(err => console.error('Failed to fetch forwarding settings:', err));
    }
  }, [account?._id, showForwardingSection]);

  // Fetch blocked senders on mount
  useEffect(() => {
    if (account?._id && showBlockedSendersSection) {
      setBlockedSendersLoading(true);
      api.get(`/email-accounts/${account._id}/blocked-senders`)
        .then(res => {
          if (res.data.success) {
            setBlockedSenders(res.data.blockedSenders || []);
          }
        })
        .catch(err => console.error('Failed to fetch blocked senders:', err))
        .finally(() => setBlockedSendersLoading(false));
    }
  }, [account?._id, showBlockedSendersSection]);

  // Fetch storage usage on mount
  useEffect(() => {
    if (account?._id) {
      setStorageLoading(true);
      api.get(`/email-accounts/${account._id}/storage-usage`)
        .then(res => {
          if (res.data.success) {
            setStorageUsage(res.data.storage);
          }
        })
        .catch(err => console.error('Failed to fetch storage usage:', err))
        .finally(() => setStorageLoading(false));
    }
  }, [account?._id]);

  // Check Gravatar on mount
  useEffect(() => {
    const checkUserGravatar = async () => {
      const email = user?.email || account?.email;
      if (!email) return;

      setGravatarChecking(true);
      const url = getGravatarUrl(email, 200);
      setGravatarUrl(url);

      const hasCustom = await hasGravatar(email);
      setHasCustomGravatar(hasCustom);
      setGravatarChecking(false);
    };

    checkUserGravatar();
  }, [user?.email, account?.email]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onAvatarUpload(file);
      event.target.value = '';
    }
  };

  const handleSignatureSave = async () => {
    setSignatureSaving(true);
    setSignatureError(null);
    setSignatureSuccess(null);

    try {
      const res = await api.put('/email-accounts/signature', { signature });
      if (res.data.success) {
        setSignatureSuccess('Signature saved successfully!');
        setTimeout(() => setSignatureSuccess(null), 3000);
      }
    } catch (err) {
      setSignatureError(err.response?.data?.message || 'Failed to save signature');
    } finally {
      setSignatureSaving(false);
    }
  };

  const handleDisplayNameEdit = () => {
    setNewDisplayName(account?.displayName || '');
    setEditingDisplayName(true);
    setDisplayNameError(null);
    setDisplayNameSuccess(null);
  };

  const handleDisplayNameSave = async () => {
    if (!newDisplayName.trim()) {
      setDisplayNameError('Display name cannot be empty');
      return;
    }

    setDisplayNameSaving(true);
    setDisplayNameError(null);
    setDisplayNameSuccess(null);

    try {
      const res = await api.put(`/email-accounts/${account._id}/display-name`, {
        displayName: newDisplayName.trim()
      });
      if (res.data.success) {
        setDisplayNameSuccess('Display name updated successfully!');
        setEditingDisplayName(false);
        setTimeout(() => setDisplayNameSuccess(null), 3000);
        window.location.reload();
      }
    } catch (err) {
      setDisplayNameError(err.response?.data?.message || 'Failed to update display name');
    } finally {
      setDisplayNameSaving(false);
    }
  };

  const handleDisplayNameCancel = () => {
    setEditingDisplayName(false);
    setNewDisplayName('');
    setDisplayNameError(null);
  };

  const handleQuotaEdit = () => {
    setNewQuota(account?.quota?.toString() || '');
    setEditingQuota(true);
    setQuotaError(null);
    setQuotaSuccess(null);
  };

  const handleQuotaSave = async () => {
    const quotaValue = parseInt(newQuota);
    if (isNaN(quotaValue) || quotaValue < 0) {
      setQuotaError('Please enter a valid quota in MB (0 or greater)');
      return;
    }

    setQuotaSaving(true);
    setQuotaError(null);
    setQuotaSuccess(null);

    try {
      const res = await api.put(`/email-accounts/${account._id}/quota`, {
        quota: quotaValue
      });
      if (res.data.success) {
        setQuotaSuccess('Quota updated successfully!');
        setEditingQuota(false);
        setTimeout(() => setQuotaSuccess(null), 3000);
        window.location.reload();
      }
    } catch (err) {
      setQuotaError(err.response?.data?.message || 'Failed to update quota');
    } finally {
      setQuotaSaving(false);
    }
  };

  const handleQuotaCancel = () => {
    setEditingQuota(false);
    setNewQuota('');
    setQuotaError(null);
  };

  // Password change handlers
  const handlePasswordSave = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordSaving(true);

    try {
      const res = await api.put(`/email-accounts/${account._id}/reset-password`, {
        newPassword
      });

      if (res.data.success) {
        setPasswordSuccess('Password updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordStrength('');
        setTimeout(() => {
          setPasswordSuccess(null);
          setShowPasswordSection(false);
        }, 3000);
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  // Email forwarding handlers
  const handleForwardingSave = async () => {
    setForwardingError(null);
    setForwardingSuccess(null);

    // Validate email if forwarding is enabled
    if (forwardingEnabled && !forwardTo) {
      setForwardingError('Please enter a forward-to email address');
      return;
    }

    if (forwardingEnabled) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(forwardTo)) {
        setForwardingError('Please enter a valid email address');
        return;
      }
    }

    setForwardingSaving(true);

    try {
      const res = await api.put(`/email-accounts/${account._id}/forwarding`, {
        forwardingEnabled,
        forwardTo: forwardingEnabled ? forwardTo : ''
      });

      if (res.data.success) {
        setForwardingSuccess('Forwarding settings updated successfully!');
        setTimeout(() => setForwardingSuccess(null), 3000);
      }
    } catch (err) {
      setForwardingError(err.response?.data?.message || 'Failed to update forwarding settings');
    } finally {
      setForwardingSaving(false);
    }
  };

  // Blocked senders handlers
  const handleAddBlockedSender = async () => {
    setBlockedSendersError(null);
    setBlockedSendersSuccess(null);

    if (!newBlockedEmail) {
      setBlockedSendersError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newBlockedEmail)) {
      setBlockedSendersError('Please enter a valid email address');
      return;
    }

    setBlockedSendersLoading(true);

    try {
      const res = await api.post(`/email-accounts/${account._id}/blocked-senders`, {
        email: newBlockedEmail
      });

      if (res.data.success) {
        setBlockedSenders(res.data.blockedSenders);
        setNewBlockedEmail('');
        setBlockedSendersSuccess('Sender blocked successfully!');
        setTimeout(() => setBlockedSendersSuccess(null), 3000);
      }
    } catch (err) {
      setBlockedSendersError(err.response?.data?.message || 'Failed to block sender');
    } finally {
      setBlockedSendersLoading(false);
    }
  };

  const handleRemoveBlockedSender = async (email) => {
    setBlockedSendersError(null);
    setBlockedSendersSuccess(null);
    setBlockedSendersLoading(true);

    try {
      const res = await api.delete(`/email-accounts/${account._id}/blocked-senders/${encodeURIComponent(email)}`);

      if (res.data.success) {
        setBlockedSenders(res.data.blockedSenders);
        setBlockedSendersSuccess('Sender unblocked successfully!');
        setTimeout(() => setBlockedSendersSuccess(null), 3000);
      }
    } catch (err) {
      setBlockedSendersError(err.response?.data?.message || 'Failed to unblock sender');
    } finally {
      setBlockedSendersLoading(false);
    }
  };

  return (
    <div className="mbox-settings">
      {/* Header Section */}
      <div className="mbox-settings-header">
        <div className="mbox-settings-header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <div className="mbox-settings-header-text">
          <h2>Mailbox Settings</h2>
          <p>Manage your mailbox profile, signature, and preferences</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="mbox-profile-card">
        <div className="mbox-profile-avatar-wrapper">
          <img src={avatarSrc} alt="Profile avatar" className="mbox-profile-avatar" />
          <button
            type="button"
            className="mbox-avatar-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <div className="mbox-profile-info">
          <h3>{displayName}</h3>
          <span className="mbox-profile-email">{account?.email || user?.email || '—'}</span>
          {(uploadError || uploadSuccess) && (
            <p className={uploadError ? 'mbox-error-text' : 'mbox-success-text'}>
              {uploadError || uploadSuccess}
            </p>
          )}
        </div>
      </div>

      {/* Account Details Grid */}
      <div className="mbox-section">
        <div className="mbox-section-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h4>Account Details</h4>
        </div>
        <div className="mbox-details-grid">
          <div className="mbox-detail-item">
            <span className="mbox-detail-label">Mailbox</span>
            <span className="mbox-detail-value">{account?.email || 'Not selected'}</span>
          </div>

          <div className="mbox-detail-item">
            <span className="mbox-detail-label">Display Name</span>
            {editingDisplayName ? (
              <div className="mbox-edit-field">
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="Enter display name"
                  autoFocus
                />
                <button onClick={handleDisplayNameSave} disabled={displayNameSaving} className="mbox-btn-save">
                  {displayNameSaving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleDisplayNameCancel} disabled={displayNameSaving} className="mbox-btn-cancel">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mbox-detail-value-editable">
                <span>{account?.displayName || 'Not set'}</span>
                <button onClick={handleDisplayNameEdit} className="mbox-btn-edit">Edit</button>
              </div>
            )}
            {displayNameError && <p className="mbox-error-text">{displayNameError}</p>}
            {displayNameSuccess && <p className="mbox-success-text">{displayNameSuccess}</p>}
          </div>

          <div className="mbox-detail-item">
            <span className="mbox-detail-label">Domain</span>
            <span className="mbox-detail-value">{account?.domain || '—'}</span>
          </div>

          <div className="mbox-detail-item">
            <span className="mbox-detail-label">IMAP Status</span>
            <span className={`mbox-status-badge ${account?.imapEnabled ? 'enabled' : 'disabled'}`}>
              {account?.imapEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="mbox-detail-item">
            <span className="mbox-detail-label">SMTP Status</span>
            <span className={`mbox-status-badge ${account?.smtpEnabled ? 'enabled' : 'disabled'}`}>
              {account?.smtpEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="mbox-detail-item">
            <span className="mbox-detail-label">Quota (MB)</span>
            {editingQuota ? (
              <div className="mbox-edit-field">
                <input
                  type="number"
                  value={newQuota}
                  onChange={(e) => setNewQuota(e.target.value)}
                  placeholder="Enter quota"
                  min="0"
                  autoFocus
                />
                <button onClick={handleQuotaSave} disabled={quotaSaving} className="mbox-btn-save">
                  {quotaSaving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleQuotaCancel} disabled={quotaSaving} className="mbox-btn-cancel">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="mbox-detail-value-editable">
                <span>{account?.quota ?? 'Not set'}</span>
                <button onClick={handleQuotaEdit} className="mbox-btn-edit">Edit</button>
              </div>
            )}
            {quotaError && <p className="mbox-error-text">{quotaError}</p>}
            {quotaSuccess && <p className="mbox-success-text">{quotaSuccess}</p>}
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="mbox-section">
        <div className="mbox-section-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <h4>Storage Usage</h4>
        </div>
        <div className="mbox-storage-card">
          {storageLoading ? (
            <div className="mbox-loading">Loading storage information...</div>
          ) : storageUsage ? (
            <>
              <div className="mbox-storage-stats">
                <div className="mbox-storage-stat">
                  <span className="mbox-storage-value">{storageUsage.used} MB</span>
                  <span className="mbox-storage-label">Used</span>
                </div>
                <div className="mbox-storage-stat">
                  <span className="mbox-storage-value">{storageUsage.available} MB</span>
                  <span className="mbox-storage-label">Available</span>
                </div>
                <div className="mbox-storage-stat">
                  <span className="mbox-storage-value">{storageUsage.quota} MB</span>
                  <span className="mbox-storage-label">Total</span>
                </div>
              </div>
              <div className="mbox-storage-bar">
                <div
                  className={`mbox-storage-fill ${storageUsage.percentage > 90 ? 'critical' : storageUsage.percentage > 70 ? 'warning' : 'normal'}`}
                  style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
                />
              </div>
              <p className="mbox-storage-percentage">{storageUsage.percentage}% of storage used</p>
            </>
          ) : (
            <p className="mbox-muted-text">Unable to load storage information</p>
          )}
        </div>
      </div>

      {/* Email Signature */}
      <div className="mbox-section">
        <div className="mbox-section-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
          </svg>
          <h4>Email Signature</h4>
        </div>
        <p className="mbox-section-description">
          This signature will be automatically appended to all outgoing emails.
        </p>
        <textarea
          className="mbox-signature-textarea"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Enter your email signature here..."
          rows={5}
        />
        <div className="mbox-signature-actions">
          <button onClick={handleSignatureSave} disabled={signatureSaving} className="mbox-btn-primary">
            {signatureSaving ? 'Saving...' : 'Save Signature'}
          </button>
          {signatureError && <p className="mbox-error-text">{signatureError}</p>}
          {signatureSuccess && <p className="mbox-success-text">{signatureSuccess}</p>}
        </div>
      </div>

      {/* Gravatar Sender Avatar */}
      <div className="mbox-section">
        <div className="mbox-section-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <h4>Sender Avatar (Gravatar)</h4>
        </div>
        <p className="mbox-section-description">
          Your sender avatar appears next to your name in email clients like Gmail and Outlook.
          Set up a free Gravatar account to display your profile picture.
        </p>

        <div className="mbox-gravatar-status">
          {gravatarChecking ? (
            <div className="mbox-loading">Checking Gravatar status...</div>
          ) : (
            <>
              <div className="mbox-gravatar-preview">
                {gravatarUrl && (
                  <img
                    src={gravatarUrl}
                    alt="Gravatar preview"
                    className="mbox-gravatar-image"
                    onError={(e) => {
                      e.target.src = buildFallbackAvatar(displayName, user?.email || account?.email);
                    }}
                  />
                )}
                <div className="mbox-gravatar-info">
                  <div className="mbox-gravatar-status-badge">
                    {hasCustomGravatar ? (
                      <span className="mbox-status-badge enabled">✓ Active</span>
                    ) : (
                      <span className="mbox-status-badge disabled">Not Set Up</span>
                    )}
                  </div>
                  <p className="mbox-gravatar-email">{user?.email || account?.email}</p>
                </div>
              </div>

              <div className="mbox-gravatar-actions">
                {hasCustomGravatar ? (
                  <>
                    <p className="mbox-success-text" style={{ marginBottom: '12px' }}>
                      ✓ Your Gravatar is set up! Recipients will see your profile picture when you send emails.
                    </p>
                    <button
                      onClick={() => openGravatarSetup(user?.email || account?.email)}
                      className="mbox-btn-secondary"
                    >
                      Update on Gravatar.com
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mbox-info-box">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <div>
                        <strong>How to set up Gravatar:</strong>
                        <ol style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                          <li>Click "Set Up Gravatar" below</li>
                          <li>Create a free account using <strong>{user?.email || account?.email}</strong></li>
                          <li>Upload your profile picture</li>
                          <li>Return here and refresh to verify</li>
                        </ol>
                      </div>
                    </div>
                    <button
                      onClick={() => openGravatarSetup(user?.email || account?.email)}
                      className="mbox-btn-primary"
                    >
                      Set Up Gravatar
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="mbox-collapsible-sections">
        {/* Password Change */}
        <div className="mbox-collapsible">
          <button
            className={`mbox-collapsible-header ${showPasswordSection ? 'active' : ''}`}
            onClick={() => setShowPasswordSection(!showPasswordSection)}
          >
            <div className="mbox-collapsible-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Change Password</span>
            </div>
            <svg className={`mbox-chevron ${showPasswordSection ? 'rotated' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showPasswordSection && (
            <div className="mbox-collapsible-content">
              <div className="mbox-form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                />
                {passwordStrength && (
                  <div className={`mbox-password-strength ${passwordStrength}`}>
                    <div className="mbox-strength-bar">
                      <div className={`mbox-strength-fill ${passwordStrength}`} />
                    </div>
                    <span>Password strength: {passwordStrength}</span>
                  </div>
                )}
              </div>
              <div className="mbox-form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <button onClick={handlePasswordSave} disabled={passwordSaving} className="mbox-btn-primary">
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
              {passwordError && <p className="mbox-error-text">{passwordError}</p>}
              {passwordSuccess && <p className="mbox-success-text">{passwordSuccess}</p>}
            </div>
          )}
        </div>

        {/* Email Forwarding */}
        <div className="mbox-collapsible">
          <button
            className={`mbox-collapsible-header ${showForwardingSection ? 'active' : ''}`}
            onClick={() => setShowForwardingSection(!showForwardingSection)}
          >
            <div className="mbox-collapsible-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 17 20 12 15 7" />
                <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
              </svg>
              <span>Email Forwarding</span>
            </div>
            <svg className={`mbox-chevron ${showForwardingSection ? 'rotated' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showForwardingSection && (
            <div className="mbox-collapsible-content">
              <label className="mbox-toggle-row">
                <span>Enable email forwarding</span>
                <div className="mbox-toggle-switch">
                  <input
                    type="checkbox"
                    checked={forwardingEnabled}
                    onChange={(e) => setForwardingEnabled(e.target.checked)}
                  />
                  <span className="mbox-toggle-slider" />
                </div>
              </label>
              {forwardingEnabled && (
                <div className="mbox-form-group">
                  <label>Forward to</label>
                  <input
                    type="email"
                    value={forwardTo}
                    onChange={(e) => setForwardTo(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              )}
              <button onClick={handleForwardingSave} disabled={forwardingSaving} className="mbox-btn-primary">
                {forwardingSaving ? 'Saving...' : 'Save Forwarding Settings'}
              </button>
              {forwardingError && <p className="mbox-error-text">{forwardingError}</p>}
              {forwardingSuccess && <p className="mbox-success-text">{forwardingSuccess}</p>}
            </div>
          )}
        </div>

        {/* Blocked Senders */}
        <div className="mbox-collapsible">
          <button
            className={`mbox-collapsible-header ${showBlockedSendersSection ? 'active' : ''}`}
            onClick={() => setShowBlockedSendersSection(!showBlockedSendersSection)}
          >
            <div className="mbox-collapsible-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <span>Blocked Senders</span>
              {blockedSenders.length > 0 && (
                <span className="mbox-badge">{blockedSenders.length}</span>
              )}
            </div>
            <svg className={`mbox-chevron ${showBlockedSendersSection ? 'rotated' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showBlockedSendersSection && (
            <div className="mbox-collapsible-content">
              <div className="mbox-form-group">
                <label>Add email to block list</label>
                <div className="mbox-input-with-button">
                  <input
                    type="email"
                    value={newBlockedEmail}
                    onChange={(e) => setNewBlockedEmail(e.target.value)}
                    placeholder="spam@example.com"
                  />
                  <button onClick={handleAddBlockedSender} disabled={blockedSendersLoading} className="mbox-btn-primary">
                    {blockedSendersLoading ? 'Adding...' : 'Block'}
                  </button>
                </div>
              </div>
              {blockedSenders.length > 0 ? (
                <div className="mbox-blocked-list">
                  {blockedSenders.map((email, index) => (
                    <div key={index} className="mbox-blocked-item">
                      <span>{email}</span>
                      <button
                        onClick={() => handleRemoveBlockedSender(email)}
                        disabled={blockedSendersLoading}
                        className="mbox-btn-unblock"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mbox-muted-text">No blocked senders yet</p>
              )}
              {blockedSendersError && <p className="mbox-error-text">{blockedSendersError}</p>}
              {blockedSendersSuccess && <p className="mbox-success-text">{blockedSendersSuccess}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mbox-footer-note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>Your avatar is automatically embedded in every new email you send. Upload a square image for best results.</span>
      </div>
    </div>
  );
};

ProfileSettings.propTypes = {
  account: PropTypes.object,
  user: PropTypes.object,
  onAvatarUpload: PropTypes.func.isRequired,
  uploading: PropTypes.bool,
  uploadError: PropTypes.string,
  uploadSuccess: PropTypes.string
};

ProfileSettings.defaultProps = {
  account: null,
  user: null,
  uploading: false,
  uploadError: null,
  uploadSuccess: null
};

export default ProfileSettings;
