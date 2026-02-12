import React, { useState, useEffect, useCallback } from 'react';
import { FiSettings, FiUsers, FiShield, FiDatabase, FiSave, FiX, FiEdit3, FiPlus, FiTrash2, FiCopy, FiCheck, FiMail, FiPackage, FiUser, FiPhone, FiCalendar, FiBriefcase, FiCamera, FiMapPin, FiClock } from 'react-icons/fi';
import { toast } from 'sonner';
import { DEPARTMENTS, PERMISSION_LABELS } from '../utils/departmentDefaults';
import { useModules } from '../contexts/ModuleContext';
import api from '../config/api';
import exhibitosLogo from './assets/exhibitos.svg';
import botgitLogo from './assets/botgit-logo.svg';
import './WorkspaceSettings.css';

const EMPTY_PERMISSIONS = Object.keys(PERMISSION_LABELS).reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {});

function WorkspaceSettings({ user, onLogout }) {
  const { isModuleInstalled, isModuleInstalling, installModule, uninstallModule } = useModules();
  const [activeTab, setActiveTab] = useState('general');
  const [moduleTab, setModuleTab] = useState('all'); // 'all' or 'installed'
  const [isEditing, setIsEditing] = useState(false);
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
  const [inviteJobTitle, setInviteJobTitle] = useState('');
  const [inviteDepartment, setInviteDepartment] = useState('Management Team');
  const [customPermissions, setCustomPermissions] = useState({ ...EMPTY_PERMISSIONS });
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteExpiresAt, setInviteExpiresAt] = useState(null);

  // Edit permissions modal state
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editPermissions, setEditPermissions] = useState({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Profile state
  const [profileData, setProfileData] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedWorkspace({ ...workspaceData });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    setWorkspaceData(editedWorkspace);
    setIsEditing(false);
    // Add API call here to save workspace settings
    console.log('Saving workspace data:', editedWorkspace);
  };

  const handleInputChange = (field, value) => {
    setEditedWorkspace(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch company members
  const fetchCompanyMembers = useCallback(async () => {
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
      const response = await api.get('/company/members');
      const data = response.data;
      console.log('Response data:', data);

      if (data.success) {
        setCompanyMembers(data.members || []);
        if (data.companyName) {
          setWorkspaceData(prev => ({ ...prev, name: data.companyName }));
        }
        console.log('Loaded members:', data.members?.length || 0);
      } else {
        console.log('No company members:', data.message);
        setCompanyMembers([]);
      }
    } catch (error) {
      console.error('Error fetching company members:', error);
      // Don't show error toast if user simply doesn't have a company (404)
      if (error.response?.status !== 404) {
        toast.error(error.response?.data?.message || 'Failed to load company members');
      }
      setCompanyMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // Fetch company details
  const fetchCompanyDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found for company details');
        return;
      }

      console.log('Fetching company details...');
      const response = await api.get('/company/details');
      const data = response.data;
      console.log('Company details response:', data);

      if (data.success) {
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
  }, []);

  // Generate invite link
  const handleGenerateInvite = async () => {
    if (!inviteEmail || !inviteEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!inviteDepartment) {
      toast.error('Please select a department');
      return;
    }

    const hasAtLeastOnePermission = Object.values(customPermissions || {}).some(v => v === true);
    if (!hasAtLeastOnePermission) {
      toast.error('Select at least one permission to send an invite');
      return;
    }

    setGeneratingInvite(true);
    try {
      const response = await api.post('/company/invite', {
        email: inviteEmail,
        department: inviteDepartment,
        jobTitle: inviteJobTitle,
        customPermissions: customPermissions
      });

      const data = response.data;

      if (data.success) {
        setInviteLink(data.inviteUrl);
        setInviteExpiresAt(data.expiresAt);
        toast.success(data.message || 'Invitation created successfully');
      } else {
        toast.error(data.message || 'Failed to generate invite link');
      }
    } catch (error) {
      console.error('Error generating invite:', error);
      toast.error(error.response?.data?.message || 'Failed to generate invite link');
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
      const response = await api.delete(`/company/members/${memberId}`);
      const data = response.data;

      if (data.success) {
        toast.success('Member removed successfully');
        fetchCompanyMembers(); // Refresh the list
      } else {
        toast.error(data.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  // Close invite modal
  const handleCloseInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteJobTitle('');
    setInviteDepartment('Management Team');
    setCustomPermissions({ ...EMPTY_PERMISSIONS });
    setInviteLink('');
    setCopied(false);
    setInviteExpiresAt(null);
  };

  // Handle department change
  const handleDepartmentChange = (department) => {
    setInviteDepartment(department);
  };

  // Handle permission toggle
  const handlePermissionToggle = (permissionKey) => {
    setCustomPermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  // Open edit permissions modal
  const handleEditMemberPermissions = (member) => {
    setSelectedMember(member);
    setEditPermissions(member.permissions || {});
    setShowEditPermissionsModal(true);
  };

  // Save edited permissions
  const handleSavePermissions = async () => {
    if (!selectedMember) return;

    setSavingPermissions(true);
    try {
      const response = await api.put(`/company/members/${selectedMember._id}/permissions`, {
        permissions: editPermissions
      });

      const data = response.data;

      if (data.success) {
        toast.success('Permissions updated successfully');
        setShowEditPermissionsModal(false);
        fetchCompanyMembers(); // Refresh members list
      } else {
        toast.error(data.message || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setSavingPermissions(false);
    }
  };

  // Toggle edit permission
  const handleEditPermissionToggle = (permissionKey) => {
    setEditPermissions(prev => ({
      ...prev,
      [permissionKey]: !prev[permissionKey]
    }));
  };

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const response = await api.get('/profile');
      const d = response.data;
      setProfileData(d);
      setEditedProfile({
        fullName: d?.fullName || '',
        email: d?.email || '',
        phoneNumber: d?.phoneNumber || '',
        businessEmail: d?.businessEmail || '',
        bio: d?.bio || '',
        jobTitle: d?.jobTitle || '',
        department: d?.department || '',
        dateOfBirth: d?.dateOfBirth ? d.dateOfBirth.split('T')[0] : '',
        address: d?.address || '',
        city: d?.city || '',
        state: d?.state || '',
        country: d?.country || '',
        linkedIn: d?.linkedIn || '',
        website: d?.website || '',
        timezone: d?.timezone || 'UTC',
        qualification: d?.qualification || '',
        institute: d?.institute || '',
        yearOfPassing: d?.yearOfPassing || '',
        emergencyContactName: d?.emergencyContact?.name || '',
        emergencyContactRelation: d?.emergencyContact?.relation || '',
        emergencyContactPhone: d?.emergencyContact?.phone || '',
        emergencyContactAddress: d?.emergencyContact?.address || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  // Handle profile edit toggle
  const handleProfileEditToggle = () => {
    if (isEditingProfile) {
      const d = profileData;
      setEditedProfile({
        fullName: d?.fullName || '',
        email: d?.email || '',
        phoneNumber: d?.phoneNumber || '',
        businessEmail: d?.businessEmail || '',
        bio: d?.bio || '',
        jobTitle: d?.jobTitle || '',
        department: d?.department || '',
        dateOfBirth: d?.dateOfBirth ? d.dateOfBirth.split('T')[0] : '',
        address: d?.address || '',
        city: d?.city || '',
        state: d?.state || '',
        country: d?.country || '',
        linkedIn: d?.linkedIn || '',
        website: d?.website || '',
        timezone: d?.timezone || 'UTC',
        qualification: d?.qualification || '',
        institute: d?.institute || '',
        yearOfPassing: d?.yearOfPassing || '',
        emergencyContactName: d?.emergencyContact?.name || '',
        emergencyContactRelation: d?.emergencyContact?.relation || '',
        emergencyContactPhone: d?.emergencyContact?.phone || '',
        emergencyContactAddress: d?.emergencyContact?.address || '',
      });
    }
    setIsEditingProfile(!isEditingProfile);
  };

  // Handle profile input change
  const handleProfileInputChange = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const updateData = {
        fullName: editedProfile.fullName,
        phoneNumber: editedProfile.phoneNumber,
        businessEmail: editedProfile.businessEmail,
        bio: editedProfile.bio,
        jobTitle: editedProfile.jobTitle,
        department: editedProfile.department,
        dateOfBirth: editedProfile.dateOfBirth || null,
        address: editedProfile.address,
        city: editedProfile.city,
        state: editedProfile.state,
        country: editedProfile.country,
        linkedIn: editedProfile.linkedIn,
        website: editedProfile.website,
        timezone: editedProfile.timezone,
        qualification: editedProfile.qualification,
        institute: editedProfile.institute,
        yearOfPassing: editedProfile.yearOfPassing,
        emergencyContact: {
          name: editedProfile.emergencyContactName,
          relation: editedProfile.emergencyContactRelation,
          phone: editedProfile.emergencyContactPhone,
          address: editedProfile.emergencyContactAddress,
        }
      };

      await api.put('/profile', updateData);
      toast.success('Profile updated successfully');
      setIsEditingProfile(false);
      fetchProfile();
      // Update localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.fullName = editedProfile.fullName;
        localStorage.setItem('user', JSON.stringify(userData));
        window.dispatchEvent(new Event('userUpdated'));
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Upload profile picture
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      const response = await api.post('/profile/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data?.imageUrl) {
        setProfileData(prev => ({ ...prev, profileImage: response.data.imageUrl }));
        toast.success('Profile picture updated');
        // Update localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userData.profileImage = response.data.imageUrl;
          localStorage.setItem('user', JSON.stringify(userData));
          window.dispatchEvent(new Event('userUpdated'));
        }
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Load data when tabs are active
  useEffect(() => {
    if (activeTab === 'members') {
      fetchCompanyMembers();
      fetchCompanyDetails();
    } else if (activeTab === 'profile') {
      fetchProfile();
      if (user?.companyId) {
        fetchCompanyMembers();
        fetchCompanyDetails();
      }
    }
  }, [activeTab, fetchCompanyDetails, fetchCompanyMembers, fetchProfile, user?.companyId]);

  const renderGeneralSettings = () => (
    <div className="workspace-tab-content">
      {/* Minimal Workspace Card */}
      <div className="ws-minimal-card">
        <div className="ws-minimal-header">
          <h3>Workspace</h3>
          {!isEditing ? (
            <button className="ws-minimal-edit-btn" onClick={handleEditToggle}>
              Edit
            </button>
          ) : (
            <div className="ws-minimal-actions">
              <button className="ws-minimal-save-btn" onClick={handleSave}>
                <FiSave /> Save
              </button>
              <button className="ws-minimal-cancel-btn" onClick={handleEditToggle}>
                Cancel
              </button>
            </div>
          )}
        </div>

        {!isEditing ? (
          <div className="ws-minimal-grid">
            <div className="ws-minimal-field">
              <label>Name</label>
              <p>{workspaceData.name}</p>
            </div>
            <div className="ws-minimal-field">
              <label>Type</label>
              <p>{workspaceData.type}</p>
            </div>
            <div className="ws-minimal-field ws-minimal-full">
              <label>Description</label>
              <p>{workspaceData.description || '—'}</p>
            </div>
          </div>
        ) : (
          <div className="ws-minimal-grid">
            <div className="ws-minimal-field">
              <label>Name</label>
              <input
                type="text"
                value={editedWorkspace.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div className="ws-minimal-field">
              <label>Type</label>
              <select
                value={editedWorkspace.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
              >
                <option value="Business">Business</option>
                <option value="Personal">Personal</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Educational">Educational</option>
              </select>
            </div>
            <div className="ws-minimal-field ws-minimal-full">
              <label>Description</label>
              <input
                type="text"
                value={editedWorkspace.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="ws-minimal-divider"></div>

        <div className="ws-minimal-grid">
          <div className="ws-minimal-field">
            <label>Plan</label>
            <p className="ws-minimal-plan">{workspaceData.plan}</p>
          </div>
          <div className="ws-minimal-field">
            <label>Team Members</label>
            <p>{workspaceData.members}</p>
          </div>
          <div className="ws-minimal-field">
            <label>Projects</label>
            <p>{workspaceData.projects}</p>
          </div>
          <div className="ws-minimal-field">
            <label>Storage</label>
            <p>{workspaceData.storage}</p>
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

    const canInviteMembers = () => {
      // If user doesn't have a company, they can't invite
      if (!user?.companyId) return false;

      // If we have company details and user is the owner, they can invite
      if (companyDetails && companyDetails.owner?._id === user._id) {
        return true;
      }

      // If user has custom permission to manage settings, allow inviting
      if (user?.permissions?.settingsConfiguration === true) {
        return true;
      }

      // Check if user is in members list with Owner role
      if (companyMembers.length > 0) {
        const currentUserMember = companyMembers.find(m => m._id === user?._id);
        if (currentUserMember && ['Owner'].includes(currentUserMember.roleInCompany)) {
          return true;
        }
      }

      return false;
    };

    return (
      <div className="workspace-tab-content">
        <div className="members-section">
          <div className="members-header-card">
            <div className="members-header-content">
              <div className="members-header-left">
                <div className="members-header-icon">
                  <FiUsers />
                </div>
                <div className="members-header-text">
                  <h3>Company Members</h3>
                  {companyDetails && (
                    <p className="members-subtitle">
                      {companyDetails.companyName}
                    </p>
                  )}
                </div>
              </div>
              <div className="members-header-right">
                {companyMembers.length > 0 && (
                  <div className="members-count-badge">
                    {companyMembers.length} member{companyMembers.length !== 1 ? 's' : ''}
                  </div>
                )}
                {canInviteMembers() && (
                  <button className="btn-primary" onClick={() => setShowInviteModal(true)}>
                    <FiPlus /> Invite
                  </button>
                )}
              </div>
            </div>
          </div>

          {loadingMembers ? (
            <div className="members-loading">
              <div className="loading-spinner"></div>
              <span>Loading members...</span>
            </div>
          ) : !user?.companyId ? (
            <div className="members-empty-state">
              <div className="empty-state-icon">
                <FiBriefcase />
              </div>
              <h4>No Company Associated</h4>
              <p>You need to set up a company first to manage members.</p>
              <p className="empty-state-hint">Subscribe to the Noxtm plan and complete company setup to get started.</p>
            </div>
          ) : companyMembers.length === 0 ? (
            <div className="members-empty-state">
              <div className="empty-state-icon">
                <FiUsers />
              </div>
              <h4>No Members Yet</h4>
              <p>Start by inviting team members to your company.</p>
              {canInviteMembers() && (
                <button className="btn-primary mt-16" onClick={() => setShowInviteModal(true)}>
                  <FiPlus /> Invite First Member
                </button>
              )}
            </div>
          ) : (
            <div className="members-grid">
              {companyMembers.map(member => (
                <div key={member._id} className="member-card">
                  <div className="member-card-header">
                    <div className="member-avatar-lg">
                      {member.profileImage ? (
                        <img src={member.profileImage} alt={member.fullName} />
                      ) : (
                        getInitials(member.fullName)
                      )}
                      <span className={`member-status-dot ${member.status?.toLowerCase() || 'active'}`}></span>
                    </div>
                    <div className="member-card-info">
                      <h4 className="member-card-name">{member.fullName || 'Unknown'}</h4>
                      <p className="member-card-email">{member.email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="member-card-meta">
                    <div className="member-meta-item">
                      <FiBriefcase className="meta-icon" />
                      <span>{member.roleInCompany === 'Owner' ? 'Owner' : (member.jobTitle || 'Employee')}</span>
                    </div>
                    {member.department && (
                      <div className="member-meta-item">
                        <FiDatabase className="meta-icon" />
                        <span>{member.department}</span>
                      </div>
                    )}
                  </div>
                  {canInviteMembers() && member._id !== companyDetails?.owner?._id && (
                    <div className="member-card-actions">
                      <button
                        className="btn-icon-action"
                        onClick={() => handleEditMemberPermissions(member)}
                        title="Edit permissions"
                      >
                        <FiShield />
                      </button>
                      <button
                        className="btn-icon-action btn-icon-danger"
                        onClick={() => handleRemoveMember(member._id, member.fullName)}
                        title="Remove member"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                  {member._id === companyDetails?.owner?._id && (
                    <div className="member-card-owner-badge">
                      <span>Owner</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="noxtm-overlay" onClick={handleCloseInviteModal}>
            <div className="modal-content invite-modal-redesigned" onClick={(e) => e.stopPropagation()}>
              <div className="invite-modal-header">
                <div className="invite-modal-header-icon">
                  <FiMail />
                </div>
                <div className="invite-modal-header-text">
                  <h3>Invite New Member</h3>
                  <p>Send an invitation to join your company</p>
                </div>
                <button className="btn-close" onClick={handleCloseInviteModal}>
                  <FiX />
                </button>
              </div>

              {!inviteLink ? (
                <>
                  <div className="invite-modal-body">
                    <div className="invite-form-group">
                      <label className="invite-form-label">
                        <FiMail className="label-icon" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        className="invite-form-input"
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        disabled={generatingInvite}
                      />
                    </div>

                    <div className="invite-form-row">
                      <div className="invite-form-group">
                        <label className="invite-form-label">
                          <FiBriefcase className="label-icon" />
                          Role / Title
                        </label>
                        <input
                          type="text"
                          className="invite-form-input"
                          placeholder="e.g. Project Manager, Designer"
                          value={inviteJobTitle}
                          onChange={(e) => setInviteJobTitle(e.target.value)}
                          disabled={generatingInvite}
                        />
                        <span className="invite-form-hint">
                          This is a label only. Access is controlled by permissions.
                        </span>
                      </div>

                      <div className="invite-form-group">
                        <label className="invite-form-label">
                          <FiDatabase className="label-icon" />
                          Department
                        </label>
                        <select
                          className="invite-form-select"
                          value={inviteDepartment}
                          onChange={(e) => handleDepartmentChange(e.target.value)}
                          disabled={generatingInvite}
                        >
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        <span className="invite-form-hint">
                          Sets default permissions
                        </span>
                      </div>
                    </div>

                    <div className="invite-permissions-section">
                      <div className="invite-permissions-toggle active" style={{ cursor: 'default' }}>
                        <div className="toggle-left">
                          <FiShield className="toggle-icon" />
                          <span>Custom Permissions</span>
                          <span className="toggle-optional">Required</span>
                        </div>
                      </div>

                      <div className="invite-permissions-grid">
                        {Object.keys(PERMISSION_LABELS).map(key => (
                          <label key={key} className="invite-permission-item">
                            <input
                              type="checkbox"
                              checked={customPermissions[key] || false}
                              onChange={() => handlePermissionToggle(key)}
                              disabled={generatingInvite}
                            />
                            <span className="permission-checkbox"></span>
                            <span className="permission-label">{PERMISSION_LABELS[key]}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="invite-modal-footer">
                    <button
                      className="invite-btn-cancel"
                      onClick={handleCloseInviteModal}
                      disabled={generatingInvite}
                    >
                      Cancel
                    </button>
                    <button
                      className="invite-btn-primary"
                      onClick={handleGenerateInvite}
                      disabled={generatingInvite || !Object.values(customPermissions || {}).some(v => v === true)}
                    >
                      {generatingInvite ? (
                        <>
                          <span className="btn-spinner"></span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <FiPlus />
                          Generate Invite Link
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="invite-modal-body">
                  <div className="invite-success-state">
                    <div className="success-icon-circle">
                      <FiCheck />
                    </div>
                    <h4>Invitation Created!</h4>
                    <p>Share this link with <strong>{inviteEmail}</strong></p>
                  </div>

                  <div className="invite-link-box">
                    <input
                      type="text"
                      className="invite-link-field"
                      value={inviteLink}
                      readOnly
                    />
                    <button
                      className={`invite-copy-btn ${copied ? 'copied' : ''}`}
                      onClick={handleCopyInviteLink}
                    >
                      {copied ? <FiCheck /> : <FiCopy />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>

                  {inviteExpiresAt && (
                    <p className="invite-expiry-text">
                      <FiCalendar className="expiry-icon" />
                      Expires: {new Date(inviteExpiresAt).toLocaleDateString()} at {new Date(inviteExpiresAt).toLocaleTimeString()}
                    </p>
                  )}

                  <div className="invite-modal-actions">
                    <button
                      className="invite-btn-primary full-width"
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

        {/* Edit Permissions Modal */}
        {showEditPermissionsModal && selectedMember && (
          <div className="noxtm-overlay" onClick={() => setShowEditPermissionsModal(false)}>
            <div className="modal-content edit-permissions-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><FiShield /> Edit Permissions: {selectedMember.fullName}</h3>
                <button className="btn-close" onClick={() => setShowEditPermissionsModal(false)}>
                  <FiX />
                </button>
              </div>

              <div className="modal-body">
                <p className="form-hint">
                  Department: <strong>{selectedMember.department || 'Not assigned'}</strong>
                </p>
                <p className="form-hint">
                  Company Role: <strong>{selectedMember.roleInCompany === 'Owner' ? 'Owner' : 'Employee'}</strong>
                </p>
                <p className="form-hint">
                  Title: <strong>{selectedMember.jobTitle || 'Not set'}</strong>
                </p>

                <div className="permissions-grid">
                  {Object.keys(PERMISSION_LABELS).map(key => (
                    <div key={key} className="permission-checkbox-item">
                      <input
                        type="checkbox"
                        id={`edit-perm-${key}`}
                        checked={editPermissions[key] || false}
                        onChange={() => handleEditPermissionToggle(key)}
                        disabled={savingPermissions}
                      />
                      <label htmlFor={`edit-perm-${key}`}>
                        {PERMISSION_LABELS[key]}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => setShowEditPermissionsModal(false)}
                    disabled={savingPermissions}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleSavePermissions}
                    disabled={savingPermissions}
                  >
                    {savingPermissions ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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

  const handleModuleInstall = async (moduleId) => {
    const result = await installModule(moduleId);
    if (result.success) {
      toast.success(`${moduleId} module activated successfully!`);
    } else {
      toast.error(result.message || `Failed to activate ${moduleId} module`);
    }
  };

  const handleModuleUninstall = async (moduleId) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to uninstall ${moduleId}?\n\nThis will remove the module from your sidebar and disable its features.`
    );

    if (!confirmed) {
      return; // User cancelled
    }

    const result = await uninstallModule(moduleId);
    if (result.success) {
      toast.success(`${moduleId} module uninstalled successfully!`);
    } else {
      toast.error(result.message || `Failed to uninstall ${moduleId} module`);
    }
  };

  const renderModulesSettings = () => {
    // Define all modules
    const allModules = [
      {
        id: 'ExhibitOS',
        name: 'Exhibit OS',
        company: 'Exhibition Contractors Company',
        description: 'Exhibit OS is your all-in-one tool to run your entire exhibition business, from first client call to booth teardown. It\'s the system every contractor wishes they had before.',
        require: 'N/A',
        lastUpdate: '28 Oct 2025',
        logo: <img src={exhibitosLogo} alt="Exhibit OS" className="module-logo" />
      },
      {
        id: 'BotGit',
        name: 'BotGit',
        company: 'Linkedin Extractor',
        description: 'Unlimited LinkedIn Connection Data Extractor. Instantly get names, phones, emails, and job titles from your own LinkedIn in one click. Super simple and lightning fast.',
        require: 'Chrome Extension',
        lastUpdate: '28 Oct 2025',
        logo: <img src={botgitLogo} alt="BotGit" className="module-logo" />
      },
      {
        id: 'ChatAutomation',
        name: 'Chat Automation',
        company: 'Noxtm Productivity',
        description: 'Enable powerful automation through the Noxtm Chat Bot. Create tasks, assign team members, set priorities and due dates — all by simply chatting with the bot. Just say "create task" and the bot guides you step by step.',
        require: 'Noxtm Chat',
        lastUpdate: '08 Feb 2026',
        logo: <div className="module-logo-placeholder" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 8, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>CA</div>
      }
    ];

    // Filter modules based on active tab
    const displayedModules = moduleTab === 'installed'
      ? allModules.filter(module => isModuleInstalled(module.id))
      : allModules;

    return (
      <div className="workspace-tab-content">
        <div className="modules-tabs">
          <button
            className={`module-tab ${moduleTab === 'all' ? 'active' : ''}`}
            onClick={() => setModuleTab('all')}
          >
            All Modules
          </button>
          <button
            className={`module-tab ${moduleTab === 'installed' ? 'active' : ''}`}
            onClick={() => setModuleTab('installed')}
          >
            Installed
          </button>
        </div>

        <div className="modules-grid">
          {displayedModules.length > 0 ? (
            displayedModules.map((module) => (
              <div key={module.id} className="module-card">
                <div className="module-header">
                  <div className="module-icon-box">
                    {module.logo}
                  </div>
                  <div className="module-title-section">
                    <h4 className="module-title">{module.name}</h4>
                    <p className="module-company">{module.company}</p>
                  </div>
                  {isModuleInstalling(module.id) ? (
                    <button className="btn-module-install installing" disabled>
                      Installing...
                    </button>
                  ) : isModuleInstalled(module.id) ? (
                    <button
                      className="btn-module-install installed"
                      onClick={() => handleModuleUninstall(module.id)}
                    >
                      Installed
                    </button>
                  ) : (
                    <button
                      className="btn-module-install"
                      onClick={() => handleModuleInstall(module.id)}
                    >
                      Install
                    </button>
                  )}
                </div>
                <p className="module-description">
                  {module.description}
                </p>
                <div className="module-footer">
                  <span className="module-require">Require: {module.require}</span>
                  <span className="module-update">Last Update: {module.lastUpdate}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <p>No modules installed yet.</p>
              <button
                onClick={() => setModuleTab('all')}
                style={{
                  marginTop: '1rem',
                  padding: '8px 16px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Browse All Modules
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Profile Settings
  const renderProfileSettings = () => {
    const getInitials = (name) => {
      if (!name) return 'U';
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0]?.[0]?.toUpperCase() || 'U';
    };

    const formatDate = (dateString) => {
      if (!dateString) return '—';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    if (loadingProfile) {
      return (
        <div className="workspace-tab-content">
          <div className="loading-members">Loading profile...</div>
        </div>
      );
    }

    const currentMember =
      companyMembers.find(m => m._id === user?._id) ||
      companyMembers.find(m => m.email && profileData?.email && m.email.toLowerCase() === profileData.email.toLowerCase());

    const isOwner =
      (companyDetails?.owner?._id && companyDetails.owner._id === user?._id) ||
      currentMember?.roleInCompany === 'Owner';

    const companyRoleLabel = user?.companyId ? (isOwner ? 'Owner' : 'Employee') : 'User';
    const titleLabel = user?.companyId ? (currentMember?.jobTitle || profileData?.jobTitle || '') : (profileData?.jobTitle || '');

    const avatarFileInputRef = React.createRef();

    return (
      <div className="workspace-tab-content">
        {/* ===== Profile Hero Card ===== */}
        <div className="pf-hero">
          <div className="pf-hero-bg"></div>
          <div className="pf-hero-content">
            <div className="pf-hero-left">
              <div className="pf-avatar-wrapper" onClick={() => avatarFileInputRef.current?.click()}>
                <div className="pf-avatar">
                  <span className="pf-avatar-initials">{getInitials(profileData?.fullName)}</span>
                  {profileData?.profileImage && (
                    <img
                      src={profileData.profileImage}
                      alt={profileData.fullName || 'User'}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
                <div className="pf-avatar-overlay">
                  {uploadingAvatar ? <FiClock size={18} /> : <FiCamera size={18} />}
                </div>
                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="pf-hero-info">
                <h2 className="pf-hero-name">{profileData?.fullName || 'User'}</h2>
                <p className="pf-hero-email">{profileData?.email}</p>
                <div className="pf-hero-badges">
                  <span className={`pf-badge pf-badge-role ${isOwner ? 'owner' : 'employee'}`}>{companyRoleLabel}</span>
                  {!!titleLabel && <span className="pf-badge pf-badge-title">{titleLabel}</span>}
                  {profileData?.department && <span className="pf-badge pf-badge-dept">{profileData.department}</span>}
                </div>
              </div>
            </div>
            <div className="pf-hero-right">
              {!isEditingProfile ? (
                <button className="pf-btn-edit" onClick={handleProfileEditToggle}>
                  <FiEdit3 size={14} /> Edit Profile
                </button>
              ) : (
                <div className="pf-hero-actions">
                  <button className="pf-btn-cancel" onClick={handleProfileEditToggle}><FiX size={14} /> Cancel</button>
                  <button className="pf-btn-save" onClick={handleSaveProfile} disabled={savingProfile}>
                    <FiSave size={14} /> {savingProfile ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="pf-quick-stats">
            <div className="pf-qs-item">
              <FiCalendar size={14} />
              <span>Joined {formatDate(profileData?.createdAt)}</span>
            </div>
            {profileData?.timezone && (
              <div className="pf-qs-item">
                <FiClock size={14} />
                <span>{profileData.timezone}</span>
              </div>
            )}
            {companyDetails?.companyName && (
              <div className="pf-qs-item">
                <FiBriefcase size={14} />
                <span>{companyDetails.companyName}</span>
              </div>
            )}
          </div>
        </div>

        {/* ===== Personal Information ===== */}
        <div className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-icon"><FiUser size={16} /></div>
            <div>
              <h3>Personal Information</h3>
              <p>Basic details about you</p>
            </div>
          </div>

          {!isEditingProfile ? (
            <div className="pf-fields-grid">
              <div className="pf-field">
                <label>Full Name</label>
                <span>{profileData?.fullName || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Email Address</label>
                <span>{profileData?.email || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Phone Number</label>
                <span>{profileData?.phoneNumber || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Business Email</label>
                <span>{profileData?.businessEmail || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Date of Birth</label>
                <span>{profileData?.dateOfBirth ? formatDate(profileData.dateOfBirth) : '—'}</span>
              </div>
              <div className="pf-field pf-field-full">
                <label>Bio</label>
                <span>{profileData?.bio || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="pf-edit-grid">
              <div className="pf-input-group">
                <label>Full Name</label>
                <input type="text" value={editedProfile.fullName} onChange={(e) => handleProfileInputChange('fullName', e.target.value)} />
              </div>
              <div className="pf-input-group">
                <label>Email <small>(read-only)</small></label>
                <input type="email" value={editedProfile.email} disabled />
              </div>
              <div className="pf-input-group">
                <label>Phone Number</label>
                <input type="tel" value={editedProfile.phoneNumber} onChange={(e) => handleProfileInputChange('phoneNumber', e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="pf-input-group">
                <label>Business Email</label>
                <input type="email" value={editedProfile.businessEmail} onChange={(e) => handleProfileInputChange('businessEmail', e.target.value)} placeholder="work@company.com" />
              </div>
              <div className="pf-input-group">
                <label>Date of Birth</label>
                <input type="date" value={editedProfile.dateOfBirth} onChange={(e) => handleProfileInputChange('dateOfBirth', e.target.value)} />
              </div>
              <div className="pf-input-group pf-input-full">
                <label>Bio</label>
                <textarea value={editedProfile.bio} onChange={(e) => handleProfileInputChange('bio', e.target.value)} placeholder="Tell us a bit about yourself..." rows="3" maxLength={500} />
                <small className="pf-char-count">{(editedProfile.bio || '').length}/500</small>
              </div>
            </div>
          )}
        </div>

        {/* ===== Work & Company ===== */}
        <div className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-icon"><FiBriefcase size={16} /></div>
            <div>
              <h3>Work & Company</h3>
              <p>Your role and professional info</p>
            </div>
          </div>

          {!isEditingProfile ? (
            <div className="pf-fields-grid">
              <div className="pf-field">
                <label>Job Title</label>
                <span>{titleLabel || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Department</label>
                <span>{profileData?.department || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Company Role</label>
                <span className="pf-field-badge">{companyRoleLabel}</span>
              </div>
              <div className="pf-field">
                <label>Timezone</label>
                <span>{profileData?.timezone || 'UTC'}</span>
              </div>
            </div>
          ) : (
            <div className="pf-edit-grid">
              <div className="pf-input-group">
                <label>Job Title</label>
                <input type="text" value={editedProfile.jobTitle} onChange={(e) => handleProfileInputChange('jobTitle', e.target.value)} placeholder="e.g., Software Engineer" />
              </div>
              <div className="pf-input-group">
                <label>Department</label>
                <select value={editedProfile.department} onChange={(e) => handleProfileInputChange('department', e.target.value)}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="pf-input-group">
                <label>Timezone</label>
                <select value={editedProfile.timezone} onChange={(e) => handleProfileInputChange('timezone', e.target.value)}>
                  {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney', 'Pacific/Auckland'].map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ===== Location & Links ===== */}
        <div className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-icon"><FiMapPin size={16} /></div>
            <div>
              <h3>Location & Links</h3>
              <p>Where you're based and how to find you online</p>
            </div>
          </div>

          {!isEditingProfile ? (
            <div className="pf-fields-grid">
              <div className="pf-field">
                <label>Address</label>
                <span>{profileData?.address || '—'}</span>
              </div>
              <div className="pf-field">
                <label>City</label>
                <span>{profileData?.city || '—'}</span>
              </div>
              <div className="pf-field">
                <label>State / Province</label>
                <span>{profileData?.state || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Country</label>
                <span>{profileData?.country || '—'}</span>
              </div>
              <div className="pf-field">
                <label>LinkedIn</label>
                <span>{profileData?.linkedIn ? <a href={profileData.linkedIn} target="_blank" rel="noopener noreferrer">{profileData.linkedIn}</a> : '—'}</span>
              </div>
              <div className="pf-field">
                <label>Website</label>
                <span>{profileData?.website ? <a href={profileData.website} target="_blank" rel="noopener noreferrer">{profileData.website}</a> : '—'}</span>
              </div>
            </div>
          ) : (
            <div className="pf-edit-grid">
              <div className="pf-input-group pf-input-full">
                <label>Address</label>
                <input type="text" value={editedProfile.address} onChange={(e) => handleProfileInputChange('address', e.target.value)} placeholder="Street address" />
              </div>
              <div className="pf-input-group">
                <label>City</label>
                <input type="text" value={editedProfile.city} onChange={(e) => handleProfileInputChange('city', e.target.value)} placeholder="City" />
              </div>
              <div className="pf-input-group">
                <label>State / Province</label>
                <input type="text" value={editedProfile.state} onChange={(e) => handleProfileInputChange('state', e.target.value)} placeholder="State" />
              </div>
              <div className="pf-input-group">
                <label>Country</label>
                <input type="text" value={editedProfile.country} onChange={(e) => handleProfileInputChange('country', e.target.value)} placeholder="Country" />
              </div>
              <div className="pf-input-group">
                <label>LinkedIn URL</label>
                <input type="url" value={editedProfile.linkedIn} onChange={(e) => handleProfileInputChange('linkedIn', e.target.value)} placeholder="https://linkedin.com/in/..." />
              </div>
              <div className="pf-input-group">
                <label>Website</label>
                <input type="url" value={editedProfile.website} onChange={(e) => handleProfileInputChange('website', e.target.value)} placeholder="https://yoursite.com" />
              </div>
            </div>
          )}
        </div>

        {/* ===== Education ===== */}
        <div className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-icon"><FiDatabase size={16} /></div>
            <div>
              <h3>Education & Qualifications</h3>
              <p>Academic background</p>
            </div>
          </div>

          {!isEditingProfile ? (
            <div className="pf-fields-grid">
              <div className="pf-field">
                <label>Highest Qualification</label>
                <span>{profileData?.qualification || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Institute / University</label>
                <span>{profileData?.institute || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Year of Passing</label>
                <span>{profileData?.yearOfPassing || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="pf-edit-grid">
              <div className="pf-input-group">
                <label>Highest Qualification</label>
                <input type="text" value={editedProfile.qualification} onChange={(e) => handleProfileInputChange('qualification', e.target.value)} placeholder="e.g., B.Tech, MBA" />
              </div>
              <div className="pf-input-group">
                <label>Institute / University</label>
                <input type="text" value={editedProfile.institute} onChange={(e) => handleProfileInputChange('institute', e.target.value)} placeholder="University name" />
              </div>
              <div className="pf-input-group">
                <label>Year of Passing</label>
                <input type="text" value={editedProfile.yearOfPassing} onChange={(e) => handleProfileInputChange('yearOfPassing', e.target.value)} placeholder="e.g., 2024" />
              </div>
            </div>
          )}
        </div>

        {/* ===== Emergency Contact ===== */}
        <div className="pf-section">
          <div className="pf-section-header">
            <div className="pf-section-icon pf-section-icon-red"><FiPhone size={16} /></div>
            <div>
              <h3>Emergency Contact</h3>
              <p>Someone we can reach in case of emergency</p>
            </div>
          </div>

          {!isEditingProfile ? (
            <div className="pf-fields-grid">
              <div className="pf-field">
                <label>Name</label>
                <span>{profileData?.emergencyContact?.name || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Relation</label>
                <span>{profileData?.emergencyContact?.relation || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Contact Number</label>
                <span>{profileData?.emergencyContact?.phone || '—'}</span>
              </div>
              <div className="pf-field">
                <label>Address</label>
                <span>{profileData?.emergencyContact?.address || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="pf-edit-grid">
              <div className="pf-input-group">
                <label>Contact Name</label>
                <input type="text" value={editedProfile.emergencyContactName} onChange={(e) => handleProfileInputChange('emergencyContactName', e.target.value)} placeholder="Emergency contact name" />
              </div>
              <div className="pf-input-group">
                <label>Relation</label>
                <input type="text" value={editedProfile.emergencyContactRelation} onChange={(e) => handleProfileInputChange('emergencyContactRelation', e.target.value)} placeholder="e.g., Father, Spouse" />
              </div>
              <div className="pf-input-group">
                <label>Contact Number</label>
                <input type="tel" value={editedProfile.emergencyContactPhone} onChange={(e) => handleProfileInputChange('emergencyContactPhone', e.target.value)} placeholder="+1 (555) 000-0000" />
              </div>
              <div className="pf-input-group pf-input-full">
                <label>Address</label>
                <textarea value={editedProfile.emergencyContactAddress} onChange={(e) => handleProfileInputChange('emergencyContactAddress', e.target.value)} placeholder="Full address" rows="2" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Save Bar when editing */}
        {isEditingProfile && (
          <div className="pf-bottom-bar">
            <span>You have unsaved changes</span>
            <div className="pf-bottom-actions">
              <button className="pf-btn-cancel" onClick={handleProfileEditToggle}><FiX size={14} /> Discard</button>
              <button className="pf-btn-save" onClick={handleSaveProfile} disabled={savingProfile}>
                <FiSave size={14} /> {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <FiUser /> Profile
        </button>
        <button
          className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          <FiUsers /> Members
        </button>
        <button
          className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <FiShield /> Security
        </button>
        <button
          className={`tab-button ${activeTab === 'modules' ? 'active' : ''}`}
          onClick={() => setActiveTab('modules')}
        >
          <FiPackage /> Modules
        </button>
      </div>

      <div className="workspace-content">
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'profile' && renderProfileSettings()}
        {activeTab === 'members' && renderMembersSettings()}
        {activeTab === 'security' && renderSecuritySettings()}
        {activeTab === 'modules' && renderModulesSettings()}
      </div>
    </div>
  );
}

export default WorkspaceSettings;