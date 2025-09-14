import React, { useState, useEffect, useCallback } from 'react';
import { useRole } from '../contexts/RoleContext';
import { toast } from 'sonner';
import { FiSearch, FiEdit3, FiUser, FiShield, FiSettings, FiMail, FiPhone, FiMapPin, FiCalendar, FiStar, FiActivity, FiMoreHorizontal } from 'react-icons/fi';
import api from '../config/api';
import './UsersRoles.css';


function UsersRoles() {
  const { users, setUsers, currentUser } = useRole();
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, ] = useState('All');
  const [filterStatus, ] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    inReview: 0,
    admins: 0
  });

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/users');
      if (response.data && response.data.users) {
        setUsers(response.data.users);
        updateStats(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [setUsers]);

  // Update statistics
  const updateStats = (userList) => {
    const total = userList.length;
    const active = userList.filter(user => user.status === 'Active').length;
    const inactive = userList.filter(user => user.status === 'Inactive').length;
    const inReview = userList.filter(user => user.status === 'In Review').length;
    const admins = userList.filter(user => user.role === 'Admin').length;
    
    setStats({ total, active, inactive, inReview, admins });
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    updateStats(users);
  }, [users]);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'All' || user.role === filterRole;
    const matchesStatus = filterStatus === 'All' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowSidePanel(true);
  };

  const handleCloseSidePanel = () => {
    setShowSidePanel(false);
    setSelectedUser(null);
  };

  const handlePermissionChange = async (userId, permission, value) => {
    try {
      // Directly call backend API instead of using RoleContext
      const token = localStorage.getItem('token');
      const response = await api.put(
        `/users/${userId}/permissions`,
        { [permission]: value },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        toast.success('Permission updated successfully');
        // Update local state immediately
        setUsers(prevUsers => prevUsers.map(u => 
          (u._id || u.id) === userId 
            ? { ...u, permissions: { ...u.permissions, [permission]: value } } 
            : u
        ));
        // Update selected user if it's the same user
        if (selectedUser && (selectedUser._id || selectedUser.id) === userId) {
          setSelectedUser(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [permission]: value }
          }));
        }
      } else {
        toast.error('Failed to update permission');
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await api.put(`/users/${userId}`, { role: newRole });
      if (response.status === 200) {
        toast.success('User role updated successfully');
        fetchUsers(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10B981';
      case 'Inactive': return '#6B7280';
      case 'Terminated': return '#EF4444';
      case 'In Review': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  return (
    <div className="users-roles-container">
      <div className="users-roles-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Users & Roles Management</h1>
            <p>Manage user accounts, roles, and permissions across your organization.</p>
          </div>
        </div>
      </div>

      <div className="table-header">
        <div className="table-header-left">
          <h3>All users {stats.total}</h3>
        </div>
        <div className="table-header-right">
          <div className="search-container">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <div className="users-table">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>User Details</th>
                <th>Access</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id || user.id}>
                  <td><input type="checkbox" /></td>
                  <td>
                    <div className="user-details-cell">
                      <div className="user-avatar">
                        <div className="avatar-icon">
                          {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                        </div>
                      </div>
                      <div className="user-basic-info">
                        <h3 className="user-name">{user.name || user.username}</h3>
                        <p className="user-email">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="access-tags">
                      {Object.entries(user.permissions || {}).filter(([, value]) => value).slice(0, 4).map(([key]) => (
                        <span key={key} className={`access-tag ${key.toLowerCase().replace(' ', '-')}`}>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      ))}
                      <button className="add-access-btn">+</button>
                    </div>
                  </td>
                  <td>
                    <select 
                      value={user.role} 
                      onChange={(e) => handleRoleChange(user._id || user.id, e.target.value)}
                      className="role-select"
                      disabled={currentUser?.role !== 'Admin'}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Project Manager">Project Manager</option>
                      <option value="Data Analyst">Data Analyst</option>
                      <option value="Data Miner">Data Miner</option>
                      <option value="Social Media Manager">Social Media Manager</option>
                      <option value="Human Resource">Human Resource</option>
                      <option value="Graphic Designer">Graphic Designer</option>
                      <option value="Web Developer">Web Developer</option>
                      <option value="SEO Manager">SEO Manager</option>
                      <option value="User">User</option>
                    </select>
                  </td>
                  <td>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(user.status) }}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td>
                    <div className="actions-menu">
                      <button className="actions-btn" onClick={() => handleUserClick(user)}>
                        <FiMoreHorizontal />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredUsers.length === 0 && !isLoading && (
        <div className="no-users-found">
          <FiUser className="no-users-icon" />
          <h3>No users found</h3>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {showSidePanel && selectedUser && (
        <UserDetailsSidePanel
          user={selectedUser}
          onClose={handleCloseSidePanel}
          isVisible={showSidePanel}
          setUsers={setUsers}
          handlePermissionChange={handlePermissionChange}
          currentUser={currentUser}
          fetchUsers={fetchUsers}
          setSelectedUser={setSelectedUser}
        />
      )}
    </div>
  );
}

// User Details Side Panel Component
function UserDetailsSidePanel({ user, onClose, isVisible, setUsers, handlePermissionChange, currentUser, fetchUsers, setSelectedUser }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({
    role: user.role,
    status: user.status,
    name: user.name || user.username,
    email: user.email,
    phone: user.phone || '+91 9098989281',
    location: user.location || 'N/A',
  });

  if (!user) return null;

  // Mock additional user data - in real app this would come from API
  const userDetails = {
    ...user,
    currentProjects: 5,
    totalProjects: 21,
    joinDate: '10 - 04 - 2024',
    phone: editedUser.phone,
    location: editedUser.location,
    languages: ['English', 'Hindi'],
    maritalStatus: 'Single',
    employmentId: '0020192',
    responseTime: '24m',
    lastActive: '2 hours ago',
    department: getDepartmentByRole(user.role),
    reportsTo: user.role !== 'Admin' ? 'Admin' : 'CEO'
  };

  function getDepartmentByRole(role) {
    const departments = {
      'Admin': 'Administration',
      'Project Manager': 'Project Management',
      'Data Analyst': 'Analytics',
      'Data Miner': 'Data Science',
      'Social Media Manager': 'Marketing',
      'Human Resource': 'Human Resources',
      'Graphic Designer': 'Design',
      'Web Developer': 'Engineering',
      'SEO Manager': 'Marketing'
    };
    return departments[role] || 'General';
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return '#8B5CF6';
      case 'Project Manager': return '#10B981';
      case 'Data Analyst': return '#3B82F6';
      case 'Data Miner': return '#8B5CF6';
      case 'Social Media Manager': return '#F59E0B';
      case 'Human Resource': return '#EC4899';
      case 'Graphic Designer': return '#06B6D4';
      case 'Web Developer': return '#10B981';
      case 'SEO Manager': return '#06B6D4';
      default: return '#6B7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return '#10B981';
      case 'Inactive': return '#6B7280';
      case 'Terminated': return '#EF4444';
      case 'In Review': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const handleSaveChanges = async () => {
    try {
      // Update role and status if changed
      if (editedUser.role !== user.role || editedUser.status !== user.status) {
        const response = await api.put(`/users/${user._id || user.id}`, {
          role: editedUser.role,
          status: editedUser.status,
          name: editedUser.name,
          phone: editedUser.phone,
          location: editedUser.location
        });
        
        if (response.status === 200) {
          toast.success('User updated successfully');
          fetchUsers();
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const getPermissionCount = () => {
    return Object.values(user.permissions || {}).filter(Boolean).length;
  };
  return (
    <>
      {/* Overlay */}
      <div 
        className={`side-panel-overlay ${isVisible ? 'visible' : ''}`}
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className={`user-details-side-panel ${isVisible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="side-panel-header">
          <div className="header-title">
            <h3>{isEditing ? 'Edit User' : 'User Details'}</h3>
            <span className="user-id">ID: {userDetails.employmentId}</span>
          </div>
          <div className="header-actions">
            {currentUser?.role === 'Admin' && !isEditing && (
              <button 
                className="edit-btn"
                onClick={() => setIsEditing(true)}
                title="Edit User"
              >
                <FiEdit3 />
              </button>
            )}
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="side-panel-content">
          <div className="user-profile-section">
            <div className="user-avatar-large">
              <div className="avatar-icon-large">
                {userDetails.name ? userDetails.name.charAt(0).toUpperCase() : '👤'}
              </div>
              <div className={`status-indicator-large ${userDetails.status?.toLowerCase()}`}></div>
            </div>
            <div className="user-info-text">
              {isEditing ? (
                <input
                  type="text"
                  value={editedUser.name}
                  onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                  className="edit-input name-input"
                />
              ) : (
                <h2>{userDetails.name}</h2>
              )}
              <div className="user-status-info">
                <span className="status-dot-green"></span>
                <span className="status-text">Last active: {userDetails.lastActive}</span>
              </div>
              {isEditing ? (
                <input
                  type="email"
                  value={editedUser.email}
                  onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                  className="edit-input email-input"
                />
              ) : (
                <p className="user-email-large">
                  <FiMail className="contact-icon" />
                  {userDetails.email}
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <FiActivity className="stat-icon" />
              <div className="stat-info">
                <div className="stat-value">{userDetails.currentProjects}</div>
                <div className="stat-label">Active Projects</div>
              </div>
            </div>
            <div className="stat-item">
              <FiStar className="stat-icon" />
              <div className="stat-info">
                <div className="stat-value">{userDetails.totalProjects}</div>
                <div className="stat-label">Total Projects</div>
              </div>
            </div>
            <div className="stat-item">
              <FiSettings className="stat-icon" />
              <div className="stat-info">
                <div className="stat-value">{getPermissionCount()}</div>
                <div className="stat-label">Permissions</div>
              </div>
            </div>
          </div>

          {/* Role and Status Section */}
          <div className="role-status-section">
            <div className="role-status-item">
              <label className="field-label">Role</label>
              {isEditing ? (
                <select
                  value={editedUser.role}
                  onChange={(e) => setEditedUser({...editedUser, role: e.target.value})}
                  className="edit-select"
                  disabled={currentUser?.role !== 'Admin'}
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Data Analyst">Data Analyst</option>
                  <option value="Data Miner">Data Miner</option>
                  <option value="Social Media Manager">Social Media Manager</option>
                  <option value="Human Resource">Human Resource</option>
                  <option value="Graphic Designer">Graphic Designer</option>
                  <option value="Web Developer">Web Developer</option>
                  <option value="SEO Manager">SEO Manager</option>
                </select>
              ) : (
                <span 
                  className="role-badge-large"
                  style={{ backgroundColor: getRoleColor(userDetails.role) }}
                >
                  {userDetails.role}
                </span>
              )}
            </div>
            <div className="role-status-item">
              <label className="field-label">Status</label>
              {isEditing ? (
                <select
                  value={editedUser.status}
                  onChange={(e) => setEditedUser({...editedUser, status: e.target.value})}
                  className="edit-select"
                  disabled={currentUser?.role !== 'Admin'}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Terminated">Terminated</option>
                  <option value="In Review">In Review</option>
                </select>
              ) : (
                <span 
                  className="status-badge-large"
                  style={{ backgroundColor: getStatusColor(userDetails.status) }}
                >
                  {userDetails.status}
                </span>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="details-section">
            <h4>Contact Information</h4>
            <div className="contact-grid">
              <div className="contact-item">
                <FiMail className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Email</div>
                  <div className="contact-value">{userDetails.email}</div>
                </div>
              </div>
              <div className="contact-item">
                <FiPhone className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Phone</div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.phone}
                      onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})}
                      className="edit-input contact-input"
                    />
                  ) : (
                    <div className="contact-value">{userDetails.phone}</div>
                  )}
                </div>
              </div>
              <div className="contact-item">
                <FiMapPin className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Location</div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedUser.location}
                      onChange={(e) => setEditedUser({...editedUser, location: e.target.value})}
                      className="edit-input contact-input"
                    />
                  ) : (
                    <div className="contact-value">{userDetails.location}</div>
                  )}
                </div>
              </div>
              <div className="contact-item">
                <FiCalendar className="contact-icon" />
                <div className="contact-info">
                  <div className="contact-label">Join Date</div>
                  <div className="contact-value">{userDetails.joinDate}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Professional Information */}
          <div className="details-section">
            <h4>Professional Details</h4>
            <div className="professional-grid">
              <div className="professional-item">
                <div className="professional-label">Department</div>
                <div className="professional-value">{userDetails.department}</div>
              </div>
              <div className="professional-item">
                <div className="professional-label">Reports To</div>
                <div className="professional-value">{userDetails.reportsTo}</div>
              </div>
              <div className="professional-item">
                <div className="professional-label">Employee ID</div>
                <div className="professional-value">{userDetails.employmentId}</div>
              </div>
              <div className="professional-item">
                <div className="professional-label">Response Time</div>
                <div className="professional-value">{userDetails.responseTime}</div>
              </div>
            </div>
          </div>
          
          {/* Permissions Section */}
          {currentUser?.role === 'Admin' && (
            <div className="details-section">
              <h4>
                <FiShield className="section-icon" />
                Module Permissions
                <span className="permission-count">({getPermissionCount()}/11)</span>
              </h4>
              <div className="permissions-grid">
                {[
                  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
                  { key: 'dataCenter', label: 'Data Center', icon: '🏢' },
                  { key: 'projects', label: 'Projects', icon: '📁' },
                  { key: 'teamCommunication', label: 'Team Communication', icon: '💬' },
                  { key: 'digitalMediaManagement', label: 'Digital Media', icon: '📱' },
                  { key: 'marketing', label: 'Marketing', icon: '📈' },
                  { key: 'hrManagement', label: 'HR Management', icon: '👥' },
                  { key: 'financeManagement', label: 'Finance', icon: '💰' },
                  { key: 'seoManagement', label: 'SEO Management', icon: '🔍' },
                  { key: 'internalPolicies', label: 'Internal Policies', icon: '📋' },
                  { key: 'settingsConfiguration', label: 'Settings', icon: '⚙️' },
                ].map((permission) => (
                  <div key={permission.key} className="permission-item-enhanced">
                    <div className="permission-content">
                      <span className="permission-icon">{permission.icon}</span>
                      <label className="permission-checkbox">
                        <input
                          type="checkbox"
                          checked={user.permissions?.[permission.key] || false}
                          onChange={(e) => handlePermissionChange(user._id || user.id, permission.key, e.target.checked)}
                          disabled={currentUser?.role !== 'Admin'}
                        />
                        <span className="checkmark"></span>
                        <span className="permission-label">{permission.label}</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isEditing && currentUser?.role === 'Admin' && (
            <div className="edit-actions">
              <button 
                className="save-btn"
                onClick={handleSaveChanges}
              >
                Save Changes
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setIsEditing(false);
                  setEditedUser({
                    role: user.role,
                    status: user.status,
                    name: user.name || user.username,
                    email: user.email,
                    phone: user.phone || '+91 9098989281',
                    location: user.location || 'N/A',
                  });
                }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default UsersRoles;
