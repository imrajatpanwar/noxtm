import { useState, useEffect } from 'react';
import api from '../config/api';
import { MAIL_LOGIN_URL } from '../config/authConfig';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      console.log('[PROTECTED_ROUTE] Checking for auth token...');

      // CRITICAL FIX: Extract token from URL FIRST (before any auth check)
      // This prevents redirect loop when opening mail app from dashboard
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('auth_token');

      if (urlToken) {
        console.log('[PROTECTED_ROUTE] ✅ Token found in URL');
        console.log('[PROTECTED_ROUTE] Token preview:', urlToken.substring(0, 30) + '...');

        // Basic JWT validation (should have 3 parts separated by dots)
        const tokenParts = urlToken.split('.');
        if (tokenParts.length !== 3) {
          console.error('[PROTECTED_ROUTE] ❌ Invalid token format - not a valid JWT');
          console.error('[PROTECTED_ROUTE] Token parts:', tokenParts.length, 'expected: 3');
          window.location.href = MAIL_LOGIN_URL;
          return;
        }

        console.log('[PROTECTED_ROUTE] Token format valid, saving to localStorage');
        localStorage.setItem('token', urlToken);
        // Set Authorization header immediately for subsequent API calls
        api.defaults.headers.common['Authorization'] = `Bearer ${urlToken}`;
        // Clean URL to remove token parameter (security best practice)
        window.history.replaceState({}, document.title, window.location.pathname);

        // Add small delay to ensure localStorage write completes
        console.log('[PROTECTED_ROUTE] Waiting 100ms for token save to complete...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // NOW check for token (will find it if it was in URL or already in localStorage)
      const token = localStorage.getItem('token') || window.__NOXTM_AUTH_TOKEN__;

      if (token) {
        // Token exists, assume authenticated (parent Inbox will verify with /profile)
        console.log('[PROTECTED_ROUTE] ✅ Token found, assuming authenticated');
        setAuthenticated(true);
        setLoading(false);
      } else {
        // No token anywhere - redirect to login
        console.log('[PROTECTED_ROUTE] ❌ No token found, redirecting to login');
        window.location.href = MAIL_LOGIN_URL;
      }
    };

    initAuth();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return authenticated ? children : null;
};

export default ProtectedRoute;
