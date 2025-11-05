import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const ModuleContext = createContext();

export const useModules = () => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider');
  }
  return context;
};

export const ModuleProvider = ({ children }) => {
  const [installedModules, setInstalledModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [installingModules, setInstallingModules] = useState({}); // Track installing state per module

  // Fetch installed modules from backend
  const fetchInstalledModules = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setInstalledModules([]);
        setLoading(false);
        return;
      }

      const response = await fetch('https://noxtm.com/api/modules/installed', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const moduleIds = data.modules.map(m => m.moduleId);
          setInstalledModules(moduleIds);
          // Cache in localStorage
          localStorage.setItem('installedModules', JSON.stringify(moduleIds));
        }
      } else {
        // If unauthorized, clear cache
        localStorage.removeItem('installedModules');
        setInstalledModules([]);
      }
    } catch (error) {
      console.error('Error fetching installed modules:', error);
      // Try to load from localStorage cache if API fails
      const cached = localStorage.getItem('installedModules');
      if (cached) {
        try {
          setInstalledModules(JSON.parse(cached));
        } catch (e) {
          console.error('Error parsing cached modules:', e);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize: Load from cache immediately, then fetch from backend
  useEffect(() => {
    // Load from cache first for instant UI update
    const cached = localStorage.getItem('installedModules');
    if (cached) {
      try {
        setInstalledModules(JSON.parse(cached));
      } catch (e) {
        console.error('Error parsing cached modules:', e);
      }
    }

    // Then fetch fresh data from backend
    fetchInstalledModules();
  }, [fetchInstalledModules]);

  // Check if a module is installed
  const isModuleInstalled = useCallback((moduleId) => {
    return installedModules.includes(moduleId);
  }, [installedModules]);

  // Check if a module is currently being installed
  const isModuleInstalling = useCallback((moduleId) => {
    return installingModules[moduleId] === true;
  }, [installingModules]);

  // Install a module
  const installModule = useCallback(async (moduleId) => {
    try {
      // Set installing state
      setInstallingModules(prev => ({ ...prev, [moduleId]: true }));

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('https://noxtm.com/api/modules/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ moduleId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update state
        setInstalledModules(prev => {
          if (!prev.includes(moduleId)) {
            const newModules = [...prev, moduleId];
            localStorage.setItem('installedModules', JSON.stringify(newModules));
            return newModules;
          }
          return prev;
        });
        return { success: true, message: data.message };
      } else {
        throw new Error(data.message || 'Failed to install module');
      }
    } catch (error) {
      console.error('Error installing module:', error);
      return { success: false, message: error.message };
    } finally {
      // Clear installing state
      setInstallingModules(prev => {
        const newState = { ...prev };
        delete newState[moduleId];
        return newState;
      });
    }
  }, []);

  // Uninstall a module
  const uninstallModule = useCallback(async (moduleId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`https://noxtm.com/api/modules/${moduleId}/uninstall`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update state
        setInstalledModules(prev => {
          const newModules = prev.filter(id => id !== moduleId);
          localStorage.setItem('installedModules', JSON.stringify(newModules));
          return newModules;
        });
        return { success: true, message: data.message };
      } else {
        throw new Error(data.message || 'Failed to uninstall module');
      }
    } catch (error) {
      console.error('Error uninstalling module:', error);
      return { success: false, message: error.message };
    }
  }, []);

  const value = {
    installedModules,
    loading,
    isModuleInstalled,
    isModuleInstalling,
    installModule,
    uninstallModule,
    refreshModules: fetchInstalledModules,
  };

  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>;
};

export default ModuleContext;
