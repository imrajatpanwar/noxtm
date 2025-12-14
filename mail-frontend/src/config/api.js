import axios from 'axios';
import { MAIL_LOGIN_URL } from './authConfig';

// Create axios instance with proper configuration for mail.noxtm.com
// Use environment-based URL configuration
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BACKEND_URL = isDevelopment ? 'http://localhost:5000/api' : '/api';

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
      console.warn('[API] ⚠️ localStorage cleared! Restoring from backup...');
      token = window.__NOXTM_AUTH_TOKEN__;
      localStorage.setItem('token', token); // Restore it
    }

    console.log('[API] Request:', config.method?.toUpperCase(), config.url);
    console.log('[API] Token check - localStorage:', token ? `YES (${token.substring(0,20)}...)` : 'NO');
    console.log('[API] Token check - backup:', window.__NOXTM_AUTH_TOKEN__ ? 'YES' : 'NO');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API] ✅ Authorization header SET');
    } else {
      console.warn('[API] ⚠️ NO TOKEN - relying on cookie auth');
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
      console.error('[API] ❌ 401 Error on:', error.config?.url);
      console.error('[API] Response:', error.response?.data);

      // Check if this is a true authentication failure
      // Only redirect if user has no valid token/cookie
      const hasToken = localStorage.getItem('token');
      const hasCookie = document.cookie.includes('token') || document.cookie.includes('auth');

      console.log('[API] Has token:', hasToken ? 'YES' : 'NO');
      console.log('[API] Has cookie:', hasCookie ? 'YES' : 'NO');

      // If no auth credentials exist at all, redirect to login
      if (!hasToken && !hasCookie && window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.log('[API] No authentication found, redirecting to login');
        window.location.href = MAIL_LOGIN_URL;
      } else {
        // User has credentials but got 401 - likely endpoint issue or permission denied
        // Log it but don't redirect - let component handle the error
        console.error('[API] 401 error but user has credentials (not auto-redirecting)');
        error.isAuthError = true;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
