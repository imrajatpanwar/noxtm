import React, { useState } from 'react';
import { FiCamera, FiEdit3, FiSave, FiX, FiUser } from 'react-icons/fi';
import './ProfileSettings.css';

function ProfileSettings({ user, onLogout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || '',
    status: user?.status || 'Active',
    profileImage: user?.profileImage || ''
  });
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset to original values when canceling
      setEditedUser({
        username: user?.username || '',
        email: user?.email || '',
        role: user?.role || '',
        status: user?.status || 'Active',
        profileImage: user?.profileImage || ''
      });
      setProfileImage(user?.profileImage || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    // Here you would typically make an API call to update the user
    console.log('Saving user data:', editedUser);
    // For now, just toggle edit mode
    setIsEditing(false);
    // You can add actual save logic here
  };

  const handleInputChange = (field, value) => {
    setEditedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setProfileImage(imageUrl);
        setEditedUser(prev => ({
          ...prev,
          profileImage: imageUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage('');
    setEditedUser(prev => ({
      ...prev,
      profileImage: ''
    }));
  };

  const getDisplayUser = () => isEditing ? editedUser : user;
  const displayUser = getDisplayUser();

  return (
    <div className="profile-settings">
      <div className="profile-header">
        <h2>Profile Settings</h2>
        <p>Manage your personal profile information and account preferences.</p>
      </div>

      {/* Profile Image Section */}
      <div className="profile-image-section">
        <div className="profile-image-container">
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="profile-image" />
          ) : (
            <div className="profile-image">
              <FiUser />
            </div>
          )}
          {isEditing && (
            <div className="profile-image-overlay" onClick={() => document.getElementById('image-upload').click()}>
              <FiCamera />
            </div>
          )}
        </div>
        <div className="profile-image-info">
          <h3>{displayUser?.username || 'User'}</h3>
          <p>Upload a profile picture to personalize your account</p>
          {isEditing && (
            <div className="image-upload-buttons">
              <input
                type="file"
                id="image-upload"
                className="file-input"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <button className="btn-upload" onClick={() => document.getElementById('image-upload').click()}>
                Upload Image
              </button>
              <button 
                className="btn-remove" 
                onClick={handleRemoveImage}
                disabled={!profileImage}
              >
                Remove Image
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* User Preview Section */}
      {!isEditing ? (
        <div className="user-preview">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>👤 User Information</h3>
            <button className="btn-edit" onClick={handleEditToggle}>
              <FiEdit3 style={{ marginRight: '0.5rem' }} />
              Edit Profile
            </button>
          </div>
          <div className="user-preview-grid">
            <div className="user-preview-item">
              <p className="user-preview-label">Username:</p>
              <p className="user-preview-value">
                {displayUser?.username || 'Not specified'}
              </p>
            </div>
            <div className="user-preview-item">
              <p className="user-preview-label">Email:</p>
              <p className="user-preview-value">
                {displayUser?.email || 'Not specified'}
              </p>
            </div>
            <div className="user-preview-item">
              <p className="user-preview-label">Role:</p>
              <p className={`user-preview-value role-badge ${displayUser?.role === 'User' ? 'role-user' : 'role-admin'}`}>
                {displayUser?.role || 'Not specified'}
              </p>
            </div>
            <div className="user-preview-item">
              <p className="user-preview-label">Status:</p>
              <p className="user-preview-value status-badge status-active">
                {displayUser?.status || 'Active'}
              </p>
            </div>
          </div>
          {displayUser?.role === 'User' && (
            <div className="restricted-warning">
              <p style={{ margin: '0' }}>
                ⚠️ <strong>Restricted Access:</strong> Your account has limited permissions. Contact an administrator to request additional access.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Edit Form */
        <div className="edit-form">
          <h3>✏️ Edit Profile Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={editedUser.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={editedUser.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-select"
                value={editedUser.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="Web Developer">Web Developer</option>
                <option value="Project Manager">Project Manager</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={editedUser.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-cancel" onClick={handleEditToggle}>
              <FiX style={{ marginRight: '0.5rem' }} />
              Cancel
            </button>
            <button className="btn-save" onClick={handleSave}>
              <FiSave style={{ marginRight: '0.5rem' }} />
              Save Changes
            </button>
          </div>
        </div>
      )}

      <div className="settings-grid">
        <div className="settings-card">
          <h3>Personal Information</h3>
          <p>Update your name, email, phone number, and contact details.</p>
        </div>
        
        <div className="settings-card">
          <h3>Account Security</h3>
          <p>Change password, enable two-factor authentication, and security settings.</p>
        </div>
        
        <div className="settings-card">
          <h3>Preferences</h3>
          <p>Configure notifications, language, timezone, and display preferences.</p>
        </div>
        
        <div className="settings-card">
          <h3>Privacy Settings</h3>
          <p>Manage data privacy, visibility settings, and account permissions.</p>
        </div>
      </div>
      
      {/* Account Actions Section */}
      <div className="account-actions">
        <h3>Account Actions</h3>
        <p>Manage your account session and security.</p>
        
        <div className="logout-section">
          <div className="logout-info">
            <p className="logout-current-user">
              Currently logged in as: <strong>{displayUser?.username || displayUser?.email || 'User'}</strong>
            </p>
            <p className="logout-current-role">
              Role: {displayUser?.role || 'Not specified'}
            </p>
          </div>
          
          <button className="btn-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
