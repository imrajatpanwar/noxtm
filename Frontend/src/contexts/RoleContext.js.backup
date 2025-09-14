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
  TEAM_COMMUNICATION: 'teamCommunication',
  MARKETING: 'marketing',
  HR_MANAGEMENT: 'hrManagement',
  FINANCE_MANAGEMENT: 'financeManagement',
  SEO_MANAGEMENT: 'seoManagement',
  INTERNAL_POLICIES: 'internalPolicies',
  SETTINGS_CONFIG: 'settingsConfiguration'
};

// Default role permissions
export const DEFAULT_PERMISSIONS = {
  User: {
    [MODULES.DASHBOARD]: false,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: false,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: false,
    [MODULES.SETTINGS_CONFIG]: false
  },
  Visitor: {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: false,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: false,
    [MODULES.SETTINGS_CONFIG]: false
  },
  Admin: {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: true,
    [MODULES.PROJECTS]: true,
    [MODULES.DIGITAL_MEDIA]: true,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: true,
    [MODULES.HR_MANAGEMENT]: true,
    [MODULES.FINANCE_MANAGEMENT]: true,
    [MODULES.SEO_MANAGEMENT]: true,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: true
  },
  'Project Manager': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: true,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Data Miner': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: true,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Data Analyst': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: true,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Social Media Manager': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: true,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Human Resource': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: true,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: true
  },
  'Graphic Designer': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: true,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Web Developer': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: true,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: true,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: true
  },
  'SEO Manager': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: false,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: true,
    [MODULES.INTERNAL_POLICIES]: true,
    [MODULES.SETTINGS_CONFIG]: false
  },
  'Marketing': {
    [MODULES.DASHBOARD]: true,
    [MODULES.DATA_CENTER]: false,
    [MODULES.PROJECTS]: false,
    [MODULES.DIGITAL_MEDIA]: false,
    [MODULES.TEAM_COMMUNICATION]: true,
    [MODULES.MARKETING]: true,
    [MODULES.HR_MANAGEMENT]: false,
    [MODULES.FINANCE_MANAGEMENT]: false,
    [MODULES.SEO_MANAGEMENT]: false,
    [MODULES.INTERNAL_POLICIES]: true,
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
      
      console.log('Fetched users from backend:', response.data.users);
      
      // Transform backend data to match frontend format
      const transformedUsers = response.data.users.map(user => {
        // Get default permissions for the user's role
        const roleDefaultPermissions = DEFAULT_PERMISSIONS[user.role] || {};
        
        // Merge backend permissions with role defaults
        // Backend permissions override role defaults
        const mergedPermissions = { ...roleDefaultPermissions };
        
        // Apply user-specific permissions from backend
        if (user.permissions) {
          Object.keys(user.permissions).forEach(key => {
            // Only override if the permission is explicitly set in backend
            if (user.permissions[key] !== undefined && user.permissions[key] !== null) {
              mergedPermissions[key] = user.permissions[key];
            }
          });
        }
        
        return {
          id: user._id,
          name: user.username,
          email: user.email,
          role: user.role,
          status: user.status || 'Active',
          access: user.access || [],
          permissions: mergedPermissions
        };
      });
      
      console.log('Transformed users:', transformedUsers);
      
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
      
      console.log('User ID:', userId, 'Type:', typeof userId, 'Is demo data:', isDemoData);
      console.log('Token exists:', !!token);
      
      if (token && !isDemoData) {
        // Update on backend
        console.log('Making API call to update permissions:', { userId, permissions });
        console.log('API URL:', `/users/${userId}/permissions`);
        const response = await api.put(`/users/${userId}/permissions`, { permissions });
        
        console.log('API response:', response.data);
        console.log('User permissions from response:', response.data.user.permissions);
        console.log('User access from response:', response.data.user.access);
        
        // Get the updated permissions from the response
        const updatedPermissions = response.data.user.permissions || {};
        
        // Update local state with the backend response
        const updatedUsers = users.map(user => {
          if (user.id === userId) {
            // Get default permissions for the user's role
            const roleDefaultPermissions = DEFAULT_PERMISSIONS[user.role] || {};
            
            // Merge with updated permissions from backend
            const mergedPermissions = { ...roleDefaultPermissions };
            Object.keys(updatedPermissions).forEach(key => {
              if (updatedPermissions[key] !== undefined && updatedPermissions[key] !== null) {
                mergedPermissions[key] = updatedPermissions[key];
              }
            });
            
            // Sync access array with permissions
            const accessArray = [];
            if (mergedPermissions[MODULES.DATA_CENTER]) accessArray.push('Data Cluster');
            if (mergedPermissions[MODULES.PROJECTS]) accessArray.push('Projects');
            if (mergedPermissions[MODULES.FINANCE_MANAGEMENT]) accessArray.push('Finance');
            if (mergedPermissions[MODULES.DIGITAL_MEDIA]) accessArray.push('Digital Media');
            if (mergedPermissions[MODULES.MARKETING]) accessArray.push('Marketing');
            
            return { ...user, permissions: mergedPermissions, access: accessArray };
          }
          return user;
        });
        
        console.log('Updated users after permission change:', updatedUsers);
        setUsers(updatedUsers);
        localStorage.setItem('usersData', JSON.stringify(updatedUsers));
        
        // If updating current user, update current permissions
        if (userId === currentUser?.id) {
          setUserPermissions(prev => ({ ...prev, ...permissions }));
        }
        
        return { success: true };
      } else if (isDemoData) {
        // For demo data, just update locally
        const updatedUsers = users.map(user => {
          if (user.id === userId) {
            const updatedUserPermissions = { ...user.permissions, ...permissions };
            
            // Sync access array with permissions
            const accessArray = [];
            if (updatedUserPermissions[MODULES.DATA_CENTER]) accessArray.push('Data Cluster');
            if (updatedUserPermissions[MODULES.PROJECTS]) accessArray.push('Projects');
            if (updatedUserPermissions[MODULES.FINANCE_MANAGEMENT]) accessArray.push('Finance');
            if (updatedUserPermissions[MODULES.DIGITAL_MEDIA]) accessArray.push('Digital Media');
            if (updatedUserPermissions[MODULES.MARKETING]) accessArray.push('Marketing');
            
            return { ...user, permissions: updatedUserPermissions, access: accessArray };
          }
          return user;
        });
        
        setUsers(updatedUsers);
        localStorage.setItem('usersData', JSON.stringify(updatedUsers));
        
        if (userId === currentUser?.id) {
          setUserPermissions(prev => ({ ...prev, ...permissions }));
        }
        
        return { success: true };
      }
      
      return { success: false, error: 'No valid token or user data' };
    } catch (error) {
      console.error('Error updating user permissions:', error);
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
    
    // User permissions are already merged in fetchUsersFromBackend
    // Just return the user's permissions
    return user.permissions || {};
  };

  // Update user role (admin function)
  const updateUserRole = async (userId, newRole, newStatus = null) => {
    try {
      const token = localStorage.getItem('token');
      
      // Check if we're using demo data (string IDs) vs real backend data (ObjectIds)
      const isDemoData = typeof userId === 'string' && /^[0-9]+$/.test(userId);
      
      if (token && !isDemoData) {
        // Try to update on backend first (only for real backend data)
        try {
          const updateData = { role: newRole };
          if (newStatus) {
            updateData.status = newStatus;
          }
          await api.put(`/users/${userId}`, updateData);
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
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          const updatedUser = { ...user, role: newRole };
          if (newStatus) {
            updatedUser.status = newStatus;
          }
          return updatedUser;
        }
        return user;
      });
      
      setUsers(updatedUsers);
      localStorage.setItem('usersData', JSON.stringify(updatedUsers));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      
      // Still update locally as fallback
      const updatedUsers = users.map(user => {
        if (user.id === userId) {
          const updatedUser = { ...user, role: newRole };
          if (newStatus) {
            updatedUser.status = newStatus;
          }
          return updatedUser;
        }
        return user;
      });
      
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
