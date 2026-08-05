import { readStorageList, safeJsonParse, writeStorageList } from './storage';

export const CHAT_THREADS_KEY = 'goisiin_chat_threads';
const LEGACY_CHAT_KEY = 'goisiin_chat_messages';
const LEGACY_ADMIN_MODE_KEY = 'goisiin_chat_admin_mode';
const LEGACY_ACTIVE_ADMIN_KEY = 'goisiin_chat_active_admin';

export function formatChatTime(value = new Date()) {
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

export function createChatMessage({ id, sender = 'cs', agent = null, text = '', createdAt = new Date().toISOString() }) {
  return {
    id: String(id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    sender: sender === 'user' ? 'user' : sender === 'system' ? 'system' : 'cs',
    agent: agent || null,
    text: String(text || '').slice(0, 1200),
    createdAt,
    timestamp: formatChatTime(createdAt),
  };
}

export function createInitialChatMessage() {
  return createChatMessage({
    id: 'init-1',
    sender: 'cs',
    agent: 'Vindy',
    text: 'Halo Kak! Selamat datang di Goisiinn. Vindy siap bantu soal produk, harga, pembayaran, promo, transaksi, dan bantuan CS.',
  });
}

export function getChatIdentity(user) {
  if (user?.email) {
    return {
      id: `user:${String(user.email).toLowerCase()}`,
      userName: user.name || user.email,
      userEmail: user.email,
      isGuest: false,
    };
  }

  let guestId = localStorage.getItem('goisiin_guest_chat_id');
  if (!guestId) {
    guestId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('goisiin_guest_chat_id', guestId);
  }

  return {
    id: `guest:${guestId}`,
    userName: 'Pengunjung',
    userEmail: '',
    isGuest: true,
  };
}

export function getChatThreads() {
  const threads = readStorageList(CHAT_THREADS_KEY)
    .filter((thread) => thread?.id)
    .map((thread) => ({
      id: String(thread.id),
      userName: thread.userName || 'Pengunjung',
      userEmail: thread.userEmail || '',
      isGuest: Boolean(thread.isGuest),
      messages: mergeMessages([], thread.messages),
      adminMode: Boolean(thread.adminMode),
      activeAdmin: thread.activeAdmin || null,
      updatedAt: thread.updatedAt || thread.createdAt || new Date().toISOString(),
      createdAt: thread.createdAt || new Date().toISOString(),
    }));

  const legacyThread = getLegacyChatThread();
  const merged = legacyThread && !threads.some((thread) => thread.id === legacyThread.id)
    ? [...threads, legacyThread]
    : threads;

  return merged
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function normalizeMessage(message) {
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

function messageSortKey(message, order) {
  if (isValidDateString(message.createdAt)) return new Date(message.createdAt).getTime();
  const legacyMinute = parseLegacyTime(message.timestamp);
  if (legacyMinute !== null) return 946684800000 + legacyMinute * 60000 + order;
  return 946684800000 + order;
}

function mergeMessages(left = [], right = []) {
  const byId = new Map();
  [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])].forEach((message, index) => {
    const normalized = normalizeMessage(message);
    if (!normalized.text) return;
    const existing = byId.get(normalized.id) || {};
    byId.set(normalized.id, {
      ...existing,
      ...normalized,
      createdAt: normalized.createdAt || existing.createdAt || '',
      _order: existing._order ?? index,
    });
  });
  return Array.from(byId.values())
    .sort((a, b) => messageSortKey(a, a._order || 0) - messageSortKey(b, b._order || 0))
    .slice(-300)
    .map(({ _order, ...message }) => message);
}

function getLegacyChatThread() {
  const legacyMessages = safeJsonParse(localStorage.getItem(LEGACY_CHAT_KEY), []);
  if (!Array.isArray(legacyMessages) || legacyMessages.length === 0) return null;
  const messages = mergeMessages([], legacyMessages);
  const latest = messages[messages.length - 1];
  const legacyLatestMinute = parseLegacyTime(latest?.timestamp) || 0;
  return {
    id: 'legacy:browser-chat',
    userName: 'Chat lama perangkat ini',
    userEmail: '',
    isGuest: true,
    messages,
    adminMode: Boolean(safeJsonParse(localStorage.getItem(LEGACY_ADMIN_MODE_KEY), false)),
    activeAdmin: localStorage.getItem(LEGACY_ACTIVE_ADMIN_KEY) || null,
    createdAt: '2000-01-01T00:00:00.000Z',
    updatedAt: latest?.createdAt || new Date(946684800000 + legacyLatestMinute * 60000).toISOString(),
  };
}

export function mergeChatThreads(localThreads = [], incomingThreads = []) {
  const byId = new Map();

  [...(Array.isArray(localThreads) ? localThreads : []), ...(Array.isArray(incomingThreads) ? incomingThreads : [])]
    .filter((thread) => thread?.id)
    .forEach((thread) => {
      const id = String(thread.id);
      const existing = byId.get(id);
      if (!existing) {
        byId.set(id, {
          id,
          userName: thread.userName || 'Pengunjung',
          userEmail: thread.userEmail || '',
          isGuest: Boolean(thread.isGuest),
          messages: mergeMessages([], thread.messages),
          adminMode: Boolean(thread.adminMode),
          activeAdmin: thread.activeAdmin || null,
          updatedAt: thread.updatedAt || thread.createdAt || new Date().toISOString(),
          createdAt: thread.createdAt || new Date().toISOString(),
        });
        return;
      }

      const existingUpdated = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const threadUpdated = new Date(thread.updatedAt || thread.createdAt || 0).getTime();
      const newer = threadUpdated >= existingUpdated ? thread : existing;

      byId.set(id, {
        ...existing,
        ...newer,
        id,
        userName: newer.userName || existing.userName || 'Pengunjung',
        userEmail: newer.userEmail || existing.userEmail || '',
        isGuest: Boolean(newer.isGuest ?? existing.isGuest),
        messages: mergeMessages(existing.messages, thread.messages),
        adminMode: Boolean(newer.adminMode),
        activeAdmin: newer.activeAdmin || existing.activeAdmin || null,
        createdAt: existing.createdAt || thread.createdAt || new Date().toISOString(),
        updatedAt: newer.updatedAt || existing.updatedAt || new Date().toISOString(),
      });
    });

  return Array.from(byId.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 300);
}

export function getChatThread(identity) {
  const threads = getChatThreads();
  const existing = threads.find((thread) => thread.id === identity.id);
  if (existing) return existing;

  const legacyMessages = safeJsonParse(localStorage.getItem(LEGACY_CHAT_KEY), []);
  const legacyAdminMode = safeJsonParse(localStorage.getItem(LEGACY_ADMIN_MODE_KEY), false);
  const legacyAdmin = localStorage.getItem(LEGACY_ACTIVE_ADMIN_KEY) || null;
  const canUseLegacy = threads.length === 0 && Array.isArray(legacyMessages) && legacyMessages.length > 0;
  const initialMessages = canUseLegacy ? legacyMessages.slice(-300) : [createInitialChatMessage()];

  return {
    id: identity.id,
    userName: identity.userName,
    userEmail: identity.userEmail,
    isGuest: identity.isGuest,
    messages: initialMessages,
    adminMode: canUseLegacy ? Boolean(legacyAdminMode) : false,
    activeAdmin: canUseLegacy ? legacyAdmin : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function saveChatThread(nextThread) {
  const now = new Date().toISOString();
  const safeThread = {
    ...nextThread,
    messages: Array.isArray(nextThread.messages) ? nextThread.messages.slice(-300) : [],
    updatedAt: now,
    createdAt: nextThread.createdAt || now,
  };
  const threads = getChatThreads();
  const existingThread = threads.find((thread) => thread.id === safeThread.id);
  const mergedThread = existingThread
    ? {
      ...existingThread,
      ...safeThread,
      messages: mergeMessages(existingThread.messages, safeThread.messages),
      createdAt: existingThread.createdAt || safeThread.createdAt,
      updatedAt: safeThread.updatedAt,
    }
    : safeThread;
  const nextThreads = mergeChatThreads(
    threads.filter((thread) => thread.id !== safeThread.id),
    [mergedThread],
  );

  writeStorageList(CHAT_THREADS_KEY, nextThreads);
  window.dispatchEvent(new CustomEvent('goisiin:chat-threads-updated'));
  return mergedThread;
}

export function getLatestThreadMessage(thread) {
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  return messages[messages.length - 1] || null;
}
