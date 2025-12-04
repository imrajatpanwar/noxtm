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
// Priority: Cookie-based auth (SSO) > localStorage token
api.interceptors.request.use(
  (config) => {
    // Try localStorage token first (for backwards compatibility)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Note: Cookies are sent automatically due to withCredentials: true
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.log('No authentication found, redirecting to login');
        window.location.href = MAIL_LOGIN_URL;
      } else {
        // User has credentials but got 401 - likely endpoint issue or permission denied
        // Log it but don't redirect - let component handle the error
        console.error('API 401 error (not redirecting):', error.config?.url);
        error.isAuthError = true;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
