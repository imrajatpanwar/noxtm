import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../config/api';

const RoleContext = createContext();

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

// Define available modules/sections
export const MODULES = {
  DASHBOARD: 'dashboard',
  DATA_CENTER: 'dataCenter',
  PROJECTS: 'projects',
  DIGITAL_MEDIA: 'digitalMediaManagement',
  MARKETING: 'marketing',
  HR_MANAGEMENT: 'hrManagement',
  FINANCE_MANAGEMENT: 'financeManagement',
  SEO_MANAGEMENT: 'seoManagement',
  INTERNAL_POLICIES: 'internalPolicies',
  SETTINGS_CONFIG: 'settingsConfiguration'
};

// Default role permissions
export const DEFAULT_PERMISSIONS = {
  Admin: {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: true,
    [MODULES.PROJECTS]: true,
    [MODULES.DIGITAL_MEDIA]: true,
    [MODULES.MARKETING]: true,
    [MODULES.HR_MANAGEMENT]: true,
    [MODULES.FINANCE_MANAGEMENT]: true,
    [MODULES.SEO_MANAGEMENT]: true,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: true
  },
  'Project Manager': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: true,
    [MODULES.PROJECTS]: true,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.MARKETING]: true,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: true,
    [MODULES.INTERNAL_POLICIES]: false,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Data Miner': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: true,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: false,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Data Analyst': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: true,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: true,
    [MODULES.INTERNAL_POLICIES]: false,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Social Media Manager': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: true,
    [MODULES.MARKETING]: true,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: true,
    [MODULES.INTERNAL_POLICIES]: false,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Human Resource': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: true,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Graphic Designer': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: true,
    [MODULES.DIGITAL_MEDIA]: true,
    [MODULES.MARKETING]: true,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: false,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Web Developer': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: true,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: true,
    [MODULES.INTERNAL_POLICIES]: false,
    [MODULES.SETTINGS_CONFIG]: true
  },
  'SEO Manager': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: true,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: true,
    [MODULES.MARKETING]: true,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: true,
    [MODULES.INTERNAL_POLICIES]: false,
    [MODULES.SETTINGS_CONFIG]: false
  }
};

export const RoleProvider = ({ children }) => {
  const [userPermissions, setUserPermissions] = useState({});
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch users from backend
  const fetchUsersFromBackend = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const response = await api.get('/users');
      
      // Transform backend data to match frontend format
      const transformedUsers = response.data.users.map(user => ({
        id: user._id,
        name: user.username,
        email: user.email,
        role: user.role,
        status: user.status || 'Active',
        access: user.access || [],
        permissions: user.permissions || {}
      }));
      
      return transformedUsers;
    } catch (error) {
      console.error('Error fetching users from backend:', error);
      return null;
    }
  };

  // Load user data from localStorage or API
  useEffect(() => {
    const loadUserData = async () => {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUser(userData);
      
      // Get user's role permissions
      if (userData.role) {
        const permissions = DEFAULT_PERMISSIONS[userData.role] || {};
        setUserPermissions(permissions);
      }
      
      // Try to fetch from backend first
      const backendUsers = await fetchUsersFromBackend();
      
      if (backendUsers && backendUsers.length > 0) {
        setUsers(backendUsers);
        localStorage.setItem('usersData', JSON.stringify(backendUsers));
      } else {
        // Fall back to local data
        const storedUsers = JSON.parse(localStorage.getItem('usersData') || '[]');
        setUsers(storedUsers);
      }
    };
    
    loadUserData();
  }, []);

  // Check if user has permission for a module
  const hasPermission = (module) => {
    if (!currentUser || !currentUser.role) return false;
    
    // Admin has access to everything
    if (currentUser.role === 'Admin') return true;
    
    // Check specific user permissions (overrides)
    const userSpecificPermissions = users.find(u => u.id === currentUser.id)?.permissions;
    if (userSpecificPermissions && userSpecificPermissions.hasOwnProperty(module)) {
      return userSpecificPermissions[module];
    }
    
    // Check default role permissions
    return userPermissions[module] || false;
  };

  // Update user permissions (admin function)
  const updateUserPermissions = async (userId, permissions) => {
    try {
      const token = localStorage.getItem('token');
      
      // Check if we're using demo data (string IDs) vs real backend data (ObjectIds)
      const isDemoData = typeof userId === 'string' && /^[0-9]+$/.test(userId);
      
      if (token && !isDemoData) {
        // Try to update on backend first (only for real backend data)
        try {
          await api.put(`/users/${userId}/permissions`, { permissions });
        } catch (apiError) {
          // If the permissions endpoint doesn't exist (404), try the general user update endpoint
          if (apiError.response?.status === 404) {
            console.log('Permissions endpoint not found, falling back to general user update');
            // For now, just log that we're skipping the API call
            // The local state will still be updated below
          } else {
            throw apiError; // Re-throw if it's a different error
          }
        }
      }
      
      // Update local state
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, permissions: { ...user.permissions, ...permissions } }
          : user
      );
      
      setUsers(updatedUsers);
      localStorage.setItem('usersData', JSON.stringify(updatedUsers));
      
      // If updating current user, update current permissions
      if (userId === currentUser?.id) {
        setUserPermissions(prev => ({ ...prev, ...permissions }));
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user permissions:', error);
      
      // Still update locally as fallback
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, permissions: { ...user.permissions, ...permissions } }
          : user
      );
      
      setUsers(updatedUsers);
      localStorage.setItem('usersData', JSON.stringify(updatedUsers));
      
      if (userId === currentUser?.id) {
        setUserPermissions(prev => ({ ...prev, ...permissions }));
      }
      
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  };

  // Get user permissions
  const getUserPermissions = (userId) => {
    const user = users.find(u => u.id === userId);
    if (!user) return {};
    
    // Merge default role permissions with user-specific overrides
    const defaultPerms = DEFAULT_PERMISSIONS[user.role] || {};
    const userSpecificPerms = user.permissions || {};
    
    return { ...defaultPerms, ...userSpecificPerms };
  };

  // Update user role (admin function)
  const updateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      
      // Check if we're using demo data (string IDs) vs real backend data (ObjectIds)
      const isDemoData = typeof userId === 'string' && /^[0-9]+$/.test(userId);
      
      if (token && !isDemoData) {
        // Try to update on backend first (only for real backend data)
        try {
          await api.put(`/users/${userId}`, { role: newRole });
        } catch (apiError) {
          // If the endpoint doesn't exist (404), log and continue with local update
          if (apiError.response?.status === 404) {
            console.log('User update endpoint not found, updating locally only');
            // The local state will still be updated below
          } else {
            throw apiError; // Re-throw if it's a different error
          }
        }
      }
      
      // Update local state
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      );
      
      setUsers(updatedUsers);
      localStorage.setItem('usersData', JSON.stringify(updatedUsers));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      
      // Still update locally as fallback
      const updatedUsers = users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      );
      
      setUsers(updatedUsers);
      localStorage.setItem('usersData', JSON.stringify(updatedUsers));
      
      return { 
        success: false, 
        error: error.response?.data?.message || error.message 
      };
    }
  };

  // Get all users with their permissions
  const getAllUsersWithPermissions = () => {
    return users.map(user => ({
      ...user,
      permissions: getUserPermissions(user.id)
    }));
  };

  const value = {
    currentUser,
    userPermissions,
    users,
    hasPermission,
    updateUserPermissions,
    updateUserRole,
    getUserPermissions,
    getAllUsersWithPermissions,
    setUsers,
    fetchUsersFromBackend,
    MODULES,
    DEFAULT_PERMISSIONS
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export default RoleContext;
