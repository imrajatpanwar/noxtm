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
          <strong>{account?.displayName || 'Not set'}</strong>
        </div>
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
          <strong>{account?.quota ?? 'Not set'}</strong>
        </div>
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
