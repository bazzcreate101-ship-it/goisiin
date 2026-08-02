import { readStorageList, writeStorageList } from './storage';

const WALLET_LEDGER_KEY = 'goisiin_wallet_ledger';
const WALLET_WITHDRAWALS_KEY = 'goisiin_wallet_withdrawals';

export const WALLET_TOPUP_MIN = 50000;
export const WALLET_TOPUP_MAX = 5000000;
export const WALLET_WITHDRAW_MIN = 100000;
export const WALLET_WITHDRAW_FEE_RATE = 0.007;

const nowText = () => new Date().toLocaleString('id-ID');
const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const normalizeWalletEmail = (value) => String(value || '').trim().toLowerCase().slice(0, 120);
export const cleanWalletText = (value, limit = 120) => String(value || '').trim().replace(/[<>`{}]/g, '').slice(0, limit);

export function getWalletLedger() {
  return readStorageList(WALLET_LEDGER_KEY);
}

function saveWalletLedger(entries) {
  writeStorageList(WALLET_LEDGER_KEY, entries.slice(-1000));
}

export function getWalletBalance(email) {
  const userEmail = normalizeWalletEmail(email);
  return getWalletLedger()
    .filter((entry) => normalizeWalletEmail(entry.userEmail) === userEmail)
    .reduce((sum, entry) => sum + Number(entry.delta || 0), 0);
}

export function getWalletEntries(email) {
  const userEmail = normalizeWalletEmail(email);
  return getWalletLedger()
    .filter((entry) => normalizeWalletEmail(entry.userEmail) === userEmail)
    .slice(0, 80);
}

function walletEntryExists(kind, invoiceId, userEmail) {
  const email = normalizeWalletEmail(userEmail);
  return getWalletLedger().some((entry) => (
    entry.kind === kind &&
    String(entry.invoiceId || '') === String(invoiceId || '') &&
    normalizeWalletEmail(entry.userEmail) === email
  ));
}

function walletWithdrawalEntryExists(kind, withdrawalId, userEmail) {
  const email = normalizeWalletEmail(userEmail);
  return getWalletLedger().some((entry) => (
    entry.kind === kind &&
    String(entry.withdrawalId || '') === String(withdrawalId || '') &&
    normalizeWalletEmail(entry.userEmail) === email
  ));
}

export function addWalletEntry({ userEmail, kind, delta, invoiceId, withdrawalId, note, metadata }) {
  const email = normalizeWalletEmail(userEmail);
  const amount = Number(delta || 0);
  if (!email || !kind || !Number.isFinite(amount) || amount === 0) {
    return { ok: false, reason: 'invalid_input' };
  }

  if (invoiceId && walletEntryExists(kind, invoiceId, email)) {
    return { ok: false, reason: 'duplicate_entry' };
  }

  const entries = getWalletLedger();
  const entry = {
    id: makeId('wallet'),
    userEmail: email,
    kind,
    delta: amount,
    invoiceId: invoiceId || null,
    withdrawalId: withdrawalId || null,
    note: cleanWalletText(note || kind, 180),
    metadata: metadata || null,
    createdAt: nowText(),
    createdAtIso: nowIso(),
  };
  entries.unshift(entry);
  saveWalletLedger(entries);
  return { ok: true, entry };
}

export function debitWalletForPurchase(transaction) {
  const userEmail = normalizeWalletEmail(transaction?.userEmail);
  const total = Number(transaction?.total || 0);
  const invoiceId = String(transaction?.invoiceId || '');
  if (!userEmail || !invoiceId || total <= 0) return { ok: false, reason: 'invalid_transaction' };
  if (getWalletBalance(userEmail) < total) return { ok: false, reason: 'insufficient_balance' };
  if (walletEntryExists('purchase_debit', invoiceId, userEmail)) return { ok: true, reason: 'already_debited' };
  return addWalletEntry({
    userEmail,
    kind: 'purchase_debit',
    delta: -total,
    invoiceId,
    note: `Pembayaran pesanan ${invoiceId}`,
    metadata: { productName: transaction.productName },
  });
}

export function settleWalletEffectsForTransaction(transaction, actor = 'system') {
  const userEmail = normalizeWalletEmail(transaction?.userEmail);
  const invoiceId = String(transaction?.invoiceId || '');
  const status = String(transaction?.status || '').toLowerCase();
  if (!userEmail || !invoiceId) return { ok: false, reason: 'invalid_transaction' };

  if (status === 'success' && transaction.transactionType === 'wallet_topup') {
    const creditAmount = Number(transaction.walletCreditAmount || transaction.subtotal || 0);
    if (creditAmount <= 0 || walletEntryExists('topup_credit', invoiceId, userEmail)) {
      return { ok: false, reason: 'not_creditable' };
    }
    return addWalletEntry({
      userEmail,
      kind: 'topup_credit',
      delta: creditAmount,
      invoiceId,
      note: `Top up saldo Goisiin ${invoiceId}`,
      metadata: { actor },
    });
  }

  if (status === 'failed') {
    if (transaction.transactionType === 'wallet_topup') {
      const creditAmount = Number(transaction.walletCreditAmount || transaction.subtotal || 0);
      if (
        creditAmount > 0 &&
        walletEntryExists('topup_credit', invoiceId, userEmail) &&
        !walletEntryExists('topup_reversal', invoiceId, userEmail)
      ) {
        return addWalletEntry({
          userEmail,
          kind: 'topup_reversal',
          delta: -creditAmount,
          invoiceId,
          note: `Pembatalan top up saldo ${invoiceId}`,
          metadata: { actor },
        });
      }
      return { ok: false, reason: 'not_refundable' };
    }

    const refundAmount = Number(transaction.refundableAmount || (transaction.walletDebited ? transaction.total : 0) || 0);
    if (refundAmount <= 0 || walletEntryExists('failed_refund', invoiceId, userEmail)) {
      return { ok: false, reason: 'not_refundable' };
    }
    return addWalletEntry({
      userEmail,
      kind: 'failed_refund',
      delta: refundAmount,
      invoiceId,
      note: `Refund otomatis transaksi gagal ${invoiceId}`,
      metadata: { actor, productName: transaction.productName },
    });
  }

  return { ok: false, reason: 'no_effect' };
}

export function getWithdrawalRequests() {
  return readStorageList(WALLET_WITHDRAWALS_KEY);
}

function saveWithdrawalRequests(requests) {
  writeStorageList(WALLET_WITHDRAWALS_KEY, requests.slice(-500));
}

export function createWithdrawalRequest(email, payload) {
  const userEmail = normalizeWalletEmail(email);
  const amount = Number(payload?.amount || 0);
  if (!userEmail || amount < WALLET_WITHDRAW_MIN) return { ok: false, reason: 'minimum_withdrawal' };
  if (getWalletBalance(userEmail) < amount) return { ok: false, reason: 'insufficient_balance' };

  const fee = Math.round(amount * WALLET_WITHDRAW_FEE_RATE);
  const payoutAmount = Math.max(0, amount - fee);
  const request = {
    id: makeId('withdraw'),
    userEmail,
    amount,
    fee,
    payoutAmount,
    destinationType: cleanWalletText(payload?.destinationType || 'E-Wallet', 40),
    provider: cleanWalletText(payload?.provider, 40),
    accountName: cleanWalletText(payload?.accountName, 80),
    accountNumber: cleanWalletText(payload?.accountNumber, 60),
    status: 'pending',
    createdAt: nowText(),
    createdAtIso: nowIso(),
  };

  if (!request.provider || !request.accountName || !request.accountNumber) {
    return { ok: false, reason: 'destination_required' };
  }

  const debit = addWalletEntry({
    userEmail,
    kind: 'withdrawal_hold',
    delta: -amount,
    withdrawalId: request.id,
    note: `Pengajuan tarik saldo ${request.provider}`,
    metadata: { fee, payoutAmount },
  });
  if (!debit.ok) return debit;

  const requests = getWithdrawalRequests();
  requests.unshift(request);
  saveWithdrawalRequests(requests);
  return { ok: true, request };
}

export function updateWithdrawalStatus(withdrawalId, status, actor = 'admin') {
  const allowed = ['pending', 'processing', 'fulfilled', 'rejected'];
  if (!allowed.includes(status)) return { ok: false, reason: 'invalid_status' };
  const requests = getWithdrawalRequests();
  const request = requests.find((item) => item.id === withdrawalId);
  if (!request) return { ok: false, reason: 'not_found' };

  const prevStatus = request.status;
  request.status = status;
  request.updatedAt = nowText();
  request.updatedBy = actor;
  saveWithdrawalRequests(requests);

  if (
    status === 'rejected' &&
    prevStatus !== 'rejected' &&
    !walletWithdrawalEntryExists('withdrawal_refund', request.id, request.userEmail)
  ) {
    addWalletEntry({
      userEmail: request.userEmail,
      kind: 'withdrawal_refund',
      delta: Number(request.amount || 0),
      withdrawalId: request.id,
      note: `Pengajuan tarik saldo ditolak, saldo dikembalikan`,
      metadata: { actor },
    });
  }

  return { ok: true, request };
}
