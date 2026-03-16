const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000';
  }
  // In production, use relative path
  return '';
};

export const API_BASE_URL = getApiBaseUrl();