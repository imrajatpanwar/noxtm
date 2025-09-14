import React, { useState, useEffect, useCallback } from 'react';
import { CiSearch } from 'react-icons/ci';
import { FiEdit3, FiEye, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import { useRole, MODULES } from '../contexts/RoleContext';
import './UsersRoles.css';

function UsersRoles() {
  const { 
     
    setUsers: setContextUsers, 
    updateUserRole,
    currentUser
  } = useRole();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);

  // Simplified admin check - prioritize context user, fallback to localStorage
  const isCurrentUserAdmin = currentUser?.role === 'Admin';
  const localStorageUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminFromLocalStorage = localStorageUser?.role === 'Admin';
  const finalIsAdmin = isCurrentUserAdmin || isAdminFromLocalStorage;

  console.log('Admin check:', { currentUser: currentUser?.role, localUser: localStorageUser?.role, finalIsAdmin });

  // Fetch available roles from backend
  const fetchRoles = useCallback(async () => {
    const fallbackRoles = [
      'User', 'Admin', 'Project Manager', 'Data Miner', 'Data Analyst',
      'Social Media Manager', 'Human Resource', 'Graphic Designer',
      'Web Developer', 'SEO Manager'
    ];

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAvailableRoles(fallbackRoles);
        return;
      }

      const response = await api.get('/roles');
      console.log('Fetched roles from backend:', response.data.roles);
      setAvailableRoles(response.data.roles || fallbackRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
      setAvailableRoles(fallbackRoles);
    }
  }, []);

  // Consolidated user fetching logic
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, using demo data');
        const demoUsers = JSON.parse(localStorage.getItem('usersData') || '[]');
        setUsers(demoUsers);
        setContextUsers(demoUsers);
        return;
      }

      // Try API call first
      const response = await api.get('/users');
      const transformedUsers = response.data.users.map(user => ({
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        access: user.access || []
      }));

      setUsers(transformedUsers);
      setContextUsers(transformedUsers);
      
    } catch (error) {
      console.error('API Error, falling back to demo data:', error);
      // Fallback to demo data only on API error
      const demoUsers = JSON.parse(localStorage.getItem('usersData') || '[]');
      if (demoUsers.length > 0) {
        setUsers(demoUsers);
        setContextUsers(demoUsers);
        setError(null); // Clear error since we have fallback data
      } else {
        setError('Failed to fetch users: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  }, [setContextUsers]);

  // Update user role
  const handleRoleChange = async (userId, newRole) => {
    console.log('handleRoleChange called:', { userId, newRole, finalIsAdmin });
    
    if (!finalIsAdmin) {
      toast.error('Only administrators can change user roles');
      return;
    }

    try {
      setError(null);
      const newStatus = newRole === 'User' ? 'In Review' : 'Active';
      console.log('Setting new status:', newStatus);
      
      const result = await updateUserRole(userId, newRole, newStatus);
      console.log('updateUserRole result:', result);
      
      if (result.success) {
        // Update local state immediately for UI responsiveness
        setUsers(prevUsers => prevUsers.map(user => 
          user.id === userId ? { 
            ...user, 
            role: newRole,
            status: newStatus
          } : user
        ));
        
        toast.success(`User role updated to ${newRole} and status set to ${newStatus}`);
      } else {
        setError(`Failed to update user role: ${result.error}`);
        toast.error(`Failed to update user role: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      setError('Failed to update user role: ' + error.message);
      toast.error('Failed to update user role: ' + error.message);
    }
  };

  // Toggle menu visibility
  const toggleMenu = (userId) => {
    setOpenMenuId(openMenuId === userId ? null : userId);
  };

  // Handle menu actions
  const handleMenuAction = async (userId, action) => {
    setOpenMenuId(null);

    try {
      setError(null);
      
      if (action === 'edit') {
        if (!finalIsAdmin) {
          toast.error('Only administrators can edit user profiles');
          return;
        }
        setSelectedUser(users.find(user => user.id === userId));
        setShowSidePanel(true);
        toast.info('Edit user panel opened');
      } else if (action === 'view') {
        setSelectedUser(users.find(user => user.id === userId));
        setShowSidePanel(true);
        toast.info('Viewing user profile');
      } else if (action === 'delete') {
        if (!finalIsAdmin) {
          toast.error('Only administrators can delete users');
          return;
        }
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
          const response = await api.delete(`/users/${userId}`);
          if (response.status === 200) {
            setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
            toast.success('User deleted successfully');
          }
        }
      }
    } catch (error) {
      console.error('Error performing user action:', error);
      setError('Failed to perform action: ' + error.message);
      toast.error('Failed to perform action: ' + error.message);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchRoles();
    
    const demoUsers = JSON.parse(localStorage.getItem('usersData') || '[]');
    if (demoUsers.length === 0) {
      import('../data/demoUsers').then(({ initializeDemoData }) => {
        initializeDemoData();
        fetchUsers();
      });
    } else {
      fetchUsers();
    }
  }, [fetchUsers, fetchRoles]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.user-actions')) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Helper functions
  const handleAccessAdd = (userId) => {
    console.log('Add access for user:', userId);
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowSidePanel(true);
  };

  const handleCloseSidePanel = () => {
    setShowSidePanel(false);
    setTimeout(() => setSelectedUser(null), 300);
  };

  const getAllUserAccess = (user) => {
    const allAccess = [];
    
    if (user.access && user.access.length > 0) {
      allAccess.push(...user.access);
    }
    
    if (user.customAccess && user.customAccess.length > 0) {
      user.customAccess.forEach(customAccess => {
        if (!allAccess.includes(customAccess)) {
          allAccess.push(customAccess);
        }
      });
    }
    
    return allAccess;
  };

  // eslint-disable-next-line no-unused-vars
  const getAccessColor = (access) => {
    const colors = {
      'Data Cluster': '#8B5CF6',
      'Data Center': '#8B5CF6',
      'Projects': '#10B981',
      'Finance Management': '#EF4444',
      'Digital Media Management': '#3B82F6',
      'Team Communication': '#F97316',
      'Marketing': '#F59E0B',
      'HR Management': '#EC4899',
      'SEO Management': '#06B6D4',
      'Settings & Configuration': '#8B5A2B',
      'Dashboard': '#6366F1',
      'Internal Policies': '#A78BFA'
    };
    return colors[access] || '#6B7280';
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="users-roles-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="users-roles-container">
        <div className="error-container">
          <div className="error-message">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={fetchUsers} className="retry-btn">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="users-roles-container">
      {/* Admin Warning for Non-Admin Users */}
      {!finalIsAdmin && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '1.25rem' }}>⚠️</div>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', color: '#92400e' }}>
              Limited Access
            </p>
            <p style={{ margin: '0', fontSize: '0.9rem', color: '#92400e' }}>
              You can view user information but cannot modify roles. Only administrators can change user roles and permissions.
            </p>
          </div>
        </div>
      )}

      {/* Display error banner if there's an error but we have fallback data */}
      {error && users.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ fontSize: '1.25rem' }}>ℹ️</div>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: '600', color: '#dc2626' }}>
              Using Offline Data
            </p>
            <p style={{ margin: '0', fontSize: '0.9rem', color: '#dc2626' }}>
              Unable to connect to server. Showing cached data. Some information may be outdated.
            </p>
          </div>
        </div>
      )}

      <div className="users-roles-header">
        <div className="header-content">
          <div className="header-left">
            <h2>Users & Roles Management <span className="realtime-indicator" title="Real-time updates enabled"></span></h2>
            <p>Manage user accounts, roles, and permissions across your organization.</p>
          </div>
        </div>

        <div className="table-header">
          <div className="table-header-left">
            <div className="user-count">
              <span className="count-label">All users</span>
              <span className="count-number">{users.length}</span>
            </div>
          </div>
          <div className="table-header-right">
            <div className="search-container">
              <CiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search users, emails, or roles"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <input type="checkbox" className="select-all-checkbox" />
              </th>
              <th>User Details</th>
              <th>Access</th>
              <th>Role</th>
              <th>Status</th>
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className={user.status === 'Inactive' ? 'inactive-user' : ''}>
                <td className="checkbox-column">
                  <input type="checkbox" className="user-checkbox" />
                </td>
                <td className="user-details">
                  <div className="user-info clickable-user" onClick={() => handleUserClick(user)}>
                    <div className="user-avatar">
                      <div className="avatar-icon">👤</div>
                    </div>
                    <div className="user-text">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="user-access">
                  <div className="access-tags">
                    {getAllUserAccess(user).map((access, index) => (
                      <span 
                        key={`${user.id}-${access}-${index}`} 
                        className="access-tag"
                        style={{ backgroundColor: getAccessColor(access) }}
                        title={`Access: ${access}`}
                      >
                        {access}
                      </span>
                    ))}
                    <button 
                      className="add-access-btn"
                      onClick={() => handleAccessAdd(user.id)}
                      disabled={!finalIsAdmin}
                      title={!finalIsAdmin ? 'Only administrators can modify access' : 'Add access'}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="user-role">
                  <select 
                    value={user.role || 'User'} 
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="role-select"
                    disabled={!finalIsAdmin}
                    style={{
                      opacity: finalIsAdmin ? 1 : 0.6,
                      cursor: finalIsAdmin ? 'pointer' : 'not-allowed',
                      backgroundColor: finalIsAdmin ? 'white' : '#f3f4f6'
                    }}
                    title={!finalIsAdmin ? 'Only administrators can change user roles' : 'Change user role'}
                  >
                    {availableRoles.map(role => (
                      <option key={role} value={role}>
                        {role === 'User' ? 'User (Restricted Access)' : role}
                      </option>
                    ))}
                  </select>
                  {!finalIsAdmin && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280', 
                      marginLeft: '0.5rem',
                      fontStyle: 'italic'
                    }}>
                      Admin only
                    </span>
                  )}
                </td>
                <td className="user-status">
                  <span 
                    className={`status-badge ${user.status?.toLowerCase().replace(' ', '-')}`}
                    style={{
                      backgroundColor: user.status === 'Active' ? '#dcfce7' : 
                                     user.status === 'Terminated' ? '#fef2f2' : 
                                     user.status === 'In Review' ? '#fef3c7' : '#f3f4f6',
                      color: user.status === 'Active' ? '#166534' : 
                             user.status === 'Terminated' ? '#dc2626' : 
                             user.status === 'In Review' ? '#92400e' : '#6b7280',
                      border: user.status === 'Active' ? '1px solid #bbf7d0' : 
                              user.status === 'Terminated' ? '1px solid #fecaca' : 
                              user.status === 'In Review' ? '1px solid #fde68a' : '1px solid #e5e7eb'
                    }}
                  >
                    {user.status === 'Terminated' ? '❌ Terminated' : 
                     user.status === 'Active' ? 'Active' : 
                     user.status === 'In Review' ? '⏳ In Review' : user.status || 'Unknown'}
                  </span>
                </td>
                <td className="user-actions">
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                      onClick={() => toggleMenu(user.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        fontSize: '1.2rem',
                        color: '#6b7280',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2rem',
                        height: '2rem'
                      }}
                      title="User actions"
                    >
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '2px',
                        alignItems: 'center'
                      }}>
                        <div style={{ width: '4px', height: '4px', backgroundColor: '#6b7280', borderRadius: '50%' }}></div>
                        <div style={{ width: '4px', height: '4px', backgroundColor: '#6b7280', borderRadius: '50%' }}></div>
                        <div style={{ width: '4px', height: '4px', backgroundColor: '#6b7280', borderRadius: '50%' }}></div>
                      </div>
                    </button>

                    {openMenuId === user.id && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        zIndex: 1000,
                        minWidth: '160px',
                        padding: '0',
                        overflow: 'hidden'
                      }}>
                        <button
                          onClick={() => handleMenuAction(user.id, 'edit')}
                          disabled={!finalIsAdmin}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'white',
                            textAlign: 'left',
                            cursor: finalIsAdmin ? 'pointer' : 'not-allowed',
                            fontSize: '0.875rem',
                            color: finalIsAdmin ? '#374151' : '#9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            borderBottom: '1px solid #f3f4f6',
                            opacity: finalIsAdmin ? 1 : 0.6
                          }}
                          onMouseEnter={(e) => finalIsAdmin && (e.target.style.backgroundColor = '#f9fafb')}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          <FiEdit3 size={16} color={finalIsAdmin ? "#374151" : "#9ca3af"} />
                          Edit Profile
                        </button>
                        <button
                          onClick={() => handleMenuAction(user.id, 'view')}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: '#f3f4f6',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            borderBottom: '1px solid #e5e7eb'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                        >
                          <FiEye size={16} color="#374151" />
                          View Profile
                        </button>
                        <button
                          onClick={() => handleMenuAction(user.id, 'delete')}
                          disabled={!finalIsAdmin}
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: finalIsAdmin ? '#fef2f2' : '#f9fafb',
                            textAlign: 'left',
                            cursor: finalIsAdmin ? 'pointer' : 'not-allowed',
                            fontSize: '0.875rem',
                            color: finalIsAdmin ? '#dc2626' : '#9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            opacity: finalIsAdmin ? 1 : 0.6
                          }}
                          onMouseEnter={(e) => finalIsAdmin && (e.target.style.backgroundColor = '#fee2e2')}
                          onMouseLeave={(e) => e.target.style.backgroundColor = finalIsAdmin ? '#fef2f2' : '#f9fafb'}
                        >
                          <FiTrash2 size={16} color={finalIsAdmin ? "#dc2626" : "#9ca3af"} />
                          Delete Profile
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  {searchTerm ? `No users found matching "${searchTerm}"` : 'No users available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Side Panel */}
      {showSidePanel && (
        <UserDetailsSidePanel 
          user={selectedUser}
          onClose={handleCloseSidePanel}
          isVisible={showSidePanel}
          onPermissionUpdate={fetchUsers}
          setUsers={setUsers}
        />
      )}
    </div>
  );
}

// User Details Side Panel Component
function UserDetailsSidePanel({ user, onClose, isVisible, onPermissionUpdate, setUsers }) {
  const { updateUserPermissions, getUserPermissions, currentUser } = useRole();
  const [userPermissions, setUserPermissions] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const getAccessColor = (access) => {
    const colors = {
      'Data Cluster': '#8B5CF6',
      'Data Center': '#8B5CF6',
      'Projects': '#10B981',
      'Finance Management': '#EF4444',
      'Digital Media Management': '#3B82F6',
      'Team Communication': '#F97316',
      'Marketing': '#F59E0B',
      'HR Management': '#EC4899',
      'SEO Management': '#06B6D4',
      'Settings & Configuration': '#8B5A2B',
      'Dashboard': '#6366F1',
      'Internal Policies': '#A78BFA'
    };
    return colors[access] || '#6B7280';
  };


  const getModuleDisplayName = (module) => {
    const displayNames = {
      [MODULES.DASHBOARD]: 'Dashboard',
      [MODULES.DATA_CENTER]: 'Data Center',
      [MODULES.PROJECTS]: 'Projects',
      [MODULES.DIGITAL_MEDIA]: 'Digital Media Management',
      [MODULES.TEAM_COMMUNICATION]: 'Team Communication',
      [MODULES.MARKETING]: 'Marketing',
      [MODULES.HR_MANAGEMENT]: 'HR Management',
      [MODULES.FINANCE_MANAGEMENT]: 'Finance Management',
      [MODULES.SEO_MANAGEMENT]: 'SEO Management',
      [MODULES.INTERNAL_POLICIES]: 'Internal Policies',
      [MODULES.SETTINGS_CONFIG]: 'Settings & Configuration'
    };
    return displayNames[module] || module;
  };

  const handlePermissionChange = async (module, value) => {
    if (!isAdmin) return;
    
    const originalPermissions = { ...userPermissions };
    
    // Optimistic update
    setUserPermissions(prev => ({ ...prev, [module]: value }));
    
    try {
      const result = await updateUserPermissions(user.id, { [module]: value });
      
      if (!result.success) {
        setUserPermissions(originalPermissions);
        toast.error(`Failed to update permissions: ${result.error}`);
        return;
      }
      
      toast.success(`Permission ${value ? 'granted' : 'revoked'} for ${getModuleDisplayName(module)}`);
      
      // Update parent users list
      setUsers(prevUsers => 
        prevUsers.map(u => {
          if (u.id === user.id) {
            const updatedUser = { ...u };
            const moduleDisplayName = getModuleDisplayName(module);
            
            if (!updatedUser.customAccess) {
              updatedUser.customAccess = [];
            }
            
            if (value && !updatedUser.customAccess.includes(moduleDisplayName)) {
              updatedUser.customAccess.push(moduleDisplayName);
            } else if (!value) {
              updatedUser.customAccess = updatedUser.customAccess.filter(
                access => access !== moduleDisplayName
              );
            }
            return updatedUser;
          }
          return u;
        })
      );
      
      if (onPermissionUpdate) {
        onPermissionUpdate();
      }
      
    } catch (error) {
      setUserPermissions(originalPermissions);
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions: ' + error.message);
    }
  };

  useEffect(() => {
    if (user) {
      let permissions = {};
      
      const displayNameToModuleKey = {
        'Dashboard': MODULES.DASHBOARD,
        'Data Center': MODULES.DATA_CENTER,
        'Data Cluster': MODULES.DATA_CENTER,
        'Projects': MODULES.PROJECTS,
        'Digital Media Management': MODULES.DIGITAL_MEDIA,
        'Team Communication': MODULES.TEAM_COMMUNICATION,
        'Marketing': MODULES.MARKETING,
        'HR Management': MODULES.HR_MANAGEMENT,
        'Finance Management': MODULES.FINANCE_MANAGEMENT,
        'SEO Management': MODULES.SEO_MANAGEMENT,
        'Internal Policies': MODULES.INTERNAL_POLICIES,
        'Settings & Configuration': MODULES.SETTINGS_CONFIG
      };

      if (user.customAccess && user.customAccess.length > 0) {
        user.customAccess.forEach(access => {
          const moduleKey = displayNameToModuleKey[access] || access;
          permissions[moduleKey] = true;
        });
      } else if (user.access && user.access.length > 0) {
        user.access.forEach(access => {
          const moduleKey = displayNameToModuleKey[access] || access;
          permissions[moduleKey] = true;
        });
      } else {
        permissions = getUserPermissions(user.id) || {};
      }
      
      setUserPermissions(permissions);
      
      const isCurrentUserAdmin = currentUser?.role === 'Admin';
      setIsAdmin(isCurrentUserAdmin);
      console.log('Current user role:', currentUser?.role);
      console.log('Is admin:', isCurrentUserAdmin);
    }
  }, [user, getUserPermissions, currentUser]);

  if (!user) return null;

  // Mock additional user data - in real app this would come from API
  const userDetails = {
    ...user,
    currentProjects: 5,
    totalProjects: 21,
    joinDate: '10 - 04 - 2024',
    phone: '+91 9098989281',
    location: 'Coffee Estate Homestay, Mullayanagiri Road, Kaimara, Chikmagalur, Karnataka - 577101, India',
    languages: ['English', 'Hindi'],
    maritalStatus: 'Single',
    employmentId: '0020192',
    responseTime: '24m'
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
          <h3>User Preview</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* User Info */}
        <div className="side-panel-content">
          <div className="user-profile-section">
            <div className="user-avatar-large">
              <div className="avatar-icon-large">👤</div>
            </div>
            <div className="user-info-text">
              <h2>{userDetails.name}</h2>
              <div className="user-status-indicator">
                <span className="status-dot-green"></span>
                <span className="status-text">Online</span>
              </div>
              <p className="user-email-large">{userDetails.email}</p>
            </div>
          </div>

          {/* Project Stats */}
          <div className="project-stats">
            <div className="stat-item">
              <div className="stat-label">Currently</div>
              <div className="stat-value">{userDetails.currentProjects}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Projects</div>
              <div className="stat-value">{userDetails.totalProjects}</div>
            </div>
          </div>

          {/* User Details Section */}
          <div className="details-section">
            <h4>User Details</h4>
            <div className="detail-grid-two-column">
              <div className="detail-row">
                <div className="detail-item-left">
                  <span className="detail-label">E-mail</span>
                  <span className="detail-value">{userDetails.email}</span>
                </div>
                <div className="detail-item-right">
                  <span className="detail-label">Join Date</span>
                  <span className="detail-value blue-text">{userDetails.joinDate}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-item-left">
                  <span className="detail-label">Phone No.</span>
                  <span className="detail-value blue-text">{userDetails.phone}</span>
                </div>
                <div className="detail-item-right">
                  <span className="detail-label">Designation</span>
                  <span className="detail-value">{userDetails.role}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-item-left">
                  <span className="detail-label">Location</span>
                  <span className="detail-value">{userDetails.location}</span>
                </div>
                <div className="detail-item-right">
                  <span className="detail-label">Employment ID</span>
                  <span className="detail-value">{userDetails.employmentId}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-item-left">
                  <span className="detail-label">Language Spoken</span>
                  <span className="detail-value">{userDetails.languages.join(', ')}</span>
                </div>
                <div className="detail-item-right">
                  <span className="detail-label">Status</span>
                  <span className="detail-value">{userDetails.status}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-item-left">
                  <span className="detail-label">Marital Status</span>
                  <span className="detail-value">{userDetails.maritalStatus}</span>
                </div>
                <div className="detail-item-right">
                  <span className="detail-label">Response Time</span>
                  <span className="detail-value">{userDetails.responseTime}</span>
                </div>
              </div>
            </div>
          </div>


          {/* Permissions Section */}
          <div className="permissions-section">
            <h4>Permissions {isAdmin && <span style={{fontSize: '12px', color: '#6B7280', fontWeight: 'normal'}}>(Click to modify)</span>}</h4>
            <div className="permissions-grid-two-column">
              <div className="permission-column">
                {Object.entries(MODULES).slice(0, Math.ceil(Object.entries(MODULES).length / 2)).map(([key, module]) => (
                  <div key={module} className="permission-item">
                    <input 
                      type="checkbox" 
                      id={module}
                      checked={userPermissions[module] || false}
                      onChange={(e) => handlePermissionChange(module, e.target.checked)}
                      disabled={!isAdmin}
                      style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                    />
                    <label 
                      htmlFor={module}
                      style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                    >
                      {getModuleDisplayName(module)}
                    </label>
                  </div>
                ))}
              </div>
              <div className="permission-column">
                {Object.entries(MODULES).slice(Math.ceil(Object.entries(MODULES).length / 2)).map(([key, module]) => (
                  <div key={module} className="permission-item">
                    <input 
                      type="checkbox" 
                      id={module}
                      checked={userPermissions[module] || false}
                      onChange={(e) => handlePermissionChange(module, e.target.checked)}
                      disabled={!isAdmin}
                      style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                    />
                    <label 
                      htmlFor={module}
                      style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                    >
                      {getModuleDisplayName(module)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            {!isAdmin && (
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '12px', fontStyle: 'italic' }}>
                Only administrators can modify permissions
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default UsersRoles;