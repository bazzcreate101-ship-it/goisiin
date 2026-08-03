const DEVICE_ID_KEY = 'goisiin_traffic_device_id';
const SESSION_ID_KEY = 'goisiin_traffic_session_id';
const LAST_SENT_KEY = 'goisiin_traffic_last_sent_at';
const MIN_SEND_INTERVAL_MS = 5 * 60 * 1000;

function randomId(prefix) {
  const cryptoObj = window.crypto || window.msCrypto;
  if (cryptoObj?.randomUUID) return `${prefix}-${cryptoObj.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getDeviceId() {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = randomId('dev');
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return randomId('dev-tmp');
  }
}

function getSessionId() {
  try {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = randomId('ses');
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return randomId('ses-tmp');
  }
}

function getLastSentAt() {
  try {
    return Number(sessionStorage.getItem(LAST_SENT_KEY) || 0);
  } catch {
    return 0;
  }
}

function setLastSentAt(value) {
  try {
    sessionStorage.setItem(LAST_SENT_KEY, String(value));
  } catch {
    // Ignore private-mode storage failures.
  }
}

function currentPath() {
  return `${window.location.pathname || '/'}${window.location.hash || ''}`.slice(0, 120);
}

export function trackTrafficView({ force = false } = {}) {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/bolehnihadmin' || window.location.hash === '#/bolehnihadmin') return;

  const now = Date.now();
  if (!force && now - getLastSentAt() < MIN_SEND_INTERVAL_MS) return;
  setLastSentAt(now);

  const payload = {
    deviceId: getDeviceId(),
    sessionId: getSessionId(),
    path: currentPath(),
    language: navigator.language || '',
    screen: {
      width: window.screen?.width || window.innerWidth || 0,
      height: window.screen?.height || window.innerHeight || 0,
      pixelRatio: window.devicePixelRatio || 1,
    },
  };

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/traffic', blob);
    return;
  }

  fetch('/api/traffic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {});
}
