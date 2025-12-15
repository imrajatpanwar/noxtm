import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { MAIL_LOGIN_URL } from '../config/authConfig';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // CRITICAL: Restore token from backup if needed
        let token = localStorage.getItem('token');
        if (!token && window.__NOXTM_AUTH_TOKEN__) {
          console.log('[PROTECTED_ROUTE] Restoring token from backup');
          localStorage.setItem('token', window.__NOXTM_AUTH_TOKEN__);
          token = window.__NOXTM_AUTH_TOKEN__;
        }

        // Check SSO cookie via /profile endpoint
        const response = await api.get('/profile');
        if (response.data) {
          setAuthenticated(true);
          // Store user data in localStorage for components to use
          localStorage.setItem('user', JSON.stringify(response.data));
        }
      } catch (err) {
        console.error('[PROTECTED_ROUTE] Authentication check failed:', err);

        // Only redirect if BOTH localStorage and backup token are missing
        const hasAuthSource = localStorage.getItem('token') || window.__NOXTM_AUTH_TOKEN__;
        if (!hasAuthSource) {
          console.log('[PROTECTED_ROUTE] No auth source found, redirecting to login');
          // Not authenticated, redirect to main app login with mail redirect
          window.location.href = MAIL_LOGIN_URL;
        } else {
          console.warn('[PROTECTED_ROUTE] Auth failed but token exists - showing loading state');
          // Token exists but auth failed - stay on loading state (component will retry)
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return authenticated ? children : null;
};

export default ProtectedRoute;
