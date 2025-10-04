import React, { useState } from 'react';
import { FiSettings, FiUsers, FiShield, FiDatabase, FiMonitor, FiSave, FiX, FiEdit3, FiPlus, FiTrash2, FiUser, FiCamera } from 'react-icons/fi';
import './WorkspaceSettings.css';

function WorkspaceSettings({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [workspaceData, setWorkspaceData] = useState({
    name: 'NOXTM Workspace',
    description: 'Primary workspace for team collaboration',
    type: 'Business',
    plan: 'Professional',
    storage: '85% used (8.5GB of 10GB)',
    members: 12,
    projects: 8
  });

  const [editedWorkspace, setEditedWorkspace] = useState({ ...workspaceData });
  
  // Profile state management
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || '',
    status: user?.status || 'Active',
    profileImage: user?.profileImage || ''
  });
  const [editedProfile, setEditedProfile] = useState({ ...profileData });
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedWorkspace({ ...workspaceData });
    }
    setIsEditing(!isEditing);
  };

  const handleProfileEditToggle = () => {
    if (isEditingProfile) {
      setEditedProfile({ ...profileData });
      setProfileImage(profileData.profileImage || '');
    }
    setIsEditingProfile(!isEditingProfile);
  };

  const handleSave = () => {
    setWorkspaceData(editedWorkspace);
    setIsEditing(false);
    // Add API call here to save workspace settings
    console.log('Saving workspace data:', editedWorkspace);
  };

  const handleProfileSave = () => {
    setProfileData(editedProfile);
    setIsEditingProfile(false);
    // Add API call here to save profile settings
    console.log('Saving profile data:', editedProfile);
  };

  const handleInputChange = (field, value) => {
    setEditedWorkspace(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProfileInputChange = (field, value) => {
    setEditedProfile(prev => ({
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
        setEditedProfile(prev => ({
          ...prev,
          profileImage: imageUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage('');
    setEditedProfile(prev => ({
      ...prev,
      profileImage: ''
    }));
  };

  const renderGeneralSettings = () => (
    <div className="workspace-tab-content">
      <div className="workspace-info-card">
        <div className="workspace-info-header">
          <h3>🏢 Workspace Information</h3>
          {!isEditing && (
            <button className="btn-edit" onClick={handleEditToggle}>
              <FiEdit3 /> Edit Workspace
            </button>
          )}
        </div>
        
        {!isEditing ? (
          <div className="workspace-info-grid">
            <div className="info-item">
              <label>Workspace Name</label>
              <div className="info-value">{workspaceData.name}</div>
            </div>
            <div className="info-item">
              <label>Description</label>
              <div className="info-value">{workspaceData.description}</div>
            </div>
            <div className="info-item">
              <label>Workspace Type</label>
              <div className="info-value workspace-badge">{workspaceData.type}</div>
            </div>
            <div className="info-item">
              <label>Current Plan</label>
              <div className="info-value plan-badge">{workspaceData.plan}</div>
            </div>
            <div className="info-item">
              <label>Storage Usage</label>
              <div className="info-value">{workspaceData.storage}</div>
            </div>
            <div className="info-item">
              <label>Team Members</label>
              <div className="info-value">{workspaceData.members} members</div>
            </div>
          </div>
        ) : (
          <div className="workspace-edit-form">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Workspace Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editedWorkspace.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={editedWorkspace.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Workspace Type</label>
                <select
                  className="form-select"
                  value={editedWorkspace.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  <option value="Business">Business</option>
                  <option value="Personal">Personal</option>
                  <option value="Enterprise">Enterprise</option>
                  <option value="Educational">Educational</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Plan</label>
                <select
                  className="form-select"
                  value={editedWorkspace.plan}
                  onChange={(e) => handleInputChange('plan', e.target.value)}
                >
                  <option value="Free">Free</option>
                  <option value="Professional">Professional</option>
                  <option value="Business">Business</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={handleEditToggle}>
                <FiX /> Cancel
              </button>
              <button className="btn-save" onClick={handleSave}>
                <FiSave /> Save Changes
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="workspace-stats-grid">
        <div className="stats-card">
          <div className="stats-icon">
            <FiUsers />
          </div>
          <div className="stats-content">
            <h4>Team Members</h4>
            <div className="stats-number">{workspaceData.members}</div>
            <p>Active collaborators</p>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon">
            <FiDatabase />
          </div>
          <div className="stats-content">
            <h4>Projects</h4>
            <div className="stats-number">{workspaceData.projects}</div>
            <p>Active projects</p>
          </div>
        </div>
        <div className="stats-card">
          <div className="stats-icon">
            <FiMonitor />
          </div>
          <div className="stats-content">
            <h4>Storage</h4>
            <div className="stats-number">8.5GB</div>
            <p>of 10GB used</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMembersSettings = () => (
    <div className="workspace-tab-content">
      <div className="members-header">
        <h3>👥 Workspace Members</h3>
        <button className="btn-primary">
          <FiPlus /> Invite Members
        </button>
      </div>
      
      <div className="members-list">
        <div className="member-item">
          <div className="member-avatar">JD</div>
          <div className="member-info">
            <div className="member-name">John Doe</div>
            <div className="member-email">john@noxtm.com</div>
          </div>
          <div className="member-role">Admin</div>
          <div className="member-status active">Active</div>
          <button className="btn-remove">
            <FiTrash2 />
          </button>
        </div>
        
        <div className="member-item">
          <div className="member-avatar">SM</div>
          <div className="member-info">
            <div className="member-name">Sarah Miller</div>
            <div className="member-email">sarah@noxtm.com</div>
          </div>
          <div className="member-role">Project Manager</div>
          <div className="member-status active">Active</div>
          <button className="btn-remove">
            <FiTrash2 />
          </button>
        </div>
        
        <div className="member-item">
          <div className="member-avatar">RJ</div>
          <div className="member-info">
            <div className="member-name">Robert Johnson</div>
            <div className="member-email">robert@noxtm.com</div>
          </div>
          <div className="member-role">Developer</div>
          <div className="member-status pending">Pending</div>
          <button className="btn-remove">
            <FiTrash2 />
          </button>
        </div>
      </div>
    </div>
  );

  const renderProfileSettings = () => {
    const getDisplayProfile = () => isEditingProfile ? editedProfile : profileData;
    const displayProfile = getDisplayProfile();

    return (
      <div className="workspace-tab-content">
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
            {isEditingProfile && (
              <div className="profile-image-overlay" onClick={() => document.getElementById('image-upload').click()}>
                <FiCamera />
              </div>
            )}
          </div>
          <div className="profile-image-info">
            <h3>{displayProfile?.username || 'User'}</h3>
            <p>Upload a profile picture to personalize your account</p>
            {isEditingProfile && (
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

        {/* Profile Information */}
        {!isEditingProfile ? (
          <div className="user-preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>👤 Profile Information</h3>
              <button className="btn-edit" onClick={handleProfileEditToggle}>
                <FiEdit3 style={{ marginRight: '0.5rem' }} />
                Edit Profile
              </button>
            </div>
            <div className="user-preview-grid">
              <div className="user-preview-item">
                <p className="user-preview-label">Username:</p>
                <p className="user-preview-value">
                  {displayProfile?.username || 'Not specified'}
                </p>
              </div>
              <div className="user-preview-item">
                <p className="user-preview-label">Email:</p>
                <p className="user-preview-value">
                  {displayProfile?.email || 'Not specified'}
                </p>
              </div>
              <div className="user-preview-item">
                <p className="user-preview-label">Role:</p>
                <p className={`user-preview-value role-badge ${displayProfile?.role === 'User' ? 'role-user' : 'role-admin'}`}>
                  {displayProfile?.role || 'Not specified'}
                </p>
              </div>
              <div className="user-preview-item">
                <p className="user-preview-label">Status:</p>
                <p className="user-preview-value status-badge status-active">
                  {displayProfile?.status || 'Active'}
                </p>
              </div>
            </div>
            {displayProfile?.role === 'User' && (
              <div className="restricted-warning">
                <p style={{ margin: '0' }}>
                  ⚠️ <strong>Restricted Access:</strong> Your account has limited permissions. Contact an administrator to request additional access.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Profile Edit Form */
          <div className="edit-form">
            <h3>✏️ Edit Profile Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={editedProfile.username}
                  onChange={(e) => handleProfileInputChange('username', e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={editedProfile.email}
                  onChange={(e) => handleProfileInputChange('email', e.target.value)}
                  placeholder="Enter email"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={editedProfile.role}
                  onChange={(e) => handleProfileInputChange('role', e.target.value)}
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
                  value={editedProfile.status}
                  onChange={(e) => handleProfileInputChange('status', e.target.value)}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={handleProfileEditToggle}>
                <FiX style={{ marginRight: '0.5rem' }} />
                Cancel
              </button>
              <button className="btn-save" onClick={handleProfileSave}>
                <FiSave style={{ marginRight: '0.5rem' }} />
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Profile Settings Cards */}
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
      </div>
    );
  };

  const renderSecuritySettings = () => (
    <div className="workspace-tab-content">
      <h3>🔒 Security & Permissions</h3>
      
      <div className="security-grid">
        <div className="security-card">
          <h4>Access Control</h4>
          <p>Manage workspace access permissions and user roles.</p>
          <button className="btn-secondary">Configure Access</button>
        </div>
        
        <div className="security-card">
          <h4>Two-Factor Authentication</h4>
          <p>Require 2FA for all workspace members.</p>
          <label className="toggle-switch">
            <input type="checkbox" defaultChecked />
            <span className="toggle-slider"></span>
          </label>
        </div>
        
        <div className="security-card">
          <h4>Data Encryption</h4>
          <p>All workspace data is encrypted at rest and in transit.</p>
          <div className="security-status enabled">Enabled</div>
        </div>
        
        <div className="security-card">
          <h4>Audit Logs</h4>
          <p>Track all workspace activities and changes.</p>
          <button className="btn-secondary">View Logs</button>
        </div>
      </div>
    </div>
  );

  const renderIntegrationsSettings = () => (
    <div className="workspace-tab-content">
      <h3>🔗 Integrations & Apps</h3>
      
      <div className="integrations-grid">
        <div className="integration-card">
          <div className="integration-icon">📧</div>
          <div className="integration-info">
            <h4>Email Integration</h4>
            <p>Connect your email provider for seamless communication.</p>
          </div>
          <button className="btn-primary">Connect</button>
        </div>
        
        <div className="integration-card connected">
          <div className="integration-icon">📱</div>
          <div className="integration-info">
            <h4>Slack Integration</h4>
            <p>Get notifications and updates in your Slack channels.</p>
          </div>
          <button className="btn-connected">Connected</button>
        </div>
        
        <div className="integration-card">
          <div className="integration-icon">📊</div>
          <div className="integration-info">
            <h4>Analytics Tools</h4>
            <p>Connect Google Analytics and other tracking tools.</p>
          </div>
          <button className="btn-primary">Connect</button>
        </div>
        
        <div className="integration-card">
          <div className="integration-icon">☁️</div>
          <div className="integration-info">
            <h4>Cloud Storage</h4>
            <p>Sync files with Google Drive, Dropbox, or OneDrive.</p>
          </div>
          <button className="btn-primary">Connect</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="workspace-settings">
      <div className="workspace-header">
        <h2>Workspace Settings</h2>
        <p>Manage your workspace configuration, team members, and integrations.</p>
      </div>

      <div className="workspace-tabs">
        <button 
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <FiSettings /> General
        </button>
        <button 
          className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <FiUsers /> Members
        </button>
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <FiUser /> Profile
        </button>
        <button 
          className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <FiShield /> Security
        </button>
        <button 
          className={`tab-button ${activeTab === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveTab('integrations')}
        >
          <FiDatabase /> Integrations
        </button>
      </div>

      <div className="workspace-content">
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'members' && renderMembersSettings()}
        {activeTab === 'profile' && renderProfileSettings()}
        {activeTab === 'security' && renderSecuritySettings()}
        {activeTab === 'integrations' && renderIntegrationsSettings()}
      </div>

      {/* Danger Zone */}
      <div className="danger-zone">
        <h3>🚨 Danger Zone</h3>
        <p>Actions in this section are irreversible. Please proceed with caution.</p>
        <div className="danger-actions">
          <button className="btn-danger" onClick={onLogout}>
            Leave Workspace
          </button>
          <button className="btn-danger">
            Delete Workspace
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkspaceSettings;