import { readStorageList, safeJsonParse, writeStorageList } from './storage';

export const CHAT_THREADS_KEY = 'goisiin_chat_threads';

export function createInitialChatMessage() {
  return {
    id: 'init-1',
    sender: 'cs',
    agent: 'Vindy',
    text: 'Halo Kak! Selamat datang di Goisiinn. Vindy siap bantu soal produk, harga, pembayaran, promo, transaksi, dan bantuan CS.',
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
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
  return readStorageList(CHAT_THREADS_KEY)
    .filter((thread) => thread?.id)
    .map((thread) => ({
      id: String(thread.id),
      userName: thread.userName || 'Pengunjung',
      userEmail: thread.userEmail || '',
      isGuest: Boolean(thread.isGuest),
      messages: Array.isArray(thread.messages) ? thread.messages.slice(-300) : [],
      adminMode: Boolean(thread.adminMode),
      activeAdmin: thread.activeAdmin || null,
      updatedAt: thread.updatedAt || thread.createdAt || new Date().toISOString(),
      createdAt: thread.createdAt || new Date().toISOString(),
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function normalizeMessage(message) {
  return {
    id: String(message?.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    sender: message?.sender === 'user' ? 'user' : message?.sender === 'system' ? 'system' : 'cs',
    agent: message?.agent || null,
    text: String(message?.text || '').slice(0, 1200),
    timestamp: message?.timestamp || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
}

function mergeMessages(left = [], right = []) {
  const byId = new Map();
  [...left, ...right].forEach((message) => {
    const normalized = normalizeMessage(message);
    if (!normalized.text) return;
    byId.set(normalized.id, {
      ...(byId.get(normalized.id) || {}),
      ...normalized,
    });
  });
  return Array.from(byId.values()).slice(-300);
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

  const legacyMessages = safeJsonParse(localStorage.getItem('goisiin_chat_messages'), []);
  const legacyAdminMode = safeJsonParse(localStorage.getItem('goisiin_chat_admin_mode'), false);
  const legacyAdmin = localStorage.getItem('goisiin_chat_active_admin') || null;
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
  return safeThread;
}

export function getLatestThreadMessage(thread) {
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  return messages[messages.length - 1] || null;
}
