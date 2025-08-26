const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Helper function to set auth token in localStorage
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Authentication API calls
export const authAPI = {
  // Register new user
  signup: async (userData) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Login user
  login: async (credentials) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  // Get current user profile
  getProfile: async () => {
    return apiRequest('/auth/me');
  },

  // Logout user
  logout: async () => {
    const result = await apiRequest('/auth/logout', {
      method: 'POST',
    });
    setAuthToken(null); // Clear token from localStorage
    return result;
  },
};

// General API utility
export const api = {
  // Health check
  healthCheck: async () => {
    return apiRequest('/health');
  },

  // Get app version
  getVersion: async () => {
    return apiRequest('/version');
  },
};

export default apiRequest;
