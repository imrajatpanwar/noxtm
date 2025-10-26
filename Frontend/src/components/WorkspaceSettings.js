import React, { useState, useEffect } from 'react';
import { FiSettings, FiUsers, FiShield, FiDatabase, FiMonitor, FiSave, FiX, FiEdit3, FiPlus, FiTrash2, FiUser, FiCamera, FiCopy, FiCheck, FiMail, FiLink } from 'react-icons/fi';
import { toast } from 'sonner';
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

  // Company members state
  const [companyMembers, setCompanyMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [companyDetails, setCompanyDetails] = useState(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteExpiresAt, setInviteExpiresAt] = useState(null);
  
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

  // Fetch company members
  const fetchCompanyMembers = async () => {
    setLoadingMembers(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        setCompanyMembers([]);
        setLoadingMembers(false);
        return;
      }

      console.log('Fetching company members...');
      const response = await fetch('/api/company/members', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.success) {
        setCompanyMembers(data.members || []);
        if (data.companyName) {
          setWorkspaceData(prev => ({ ...prev, name: data.companyName }));
        }
        console.log('Loaded members:', data.members?.length || 0);
      } else {
        console.log('No company members:', data.message);
        setCompanyMembers([]);
        // Don't show error toast if user simply doesn't have a company
        if (response.status !== 404) {
          toast.error(data.message || 'Failed to load company members');
        }
      }
    } catch (error) {
      console.error('Error fetching company members:', error);
      toast.error('Failed to load company members: ' + error.message);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Fetch company details
  const fetchCompanyDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found for company details');
        return;
      }

      console.log('Fetching company details...');
      const response = await fetch('/api/company/details', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log('Company details response:', data);

      if (response.ok && data.success) {
        setCompanyDetails(data.company);
        console.log('Company details loaded:', data.company);
      } else {
        console.log('No company details:', data.message);
        setCompanyDetails(null);
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
      setCompanyDetails(null);
    }
  };

  // Generate invite link
  const handleGenerateInvite = async () => {
    if (!inviteEmail || !inviteEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setGeneratingInvite(true);
    try {
      const response = await fetch('/api/company/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          email: inviteEmail,
          roleInCompany: inviteRole
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInviteLink(data.inviteUrl);
        setInviteExpiresAt(data.expiresAt);
        toast.success(data.message || 'Invitation created successfully');
      } else {
        toast.error(data.message || 'Failed to generate invite link');
      }
    } catch (error) {
      console.error('Error generating invite:', error);
      toast.error('Failed to generate invite link');
    } finally {
      setGeneratingInvite(false);
    }
  };

  // Copy invite link to clipboard
  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Invite link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Remove member from company
  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the company?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/company/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Member removed successfully');
        fetchCompanyMembers(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  // Close invite modal
  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('Member');
    setInviteLink('');
    setCopied(false);
    setInviteExpiresAt(null);
  };

  // Load members when Members tab is active
  useEffect(() => {
    if (activeTab === 'members') {
      fetchCompanyMembers();
      fetchCompanyDetails();
    }
  }, [activeTab]);

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

  const renderMembersSettings = () => {
    const getInitials = (name) => {
      if (!name) return '?';
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    const isOwnerOrAdmin = () => {
      // If user doesn't have a company, they can't invite
      if (!user?.companyId) return false;

      // If we have company details and user is the owner, they can invite
      if (companyDetails && companyDetails.owner?._id === user._id) {
        return true;
      }

      // Check if user is in members list with Owner or Admin role
      if (companyMembers.length > 0) {
        const currentUserMember = companyMembers.find(m => m._id === user?._id);
        if (currentUserMember && ['Owner', 'Admin'].includes(currentUserMember.roleInCompany)) {
          return true;
        }
      }

      // If we have companyId but details haven't loaded yet, show the button
      // The API will validate permissions anyway
      return user?.companyId ? true : false;
    };

    return (
      <div className="workspace-tab-content">
        <div className="members-header">
          <div>
            <h3>👥 Company Members</h3>
            {companyDetails && (
              <p className="members-subtitle">
                {companyDetails.companyName} • {companyMembers.length} member{companyMembers.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {isOwnerOrAdmin() && (
            <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
              <FiPlus /> Invite Members
            </button>
          )}
        </div>

        {loadingMembers ? (
          <div className="loading-members">Loading members...</div>
        ) : !user?.companyId ? (
          <div className="no-members">
            <h4>No Company Associated</h4>
            <p>You need to set up a company first to manage members.</p>
            <p>Subscribe to the Noxtm plan and complete company setup to get started.</p>
          </div>
        ) : companyMembers.length === 0 ? (
          <div className="no-members">
            <h4>No Members Yet</h4>
            <p>Start by inviting team members to your company.</p>
          </div>
        ) : (
          <div className="members-list">
            {companyMembers.map(member => (
              <div key={member._id} className="member-item">
                <div className="member-avatar">
                  {member.profileImage ? (
                    <img src={member.profileImage} alt={member.fullName} />
                  ) : (
                    getInitials(member.fullName)
                  )}
                </div>
                <div className="member-info">
                  <div className="member-name">{member.fullName || 'Unknown'}</div>
                  <div className="member-email">{member.email || 'No email'}</div>
                </div>
                <div className="member-role-badge">{member.roleInCompany || 'Member'}</div>
                <div className={`member-status ${member.status?.toLowerCase() || 'active'}`}>
                  {member.status || 'Active'}
                </div>
                {isOwnerOrAdmin() && member._id !== companyDetails?.owner?._id && (
                  <button
                    className="btn-remove"
                    onClick={() => handleRemoveMember(member._id, member.fullName)}
                    title="Remove member"
                  >
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="modal-overlay" onClick={handleCloseInviteModal}>
            <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FiMail /> Invite New Member</h3>
                <button className="btn-close" onClick={handleCloseInviteModal}>
                  <FiX />
                </button>
              </div>

              {!inviteLink ? (
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={generatingInvite}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Role in Company</label>
                    <select
                      className="form-select"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      disabled={generatingInvite}
                    >
                      <option value="Member">Member</option>
                      <option value="Admin">Admin</option>
                    </select>
                    <p className="form-hint">
                      Admins can invite and manage other members
                    </p>
                  </div>

                  <div className="modal-actions">
                    <button
                      className="btn-cancel"
                      onClick={handleCloseInviteModal}
                      disabled={generatingInvite}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleGenerateInvite}
                      disabled={generatingInvite}
                    >
                      {generatingInvite ? 'Generating...' : 'Generate Invite Link'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="modal-body">
                  <div className="invite-success">
                    <FiCheck className="success-icon" />
                    <h4>Invitation Created!</h4>
                    <p>Share this link with {inviteEmail}</p>
                  </div>

                  <div className="invite-link-container">
                    <input
                      type="text"
                      className="form-input invite-link-input"
                      value={inviteLink}
                      readOnly
                    />
                    <button
                      className={`btn-copy ${copied ? 'copied' : ''}`}
                      onClick={handleCopyInviteLink}
                    >
                      {copied ? <FiCheck /> : <FiCopy />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  {inviteExpiresAt && (
                    <p className="invite-expiry">
                      This link expires on {new Date(inviteExpiresAt).toLocaleDateString()} at {new Date(inviteExpiresAt).toLocaleTimeString()}
                    </p>
                  )}

                  <div className="modal-actions">
                    <button
                      className="btn-primary full-width"
                      onClick={handleCloseInviteModal}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

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