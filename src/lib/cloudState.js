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

function formatChatTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(safeDate);
}

function isValidDateString(value) {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

function parseLegacyTime(value) {
  const match = String(value || '').match(/(\d{1,2})[.:](\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function chatMessageSortKey(message, order) {
  if (isValidDateString(message.createdAt)) return new Date(message.createdAt).getTime();
  const legacyMinute = parseLegacyTime(message.timestamp);
  if (legacyMinute !== null) return 946684800000 + legacyMinute * 60000 + order;
  return 946684800000 + order;
}

function normalizeChatMessage(message) {
  const createdAt = isValidDateString(message?.createdAt) ? message.createdAt : '';
  const fallbackTime = !createdAt && parseLegacyTime(message?.timestamp) !== null
    ? message.timestamp
    : formatChatTime(new Date());
  return {
    id: String(message?.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    sender: message?.sender === 'user' ? 'user' : message?.sender === 'system' ? 'system' : 'cs',
    agent: message?.agent || null,
    text: String(message?.text || '').slice(0, 1200),
    createdAt,
    timestamp: createdAt ? formatChatTime(createdAt) : fallbackTime,
  };
}

function mergeChatMessages(left = [], right = []) {
  const byId = new Map();
  [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])].forEach((message, index) => {
    const normalized = normalizeChatMessage(message);
    const existing = byId.get(normalized.id) || {};
    if (normalized.text) {
      byId.set(normalized.id, {
        ...existing,
        ...normalized,
        createdAt: normalized.createdAt || existing.createdAt || '',
        _order: existing._order ?? index,
      });
    }
  });
  return Array.from(byId.values())
    .sort((a, b) => chatMessageSortKey(a, a._order || 0) - chatMessageSortKey(b, b._order || 0))
    .slice(-300)
    .map(({ _order, ...message }) => message);
}

function mergeChatThreads(localThreads, cloudThreads) {
  const byId = new Map();
  [...(Array.isArray(cloudThreads) ? cloudThreads : []), ...(Array.isArray(localThreads) ? localThreads : [])]
    .filter((thread) => thread?.id)
    .forEach((thread) => {
      const id = String(thread.id);
      const existing = byId.get(id);
      const normalized = {
        id,
        userName: thread.userName || 'Pengunjung',
        userEmail: thread.userEmail || '',
        isGuest: Boolean(thread.isGuest),
        messages: mergeChatMessages([], thread.messages),
        adminMode: Boolean(thread.adminMode),
        activeAdmin: thread.activeAdmin || null,
        createdAt: thread.createdAt || new Date().toISOString(),
        updatedAt: thread.updatedAt || thread.createdAt || new Date().toISOString(),
      };

      if (!existing) {
        byId.set(id, normalized);
        return;
      }

      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingTime = new Date(normalized.updatedAt || normalized.createdAt || 0).getTime();
      const newer = incomingTime >= existingTime ? normalized : existing;
      byId.set(id, {
        ...existing,
        ...newer,
        id,
        messages: mergeChatMessages(existing.messages, normalized.messages),
        createdAt: existing.createdAt || normalized.createdAt,
        updatedAt: newer.updatedAt || existing.updatedAt,
      });
    });

  return Array.from(byId.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 300);
}

function mergeCloudValue(key, cloudValue) {
  if (key === 'goisiin_users' && hasLocalValue(key)) {
    return mergeUsers(readLocalValue(key), cloudValue);
  }
  if (key === 'goisiin_chat_threads' && hasLocalValue(key)) {
    return mergeChatThreads(readLocalValue(key), cloudValue);
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

export async function hydrateCloudStateKeys(keys) {
  const selectedKeys = (Array.isArray(keys) ? keys : [])
    .filter((key) => CLOUD_STATE_KEYS.includes(key));
  if (!cloudSyncEnabled || selectedKeys.length === 0) return { ok: false, hydrated: 0, seeded: 0 };

  try {
    const response = await fetch(`/api/cloud-state?keys=${encodeURIComponent(selectedKeys.join(','))}`, {
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
    selectedKeys.forEach((key) => {
      if (!Object.prototype.hasOwnProperty.call(data.state, key)) return;
      const mergedValue = mergeCloudValue(key, data.state[key]);
      writeLocalValue(key, mergedValue);
      if (JSON.stringify(mergedValue) !== JSON.stringify(data.state[key])) {
        seedUpdates[key] = mergedValue;
      }
      hydrated += 1;
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
