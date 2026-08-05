import {
  cleanText,
  clampArray,
  getClientIp,
  rateLimit,
  sendJson,
} from './_security.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE_NAME = 'goisiin_app_state';

const ALLOWED_KEYS = new Set([
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
]);

function isConfigured() {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

function supabaseRestUrl(path = '') {
  return `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${TABLE_NAME}${path}`;
}

function headers(extra = {}) {
  return {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function sanitizeKey(key) {
  const cleaned = cleanText(key, 80);
  return ALLOWED_KEYS.has(cleaned) ? cleaned : '';
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return clampArray(value, 1000);
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return cleanText(value, 2000);
  if (value && typeof value === 'object') return value;
  return null;
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
    ? cleanText(message.timestamp, 40)
    : formatChatTime(new Date());
  return {
    id: cleanText(message?.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, 80),
    sender: ['user', 'cs', 'system'].includes(message?.sender) ? message.sender : 'cs',
    agent: cleanText(message?.agent || '', 40) || null,
    text: cleanText(message?.text || '', 1200),
    createdAt: cleanText(createdAt, 80),
    timestamp: cleanText(createdAt ? formatChatTime(createdAt) : fallbackTime, 40),
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

function mergeChatThreads(existingThreads = [], incomingThreads = []) {
  const byId = new Map();
  [...(Array.isArray(existingThreads) ? existingThreads : []), ...(Array.isArray(incomingThreads) ? incomingThreads : [])]
    .filter((thread) => thread?.id)
    .forEach((thread) => {
      const id = cleanText(thread.id, 160);
      if (!id) return;
      const normalized = {
        id,
        userName: cleanText(thread.userName || 'Pengunjung', 120),
        userEmail: cleanText(thread.userEmail || '', 160),
        isGuest: Boolean(thread.isGuest),
        messages: mergeChatMessages([], thread.messages),
        adminMode: Boolean(thread.adminMode),
        activeAdmin: cleanText(thread.activeAdmin || '', 40) || null,
        createdAt: cleanText(thread.createdAt || new Date().toISOString(), 80),
        updatedAt: cleanText(thread.updatedAt || thread.createdAt || new Date().toISOString(), 80),
      };
      const existing = byId.get(id);
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

async function readState(keys) {
  const selectedKeys = keys.length > 0 ? keys : Array.from(ALLOWED_KEYS);
  const encodedKeys = selectedKeys.map((key) => `"${key.replace(/"/g, '\\"')}"`).join(',');
  const response = await fetch(supabaseRestUrl(`?select=key,value,updated_at&key=in.(${encodedKeys})`), {
    method: 'GET',
    headers: headers(),
  });

  if (!response.ok) {
    throw new Error(`Supabase state read failed: ${response.status}`);
  }

  const rows = await response.json();
  return rows.reduce((acc, row) => {
    if (sanitizeKey(row.key)) acc[row.key] = row.value;
    return acc;
  }, {});
}

async function writeState(updates) {
  const nextUpdates = { ...updates };
  if (Array.isArray(nextUpdates.goisiin_chat_threads)) {
    const existing = await readState(['goisiin_chat_threads']);
    nextUpdates.goisiin_chat_threads = mergeChatThreads(existing.goisiin_chat_threads, nextUpdates.goisiin_chat_threads);
  }

  const rows = Object.entries(nextUpdates)
    .map(([key, value]) => ({ key: sanitizeKey(key), value: sanitizeValue(value) }))
    .filter((row) => row.key);

  if (rows.length === 0) return 0;

  const response = await fetch(supabaseRestUrl('?on_conflict=key'), {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`Supabase state write failed: ${response.status}`);
  }

  return rows.length;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  const limit = rateLimit({ key: `cloud-state:${ip}`, limit: 120, windowMs: 60 * 1000 });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return sendJson(res, 429, { error: 'Terlalu banyak sinkronisasi. Coba lagi sebentar.' });
  }

  if (!isConfigured()) {
    return sendJson(res, 503, {
      ok: false,
      disabled: true,
      error: 'Cloud state belum dikonfigurasi.',
    });
  }

  try {
    if (req.method === 'GET') {
      const requestUrl = new URL(req.url || '/api/cloud-state', `https://${req.headers.host || 'goisiinn.com'}`);
      const rawKeys = String(req.query?.keys || requestUrl.searchParams.get('keys') || '')
        .split(',')
        .map(sanitizeKey)
        .filter(Boolean);
      const state = await readState(rawKeys);
      return sendJson(res, 200, { ok: true, state });
    }

    const body = typeof req.body === 'string'
      ? JSON.parse(req.body || '{}')
      : (req.body || {});
    const updates = body.updates && typeof body.updates === 'object'
      ? body.updates
      : { [body.key]: body.value };
    const written = await writeState(updates);
    return sendJson(res, 200, { ok: true, written });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: 'Cloud state gagal diproses.',
      detail: cleanText(error.message, 180),
    });
  }
}
