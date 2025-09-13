import React, { useState, useEffect, useCallback } from 'react';
import { CiSearch } from 'react-icons/ci';
import { FiEdit3, FiEye, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import { useRole, MODULES } from '../contexts/RoleContext';
import './UsersRoles.css';

function UsersRoles() {
  const { 
    users: contextUsers, 
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

  // Check if current user is admin
  const isCurrentUserAdmin = currentUser?.role === 'Admin';
  
  // Debug logging
  console.log('Current user from context:', currentUser);
  console.log('Is current user admin:', isCurrentUserAdmin);
  
  // Fallback: Check localStorage if context user is not available
  const localStorageUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdminFromLocalStorage = localStorageUser?.role === 'Admin';
  console.log('User from localStorage:', localStorageUser);
  console.log('Is admin from localStorage:', isAdminFromLocalStorage);
  
  // Use either context user or localStorage user for admin check
  const finalIsAdmin = isCurrentUserAdmin || isAdminFromLocalStorage;

  // Fetch available roles from backend
  const fetchRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Fallback to hardcoded roles if no token
        const fallbackRoles = [
          'User',
          'Admin',
          'Project Manager', 
          'Data Miner',
          'Data Analyst',
          'Social Media Manager',
          'Human Resource',
          'Graphic Designer',
          'Web Developer',
          'SEO Manager'
        ];
        setAvailableRoles(fallbackRoles);
        return;
      }

      const response = await api.get('/roles');
      console.log('Fetched roles from backend:', response.data.roles);
      setAvailableRoles(response.data.roles || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
      // Fallback to hardcoded roles on error
      const fallbackRoles = [
        'User',
    'Admin',
    'Project Manager', 
    'Data Miner',
    'Data Analyst',
    'Social Media Manager',
    'Human Resource',
    'Graphic Designer',
    'Web Developer',
    'SEO Manager'
  ];
      setAvailableRoles(fallbackRoles);
    }
  }, []);

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Use demo data if no token
        console.log('No token found, using demo data');
        const demoUsers = JSON.parse(localStorage.getItem('usersData') || '[]');
        if (demoUsers.length > 0) {
          setUsers(demoUsers);
        }
        setLoading(false);
        return;
      }

      const response = await api.get('/users');

      // Transform backend data to match frontend format
      const transformedUsers = response.data.users.map(user => ({
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        access: user.access || []
      }));

      setUsers(transformedUsers);
      setContextUsers(transformedUsers); // Update context as well
      setError(null);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fall back to demo data on error
      const demoUsers = JSON.parse(localStorage.getItem('usersData') || '[]');
      if (demoUsers.length > 0) {
        setUsers(demoUsers);
        setError(null); // Clear error if we have demo data
        console.log('Using demo data due to API error');
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
    
    // Check if current user is admin
    if (!finalIsAdmin) {
      toast.error('Only administrators can change user roles');
      return;
    }

    try {
      setError(null); // Clear any previous errors
      
      // Set status based on role: User = "In Review", any other role = "Active"
      const newStatus = newRole === 'User' ? 'In Review' : 'Active';
      console.log('Setting new status:', newStatus);
      
      const result = await updateUserRole(userId, newRole, newStatus);
      console.log('updateUserRole result:', result);
      
      if (result.success) {
        // Update local state immediately for UI responsiveness
        setUsers(users.map(user => 
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

  // Close menu when clicking outside
  const closeMenu = () => {
    setOpenMenuId(null);
  };

  // Handle menu actions
  const handleMenuAction = async (userId, action) => {
    // Close menu
    setOpenMenuId(null);

    try {
      setError(null); // Clear any previous errors
      
      if (action === 'edit') {
        // Check if current user is admin for edit action
        if (!finalIsAdmin) {
          toast.error('Only administrators can edit user profiles');
          return;
        }
        // Open edit panel or navigate to edit page
        setSelectedUser(users.find(user => user.id === userId));
        setShowSidePanel(true);
        toast.info('Edit user panel opened');
      } else if (action === 'view') {
        // View profile - no admin check needed
        setSelectedUser(users.find(user => user.id === userId));
        setShowSidePanel(true);
        toast.info('Viewing user profile');
      } else if (action === 'delete') {
        // Check if current user is admin for delete action
        if (!finalIsAdmin) {
          toast.error('Only administrators can delete users');
          return;
        }
        // Confirm deletion
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
          const response = await api.delete(`/users/${userId}`);
          if (response.status === 200) {
            // Remove user from local state
            setUsers(users.filter(user => user.id !== userId));
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

  // Load users and roles on component mount
  useEffect(() => {
    // Fetch roles first
    fetchRoles();
    
    // Initialize demo data if needed
    const demoUsers = JSON.parse(localStorage.getItem('usersData') || '[]');
    if (demoUsers.length === 0) {
      // Import and initialize demo data
      import('../data/demoUsers').then(({ initializeDemoData }) => {
        initializeDemoData();
        // Try to fetch users after initialization
        fetchUsers();
      });
    } else {
      // Try to fetch from API first, fall back to demo data
      fetchUsers();
    }
  }, [fetchUsers, fetchRoles]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('.user-actions')) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Sync with context users when they change
  useEffect(() => {
    if (contextUsers && contextUsers.length > 0) {
      setUsers(contextUsers);
      setLoading(false);
    }
  }, [contextUsers]);

  // Fallback: Load users from localStorage if available
  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('usersData') || '[]');
    if (storedUsers.length > 0 && users.length === 0 && !loading) {
      setUsers(storedUsers);
      setLoading(false);
    }
  }, [users.length, loading]);

  const handleAccessAdd = (userId) => {
    // This would typically open a modal or dropdown to add access
    console.log('Add access for user:', userId);
  };

  // Handle user details click
  const handleUserClick = (user) => {
    setSelectedUser(user);
    setShowSidePanel(true);
  };

  // Handle side panel close
  const handleCloseSidePanel = () => {
    setShowSidePanel(false);
    setTimeout(() => setSelectedUser(null), 300); // Delay clearing user to allow animation
  };


  // Function to get all access permissions for a user (role-based + custom)
  const getAllUserAccess = (user) => {
    const allAccess = [];
    
    // Add role-based access
    if (user.access && user.access.length > 0) {
      allAccess.push(...user.access);
    }
    
    // Add custom access (if different from role-based)
    if (user.customAccess && user.customAccess.length > 0) {
      user.customAccess.forEach(customAccess => {
        if (!allAccess.includes(customAccess)) {
          allAccess.push(customAccess);
        }
      });
    }
    
    return allAccess;
  };
  const getAccessColor = (access) => {
  const colors = {
    'Data Cluster': '#8B5CF6',
    'Projects': '#10B981',
    'Finance': '#EF4444',
    'Digital Media': '#3B82F6',
    'Marketing': '#F59E0B',
    'HR Management': '#EC4899',
    'SEO Management': '#06B6D4',
    'Settings': '#8B5A2B',
    'Dashboard': '#6366F1',
    'Internal Policies': '#A78BFA'
  };
  return colors[access] || '#6B7280';
  };
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (error) {
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

      <div className="users-roles-header">
        <div className="header-content">
          <div className="header-left">
            <h2>Users & Roles Management</h2>
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
                placeholder="Search"
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
                        key={index} 
                        className="access-tag"
                        style={{ backgroundColor: getAccessColor(access) }}
                      >
                        {access}
                      </span>
                    ))}
                    <button 
                      className="add-access-btn"
                      onClick={() => handleAccessAdd(user.id)}
                    >
                      +
                    </button>
                  </div>
                </td>
                <td className="user-role">
                  <select 
                    value={user.role} 
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="role-select"
                    disabled={!finalIsAdmin}
                    style={{
                      opacity: finalIsAdmin ? 1 : 0.6,
                      cursor: finalIsAdmin ? 'pointer' : 'not-allowed',
                      backgroundColor: finalIsAdmin ? 'white' : '#f3f4f6'
                    }}
                    title={!finalIsAdmin ? 'Only administrators can change user roles' : ''}
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
                    className={`status-badge ${user.status.toLowerCase().replace(' ', '-')}`}
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
                     user.status === 'In Review' ? '⏳ In Review' : user.status}
                  </span>
                </td>
                <td className="user-actions">
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {/* 3-dot menu button */}
                    <button
                      onClick={() => toggleMenu(user.id)}
                      disabled={!finalIsAdmin}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: finalIsAdmin ? 'pointer' : 'not-allowed',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        opacity: finalIsAdmin ? 1 : 0.5,
                        fontSize: '1.2rem',
                        color: '#6b7280',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2rem',
                        height: '2rem'
                      }}
                      title={!finalIsAdmin ? 'Only administrators can perform actions' : 'User actions'}
                    >
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '2px',
                        alignItems: 'center'
                      }}>
                        <div style={{ 
                          width: '4px', 
                          height: '4px', 
                          backgroundColor: '#6b7280', 
                          borderRadius: '50%' 
                        }}></div>
                        <div style={{ 
                          width: '4px', 
                          height: '4px', 
                          backgroundColor: '#6b7280', 
                          borderRadius: '50%' 
                        }}></div>
                        <div style={{ 
                          width: '4px', 
                          height: '4px', 
                          backgroundColor: '#6b7280', 
                          borderRadius: '50%' 
                        }}></div>
                      </div>
                    </button>

                    {/* Dropdown menu */}
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
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: 'white',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            borderBottom: '1px solid #f3f4f6'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                          <FiEdit3 size={16} color="#374151" />
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
                          style={{
                            width: '100%',
                            padding: '0.75rem 1rem',
                            border: 'none',
                            background: '#fef2f2',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#fee2e2'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#fef2f2'}
                        >
                          <FiTrash2 size={16} color="#dc2626" />
                          Delete Profile
                  </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
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
        />
      )}

    </div>
  );
}

// User Details Side Panel Component
function UserDetailsSidePanel({ user, onClose, isVisible, onPermissionUpdate }) {
  const { updateUserPermissions, getUserPermissions, currentUser } = useRole();
  const [userPermissions, setUserPermissions] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      // Initialize permissions based on user's actual access
      let permissions = {};
      
      // Create a mapping from display names to module keys
      const displayNameToModuleKey = {
        'Dashboard': MODULES.DASHBOARD,
        'Data Center': MODULES.DATA_CENTER,
        'Data Cluster': MODULES.DATA_CENTER,
        'Projects': MODULES.PROJECTS,
        'Digital Media Management': MODULES.DIGITAL_MEDIA,
        'Digital Media': MODULES.DIGITAL_MEDIA,
        'Marketing': MODULES.MARKETING,
        'HR Management': MODULES.HR_MANAGEMENT,
        'Finance Management': MODULES.FINANCE_MANAGEMENT,
        'Finance': MODULES.FINANCE_MANAGEMENT,
        'SEO Management': MODULES.SEO_MANAGEMENT,
        'Internal Policies': MODULES.INTERNAL_POLICIES,
        'Settings & Configuration': MODULES.SETTINGS_CONFIG
      };      if (user.customAccess && user.customAccess.length > 0) {
        user.customAccess.forEach(access => {
          const moduleKey = displayNameToModuleKey[access] || access;
          permissions[moduleKey] = true;
        });
      } else if (user.access && user.access.length > 0) {
        // Use user.access array and map display names to module keys
        user.access.forEach(access => {
          const moduleKey = displayNameToModuleKey[access] || access;
          permissions[moduleKey] = true;
        });
      } else {
        // Fallback to backend permissions
        permissions = getUserPermissions(user.id);
      }      
      setUserPermissions(permissions);
      console.log("User permissions loaded:", permissions);
      console.log("Display name to module key mapping:", displayNameToModuleKey);      console.log("User access array:", user.access);
      console.log("User access array mapped to permissions:", Object.keys(permissions));      console.log("User custom access:", user.customAccess);
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

  const getModuleDisplayName = (module) => {
    const displayNames = {
      [MODULES.DASHBOARD]: 'Dashboard',
      [MODULES.DATA_CENTER]: 'Data Center',
      [MODULES.PROJECTS]: 'Projects',
      [MODULES.DIGITAL_MEDIA]: 'Digital Media Management',
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
    
    // Update local state immediately for live UI updates
    const updatedPermissions = {
      ...userPermissions,
      [module]: value
    };
    setUserPermissions(updatedPermissions);    
    try {
      const result = await updateUserPermissions(user.id, { [module]: value });
      
      if (result.success) {
        // Update local state immediately for UI responsiveness
        const updatedPermissions = {
          ...userPermissions,
          [module]: value
        };
        setUserPermissions(updatedPermissions);
        toast.success(`Permission ${value ? 'granted' : 'revoked'} for ${getModuleDisplayName(module)}`);
        
        // Refresh the permissions to ensure UI is in sync with backend
        const refreshedPermissions = getUserPermissions(user.id);
        setUserPermissions(refreshedPermissions);
        
        // Notify parent component to refresh users list
        if (onPermissionUpdate) {
          onPermissionUpdate();
        }
      } else {
        console.error('Failed to update permissions:', result.error);
        toast.error(`Failed to update permissions: ${result.error}`);
        
        // Revert the checkbox state on error
        const currentPermissions = getUserPermissions(user.id);
        setUserPermissions(currentPermissions);
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions: ' + error.message);
      
      // Revert the checkbox state on error
      const currentPermissions = getUserPermissions(user.id);
      setUserPermissions(currentPermissions);
    }
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
            <h4>Permission {isAdmin && <span style={{fontSize: '12px', color: '#6B7280', fontWeight: 'normal'}}>(Click to modify)</span>}</h4>
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
