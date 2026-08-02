import { STAMP_MIN_TRANSACTION, STAMP_REQUIRED_UNIQUE, stampRewards, stampTypes } from '../data/stampRewards';
import { readStorageList, writeStorageList } from './storage';

const STAMP_EVENTS_KEY = 'goisiin_stamp_events';
const STAMP_TRADES_KEY = 'goisiin_stamp_trades';
const STAMP_REDEMPTIONS_KEY = 'goisiin_stamp_redemptions';
const STAMP_AUDIT_KEY = 'goisiin_stamp_audit_logs';
const VOUCHER_CODES_KEY = 'goisiin_stamp_voucher_codes';

const nowText = () => new Date().toLocaleString('id-ID');
const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeEmail = (value) => String(value || '').trim().toLowerCase().slice(0, 120);
export const cleanClaimText = (value, limit = 160) => String(value || '').trim().replace(/[<>`{}]/g, '').slice(0, limit);

export function getStampEvents() {
  return readStorageList(STAMP_EVENTS_KEY);
}

function saveStampEvents(events) {
  writeStorageList(STAMP_EVENTS_KEY, events.slice(-1000));
}

export function getStampTrades() {
  return readStorageList(STAMP_TRADES_KEY);
}

function saveStampTrades(trades) {
  writeStorageList(STAMP_TRADES_KEY, trades.slice(-500));
}

export function getStampRedemptions() {
  return readStorageList(STAMP_REDEMPTIONS_KEY);
}

function saveStampRedemptions(redemptions) {
  writeStorageList(STAMP_REDEMPTIONS_KEY, redemptions.slice(-500));
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

export function getPendingLocks(email) {
  const userEmail = normalizeEmail(email);
  const locks = Object.fromEntries(stampTypes.map((stamp) => [stamp.id, 0]));
  getStampTrades()
    .filter((trade) => trade.status === 'pending' && normalizeEmail(trade.fromEmail) === userEmail)
    .forEach((trade) => {
      locks[Number(trade.offeredStamp)] = (locks[Number(trade.offeredStamp)] || 0) + 1;
    });
  return locks;
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

  if (!userEmail || !invoiceId || status !== 'success' || total < STAMP_MIN_TRANSACTION) {
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

export function giftStamp(fromEmail, toEmail, stampNo) {
  const from = normalizeEmail(fromEmail);
  const to = normalizeEmail(toEmail);
  const safeStamp = Number(stampNo);
  const { available } = getStampInventory(from, { includeLocks: true });
  if (!from || !to || from === to || !isValidStampNo(safeStamp) || available[safeStamp] <= 0) {
    return { ok: false, reason: 'not_available' };
  }
  const giftId = makeId('gift');
  addEvent({ kind: 'gift_out', userEmail: from, stampNo: safeStamp, delta: -1, relatedUserEmail: to, giftId, note: `Gift ke ${to}` });
  addEvent({ kind: 'gift_in', userEmail: to, stampNo: safeStamp, delta: 1, relatedUserEmail: from, giftId, note: `Gift dari ${from}` });
  appendAudit('user_gift_stamp', from, `${from} mengirim stamp ${safeStamp} ke ${to}`);
  return { ok: true, giftId };
}

export function createTradeOffer(fromEmail, toEmail, offeredStamp, requestedStamp) {
  const from = normalizeEmail(fromEmail);
  const to = normalizeEmail(toEmail);
  const offer = Number(offeredStamp);
  const request = Number(requestedStamp);
  const { available } = getStampInventory(from, { includeLocks: true });
  if (!from || !to || from === to || !isValidStampNo(offer) || !isValidStampNo(request) || available[offer] <= 0) {
    return { ok: false, reason: 'not_available' };
  }
  const trades = getStampTrades();
  const trade = {
    id: makeId('trade'),
    fromEmail: from,
    toEmail: to,
    offeredStamp: offer,
    requestedStamp: request,
    status: 'pending',
    createdAt: nowText(),
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  };
  trades.unshift(trade);
  saveStampTrades(trades);
  appendAudit('trade_created', from, `${from} menawarkan stamp ${offer} ke ${to}, minta stamp ${request}`);
  return { ok: true, trade };
}

export function acceptTradeOffer(tradeId, actorEmail) {
  const actor = normalizeEmail(actorEmail);
  const trades = getStampTrades();
  const trade = trades.find((item) => item.id === tradeId);
  if (!trade || trade.status !== 'pending' || normalizeEmail(trade.toEmail) !== actor) {
    return { ok: false, reason: 'invalid_trade' };
  }

  const from = normalizeEmail(trade.fromEmail);
  const to = normalizeEmail(trade.toEmail);
  const fromInventory = getStampInventory(from, { includeLocks: true });
  const fromAvailable = {
    ...fromInventory.available,
    [trade.offeredStamp]: (fromInventory.available[trade.offeredStamp] || 0) + 1,
  };
  const toAvailable = getStampInventory(to, { includeLocks: true }).available;
  if (fromAvailable[trade.offeredStamp] <= 0 || toAvailable[trade.requestedStamp] <= 0) {
    trade.status = 'expired';
    trade.updatedAt = nowText();
    saveStampTrades(trades);
    return { ok: false, reason: 'stamp_unavailable' };
  }

  addEvent({ kind: 'trade_out', userEmail: from, stampNo: trade.offeredStamp, delta: -1, relatedUserEmail: to, tradeId, note: `Barter ke ${to}` });
  addEvent({ kind: 'trade_in', userEmail: to, stampNo: trade.offeredStamp, delta: 1, relatedUserEmail: from, tradeId, note: `Barter dari ${from}` });
  addEvent({ kind: 'trade_out', userEmail: to, stampNo: trade.requestedStamp, delta: -1, relatedUserEmail: from, tradeId, note: `Barter ke ${from}` });
  addEvent({ kind: 'trade_in', userEmail: from, stampNo: trade.requestedStamp, delta: 1, relatedUserEmail: to, tradeId, note: `Barter dari ${to}` });

  trade.status = 'accepted';
  trade.updatedAt = nowText();
  saveStampTrades(trades);
  appendAudit('trade_accepted', actor, `${actor} menerima barter ${tradeId}`);
  return { ok: true, trade };
}

export function rejectTradeOffer(tradeId, actorEmail) {
  const actor = normalizeEmail(actorEmail);
  const trades = getStampTrades();
  const trade = trades.find((item) => item.id === tradeId);
  if (!trade || trade.status !== 'pending' || ![normalizeEmail(trade.toEmail), normalizeEmail(trade.fromEmail)].includes(actor)) {
    return { ok: false, reason: 'invalid_trade' };
  }
  trade.status = normalizeEmail(trade.fromEmail) === actor ? 'cancelled' : 'rejected';
  trade.updatedAt = nowText();
  saveStampTrades(trades);
  appendAudit('trade_closed', actor, `${actor} menutup barter ${tradeId}`);
  return { ok: true, trade };
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

export function getUserRedemptions(email) {
  const userEmail = normalizeEmail(email);
  return getStampRedemptions().filter((redemption) => normalizeEmail(redemption.userEmail) === userEmail);
}
