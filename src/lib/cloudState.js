export const CLOUD_STATE_KEYS = [
  'goisiin_transactions',
  'goisiin_users',
  'goisiin_products',
  'goisiin_chat_threads',
  'goisiin_chat_messages',
  'goisiin_chat_admin_mode',
  'goisiin_chat_active_admin',
  'goisiin_wallet_ledger',
  'goisiin_wallet_withdrawals',
  'goisiin_stamp_events',
  'goisiin_stamp_redemptions',
  'goisiin_stamp_redeem_codes',
  'goisiin_stamp_audit_logs',
  'goisiin_stamp_voucher_codes',
];

const pendingWrites = new Map();
let flushTimer = null;
let cloudSyncEnabled = true;

const safeJsonParse = (value, fallback = null) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

function hasLocalValue(key) {
  return localStorage.getItem(key) !== null;
}

function readLocalValue(key) {
  return safeJsonParse(localStorage.getItem(key), localStorage.getItem(key));
}

function writeLocalValue(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
}

function mergeUsers(localUsers, cloudUsers) {
  const usersByEmail = new Map();
  [...(Array.isArray(cloudUsers) ? cloudUsers : []), ...(Array.isArray(localUsers) ? localUsers : [])].forEach((user) => {
    const email = String(user?.email || '').trim().toLowerCase();
    if (!email) return;
    const existing = usersByEmail.get(email) || {};
    usersByEmail.set(email, {
      ...existing,
      ...user,
      email,
      name: user?.name || existing.name || email,
      picture: user?.picture || existing.picture || '',
      lastLogin: user?.lastLogin || existing.lastLogin || user?.registeredAt || existing.registeredAt || '',
      registeredAt: user?.registeredAt || existing.registeredAt || '',
    });
  });
  return Array.from(usersByEmail.values());
}

function mergeCloudValue(key, cloudValue) {
  if (key === 'goisiin_users' && hasLocalValue(key)) {
    return mergeUsers(readLocalValue(key), cloudValue);
  }
  return cloudValue;
}

export function notifyLocalStateChanged() {
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('goisiin:cloud-state-updated'));
}

async function postCloudState(updates) {
  if (!cloudSyncEnabled || !updates || Object.keys(updates).length === 0) return false;
  try {
    const response = await fetch('/api/cloud-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });
    if (response.status === 503) cloudSyncEnabled = false;
    return response.ok;
  } catch {
    return false;
  }
}

export function queueCloudStateWrite(key, value) {
  if (!CLOUD_STATE_KEYS.includes(key)) return;
  pendingWrites.set(key, value);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    const updates = Object.fromEntries(pendingWrites.entries());
    pendingWrites.clear();
    postCloudState(updates);
  }, 350);
}

export async function hydrateCloudState() {
  if (!cloudSyncEnabled) return { ok: false, disabled: true, hydrated: 0, seeded: 0 };

  try {
    const response = await fetch(`/api/cloud-state?keys=${encodeURIComponent(CLOUD_STATE_KEYS.join(','))}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 503 || data.disabled) {
      cloudSyncEnabled = false;
      return { ok: false, disabled: true, hydrated: 0, seeded: 0 };
    }
    if (!response.ok || !data.state) return { ok: false, hydrated: 0, seeded: 0 };

    let hydrated = 0;
    const seedUpdates = {};

    CLOUD_STATE_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(data.state, key)) {
        const mergedValue = mergeCloudValue(key, data.state[key]);
        writeLocalValue(key, mergedValue);
        if (JSON.stringify(mergedValue) !== JSON.stringify(data.state[key])) {
          seedUpdates[key] = mergedValue;
        }
        hydrated += 1;
      } else if (hasLocalValue(key)) {
        seedUpdates[key] = readLocalValue(key);
      }
    });

    const seeded = Object.keys(seedUpdates).length;
    if (seeded > 0) await postCloudState(seedUpdates);
    if (hydrated > 0) notifyLocalStateChanged();

    return { ok: true, hydrated, seeded };
  } catch {
    return { ok: false, hydrated: 0, seeded: 0 };
  }
}

export function writeCloudBackedValue(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
  } else {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  queueCloudStateWrite(key, value);
}
