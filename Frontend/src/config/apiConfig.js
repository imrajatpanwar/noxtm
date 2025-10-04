const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    // Use the production server URL when running frontend locally
    return 'https://noxtm.com';
  }
  // In production, use relative path
  return '';
};

export const API_BASE_URL = getApiBaseUrl();