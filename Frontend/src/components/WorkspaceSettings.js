import React, { useState, useEffect } from 'react';
import { FiSettings, FiUsers, FiShield, FiDatabase, FiMonitor, FiSave, FiX, FiEdit3, FiPlus, FiTrash2, FiCopy, FiCheck, FiMail, FiChevronDown, FiChevronUp, FiPackage } from 'react-icons/fi';
import { toast } from 'sonner';
import { DEPARTMENT_DEFAULTS, DEPARTMENTS, PERMISSION_LABELS } from '../utils/departmentDefaults';
import { useModules } from '../contexts/ModuleContext';
import exhibitosLogo from './assets/exhibitos.svg';
import botgitLogo from './assets/botgit-logo.svg';
import './WorkspaceSettings.css';

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
  const [inviteRole, setInviteRole] = useState('Employee');
  const [inviteDepartment, setInviteDepartment] = useState('Management Team');
  const [customPermissions, setCustomPermissions] = useState(DEPARTMENT_DEFAULTS['Management Team']);
  const [showPermissions, setShowPermissions] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [inviteExpiresAt, setInviteExpiresAt] = useState(null);

  // Edit permissions modal state
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editPermissions, setEditPermissions] = useState({});
  const [savingPermissions, setSavingPermissions] = useState(false);

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

    if (!inviteDepartment) {
      toast.error('Please select a department');
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
          roleInCompany: inviteRole,
          department: inviteDepartment,
          customPermissions: customPermissions
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
    setInviteRole('Employee');
    setInviteDepartment('Management Team');
    setCustomPermissions(DEPARTMENT_DEFAULTS['Management Team']);
    setShowPermissions(false);
    setInviteLink('');
    setCopied(false);
    setInviteExpiresAt(null);
  };

  // Handle department change - update default permissions
  const handleDepartmentChange = (department) => {
    setInviteDepartment(department);
    setCustomPermissions(DEPARTMENT_DEFAULTS[department] || {});
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
      const response = await fetch(`/api/company/members/${selectedMember._id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ permissions: editPermissions })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Permissions updated successfully');
        setShowEditPermissionsModal(false);
        fetchCompanyMembers(); // Refresh members list
      } else {
        toast.error(data.message || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
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
                  {member.department && (
                    <div className="member-department">{member.department}</div>
                  )}
                </div>
                <div className="member-role-badge">{member.roleInCompany || 'Employee'}</div>
                <div className={`member-status ${member.status?.toLowerCase() || 'active'}`}>
                  {member.status || 'Active'}
                </div>
                <div className="member-actions">
                  {isOwnerOrAdmin() && member._id !== companyDetails?.owner?._id && (
                    <>
                      <button
                        className="btn-edit"
                        onClick={() => handleEditMemberPermissions(member)}
                        title="Edit permissions"
                      >
                        <FiEdit3 />
                      </button>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveMember(member._id, member.fullName)}
                        title="Remove member"
                      >
                        <FiTrash2 />
                      </button>
                    </>
                  )}
                </div>
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
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                    </select>
                    <p className="form-hint">
                      Managers can invite and manage other members
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      className="form-select"
                      value={inviteDepartment}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      disabled={generatingInvite}
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <p className="form-hint">
                      Default permissions will be set based on department
                    </p>
                  </div>

                  <div className="permissions-section">
                    <div
                      className="permissions-header"
                      onClick={() => setShowPermissions(!showPermissions)}
                    >
                      <label className="form-label">Custom Permissions (Optional)</label>
                      {showPermissions ? <FiChevronUp /> : <FiChevronDown />}
                    </div>

                    {showPermissions && (
                      <div className="permissions-grid">
                        {Object.keys(PERMISSION_LABELS).map(key => (
                          <div key={key} className="permission-checkbox-item">
                            <input
                              type="checkbox"
                              id={`perm-${key}`}
                              checked={customPermissions[key] || false}
                              onChange={() => handlePermissionToggle(key)}
                              disabled={generatingInvite}
                            />
                            <label htmlFor={`perm-${key}`}>
                              {PERMISSION_LABELS[key]}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
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

        {/* Edit Permissions Modal */}
        {showEditPermissionsModal && selectedMember && (
          <div className="modal-overlay" onClick={() => setShowEditPermissionsModal(false)}>
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
                  Role: <strong>{selectedMember.roleInCompany || 'Employee'}</strong>
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
        {activeTab === 'members' && renderMembersSettings()}
        {activeTab === 'security' && renderSecuritySettings()}
        {activeTab === 'modules' && renderModulesSettings()}
      </div>
    </div>
  );
}

export default WorkspaceSettings;