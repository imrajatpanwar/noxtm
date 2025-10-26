import React, { useState, useEffect, useCallback } from 'react';
import { FiCamera, FiEdit2, FiSave, FiX, FiUser, FiLock, FiAlertCircle, FiCheck } from 'react-icons/fi';
import api from '../config/api';
import './ProfileSettings.css';

function ProfileSettings({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [editedUser, setEditedUser] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    bio: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      setUser(response.data.user);
      setEditedUser({
        fullName: response.data.user.fullName || '',
        username: response.data.user.username || '',
        email: response.data.user.email || '',
        phoneNumber: response.data.user.phoneNumber || '',
        bio: response.data.user.bio || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      showMessage('error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  // Fetch current user profile
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset to original values
      setEditedUser({
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || ''
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const response = await api.put('/profile', editedUser);
      setUser(response.data.user);
      setIsEditing(false);
      showMessage('success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showMessage('error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showMessage('error', 'Image size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setLoading(true);
          const imageUrl = e.target.result;
          const response = await api.put('/profile/picture', {
            profileImage: imageUrl
          });
          setUser(response.data.user);
          showMessage('success', 'Profile picture updated successfully');
        } catch (error) {
          console.error('Error uploading image:', error);
          showMessage('error', error.response?.data?.message || 'Failed to upload image');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async () => {
    try {
      setLoading(true);
      const response = await api.delete('/profile/picture');
      setUser(response.data.user);
      showMessage('success', 'Profile picture removed successfully');
    } catch (error) {
      console.error('Error removing image:', error);
      showMessage('error', error.response?.data?.message || 'Failed to remove image');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('error', 'New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage('error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      await api.put('/profile/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMessage('success', 'Password changed successfully');
    } catch (error) {
      console.error('Error changing password:', error);
      showMessage('error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getSubscriptionBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'badge-active';
      case 'inactive': return 'badge-inactive';
      case 'pending': return 'badge-pending';
      default: return 'badge-inactive';
    }
  };

  if (loading && !user) {
    return (
      <div className="profile-settings">
        <div className="loading-state">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-settings">
      {/* Header */}
      <div className="profile-header">
        <h1>Profile Settings</h1>
        <p className="subtitle">Manage your personal information and preferences</p>
      </div>

      {/* Message Alert */}
      {message.text && (
        <div className={`message-alert ${message.type}`}>
          {message.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="profile-card">
        {/* Profile Picture Section */}
        <div className="profile-picture-section">
          <div className="picture-container">
            <div className="picture-wrapper">
              {user?.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  <FiUser />
                </div>
              )}
              <div className="picture-overlay" onClick={() => document.getElementById('image-upload').click()}>
                <FiCamera />
                <span>Change Photo</span>
              </div>
            </div>
            <input
              type="file"
              id="image-upload"
              className="file-input"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={loading}
            />
          </div>
          <div className="picture-info">
            <h2>{user?.fullName || 'User'}</h2>
            <p className="role-badge">{user?.role || 'User'}</p>
            {user?.profileImage && (
              <button
                className="btn-remove-picture"
                onClick={handleRemoveImage}
                disabled={loading}
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="profile-info-section">
          <div className="section-header">
            <h3>Personal Information</h3>
            {!isEditing ? (
              <button className="btn-edit" onClick={handleEditToggle}>
                <FiEdit2 />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="edit-actions">
                <button className="btn-cancel" onClick={handleEditToggle} disabled={loading}>
                  <FiX />
                  <span>Cancel</span>
                </button>
                <button className="btn-save" onClick={handleSaveProfile} disabled={loading}>
                  <FiSave />
                  <span>Save Changes</span>
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <div className="info-grid">
              <div className="info-item">
                <label>Full Name</label>
                <p>{user?.fullName || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Username</label>
                <p>{user?.username || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Email Address</label>
                <p>{user?.email || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Phone Number</label>
                <p>{user?.phoneNumber || 'Not set'}</p>
              </div>
              <div className="info-item full-width">
                <label>Bio</label>
                <p className="bio-text">{user?.bio || 'No bio added yet'}</p>
              </div>
            </div>
          ) : (
            <div className="edit-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={editedUser.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={editedUser.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Choose a username"
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={editedUser.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="your.email@example.com"
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={editedUser.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="form-group full-width">
                <label>Bio</label>
                <textarea
                  value={editedUser.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                  rows="4"
                  maxLength="500"
                />
                <span className="char-count">{editedUser.bio.length}/500</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Details Card */}
      <div className="account-details-card">
        <h3>Account Details</h3>
        <div className="details-grid">
          <div className="detail-item">
            <label>Role</label>
            <p className="role-value">{user?.role || 'User'}</p>
          </div>
          <div className="detail-item">
            <label>Status</label>
            <p className={`status-badge status-${user?.status?.toLowerCase()}`}>
              {user?.status || 'Active'}
            </p>
          </div>
          <div className="detail-item">
            <label>Company</label>
            <p>{user?.companyId?.companyName || 'Not assigned'}</p>
          </div>
          <div className="detail-item">
            <label>Subscription Plan</label>
            <p>{user?.subscription?.plan || 'None'}</p>
          </div>
          <div className="detail-item">
            <label>Subscription Status</label>
            <p className={`subscription-badge ${getSubscriptionBadgeClass(user?.subscription?.status)}`}>
              {user?.subscription?.status || 'Inactive'}
            </p>
          </div>
          <div className="detail-item">
            <label>Member Since</label>
            <p>{formatDate(user?.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Security Card */}
      <div className="security-card">
        <h3>Security</h3>
        <div className="security-content">
          <div className="security-item">
            <div className="security-info">
              <FiLock className="security-icon" />
              <div>
                <h4>Password</h4>
                <p>Update your password to keep your account secure</p>
              </div>
            </div>
            <button className="btn-change-password" onClick={() => setShowPasswordModal(true)}>
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Logout Card */}
      <div className="logout-card">
        <div className="logout-content">
          <div>
            <h4>Sign Out</h4>
            <p>Sign out of your account on this device</p>
          </div>
          <button className="btn-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="btn-close" onClick={() => setShowPasswordModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileSettings;
