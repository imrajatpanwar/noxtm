import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise = null;
let currentFingerprint = null;
let heartbeatInterval = null;
let visibilityHandler = null;
let unloadHandler = null;

// Initialize FingerprintJS
function getFingerprint() {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load().then(fp => fp.get());
  }
  return fpPromise;
}

// Get API base URL
function getApiBase() {
  const isDev = process.env.NODE_ENV === 'development';
  return process.env.REACT_APP_API_URL || (isDev ? 'http://localhost:5000' : '');
}

// Detect friendly page name from the current path
function getCurrentPage() {
  const path = window.location.pathname;
  const pageMap = {
    '/': 'Home',
    '/login': 'Login',
    '/signup': 'Sign Up',
    '/forgot-password': 'Forgot Password',
    '/pricing': 'Pricing',
    '/company-setup': 'Company Setup',
    '/join-company': 'Join Company',
    '/dashboard': 'Dashboard',
    '/access-restricted': 'Access Restricted',
    '/auth/callback': 'Auth Callback',
    '/api-reference': 'API Reference',
    '/checkout': 'Checkout',
    '/extension-login': 'Extension Login',
  };

  // Exact match first
  if (pageMap[path]) return pageMap[path];

  // Dashboard sub-sections (e.g. /dashboard with section query or hash)
  if (path.startsWith('/dashboard')) return 'Dashboard';

  return path.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Home';
}

// Track visitor - works for ALL pages (authenticated and anonymous)
export async function trackVisitor() {
  try {
    const result = await getFingerprint();
    currentFingerprint = result.visitorId;

    const token = localStorage.getItem('token');
    const payload = {
      fingerprint: result.visitorId,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language || navigator.userLanguage || '',
      platform: navigator.platform || '',
      referrer: document.referrer || '',
      pageUrl: window.location.href,
      currentPage: getCurrentPage(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    };

    const apiBase = getApiBase();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`${apiBase}/api/visitors/track`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    // Start heartbeat every 2 minutes
    startHeartbeat(token);

    // Clean up old listeners before adding new ones
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    if (unloadHandler) window.removeEventListener('beforeunload', unloadHandler);

    // Track page visibility changes
    visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        sendOffline(token);
      } else {
        sendHeartbeat(token);
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    // Track before unload
    unloadHandler = () => sendOfflineSync(token);
    window.addEventListener('beforeunload', unloadHandler);

  } catch (error) {
    console.error('[FingerprintJS] Tracking error:', error);
  }
}

// Update current page without re-initializing fingerprint
export function updateCurrentPage(pageName) {
  if (!currentFingerprint) return;
  const token = localStorage.getItem('token');
  const apiBase = getApiBase();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const currentPage = pageName || getCurrentPage();

  fetch(`${apiBase}/api/visitors/heartbeat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fingerprint: currentFingerprint,
      currentPage
    })
  }).catch(() => {});
}

function startHeartbeat(token) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => sendHeartbeat(token), 2 * 60 * 1000); // Every 2 min
}

async function sendHeartbeat(token) {
  if (!currentFingerprint) return;
  try {
    const apiBase = getApiBase();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`${apiBase}/api/visitors/heartbeat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fingerprint: currentFingerprint,
        currentPage: getCurrentPage()
      })
    });
  } catch (e) {
    // Ignore heartbeat errors
  }
}

async function sendOffline(token) {
  if (!currentFingerprint) return;
  try {
    const apiBase = getApiBase();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`${apiBase}/api/visitors/offline`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fingerprint: currentFingerprint })
    });
  } catch (e) {
    // Ignore offline errors
  }
}

function sendOfflineSync(token) {
  if (!currentFingerprint) return;
  const apiBase = getApiBase();
  // Use sendBeacon for reliable delivery on page unload
  const data = JSON.stringify({ fingerprint: currentFingerprint });
  if (navigator.sendBeacon) {
    const blob = new Blob([data], { type: 'application/json' });
    navigator.sendBeacon(`${apiBase}/api/visitors/offline`, blob);
  }
}

export function stopTracking() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  if (unloadHandler) {
    window.removeEventListener('beforeunload', unloadHandler);
    unloadHandler = null;
  }
}
