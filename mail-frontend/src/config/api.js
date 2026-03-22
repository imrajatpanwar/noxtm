import axios from 'axios';
import toast from 'react-hot-toast';
import { MAIL_LOGIN_URL, getMainAppUrl } from './authConfig';

// Global flag to prevent redirect during token extraction/authentication
// Set by Inbox component during initial auth flow
window.__NOXTM_AUTH_LOADING__ = false;

// Create axios instance with proper configuration
// Uses REACT_APP_API_URL env var so local dev can point to localhost backend
const BACKEND_URL = process.env.REACT_APP_API_URL || 'https://noxtm.com/api';

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 90000, // 90 seconds - for large mailboxes with UID-based fetching
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for cross-subdomain SSO
});

// Request interceptor to add auth token
// Priority: localStorage token > Cookie-based auth (SSO)
api.interceptors.request.use(
  (config) => {
    // CRITICAL FIX: Check multiple sources for token
    let token = localStorage.getItem('token');

    // If localStorage was cleared, check backup location
    if (!token && window.__NOXTM_AUTH_TOKEN__) {
      token = window.__NOXTM_AUTH_TOKEN__;
      localStorage.setItem('token', token); // Restore it
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
    }
    // Note: Cookies are sent automatically due to withCredentials: true
    // Backend will use cookie if Authorization header is missing
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {

      // Check if this is a true authentication failure
      // Only redirect if user has no valid token/cookie
      const hasToken = localStorage.getItem('token');
      const hasCookie = document.cookie.includes('token') || document.cookie.includes('auth');

      // If no auth credentials exist at all, redirect to login
      if (!hasToken && !hasCookie && window.location.pathname !== '/login') {
        // NEW: Don't redirect if auth is still loading (prevents race condition)
        if (window.__NOXTM_AUTH_LOADING__) {
          error.isAuthError = true;
          return Promise.reject(error);
        }

        // Add a delay to avoid race condition with token saving
        // This gives time for localStorage/cookie to sync across subdomains
        setTimeout(() => {
          const recheckToken = localStorage.getItem('token');
          const recheckCookie = document.cookie.includes('token') || document.cookie.includes('auth');

          // Check if we've already redirected recently (prevent loop)
          const lastRedirect = sessionStorage.getItem('last_mail_redirect');
          const now = Date.now();

          if (lastRedirect && (now - parseInt(lastRedirect)) < 5000) {
            toast.error('Unable to authenticate. Please refresh the page and try again.');
            error.isAuthError = true;
            return Promise.reject(error);
          }

          // Only redirect if STILL no token after delay
          if (!recheckToken && !recheckCookie) {
            sessionStorage.setItem('last_mail_redirect', now.toString());
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = MAIL_LOGIN_URL;
          } else {
          }
        }, 3500); // 3500ms grace period - longer than Inbox's 3-second retry

        // Still reject the error so component can handle it
        error.isAuthError = true;
        return Promise.reject(error);
      } else {
        // User has credentials but got 401 - likely endpoint issue or permission denied
        error.isAuthError = true;
      }
    }

    // Handle 403 - Subscription required errors
    if (error.response?.status === 403) {
      const data = error.response?.data;

      // Check if this is a subscription-related 403
      if (data?.code === 'SUBSCRIPTION_REQUIRED' ||
          data?.code === 'SUBSCRIPTION_EXPIRED' ||
          data?.redirect === '/pricing') {

        // Don't redirect if auth is still loading
        if (window.__NOXTM_AUTH_LOADING__) {
          error.isSubscriptionError = true;
          return Promise.reject(error);
        }
        window.location.href = getMainAppUrl('/pricing');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
