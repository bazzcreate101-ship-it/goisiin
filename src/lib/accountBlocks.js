import { readStorageList, writeStorageList } from './storage';

export const BLOCKED_USERS_KEY = 'goisiin_blocked_users';

export function normalizeBlockedEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, 160);
}

function cleanBlockText(value, limit = 180) {
  return String(value || '').trim().replace(/[<>`{}]/g, '').slice(0, limit);
}

export function getBlockedAccounts() {
  const seen = new Set();
  return readStorageList(BLOCKED_USERS_KEY)
    .map((item) => ({
      email: normalizeBlockedEmail(item?.email || item),
      reason: cleanBlockText(item?.reason || 'Diblokir oleh admin', 180),
      blockedBy: cleanBlockText(item?.blockedBy || 'admin', 80),
      blockedAt: item?.blockedAt || new Date().toLocaleString('id-ID'),
      blockedAtIso: item?.blockedAtIso || new Date().toISOString(),
    }))
    .filter((item) => {
      if (!item.email || seen.has(item.email)) return false;
      seen.add(item.email);
      return true;
    });
}

export function isAccountBlocked(email) {
  const target = normalizeBlockedEmail(email);
  if (!target) return false;
  return getBlockedAccounts().some((item) => item.email === target);
}

export function getAccountBlock(email) {
  const target = normalizeBlockedEmail(email);
  if (!target) return null;
  return getBlockedAccounts().find((item) => item.email === target) || null;
}

export function blockAccount(email, reason = '', blockedBy = 'admin') {
  const target = normalizeBlockedEmail(email);
  if (!target) return { ok: false, reason: 'invalid_email' };
  const accounts = getBlockedAccounts();
  const existing = accounts.find((item) => item.email === target);
  const nextBlock = {
    email: target,
    reason: cleanBlockText(reason || existing?.reason || 'Akun dibatasi oleh admin.', 180),
    blockedBy: cleanBlockText(blockedBy, 80),
    blockedAt: new Date().toLocaleString('id-ID'),
    blockedAtIso: new Date().toISOString(),
  };
  const nextAccounts = [nextBlock, ...accounts.filter((item) => item.email !== target)];
  writeStorageList(BLOCKED_USERS_KEY, nextAccounts);
  window.dispatchEvent(new CustomEvent('goisiin:blocked-users-updated'));
  return { ok: true, account: nextBlock };
}

export function unblockAccount(email) {
  const target = normalizeBlockedEmail(email);
  if (!target) return { ok: false, reason: 'invalid_email' };
  const accounts = getBlockedAccounts();
  const nextAccounts = accounts.filter((item) => item.email !== target);
  writeStorageList(BLOCKED_USERS_KEY, nextAccounts);
  window.dispatchEvent(new CustomEvent('goisiin:blocked-users-updated'));
  return { ok: true };
}
