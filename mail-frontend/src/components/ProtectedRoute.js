import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { MAIL_LOGIN_URL } from '../config/authConfig';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Simply check if token exists - let parent (Inbox) handle /profile call
    // This prevents duplicate API calls and race conditions
    console.log('[PROTECTED_ROUTE] Checking for auth token...');

    const token = localStorage.getItem('token') || window.__NOXTM_AUTH_TOKEN__;

    if (token) {
      // Token exists, assume authenticated (parent will verify)
      console.log('[PROTECTED_ROUTE] Token found, assuming authenticated');
      setAuthenticated(true);
      setLoading(false);
    } else {
      // No token at all - redirect to login
      console.log('[PROTECTED_ROUTE] No token found, redirecting to login');
      window.location.href = MAIL_LOGIN_URL;
    }
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
