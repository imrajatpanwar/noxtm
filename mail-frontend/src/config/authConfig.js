const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const ensureLeadingSlash = (value = '') => {
  if (!value) return '';
  return value.startsWith('/') ? value : `/${value}`;
};

const authHost = trimTrailingSlash(process.env.REACT_APP_AUTH_HOST || 'https://noxtm.com');
const mainAppUrlDefault = trimTrailingSlash(process.env.REACT_APP_MAIN_APP_URL || authHost);
const mailLoginPath = process.env.REACT_APP_MAIL_LOGIN_PATH || '/login?redirect=mail';

export const MAIL_LOGIN_URL = `${authHost}${ensureLeadingSlash(mailLoginPath)}`;
export const MAIN_APP_URL = mainAppUrlDefault;
export const getMainAppUrl = (path = '') => {
  return `${MAIN_APP_URL}${ensureLeadingSlash(path)}`;
};