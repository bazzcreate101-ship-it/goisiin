import {
  cleanText,
  clampArray,
  getAdminSecret,
  readBearer,
  getClientIp,
  rateLimit,
  sendJson,
  verifySignedToken,
} from './_security.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE_NAME = 'goisiin_app_state';

const ALLOWED_KEYS = new Set([
  'goisiin_transactions',
  'goisiin_transaction_deletions',
  'goisiin_users',
  'goisiin_blocked_users',
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

const ADMIN_ONLY_KEYS = new Set([
  'goisiin_transaction_deletions',
  'goisiin_blocked_users',
  'goisiin_products',
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

function isCompromisedProductState(value) {
  if (!Array.isArray(value)) return false;
  const serialized = JSON.stringify(value).toLowerCase();
  const blockedPatterns = [
    'web nipu',
    'kontol',
    'depositphotos.com/1496387/14240',
    'middle-finger',
    'fuck-you',
    'judol',
    'slot gacor',
    'casino',
  ];
  if (blockedPatterns.some((pattern) => serialized.includes(pattern))) return true;

  const namedProducts = value.filter((product) => cleanText(product?.name || '', 120));
  const uniqueNames = new Set(namedProducts.map((product) => cleanText(product.name, 120).toLowerCase()));
  return namedProducts.length > 1 && uniqueNames.size === 1;
}

async function writeRowsRaw(rows) {
  const response = await fetch(supabaseRestUrl('?on_conflict=key'), {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(`Supabase state write failed: ${response.status}`);
  }
}

function mergeUsers(existingUsers, incomingUsers) {
  const usersByEmail = new Map();
  [...(Array.isArray(existingUsers) ? existingUsers : []), ...(Array.isArray(incomingUsers) ? incomingUsers : [])].forEach((user) => {
    const email = cleanText(user?.email || '', 160).toLowerCase();
    if (!email) return;
    const existing = usersByEmail.get(email) || {};
    usersByEmail.set(email, {
      ...existing,
      ...user,
      email,
      name: cleanText(user?.name || existing.name || email, 160),
      picture: cleanText(user?.picture || existing.picture || '', 300),
      lastLogin: cleanText(user?.lastLogin || existing.lastLogin || user?.registeredAt || existing.registeredAt || '', 100),
      lastLoginAt: newerIso(existing.lastLoginAt, user?.lastLoginAt),
      lastLogoutAt: newerIso(existing.lastLogoutAt, user?.lastLogoutAt),
      lastOnlineAt: newerIso(existing.lastOnlineAt, user?.lastOnlineAt),
      onlineUntil: newerIso(existing.onlineUntil, user?.onlineUntil),
      registeredAt: cleanText(existing.registeredAt || user?.registeredAt || '', 100),
      registeredAtIso: cleanText(existing.registeredAtIso || user?.registeredAtIso || '', 100),
    });
  });
  return Array.from(usersByEmail.values()).slice(0, 1000);
}

function transactionTime(transaction) {
  return new Date(transaction?.updatedByAdminAt || transaction?.updatedAtIso || transaction?.createdAtIso || transaction?.createdAt || 0).getTime() || 0;
}

function mergeTransactionDeletions(existingDeletions, incomingDeletions) {
  const byInvoice = new Map();
  [...(Array.isArray(existingDeletions) ? existingDeletions : []), ...(Array.isArray(incomingDeletions) ? incomingDeletions : [])].forEach((item) => {
    const invoiceId = cleanText(item?.invoiceId || '', 100);
    if (!invoiceId) return;
    const existing = byInvoice.get(invoiceId) || {};
    byInvoice.set(invoiceId, {
      ...existing,
      ...item,
      invoiceId,
      deletedAtIso: cleanText(item?.deletedAtIso || existing.deletedAtIso || new Date().toISOString(), 100),
    });
  });
  return Array.from(byInvoice.values()).slice(-1000);
}

function mergeTransactions(existingTransactions, incomingTransactions, deletions = []) {
  const deletedIds = new Set((Array.isArray(deletions) ? deletions : [])
    .map((item) => cleanText(item?.invoiceId || '', 100))
    .filter(Boolean));
  const byInvoice = new Map();
  [...(Array.isArray(existingTransactions) ? existingTransactions : []), ...(Array.isArray(incomingTransactions) ? incomingTransactions : [])].forEach((transaction) => {
    const invoiceId = cleanText(transaction?.invoiceId || '', 100);
    if (!invoiceId) return;
    if (deletedIds.has(invoiceId)) return;
    const existing = byInvoice.get(invoiceId) || {};
    const newer = transactionTime(transaction) >= transactionTime(existing) ? transaction : existing;
    byInvoice.set(invoiceId, {
      ...existing,
      ...newer,
      invoiceId,
      userEmail: cleanText(newer.userEmail || existing.userEmail || '', 160).toLowerCase(),
    });
  });
  return Array.from(byInvoice.values())
    .sort((a, b) => transactionTime(b) - transactionTime(a))
    .slice(0, 1000);
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

function validOrEmpty(value) {
  return isValidDateString(value) ? value : '';
}

function newerIso(a, b) {
  const aTime = isValidDateString(a) ? new Date(a).getTime() : 0;
  const bTime = isValidDateString(b) ? new Date(b).getTime() : 0;
  const newer = Math.max(aTime, bTime);
  return newer > 0 ? new Date(newer).toISOString() : '';
}

function parseLegacyTime(value) {
  const match = String(value || '').match(/(\d{1,2})[.:](\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function inferCreatedAtFromMessageId(id) {
  const match = String(id || '').match(/(?:msg|sys|init)-(\d{12,})/);
  if (!match) return '';
  const time = Number(match[1]);
  const min = new Date('2024-01-01T00:00:00.000Z').getTime();
  const max = Date.now() + 366 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(time) || time < min || time > max) return '';
  return new Date(time).toISOString();
}

function chatMessageSortKey(message, order) {
  if (isValidDateString(message.createdAt)) return new Date(message.createdAt).getTime();
  const legacyMinute = parseLegacyTime(message.timestamp);
  if (legacyMinute !== null) return 946684800000 + legacyMinute * 60000 + order;
  return 946684800000 + order;
}

function normalizeReplacedThreadIds(value) {
  return Array.isArray(value)
    ? value.map((id) => cleanText(id || '', 160)).filter(Boolean).slice(0, 10)
    : [];
}

function normalizeDeletedMessageIds(value) {
  return Array.isArray(value)
    ? value.map((id) => cleanText(id || '', 160)).filter(Boolean).slice(0, 300)
    : [];
}

function normalizeChatMessage(message) {
  const createdAt = isValidDateString(message?.createdAt)
    ? message.createdAt
    : inferCreatedAtFromMessageId(message?.id);
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
    invoiceId: cleanText(message?.invoiceId || '', 80) || null,
    kind: cleanText(message?.kind || 'message', 40),
  };
}

function mergeChatMessages(left = [], right = [], deletedMessageIds = []) {
  const byId = new Map();
  const deletedIds = new Set(normalizeDeletedMessageIds(deletedMessageIds));
  [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])].forEach((message, index) => {
    const normalized = normalizeChatMessage(message);
    if (deletedIds.has(normalized.id)) return;
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

function getThreadUpdatedAt(messages = [], fallback = new Date().toISOString()) {
  const mergedMessages = Array.isArray(messages) ? mergeChatMessages([], messages) : [];
  const latest = mergedMessages[mergedMessages.length - 1];
  if (isValidDateString(latest?.createdAt)) return latest.createdAt;
  return isValidDateString(fallback) ? fallback : new Date().toISOString();
}

function getOlderDate(a, b) {
  const aTime = isValidDateString(a) ? new Date(a).getTime() : Number.POSITIVE_INFINITY;
  const bTime = isValidDateString(b) ? new Date(b).getTime() : Number.POSITIVE_INFINITY;
  const older = Math.min(aTime, bTime);
  return Number.isFinite(older) ? new Date(older).toISOString() : new Date().toISOString();
}

function mergeChatThreads(existingThreads = [], incomingThreads = []) {
  const byId = new Map();
  const sourceThreads = [
    ...(Array.isArray(existingThreads) ? existingThreads : []),
    ...(Array.isArray(incomingThreads) ? incomingThreads : []),
  ];
  const replacedThreadIds = new Set(
    sourceThreads.flatMap((thread) => normalizeReplacedThreadIds(thread?.replacedThreadIds)),
  );

  sourceThreads
    .filter((thread) => thread?.id)
    .forEach((thread) => {
      const id = cleanText(thread.id, 160);
      if (!id) return;
      if (replacedThreadIds.has(id)) return;
      const deletedMessageIds = normalizeDeletedMessageIds(thread.deletedMessageIds);
      const messages = mergeChatMessages([], thread.messages, deletedMessageIds);
      const normalized = {
        id,
        userName: cleanText(thread.userName || 'Pengunjung', 120),
        userEmail: cleanText(thread.userEmail || '', 160),
        isGuest: Boolean(thread.isGuest),
        messages,
        adminMode: Boolean(thread.adminMode),
        activeAdmin: cleanText(thread.activeAdmin || '', 40) || null,
        replacedThreadIds: normalizeReplacedThreadIds(thread.replacedThreadIds),
        deletedMessageIds,
        adminLastReadAt: validOrEmpty(thread.adminLastReadAt),
        userLastReadAt: validOrEmpty(thread.userLastReadAt),
        lastOrderInvoiceId: cleanText(thread.lastOrderInvoiceId || '', 80) || null,
        createdAt: cleanText(thread.createdAt || new Date().toISOString(), 80),
        updatedAt: cleanText(getThreadUpdatedAt(messages, thread.updatedAt || thread.createdAt || new Date().toISOString()), 80),
      };
      const existing = byId.get(id);
      if (!existing) {
        byId.set(id, normalized);
        return;
      }
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingTime = new Date(normalized.updatedAt || normalized.createdAt || 0).getTime();
      const newer = incomingTime >= existingTime ? normalized : existing;
      const mergedDeletedMessageIds = Array.from(new Set([
        ...normalizeDeletedMessageIds(existing.deletedMessageIds),
        ...normalizeDeletedMessageIds(normalized.deletedMessageIds),
      ])).slice(0, 300);
      const mergedMessages = mergeChatMessages(existing.messages, normalized.messages, mergedDeletedMessageIds);
      byId.set(id, {
        ...existing,
        ...newer,
        id,
        messages: mergedMessages,
        deletedMessageIds: mergedDeletedMessageIds,
        replacedThreadIds: Array.from(new Set([
          ...normalizeReplacedThreadIds(existing.replacedThreadIds),
          ...normalizeReplacedThreadIds(normalized.replacedThreadIds),
        ])).slice(0, 10),
        adminLastReadAt: newerIso(existing.adminLastReadAt, normalized.adminLastReadAt),
        userLastReadAt: newerIso(existing.userLastReadAt, normalized.userLastReadAt),
        lastOrderInvoiceId: newer.lastOrderInvoiceId || existing.lastOrderInvoiceId || null,
        createdAt: getOlderDate(existing.createdAt, normalized.createdAt),
        updatedAt: getThreadUpdatedAt(
          mergedMessages,
          newer.updatedAt || existing.updatedAt,
        ),
      });
    });

  return Array.from(byId.values())
    .filter((thread) => !replacedThreadIds.has(thread.id))
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
  const state = rows.reduce((acc, row) => {
    if (sanitizeKey(row.key)) acc[row.key] = row.value;
    return acc;
  }, {});

  if (isCompromisedProductState(state.goisiin_products)) {
    state.goisiin_products = [];
    await writeRowsRaw([{ key: 'goisiin_products', value: [] }]);
  }

  return state;
}

async function writeState(updates) {
  const nextUpdates = { ...updates };
  let transactionDeletions = [];
  if (Array.isArray(nextUpdates.goisiin_transaction_deletions)) {
    const existing = await readState(['goisiin_transaction_deletions']);
    nextUpdates.goisiin_transaction_deletions = mergeTransactionDeletions(existing.goisiin_transaction_deletions, nextUpdates.goisiin_transaction_deletions);
    transactionDeletions = nextUpdates.goisiin_transaction_deletions;
  } else if (Array.isArray(nextUpdates.goisiin_transactions)) {
    const existing = await readState(['goisiin_transaction_deletions']);
    transactionDeletions = Array.isArray(existing.goisiin_transaction_deletions) ? existing.goisiin_transaction_deletions : [];
  }
  if (Array.isArray(nextUpdates.goisiin_transactions)) {
    const existing = await readState(['goisiin_transactions']);
    nextUpdates.goisiin_transactions = mergeTransactions(existing.goisiin_transactions, nextUpdates.goisiin_transactions, transactionDeletions);
  }
  if (Array.isArray(nextUpdates.goisiin_users)) {
    const existing = await readState(['goisiin_users']);
    nextUpdates.goisiin_users = mergeUsers(existing.goisiin_users, nextUpdates.goisiin_users);
  }
  if (Array.isArray(nextUpdates.goisiin_chat_threads)) {
    const existing = await readState(['goisiin_chat_threads']);
    nextUpdates.goisiin_chat_threads = mergeChatThreads(existing.goisiin_chat_threads, nextUpdates.goisiin_chat_threads);
  }

  const rows = Object.entries(nextUpdates)
    .map(([key, value]) => ({ key: sanitizeKey(key), value: sanitizeValue(value) }))
    .filter((row) => row.key);

  if (rows.length === 0) return 0;

  await writeRowsRaw(rows);

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
    const updateKeys = Object.keys(updates || {}).map(sanitizeKey).filter(Boolean);
    const requiresAdmin = updateKeys.some((key) => ADMIN_ONLY_KEYS.has(key));

    if (requiresAdmin) {
      const payload = verifySignedToken(readBearer(req), getAdminSecret());
      if (!payload || payload.typ !== 'admin') {
        return sendJson(res, 401, {
          ok: false,
          error: 'Unauthorized',
        });
      }
    }

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
