import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import api from '../../config/api';

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
        // Refresh the page or update account state
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
    <div className="mailbox-profile-settings">
      <div className="mailbox-settings-heading">
        <div>
          <h3>Mailbox Settings</h3>
          <p>Manage the avatar and metadata used inside the emails sent from this hosted mailbox.</p>
        </div>
      </div>

      <div className="mailbox-avatar-section">
        <img src={avatarSrc} alt="Profile avatar" className="mailbox-settings-avatar" />
        <div className="mailbox-avatar-meta">
          <div className="mailbox-avatar-text">
            <strong>{displayName}</strong>
            <span>{account?.email || user?.email || '—'}</span>
          </div>
          <div className="mailbox-avatar-actions">
            <button type="button" className="mailbox-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload Avatar'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {uploadError && <p className="mailbox-settings-error">{uploadError}</p>}
            {uploadSuccess && <p className="mailbox-settings-success">{uploadSuccess}</p>}
          </div>
        </div>
      </div>

      <div className="mailbox-settings-grid">
        <div className="mailbox-settings-row">
          <span className="label">Mailbox</span>
          <strong>{account?.email || 'Not selected'}</strong>
        </div>
        <div className="mailbox-settings-row">
          <span className="label">Display name</span>
          {editingDisplayName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="Enter display name"
                style={{
                  padding: '6px 10px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  flex: 1,
                  maxWidth: '300px'
                }}
                autoFocus
              />
              <button
                onClick={handleDisplayNameSave}
                disabled={displayNameSaving}
                className="mailbox-upload-btn"
                style={{ margin: 0, padding: '6px 12px', fontSize: '13px' }}
              >
                {displayNameSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleDisplayNameCancel}
                disabled={displayNameSaving}
                style={{
                  margin: 0,
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>{account?.displayName || 'Not set'}</strong>
              <button
                onClick={handleDisplayNameEdit}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  background: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
        {displayNameError && (
          <div className="mailbox-settings-row">
            <span className="label"></span>
            <p className="mailbox-settings-error">{displayNameError}</p>
          </div>
        )}
        {displayNameSuccess && (
          <div className="mailbox-settings-row">
            <span className="label"></span>
            <p className="mailbox-settings-success">{displayNameSuccess}</p>
          </div>
        )}
        <div className="mailbox-settings-row">
          <span className="label">Domain</span>
          <strong>{account?.domain || '—'}</strong>
        </div>
        <div className="mailbox-settings-row">
          <span className="label">IMAP</span>
          <strong>{account?.imapEnabled ? 'Enabled' : 'Disabled'}</strong>
        </div>
        <div className="mailbox-settings-row">
          <span className="label">SMTP</span>
          <strong>{account?.smtpEnabled ? 'Enabled' : 'Disabled'}</strong>
        </div>
        <div className="mailbox-settings-row">
          <span className="label">Quota (MB)</span>
          {editingQuota ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <input
                type="number"
                value={newQuota}
                onChange={(e) => setNewQuota(e.target.value)}
                placeholder="Enter quota in MB"
                min="0"
                style={{
                  padding: '6px 10px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  flex: 1,
                  maxWidth: '150px'
                }}
                autoFocus
              />
              <button
                onClick={handleQuotaSave}
                disabled={quotaSaving}
                className="mailbox-upload-btn"
                style={{ margin: 0, padding: '6px 12px', fontSize: '13px' }}
              >
                {quotaSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleQuotaCancel}
                disabled={quotaSaving}
                style={{
                  margin: 0,
                  padding: '6px 12px',
                  fontSize: '13px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>{account?.quota ?? 'Not set'}</strong>
              <button
                onClick={handleQuotaEdit}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  background: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Edit
              </button>
            </div>
          )}
        </div>
        {quotaError && (
          <div className="mailbox-settings-row">
            <span className="label"></span>
            <p className="mailbox-settings-error">{quotaError}</p>
          </div>
        )}
        {quotaSuccess && (
          <div className="mailbox-settings-row">
            <span className="label"></span>
            <p className="mailbox-settings-success">{quotaSuccess}</p>
          </div>
        )}
      </div>

      <div className="mailbox-signature-section">
        <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>Email Signature</h4>
        <p style={{ marginBottom: '12px', fontSize: '13px', color: '#666' }}>
          This signature will be automatically appended to the end of all outgoing messages.
        </p>
        <textarea
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Enter your email signature here..."
          rows={6}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '13px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            resize: 'vertical',
            fontFamily: 'inherit',
            marginBottom: '10px'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSignatureSave}
            disabled={signatureSaving}
            className="mailbox-upload-btn"
            style={{ margin: 0 }}
          >
            {signatureSaving ? 'Saving...' : 'Save Signature'}
          </button>
          {signatureError && <p className="mailbox-settings-error">{signatureError}</p>}
          {signatureSuccess && <p className="mailbox-settings-success">{signatureSuccess}</p>}
        </div>
      </div>

      {/* Storage Usage Section */}
      <div className="mailbox-storage-section" style={{ marginTop: '30px' }}>
        <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Storage Usage</h4>
        {storageLoading ? (
          <p style={{ fontSize: '13px', color: '#666' }}>Loading...</p>
        ) : storageUsage ? (
          <div>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>{storageUsage.used} MB used</span>
              <span>{storageUsage.quota} MB total</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                width: `${Math.min(storageUsage.percentage, 100)}%`,
                height: '100%',
                backgroundColor: storageUsage.percentage > 90 ? '#ef4444' : storageUsage.percentage > 70 ? '#f59e0b' : '#10b981',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ fontSize: '12px', color: '#666' }}>
              {storageUsage.available} MB available ({storageUsage.percentage}% used)
            </p>
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#666' }}>Unable to load storage information</p>
        )}
      </div>

      {/* Password Change Section */}
      <div className="mailbox-password-section" style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Change Password</h4>
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showPasswordSection ? 'Hide' : 'Show'}
          </button>
        </div>

        {showPasswordSection && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
              {passwordStrength && (
                <p style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: passwordStrength === 'strong' ? '#10b981' : passwordStrength === 'medium' ? '#f59e0b' : '#ef4444'
                }}>
                  Password strength: {passwordStrength}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <button
              onClick={handlePasswordSave}
              disabled={passwordSaving}
              className="mailbox-upload-btn"
              style={{ margin: 0 }}
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>

            {passwordError && <p className="mailbox-settings-error" style={{ marginTop: '10px' }}>{passwordError}</p>}
            {passwordSuccess && <p className="mailbox-settings-success" style={{ marginTop: '10px' }}>{passwordSuccess}</p>}
          </div>
        )}
      </div>

      {/* Email Forwarding Section */}
      <div className="mailbox-forwarding-section" style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Email Forwarding</h4>
          <button
            onClick={() => setShowForwardingSection(!showForwardingSection)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showForwardingSection ? 'Hide' : 'Show'}
          </button>
        </div>

        {showForwardingSection && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <input
                  type="checkbox"
                  checked={forwardingEnabled}
                  onChange={(e) => setForwardingEnabled(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span>Enable email forwarding</span>
              </label>
            </div>

            {forwardingEnabled && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                  Forward to
                </label>
                <input
                  type="email"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  placeholder="email@example.com"
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '13px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
            )}

            <button
              onClick={handleForwardingSave}
              disabled={forwardingSaving}
              className="mailbox-upload-btn"
              style={{ margin: 0 }}
            >
              {forwardingSaving ? 'Saving...' : 'Save Forwarding Settings'}
            </button>

            {forwardingError && <p className="mailbox-settings-error" style={{ marginTop: '10px' }}>{forwardingError}</p>}
            {forwardingSuccess && <p className="mailbox-settings-success" style={{ marginTop: '10px' }}>{forwardingSuccess}</p>}
          </div>
        )}
      </div>

      {/* Blocked Senders Section */}
      <div className="mailbox-blocked-senders-section" style={{ marginTop: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '600' }}>Blocked Senders</h4>
          <button
            onClick={() => setShowBlockedSendersSection(!showBlockedSendersSection)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showBlockedSendersSection ? 'Hide' : 'Show'}
          </button>
        </div>

        {showBlockedSendersSection && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500' }}>
                Add email to block list
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  value={newBlockedEmail}
                  onChange={(e) => setNewBlockedEmail(e.target.value)}
                  placeholder="spam@example.com"
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '13px',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
                <button
                  onClick={handleAddBlockedSender}
                  disabled={blockedSendersLoading}
                  className="mailbox-upload-btn"
                  style={{ margin: 0 }}
                >
                  {blockedSendersLoading ? 'Adding...' : 'Block'}
                </button>
              </div>
            </div>

            {blockedSenders.length > 0 ? (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>
                  Blocked emails ({blockedSenders.length}):
                </p>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {blockedSenders.map((email, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        marginBottom: '4px',
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px'
                      }}
                    >
                      <span style={{ fontSize: '13px' }}>{email}</span>
                      <button
                        onClick={() => handleRemoveBlockedSender(email)}
                        disabled={blockedSendersLoading}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                No blocked senders yet
              </p>
            )}

            {blockedSendersError && <p className="mailbox-settings-error">{blockedSendersError}</p>}
            {blockedSendersSuccess && <p className="mailbox-settings-success">{blockedSendersSuccess}</p>}
          </div>
        )}
      </div>

      <div className="mailbox-settings-footer-note">
        The image above is automatically embedded in every new email you send. Upload a square picture for best results.
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
