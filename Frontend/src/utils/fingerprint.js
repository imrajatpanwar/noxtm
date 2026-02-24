import FingerprintJS from '@fingerprintjs/fingerprintjs';

let fpPromise = null;
let currentFingerprint = null;
let heartbeatInterval = null;

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

// Track visitor
export async function trackVisitor() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return; // Only track authenticated users

    const result = await getFingerprint();
    currentFingerprint = result.visitorId;

    const payload = {
      fingerprint: result.visitorId,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language || navigator.userLanguage || '',
      platform: navigator.platform || '',
      referrer: document.referrer || '',
      pageUrl: window.location.href,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    };

    const apiBase = getApiBase();
    await fetch(`${apiBase}/api/visitors/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    // Start heartbeat every 2 minutes
    startHeartbeat(token);

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendOffline(token);
      } else {
        sendHeartbeat(token);
      }
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      sendOfflineSync(token);
    });

  } catch (error) {
    console.error('[FingerprintJS] Tracking error:', error);
  }
}

function startHeartbeat(token) {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => sendHeartbeat(token), 2 * 60 * 1000); // Every 2 min
}

async function sendHeartbeat(token) {
  if (!currentFingerprint) return;
  try {
    const apiBase = getApiBase();
    await fetch(`${apiBase}/api/visitors/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fingerprint: currentFingerprint })
    });
  } catch (e) {
    // Ignore heartbeat errors
  }
}

async function sendOffline(token) {
  if (!currentFingerprint) return;
  try {
    const apiBase = getApiBase();
    await fetch(`${apiBase}/api/visitors/offline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
}
