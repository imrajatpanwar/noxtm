import React, { useRef } from 'react';
import PropTypes from 'prop-types';

const buildFallbackAvatar = (name, email) => {
  const label = name || email || 'User';
  return `https://ui-avatars.com/api/?background=3B82F6&color=fff&name=${encodeURIComponent(label)}`;
};

const ProfileSettings = ({ account, user, onAvatarUpload, uploading, uploadError, uploadSuccess }) => {
  const fileInputRef = useRef(null);
  const displayName = user?.fullName || account?.displayName || account?.email || 'Mailbox User';
  const avatarSrc = user?.profileImage || buildFallbackAvatar(displayName, account?.email || user?.email);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onAvatarUpload(file);
      event.target.value = '';
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
