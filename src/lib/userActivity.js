import { readStorageList, writeStorageList } from './storage';

const USERS_KEY = 'goisiin_users';
const ONLINE_WINDOW_MS = 3 * 60 * 1000;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

export function formatActivityTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || '');
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function isUserOnline(user) {
  const onlineUntil = new Date(user?.onlineUntil || 0).getTime();
  return Number.isFinite(onlineUntil) && onlineUntil > Date.now();
}

export function upsertUserActivity(user, event = 'online') {
  const email = normalizeEmail(user?.email);
  if (!email) return null;

  const now = new Date();
  const nowIso = now.toISOString();
  const nowText = now.toLocaleString('id-ID');
  const users = readStorageList(USERS_KEY);
  const existing = users.find((item) => normalizeEmail(item.email) === email) || {};
  const nextUser = {
    ...existing,
    name: user.name || existing.name || email,
    email,
    picture: user.picture || existing.picture || '',
    registeredAt: existing.registeredAt || user.registeredAt || nowText,
    registeredAtIso: existing.registeredAtIso || user.registeredAtIso || nowIso,
    lastOnlineAt: nowIso,
    onlineUntil: new Date(now.getTime() + ONLINE_WINDOW_MS).toISOString(),
  };

  if (event === 'login') {
    nextUser.lastLogin = nowText;
    nextUser.lastLoginAt = nowIso;
  }

  if (event === 'logout') {
    nextUser.lastLogoutAt = nowIso;
    nextUser.onlineUntil = nowIso;
  }

  const nextUsers = [
    nextUser,
    ...users.filter((item) => normalizeEmail(item.email) !== email),
  ].slice(0, 1000);
  writeStorageList(USERS_KEY, nextUsers);
  return nextUser;
}
