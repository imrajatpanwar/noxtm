import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { MAIL_LOGIN_URL } from '../config/authConfig';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check SSO cookie via /profile endpoint
        const response = await api.get('/profile');
        if (response.data) {
          setAuthenticated(true);
          // Store user data in localStorage for components to use
          localStorage.setItem('user', JSON.stringify(response.data));
        }
      } catch (err) {
        // Not authenticated, redirect to main app login with mail redirect
        window.location.href = MAIL_LOGIN_URL;
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
