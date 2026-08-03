import { STAMP_MIN_TRANSACTION, STAMP_REQUIRED_UNIQUE, stampRewards, stampTypes } from '../data/stampRewards';
import { readStorageList, writeStorageList } from './storage';

const STAMP_EVENTS_KEY = 'goisiin_stamp_events';
const STAMP_REDEMPTIONS_KEY = 'goisiin_stamp_redemptions';
const STAMP_AUDIT_KEY = 'goisiin_stamp_audit_logs';
const VOUCHER_CODES_KEY = 'goisiin_stamp_voucher_codes';
const STAMP_REDEEM_CODES_KEY = 'goisiin_stamp_redeem_codes';

const nowText = () => new Date().toLocaleString('id-ID');
const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const makeStampCode = (stampNo) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  if (window.crypto?.getRandomValues) {
    const buffer = new Uint32Array(10);
    window.crypto.getRandomValues(buffer);
    token = Array.from(buffer, (value) => alphabet[value % alphabet.length]).join('');
  } else {
    token = Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  }
  return `GSI-S${Number(stampNo)}-${token.slice(0, 5)}-${token.slice(5)}`;
};

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase().slice(0, 120);
export const cleanClaimText = (value, limit = 160) => String(value || '').trim().replace(/[<>`{}]/g, '').slice(0, limit);

export function getStampEvents() {
  return readStorageList(STAMP_EVENTS_KEY);
}

function saveStampEvents(events) {
  writeStorageList(STAMP_EVENTS_KEY, events.slice(-1000));
}

export function getStampRedemptions() {
  return readStorageList(STAMP_REDEMPTIONS_KEY);
}

function saveStampRedemptions(redemptions) {
  writeStorageList(STAMP_REDEMPTIONS_KEY, redemptions.slice(-500));
}

export function getStampRedeemCodes() {
  return readStorageList(STAMP_REDEEM_CODES_KEY);
}

function saveStampRedeemCodes(codes) {
  writeStorageList(STAMP_REDEEM_CODES_KEY, codes.slice(-500));
}

export function getStampAuditLogs() {
  return readStorageList(STAMP_AUDIT_KEY);
}

function appendAudit(action, actor, detail) {
  const logs = getStampAuditLogs();
  logs.unshift({
    id: makeId('audit'),
    action,
    actor: actor || 'system',
    detail,
    createdAt: nowText(),
  });
  writeStorageList(STAMP_AUDIT_KEY, logs.slice(0, 500));
}

const isValidStampNo = (stampNo) => stampTypes.some((stamp) => stamp.id === Number(stampNo));

function randomStampNo() {
  if (window.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    return (buffer[0] % STAMP_REQUIRED_UNIQUE) + 1;
  }
  return Math.floor(Math.random() * STAMP_REQUIRED_UNIQUE) + 1;
}

function addEvent(event) {
  const events = getStampEvents();
  const next = {
    id: makeId('stamp'),
    createdAt: nowText(),
    createdAtIso: nowIso(),
    ...event,
    userEmail: normalizeEmail(event.userEmail),
    stampNo: Number(event.stampNo),
    delta: Number(event.delta),
  };
  events.unshift(next);
  saveStampEvents(events);
  return next;
}

export function getPendingLocks() {
  return Object.fromEntries(stampTypes.map((stamp) => [stamp.id, 0]));
}

export function getStampInventory(email, { includeLocks = false } = {}) {
  const userEmail = normalizeEmail(email);
  const counts = Object.fromEntries(stampTypes.map((stamp) => [stamp.id, 0]));
  getStampEvents()
    .filter((event) => normalizeEmail(event.userEmail) === userEmail)
    .forEach((event) => {
      if (isValidStampNo(event.stampNo)) {
        counts[Number(event.stampNo)] = (counts[Number(event.stampNo)] || 0) + Number(event.delta || 0);
      }
    });
  stampTypes.forEach((stamp) => {
    counts[stamp.id] = Math.max(0, counts[stamp.id] || 0);
  });

  if (!includeLocks) return counts;
  const locks = getPendingLocks(userEmail);
  const available = Object.fromEntries(stampTypes.map((stamp) => [
    stamp.id,
    Math.max(0, counts[stamp.id] - (locks[stamp.id] || 0)),
  ]));
  return { counts, locks, available };
}

export function getStampSummary(email) {
  const { counts, locks, available } = getStampInventory(email, { includeLocks: true });
  const unique = stampTypes.filter((stamp) => counts[stamp.id] > 0).length;
  const duplicates = stampTypes.reduce((sum, stamp) => sum + Math.max(0, counts[stamp.id] - 1), 0);
  const complete = unique >= STAMP_REQUIRED_UNIQUE;
  return {
    counts,
    locks,
    available,
    unique,
    duplicates,
    complete,
    missing: stampTypes.filter((stamp) => counts[stamp.id] <= 0).map((stamp) => stamp.id),
  };
}

export function awardStampForTransaction(transaction, actor = 'system') {
  const userEmail = normalizeEmail(transaction?.userEmail);
  const invoiceId = String(transaction?.invoiceId || '');
  const total = Number(transaction?.total || 0);
  const status = String(transaction?.status || '').toLowerCase();
  const transactionType = String(transaction?.transactionType || '').toLowerCase();

  if (!userEmail || !invoiceId || transactionType === 'wallet_topup' || status !== 'success' || total < STAMP_MIN_TRANSACTION) {
    return { ok: false, reason: 'not_eligible' };
  }

  const exists = getStampEvents().some((event) => event.kind === 'earned' && event.invoiceId === invoiceId);
  if (exists) return { ok: false, reason: 'already_awarded' };

  const stampNo = randomStampNo();
  const event = addEvent({
    kind: 'earned',
    userEmail,
    stampNo,
    delta: 1,
    invoiceId,
    note: `Stamp acak dari transaksi ${invoiceId}`,
  });
  appendAudit('stamp_awarded_transaction', actor, `${userEmail} mendapat stamp ${stampNo} dari ${invoiceId}`);
  return { ok: true, event };
}

export function grantStampToUser(email, stampNo, actor = 'admin') {
  const userEmail = normalizeEmail(email);
  const safeStamp = Number(stampNo);
  if (!userEmail || !isValidStampNo(safeStamp)) return { ok: false, reason: 'invalid_input' };
  const event = addEvent({
    kind: 'admin_grant',
    userEmail,
    stampNo: safeStamp,
    delta: 1,
    note: `Diberikan oleh ${actor}`,
  });
  appendAudit('admin_grant_stamp', actor, `${actor} memberi stamp ${safeStamp} ke ${userEmail}`);
  return { ok: true, event };
}

export function revokeStampFromUser(email, stampNo, actor = 'admin') {
  const userEmail = normalizeEmail(email);
  const safeStamp = Number(stampNo);
  const inventory = getStampInventory(userEmail);
  if (!userEmail || !isValidStampNo(safeStamp) || inventory[safeStamp] <= 0) {
    return { ok: false, reason: 'not_available' };
  }
  const event = addEvent({
    kind: 'admin_revoke',
    userEmail,
    stampNo: safeStamp,
    delta: -1,
    note: `Dicabut oleh ${actor}`,
  });
  appendAudit('admin_revoke_stamp', actor, `${actor} mencabut stamp ${safeStamp} dari ${userEmail}`);
  return { ok: true, event };
}

export function createStampRedeemCode(ownerEmail, stampNo) {
  const owner = normalizeEmail(ownerEmail);
  const safeStamp = Number(stampNo);
  const { available } = getStampInventory(owner, { includeLocks: true });
  if (!owner || !isValidStampNo(safeStamp) || available[safeStamp] <= 0) {
    return { ok: false, reason: 'not_available' };
  }

  const codes = getStampRedeemCodes();
  let code = makeStampCode(safeStamp);
  while (codes.some((item) => item.code === code)) {
    code = makeStampCode(safeStamp);
  }

  const redeemCode = {
    id: makeId('stampcode'),
    code,
    stampNo: safeStamp,
    ownerEmail: owner,
    status: 'active',
    createdAt: nowText(),
    createdAtIso: nowIso(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };

  addEvent({
    kind: 'code_out',
    userEmail: owner,
    stampNo: safeStamp,
    delta: -1,
    redeemCodeId: redeemCode.id,
    note: `Dibuat kode redeem ${code}`,
  });
  codes.unshift(redeemCode);
  saveStampRedeemCodes(codes);
  appendAudit('stamp_code_created', owner, `${owner} membuat kode ${code} untuk stamp ${safeStamp}`);
  return { ok: true, code: redeemCode };
}

export function redeemStampCode(codeValue, redeemerEmail) {
  const redeemer = normalizeEmail(redeemerEmail);
  const safeCode = String(codeValue || '').trim().toUpperCase().replace(/\s+/g, '');
  const codes = getStampRedeemCodes();
  const code = codes.find((item) => String(item.code || '').toUpperCase() === safeCode);

  if (!redeemer || !code || code.status !== 'active') {
    return { ok: false, reason: 'invalid_code' };
  }
  if (normalizeEmail(code.ownerEmail) === redeemer) {
    return { ok: false, reason: 'self_redeem_blocked' };
  }
  if (code.expiresAt && new Date(code.expiresAt).getTime() < Date.now()) {
    code.status = 'expired';
    code.updatedAt = nowText();
    saveStampRedeemCodes(codes);
    return { ok: false, reason: 'expired' };
  }

  code.status = 'redeemed';
  code.redeemedBy = redeemer;
  code.redeemedAt = nowText();
  code.updatedAt = nowText();
  addEvent({
    kind: 'code_in',
    userEmail: redeemer,
    stampNo: code.stampNo,
    delta: 1,
    relatedUserEmail: normalizeEmail(code.ownerEmail),
    redeemCodeId: code.id,
    note: `Redeem kode dari ${normalizeEmail(code.ownerEmail)}`,
  });
  saveStampRedeemCodes(codes);
  appendAudit('stamp_code_redeemed', redeemer, `${redeemer} redeem kode ${code.code} dari ${code.ownerEmail}`);
  return { ok: true, code };
}

export function cancelStampRedeemCode(codeId, ownerEmail) {
  const owner = normalizeEmail(ownerEmail);
  const codes = getStampRedeemCodes();
  const code = codes.find((item) => item.id === codeId);
  if (!owner || !code || !['active', 'expired'].includes(code.status) || normalizeEmail(code.ownerEmail) !== owner) {
    return { ok: false, reason: 'invalid_code' };
  }

  code.status = 'cancelled';
  code.updatedAt = nowText();
  addEvent({
    kind: 'code_refund',
    userEmail: owner,
    stampNo: code.stampNo,
    delta: 1,
    redeemCodeId: code.id,
    note: `Kode redeem ${code.code} dibatalkan`,
  });
  saveStampRedeemCodes(codes);
  appendAudit('stamp_code_cancelled', owner, `${owner} membatalkan kode ${code.code}`);
  return { ok: true, code };
}

export function createRedemption(email) {
  const userEmail = normalizeEmail(email);
  const summary = getStampSummary(userEmail);
  if (!userEmail || !summary.complete) return { ok: false, reason: 'incomplete_stamp' };

  const redemptionId = makeId('redeem');
  stampTypes.forEach((stamp) => {
    addEvent({
      kind: 'redeem_consume',
      userEmail,
      stampNo: stamp.id,
      delta: -1,
      redemptionId,
      note: `Dipakai untuk klaim ${redemptionId}`,
    });
  });

  const redemptions = getStampRedemptions();
  const redemption = {
    id: redemptionId,
    userEmail,
    status: 'pending_prize',
    consumedStampNos: stampTypes.map((stamp) => stamp.id),
    createdAt: nowText(),
    revealReady: false,
  };
  redemptions.unshift(redemption);
  saveStampRedemptions(redemptions);
  appendAudit('redemption_created', userEmail, `${userEmail} menukar 6 stamp (${redemptionId})`);
  return { ok: true, redemption };
}

export function getDefaultVoucherCodes() {
  const saved = readStorageList(VOUCHER_CODES_KEY);
  if (saved.length > 0) return saved;
  const seeded = Array.from({ length: 20 }, (_, index) => ({
    id: makeId('voucher'),
    prizeId: 'google-play-100k',
    code: `GP-GOISIIN-${String(index + 1).padStart(3, '0')}`,
    status: 'unused',
  }));
  writeStorageList(VOUCHER_CODES_KEY, seeded);
  return seeded;
}

function assignVoucherCode(prizeId, redemptionId) {
  const codes = getDefaultVoucherCodes();
  const code = codes.find((item) => item.prizeId === prizeId && item.status === 'unused');
  if (!code) return null;
  code.status = 'assigned';
  code.redemptionId = redemptionId;
  code.assignedAt = nowText();
  writeStorageList(VOUCHER_CODES_KEY, codes);
  return code.code;
}

export function assignPrizeToRedemption(redemptionId, prizeId, actor = 'admin') {
  const redemptions = getStampRedemptions();
  const redemption = redemptions.find((item) => item.id === redemptionId);
  const prize = stampRewards.find((item) => item.id === prizeId);
  if (!redemption || !prize || !['pending_prize', 'prize_assigned'].includes(redemption.status)) {
    return { ok: false, reason: 'invalid_redemption' };
  }
  redemption.prizeId = prize.id;
  redemption.prizeName = prize.name;
  redemption.prizeType = prize.type;
  redemption.prizeImage = prize.image;
  redemption.status = 'prize_assigned';
  redemption.revealReady = true;
  redemption.assignedAt = nowText();
  redemption.assignedBy = actor;
  if (prize.type === 'voucher_code' && !redemption.voucherCode) {
    redemption.voucherCode = assignVoucherCode(prize.id, redemption.id) || `GP-GOISIIN-${redemption.id.slice(-6).toUpperCase()}`;
  }
  saveStampRedemptions(redemptions);
  appendAudit('prize_assigned', actor, `${actor} memilih ${prize.name} untuk ${redemption.userEmail}`);
  return { ok: true, redemption };
}

export function submitRedemptionClaim(redemptionId, claimDetails) {
  const redemptions = getStampRedemptions();
  const redemption = redemptions.find((item) => item.id === redemptionId);
  if (!redemption || redemption.status !== 'prize_assigned') {
    return { ok: false, reason: 'invalid_redemption' };
  }
  const details = {
    fullName: cleanClaimText(claimDetails.fullName, 80),
    phone: cleanClaimText(claimDetails.phone, 30),
    address: cleanClaimText(claimDetails.address, 240),
    city: cleanClaimText(claimDetails.city, 80),
    province: cleanClaimText(claimDetails.province, 80),
    postalCode: cleanClaimText(claimDetails.postalCode, 12),
    walletProvider: cleanClaimText(claimDetails.walletProvider, 40),
    walletNumber: cleanClaimText(claimDetails.walletNumber, 40),
  };

  if (redemption.prizeType === 'physical' && (!details.fullName || !details.phone || !details.address || !details.city)) {
    return { ok: false, reason: 'address_required' };
  }
  if (redemption.prizeType === 'wallet_balance' && (!details.walletProvider || !details.walletNumber)) {
    return { ok: false, reason: 'wallet_required' };
  }

  redemption.claimDetails = details;
  redemption.status = redemption.prizeType === 'voucher_code' ? 'fulfilled' : 'claimed';
  redemption.claimedAt = nowText();
  saveStampRedemptions(redemptions);
  appendAudit('redemption_claimed', redemption.userEmail, `${redemption.userEmail} mengisi klaim ${redemption.id}`);
  return { ok: true, redemption };
}

export function updateRedemptionStatus(redemptionId, status, actor = 'admin') {
  const allowed = ['pending_prize', 'prize_assigned', 'claimed', 'fulfilled', 'rejected'];
  const redemptions = getStampRedemptions();
  const redemption = redemptions.find((item) => item.id === redemptionId);
  if (!redemption || !allowed.includes(status)) return { ok: false, reason: 'invalid_status' };
  redemption.status = status;
  redemption.updatedAt = nowText();
  redemption.updatedBy = actor;
  saveStampRedemptions(redemptions);
  appendAudit('redemption_status_updated', actor, `${actor} mengubah ${redemptionId} ke ${status}`);
  return { ok: true, redemption };
}

export function updateRedemptionDates(redemptionId, dates = {}, actor = 'admin') {
  const allowedFields = ['createdAt', 'assignedAt', 'claimedAt', 'updatedAt'];
  const redemptions = getStampRedemptions();
  const redemption = redemptions.find((item) => item.id === redemptionId);
  if (!redemption) return { ok: false, reason: 'invalid_redemption' };

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(dates, field)) {
      redemption[field] = cleanClaimText(dates[field], 80);
    }
  });
  redemption.updatedBy = actor;
  saveStampRedemptions(redemptions);
  appendAudit('redemption_dates_updated', actor, `${actor} mengubah tanggal penukaran ${redemptionId}`);
  return { ok: true, redemption };
}

export function getUserRedemptions(email) {
  const userEmail = normalizeEmail(email);
  return getStampRedemptions().filter((redemption) => normalizeEmail(redemption.userEmail) === userEmail);
}
