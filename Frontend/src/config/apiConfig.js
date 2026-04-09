import { getConfigSync } from './configService';

const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const cfg = getConfigSync();
  if (cfg.apiUrl) return cfg.apiUrl;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:5001';
  return '';
};

export const API_BASE_URL = getApiBaseUrl();