import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

// Simplified: No default role permissions - all permissions are manual

export const RoleProvider = ({ children }) => {
  const [userPermissions, setUserPermissions] = useState({});
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [permissionUpdateTrigger, setPermissionUpdateTrigger] = useState(0);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const lastPermissionHash = useRef(null);

  // Fetch users from backend
  const fetchUsersFromBackend = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await api.get('/users');

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
      // Only fetch profile and check for permission changes
      const response = await api.get('/profile');
      const updatedUser = response.data;

      // Check if permissions actually changed before updating
      const newHash = generatePermissionHash(updatedUser);
      const oldHash = lastPermissionHash.current;

      if (oldHash && newHash && oldHash !== newHash) {
        // Permissions changed - trigger re-render without notification
        setPermissionUpdateTrigger(prev => prev + 1);

        // Only update state if permissions changed
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Fetch updated users list
        const backendUsers = await fetchUsersFromBackend();
        if (backendUsers) {
          setUsers(backendUsers);
          localStorage.setItem('usersData', JSON.stringify(backendUsers));
        }

        lastPermissionHash.current = newHash;
      }
    } catch (error) {
      console.error('Error checking user permissions:', error);
      // Don't show error toast for permission checks to avoid spam
    } finally {
      setIsCheckingPermissions(false);
    }
  }, [currentUser, isCheckingPermissions, generatePermissionHash]);

  // Load user data from localStorage or API
  // eslint-disable-next-line react-hooks/exhaustive-deps -- We intentionally omit generatePermissionHash to prevent unnecessary re-renders
  useEffect(() => {
    const loadUserData = async () => {
      // Load from localStorage first
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const storedUsers = JSON.parse(localStorage.getItem('usersData') || '[]');

      setCurrentUser(userData);
      setUsers(storedUsers); // Set stored users immediately

      // Get user's role permissions
      if (userData.role) {
        const permissions = [userData.role] || {};
        setUserPermissions(permissions);
      }

      // Then fetch latest data from backend
      try {
        const backendUsers = await fetchUsersFromBackend();

        if (backendUsers && backendUsers.length > 0) {
          setUsers(backendUsers);
          localStorage.setItem('usersData', JSON.stringify(backendUsers));

          // Set initial permission hash
          if (userData.id) {
            lastPermissionHash.current = generatePermissionHash(userData);
          }
        }
      } catch (error) {
        console.error('Error fetching initial user data:', error);
      }
    };

    loadUserData();

    // Listen for userUpdated events (triggered after login)
    const handleUserUpdated = () => {
      loadUserData();
    };

    window.addEventListener('userUpdated', handleUserUpdated);

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdated);
    };
    // Only run this effect once on mount, intentionally omitting generatePermissionHash to prevent unnecessary re-renders
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Function to check if user has active subscription
  const hasActiveSubscription = useCallback(() => {
    if (!currentUser) return false;
    // Admin and Lord always have access
    if (currentUser.role === 'Admin' || currentUser.role === 'Lord') return true;
    // Check if subscription is active (Noxtm or Enterprise plans only)
    return currentUser.subscription?.status === 'active';
  }, [currentUser]);

  // Event-based permission updates (replaces 30-second polling)
  useEffect(() => {
    if (!currentUser) return;

    // Listen for permission changes from other tabs via localStorage
    const handleStorageChange = (event) => {
      if (event.key === 'permissionUpdate' || event.key === 'user') {
        checkCurrentUserPermissions();
      }
    };

    // Check permissions when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkCurrentUserPermissions();
      }
    };

    // Listen for custom permission update events (from same tab)
    const handlePermissionUpdate = () => {
      checkCurrentUserPermissions();
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('permissionUpdated', handlePermissionUpdate);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('permissionUpdated', handlePermissionUpdate);
    };
  }, [currentUser, checkCurrentUserPermissions]);

  // Check if user has permission for a module
  const hasPermission = useCallback((module) => {
    if (!currentUser || !currentUser.role) return false;

    // Admin and Lord have access to everything
    if (currentUser.role === 'Admin' || currentUser.role === 'Lord') return true;

    // For regular users, check their subscription-based permissions
    const userSpecificPermissions = users.find(u => u.id === currentUser.id)?.permissions;
    if (userSpecificPermissions && userSpecificPermissions.hasOwnProperty(module)) {
      return userSpecificPermissions[module];
    }

    // Check permissions from current user object (subscription-based)
    if (currentUser.permissions && currentUser.permissions.hasOwnProperty(module)) {
      return currentUser.permissions[module];
    }

    // Default: no access
    return false;
  }, [currentUser, users]);


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
    hasActiveSubscription,
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
