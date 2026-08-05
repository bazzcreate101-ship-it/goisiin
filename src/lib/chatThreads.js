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
  const guestId = localStorage.getItem('goisiin_guest_chat_id');

  if (user?.email) {
    return {
      id: `user:${String(user.email).toLowerCase()}`,
      userName: user.name || user.email,
      userEmail: user.email,
      isGuest: false,
      previousGuestId: guestId ? `guest:${guestId}` : null,
    };
  }

  let activeGuestId = guestId;
  if (!activeGuestId) {
    activeGuestId = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('goisiin_guest_chat_id', activeGuestId);
  }

  return {
    id: `guest:${activeGuestId}`,
    userName: 'Pengunjung',
    userEmail: '',
    isGuest: true,
    previousGuestId: null,
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
      replacedThreadIds: normalizeReplacedThreadIds(thread.replacedThreadIds),
      updatedAt: getThreadUpdatedAt(thread.messages, thread.updatedAt || thread.createdAt || new Date().toISOString()),
      createdAt: thread.createdAt || new Date().toISOString(),
    }));

  const replacedThreadIds = new Set(threads.flatMap((thread) => normalizeReplacedThreadIds(thread.replacedThreadIds)));
  const activeThreads = threads.filter((thread) => !replacedThreadIds.has(thread.id));
  const legacyThread = getLegacyChatThread();
  const merged = legacyThread && !activeThreads.some((thread) => thread.id === legacyThread.id)
    ? [...activeThreads, legacyThread]
    : activeThreads;

  return merged
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function normalizeMessage(message) {
  const createdAt = isValidDateString(message?.createdAt)
    ? message.createdAt
    : inferCreatedAtFromMessageId(message?.id);
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

function inferCreatedAtFromMessageId(id) {
  const match = String(id || '').match(/(?:msg|sys|init)-(\d{12,})/);
  if (!match) return '';
  const time = Number(match[1]);
  const min = new Date('2024-01-01T00:00:00.000Z').getTime();
  const max = Date.now() + 366 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(time) || time < min || time > max) return '';
  return new Date(time).toISOString();
}

function messageSortKey(message, order) {
  if (isValidDateString(message.createdAt)) return new Date(message.createdAt).getTime();
  const legacyMinute = parseLegacyTime(message.timestamp);
  if (legacyMinute !== null) return 946684800000 + legacyMinute * 60000 + order;
  return 946684800000 + order;
}

function normalizeReplacedThreadIds(value) {
  return Array.isArray(value)
    ? value.map((id) => String(id || '')).filter(Boolean).slice(0, 10)
    : [];
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

function getThreadUpdatedAt(messages = [], fallback = new Date().toISOString()) {
  const mergedMessages = Array.isArray(messages) ? mergeMessages([], messages) : [];
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
  const sourceThreads = [
    ...(Array.isArray(localThreads) ? localThreads : []),
    ...(Array.isArray(incomingThreads) ? incomingThreads : []),
  ];
  const replacedThreadIds = new Set(
    sourceThreads.flatMap((thread) => normalizeReplacedThreadIds(thread?.replacedThreadIds)),
  );

  sourceThreads
    .filter((thread) => thread?.id)
    .forEach((thread) => {
      const id = String(thread.id);
      if (replacedThreadIds.has(id)) return;
      const existing = byId.get(id);
      const messages = mergeMessages([], thread.messages);
      const threadUpdatedAt = getThreadUpdatedAt(messages, thread.updatedAt || thread.createdAt || new Date().toISOString());
      if (!existing) {
        byId.set(id, {
          id,
          userName: thread.userName || 'Pengunjung',
          userEmail: thread.userEmail || '',
          isGuest: Boolean(thread.isGuest),
          messages,
          adminMode: Boolean(thread.adminMode),
          activeAdmin: thread.activeAdmin || null,
          replacedThreadIds: normalizeReplacedThreadIds(thread.replacedThreadIds),
          updatedAt: threadUpdatedAt,
          createdAt: thread.createdAt || new Date().toISOString(),
        });
        return;
      }

      const existingUpdated = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const threadUpdated = new Date(threadUpdatedAt || thread.createdAt || 0).getTime();
      const newer = threadUpdated >= existingUpdated ? thread : existing;
      const mergedMessages = mergeMessages(existing.messages, messages);

      byId.set(id, {
        ...existing,
        ...newer,
        id,
        userName: newer.userName || existing.userName || 'Pengunjung',
        userEmail: newer.userEmail || existing.userEmail || '',
        isGuest: Boolean(newer.isGuest ?? existing.isGuest),
        messages: mergedMessages,
        adminMode: Boolean(newer.adminMode),
        activeAdmin: newer.activeAdmin || existing.activeAdmin || null,
        replacedThreadIds: Array.from(new Set([
          ...normalizeReplacedThreadIds(existing.replacedThreadIds),
          ...normalizeReplacedThreadIds(thread.replacedThreadIds),
        ])).slice(0, 10),
        createdAt: getOlderDate(existing.createdAt, thread.createdAt),
        updatedAt: getThreadUpdatedAt(mergedMessages, newer.updatedAt || existing.updatedAt || new Date().toISOString()),
      });
    });

  return Array.from(byId.values())
    .filter((thread) => !replacedThreadIds.has(thread.id))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 300);
}

function promoteGuestThreadToUser(identity, threads) {
  if (identity.isGuest || !identity.previousGuestId) return null;
  const guestThread = threads.find((thread) => thread.id === identity.previousGuestId);
  if (!guestThread) return null;

  const userThread = threads.find((thread) => thread.id === identity.id);
  const mergedMessages = mergeMessages(guestThread.messages, userThread?.messages || []);
  const promotedThread = {
    ...(userThread || guestThread),
    id: identity.id,
    userName: identity.userName,
    userEmail: identity.userEmail,
    isGuest: false,
    messages: mergedMessages.length > 0 ? mergedMessages : [createInitialChatMessage()],
    adminMode: Boolean(userThread?.adminMode ?? guestThread.adminMode),
    activeAdmin: userThread?.activeAdmin || guestThread.activeAdmin || null,
    replacedThreadIds: Array.from(new Set([
      ...normalizeReplacedThreadIds(userThread?.replacedThreadIds),
      ...normalizeReplacedThreadIds(guestThread.replacedThreadIds),
      identity.previousGuestId,
    ])).slice(0, 10),
    createdAt: getOlderDate(userThread?.createdAt, guestThread.createdAt),
    updatedAt: getThreadUpdatedAt(mergedMessages, userThread?.updatedAt || guestThread.updatedAt || new Date().toISOString()),
  };

  const nextThreads = mergeChatThreads(
    threads.filter((thread) => thread.id !== identity.id && thread.id !== identity.previousGuestId),
    [promotedThread],
  );
  writeStorageList(CHAT_THREADS_KEY, nextThreads);
  window.dispatchEvent(new CustomEvent('goisiin:chat-threads-updated'));
  return promotedThread;
}

export function getChatThread(identity) {
  const threads = getChatThreads();
  const promoted = promoteGuestThreadToUser(identity, threads);
  if (promoted) return promoted;

  const existing = threads.find((thread) => thread.id === identity.id);
  if (existing) return existing;

  return {
    id: identity.id,
    userName: identity.userName,
    userEmail: identity.userEmail,
    isGuest: identity.isGuest,
    messages: [createInitialChatMessage()],
    adminMode: false,
    activeAdmin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    replacedThreadIds: [],
  };
}

export function saveChatThread(nextThread) {
  const now = new Date().toISOString();
  const normalizedMessages = mergeMessages([], nextThread.messages);
  const safeThread = {
    ...nextThread,
    messages: normalizedMessages,
    replacedThreadIds: normalizeReplacedThreadIds(nextThread.replacedThreadIds),
    updatedAt: getThreadUpdatedAt(normalizedMessages, nextThread.updatedAt || now),
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
