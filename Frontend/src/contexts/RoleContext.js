import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/api';
import { toast } from 'sonner';

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

// Simplified: No default role permissions - all permissions are manual

export const RoleProvider = ({ children }) => {
  const [userPermissions, setUserPermissions] = useState({});
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [permissionUpdateTrigger, setPermissionUpdateTrigger] = useState(0);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const permissionCheckInterval = useRef(null);
  const lastPermissionHash = useRef(null);

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
        const roleDefaultPermissions = [user.role] || {};
        
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
          status: user.role === 'User' ? 'In Review' : (user.status || 'Active'),
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

  // Generate hash of current user permissions for change detection
  const generatePermissionHash = useCallback((user) => {
    if (!user) return null;
    const userPermissions = users.find(u => u.id === user.id)?.permissions || {};
    return JSON.stringify({ role: user.role, permissions: userPermissions });
  }, [users]);

  // Check current user permissions from backend
  const checkCurrentUserPermissions = useCallback(async () => {
    if (!currentUser || isCheckingPermissions) return;
    
    setIsCheckingPermissions(true);
    try {
      const response = await api.get('/profile');
      const updatedUser = response.data;
      
      // Update current user data
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Fetch updated users list to get latest permissions
      const usersResponse = await api.get('/users');
      if (usersResponse.data && usersResponse.data.users) {
        const transformedUsers = usersResponse.data.users.map(user => ({
          id: user._id,
          name: user.username,
          email: user.email,
          role: user.role,
          status: user.role === 'User' ? 'In Review' : (user.status || 'Active'),
          access: user.access || [],
          permissions: user.permissions || {}
        }));
        
        // Check if current user's permissions changed
        const newHash = generatePermissionHash(updatedUser);
        const oldHash = lastPermissionHash.current;
        
        if (oldHash && newHash && oldHash !== newHash) {
          // Permissions changed - notify user and trigger re-render
          toast.success('Your permissions have been updated!', {
            description: 'Your access levels have been modified by an administrator.',
            duration: 5000,
          });
          setPermissionUpdateTrigger(prev => prev + 1);
        }
        
        lastPermissionHash.current = newHash;
        setUsers(transformedUsers);
        localStorage.setItem('usersData', JSON.stringify(transformedUsers));
      }
    } catch (error) {
      console.error('Error checking user permissions:', error);
      // Don't show error toast for permission checks to avoid spam
    } finally {
      setIsCheckingPermissions(false);
    }
  }, [currentUser, isCheckingPermissions, generatePermissionHash]);

  // Load user data from localStorage or API
  useEffect(() => {
    const loadUserData = async () => {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setCurrentUser(userData);
      
      // Get user's role permissions
      if (userData.role) {
        const permissions = [userData.role] || {};
        setUserPermissions(permissions);
      }
      
      // Try to fetch from backend first
      const backendUsers = await fetchUsersFromBackend();
      
      if (backendUsers && backendUsers.length > 0) {
        setUsers(backendUsers);
        localStorage.setItem('usersData', JSON.stringify(backendUsers));
        
        // Set initial permission hash
        if (userData.id) {
          lastPermissionHash.current = generatePermissionHash(userData);
        }
      } else {
        // Fall back to local data
        const storedUsers = JSON.parse(localStorage.getItem('usersData') || '[]');
        setUsers(storedUsers);
      }
    };
    
    loadUserData();
  }, [generatePermissionHash]);

  // Set up real-time permission checking
  useEffect(() => {
    if (!currentUser) return;

    // Start permission checking interval (every 30 seconds)
    permissionCheckInterval.current = setInterval(() => {
      checkCurrentUserPermissions();
    }, 30000);

    // Cleanup interval on unmount or user change
    return () => {
      if (permissionCheckInterval.current) {
        clearInterval(permissionCheckInterval.current);
      }
    };
  }, [currentUser, checkCurrentUserPermissions]);

  // Check if user has permission for a module
  const hasPermission = useCallback((module) => {
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
  }, [currentUser, users, userPermissions]); // Remove permissionUpdateTrigger as it's not directly used


  // Update user permissions (admin function)
  const updateUserPermissions = async (userId, permissions) => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        // Update on backend - send permissions directly
        await api.put(`/users/${userId}/permissions`, permissions);
      }
      
      // Update local state
      const updatedUsers = users.map(user => {
        if ((user._id || user.id) === userId) {
          return { ...user, permissions: { ...user.permissions, ...permissions } };
        }
        return user;
      });
      
      setUsers(updatedUsers);
      localStorage.setItem('usersData', JSON.stringify(updatedUsers));
      
      return { success: true };
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
    const user = users.find(u => (u._id || u.id) === userId);
    return user ? user.permissions : {};
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
      permissions: user.permissions || {}
    }));
  };

  const value = {
    currentUser,
    userPermissions,
    users,
    hasPermission,
    updateUserRole,
    updateUserPermissions,
    getUserPermissions,
    getAllUsersWithPermissions,
    setUsers,
    fetchUsersFromBackend,
    checkCurrentUserPermissions,
    permissionUpdateTrigger,
    MODULES
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export default RoleContext;
