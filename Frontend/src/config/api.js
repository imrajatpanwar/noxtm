import axios from 'axios';

// Create axios instance with proper configuration
const PRODUCTION_BACKEND_URL = 'http://noxtm.com:5000/api/';

const api = axios.create({
  baseURL: PRODUCTION_BACKEND_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
      // Only clear auth for main dashboard endpoints, not webmail
      const isWebmailEndpoint = error.config?.url?.includes('/webmail/');

      if (!isWebmailEndpoint) {
        // Token expired or invalid: clear local auth state but do NOT forcibly navigate
        // Let UI components decide how to handle auth failures (avoid unexpected redirects)
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Attach a flag so callers can detect auth failures and redirect if they want
        error.isAuthError = true;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
