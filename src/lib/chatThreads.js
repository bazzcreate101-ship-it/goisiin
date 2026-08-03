import { readStorageList, safeJsonParse, writeStorageList } from './storage';

export const CHAT_THREADS_KEY = 'goisiin_chat_threads';

export function createInitialChatMessage() {
  return {
    id: 'init-1',
    sender: 'cs',
    agent: 'Vindy',
    text: 'Halo Kak! Selamat datang di Goisiin. Vindy siap bantu soal produk, harga, pembayaran, promo, transaksi, dan bantuan CS.',
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

export function getChatThread(identity) {
  const threads = getChatThreads();
  const existing = threads.find((thread) => thread.id === identity.id);
  if (existing) return existing;

  const legacyMessages = safeJsonParse(localStorage.getItem('goisiin_chat_messages'), []);
  const legacyAdminMode = safeJsonParse(localStorage.getItem('goisiin_chat_admin_mode'), false);
  const legacyAdmin = localStorage.getItem('goisiin_chat_active_admin') || null;
  const initialMessages = Array.isArray(legacyMessages) && legacyMessages.length > 0
    ? legacyMessages.slice(-300)
    : [createInitialChatMessage()];

  return {
    id: identity.id,
    userName: identity.userName,
    userEmail: identity.userEmail,
    isGuest: identity.isGuest,
    messages: initialMessages,
    adminMode: Boolean(legacyAdminMode),
    activeAdmin: legacyAdmin,
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
  const nextThreads = [
    safeThread,
    ...threads.filter((thread) => thread.id !== safeThread.id),
  ].slice(0, 300);

  writeStorageList(CHAT_THREADS_KEY, nextThreads);
  window.dispatchEvent(new CustomEvent('goisiin:chat-threads-updated'));
  return safeThread;
}

export function getLatestThreadMessage(thread) {
  const messages = Array.isArray(thread?.messages) ? thread.messages : [];
  return messages[messages.length - 1] || null;
}
