/**
 * configService.js
 * ─────────────────────────────────────────────────────────────────
 * Fetches public runtime config from the backend /api/config endpoint
 * and caches it for the lifetime of the page.
 *
 * Fallback chain (in order):
 *   1. Server response  →  /api/config
 *   2. Build-time env   →  REACT_APP_API_URL / REACT_APP_MAIL_URL
 *   3. Auto-detect      →  window.location.origin  (production)
 *                          http://localhost:5001     (dev)
 */

const isDev = process.env.NODE_ENV === 'development';

// The bootstrap URL used ONLY to fetch config — before we know the real API URL.
// In prod this will be a relative path; in dev it uses the known local port.
const BOOTSTRAP_API = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api/config`
  : isDev
    ? 'http://localhost:5001/api/config'
    : '/api/config';

let _cache = null;
let _promise = null;

/**
 * Returns the runtime config object (fetched once, then cached).
 * @returns {Promise<{apiUrl, mailUrl, environment, razorpayKeyId, googleClientId}>}
 */
export async function getConfig() {
  if (_cache) return _cache;
  if (_promise) return _promise;

  _promise = fetch(BOOTSTRAP_API, { credentials: 'include' })
    .then((res) => {
      if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      _cache = {
        apiUrl:        data.apiUrl        || _defaultApiUrl(),
        mailUrl:       data.mailUrl       || _defaultMailUrl(),
        environment:   data.environment   || (isDev ? 'development' : 'production'),
        razorpayKeyId: data.razorpayKeyId || '',
        googleClientId: data.googleClientId || '',
      };
      console.debug('[Config] Loaded from server:', _cache);
      return _cache;
    })
    .catch((err) => {
      console.warn('[Config] Could not reach /api/config, using fallbacks.', err.message);
      _cache = _fallback();
      return _cache;
    });

  return _promise;
}

/**
 * Synchronous getter — returns the cached config if already fetched,
 * or the static fallback. Call getConfig() first if you need server values.
 */
export function getConfigSync() {
  return _cache || _fallback();
}

function _defaultApiUrl() {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (isDev) return 'http://localhost:5001';
  return window.location.origin;
}

function _defaultMailUrl() {
  if (process.env.REACT_APP_MAIL_URL) return process.env.REACT_APP_MAIL_URL;
  return 'https://mail.noxtm.com';
}

function _fallback() {
  return {
    apiUrl:        _defaultApiUrl(),
    mailUrl:       _defaultMailUrl(),
    environment:   isDev ? 'development' : 'production',
    razorpayKeyId: '',
    googleClientId: '',
  };
}
