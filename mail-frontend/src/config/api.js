import axios from 'axios';

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
      // Token expired or invalid: clear local auth state
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Attach a flag so callers can detect auth failures and redirect if needed
      error.isAuthError = true;

      // For mail app, redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
