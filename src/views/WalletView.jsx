import React, { useState } from 'react';
import { paymentImages } from '../assets/images';
import { getStampSummary, normalizeEmail } from '../lib/stampService';
import { buildDynamicQrisPayload } from '../lib/qris';
import { readStorageList, writeStorageList } from '../lib/storage';
import {
  WALLET_TOPUP_MAX,
  WALLET_TOPUP_MIN,
  WALLET_WITHDRAW_FEE_RATE,
  WALLET_WITHDRAW_MIN,
  createWithdrawalRequest,
  getWalletBalance,
  getWalletEntries,
  getWithdrawalRequests,
} from '../lib/walletService';

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(Number(num || 0));

const qrisFee = (amount) => Math.round(Number(amount || 0) * 0.007);

export default function WalletView({ user, onNavigate }) {
  const userEmail = normalizeEmail(user?.email);
  const [topupAmount, setTopupAmount] = useState(50000);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: 100000,
    destinationType: 'E-Wallet',
    provider: 'DANA',
    accountName: '',
    accountNumber: '',
  });
  const [notice, setNotice] = useState('');
  const [, setRefreshKey] = useState(0);

  const transactions = readStorageList('goisiin_transactions').filter((tx) => normalizeEmail(tx.userEmail) === userEmail);
  const successTransactions = transactions.filter((tx) => String(tx.status).toLowerCase() === 'success');
  const pendingTransactions = transactions.filter((tx) => String(tx.status).toLowerCase() === 'pending');
  const points = successTransactions.reduce((sum, tx) => sum + Number(tx.points || 0), 0);
  const walletBalance = getWalletBalance(userEmail);
  const walletEntries = getWalletEntries(userEmail);
  const withdrawalRequests = getWithdrawalRequests().filter((request) => normalizeEmail(request.userEmail) === userEmail);
  const stampSummary = getStampSummary(userEmail);

  const reload = (message = '') => {
    setNotice(message);
    setRefreshKey((key) => key + 1);
  };

  const handleTopup = (event) => {
    event.preventDefault();
    const amount = Number(topupAmount || 0);
    if (amount < WALLET_TOPUP_MIN || amount > WALLET_TOPUP_MAX) {
      reload(`Nominal top up harus ${formatRupiah(WALLET_TOPUP_MIN)} sampai ${formatRupiah(WALLET_TOPUP_MAX)}.`);
      return;
    }

    const fee = qrisFee(amount);
    const total = amount + fee;
    const invoiceId = 'GSI-WALLET-' + Date.now().toString().slice(-8).toUpperCase();
    const invoiceData = {
      invoiceId,
      productId: 'goisiin-wallet',
      productName: 'Top Up Saldo Goisiin',
      productImage: paymentImages.goisiinBalance,
      denomination: `Saldo ${formatRupiah(amount)}`,
      userId: userEmail,
      nick: user?.name || 'Member Goisiin',
      paymentId: 'qris',
      paymentCategory: 'QRIS',
      paymentMethod: 'QRIS',
      paymentImage: paymentImages.qris,
      subtotal: amount,
      fee,
      total,
      points: 0,
      createdAt: new Date().toLocaleString('id-ID'),
      expiresAt: Date.now() + 60 * 60 * 1000,
      status: 'pending',
      userEmail,
      transactionType: 'wallet_topup',
      walletCreditAmount: amount,
      qrisPayload: buildDynamicQrisPayload(total),
      retailBarcode: null,
      refundableAmount: 0,
    };

    const list = readStorageList('goisiin_transactions');
    list.unshift(invoiceData);
    writeStorageList('goisiin_transactions', list);
    onNavigate('invoice', invoiceData);
  };

  const handleWithdraw = (event) => {
    event.preventDefault();
    const result = createWithdrawalRequest(userEmail, withdrawForm);
    if (!result.ok) {
      const copy = {
        minimum_withdrawal: `Minimal tarik saldo adalah ${formatRupiah(WALLET_WITHDRAW_MIN)}.`,
        insufficient_balance: 'Saldo Goisiin tidak cukup untuk nominal penarikan ini.',
        destination_required: 'Lengkapi provider, nama penerima, dan nomor rekening/e-wallet.',
      };
      reload(copy[result.reason] || 'Pengajuan tarik saldo gagal diproses.');
      return;
    }
    setWithdrawForm({ amount: 100000, destinationType: 'E-Wallet', provider: 'DANA', accountName: '', accountNumber: '' });
    reload(`Pengajuan tarik saldo dibuat. Admin akan memproses payout ${formatRupiah(result.request.payoutAmount)}.`);
  };

  const withdrawFee = Math.round(Number(withdrawForm.amount || 0) * WALLET_WITHDRAW_FEE_RATE);

  return (
    <div className="main main-surface">
      <div className="container col-md-8 col-12 py-3">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb m-0" style={{ fontSize: '0.82rem' }}>
            <li className="breadcrumb-item">
              <a href="#" onClick={(event) => { event.preventDefault(); onNavigate('home'); }} className="text-success text-decoration-none">Beranda</a>
            </li>
            <li className="breadcrumb-item active text-secondary">Dompet Saya</li>
          </ol>
        </nav>

        <section className="wallet-page-hero">
          <div>
            <span className="stamp-eyebrow">Dompet Goisiin</span>
            <h1>Dompet Saya</h1>
            <p>
              Saldo Goisiin bisa dipakai untuk checkout, refund transaksi gagal yang sudah terdebit,
              top up via QRIS, dan ditarik ke e-wallet/bank.
            </p>
          </div>
          <div className="wallet-balance-card">
            <span>Saldo Goisiin</span>
            <strong>{formatRupiah(walletBalance)}</strong>
            <small>Minimal top up {formatRupiah(WALLET_TOPUP_MIN)} · tarik min {formatRupiah(WALLET_WITHDRAW_MIN)}</small>
          </div>
        </section>

        {notice && (
          <div className={`alert ${notice.toLowerCase().includes('gagal') || notice.toLowerCase().includes('tidak') ? 'alert-warning' : 'alert-success'} py-2 mt-3 mb-0`}>
            {notice}
          </div>
        )}

        <section className="wallet-stats-grid mt-3">
          <article className="wallet-stat-card">
            <span>Poin</span>
            <strong>{points.toLocaleString('id-ID')}</strong>
            <small>Dari transaksi sukses</small>
          </article>
          <article className="wallet-stat-card">
            <span>Pending</span>
            <strong>{pendingTransactions.length}</strong>
            <small>Menunggu pembayaran</small>
          </article>
          <article className="wallet-stat-card">
            <span>Stamp unik</span>
            <strong>{stampSummary.unique}/6</strong>
            <small>{stampSummary.duplicates} duplicate</small>
          </article>
          <article className="wallet-stat-card">
            <span>Fee tarik saldo</span>
            <strong>0,7%</strong>
            <small>Dipakai saat withdrawal</small>
          </article>
        </section>

        <div className="wallet-action-grid mt-3">
          <section className="order-card">
            <span className="stamp-eyebrow">Top Up Saldo</span>
            <h2 className="stamp-section-title">Isi saldo via QRIS</h2>
            <p className="text-secondary">Nominal top up minimal {formatRupiah(WALLET_TOPUP_MIN)} dan maksimal {formatRupiah(WALLET_TOPUP_MAX)}. QRIS dibuat otomatis sesuai total bayar.</p>
            <form className="stamp-form" onSubmit={handleTopup}>
              <input
                type="number"
                min={WALLET_TOPUP_MIN}
                max={WALLET_TOPUP_MAX}
                step="1000"
                value={topupAmount}
                onChange={(event) => setTopupAmount(event.target.value)}
              />
              <div className="wallet-fee-preview">
                <span>Masuk saldo: <strong>{formatRupiah(topupAmount)}</strong></span>
                <span>Total QRIS: <strong>{formatRupiah(Number(topupAmount || 0) + qrisFee(topupAmount))}</strong></span>
              </div>
              <button className="btn btn-success fw-bold" type="submit">Top Up via QRIS</button>
            </form>
          </section>

          <section className="order-card">
            <span className="stamp-eyebrow">Tarik Saldo</span>
            <h2 className="stamp-section-title">Withdraw ke e-wallet / bank</h2>
            <p className="text-secondary">Minimal tarik {formatRupiah(WALLET_WITHDRAW_MIN)}. Biaya layanan 0,7% dipotong dari nominal penarikan.</p>
            <form className="stamp-form" onSubmit={handleWithdraw}>
              <div className="stamp-form__inline">
                <input
                  type="number"
                  min={WALLET_WITHDRAW_MIN}
                  step="1000"
                  value={withdrawForm.amount}
                  onChange={(event) => setWithdrawForm({ ...withdrawForm, amount: Number(event.target.value) })}
                  placeholder="Nominal tarik"
                />
                <select
                  value={withdrawForm.destinationType}
                  onChange={(event) => setWithdrawForm({
                    ...withdrawForm,
                    destinationType: event.target.value,
                    provider: event.target.value === 'Bank' ? 'BCA' : 'DANA',
                  })}
                >
                  <option>E-Wallet</option>
                  <option>Bank</option>
                </select>
              </div>
              <select
                value={withdrawForm.provider}
                onChange={(event) => setWithdrawForm({ ...withdrawForm, provider: event.target.value })}
              >
                {(withdrawForm.destinationType === 'Bank'
                  ? ['BCA', 'BRI', 'Mandiri', 'BNI', 'BSI', 'CIMB', 'PermataBank']
                  : ['DANA', 'GoPay', 'OVO', 'ShopeePay', 'LinkAja']
                ).map((provider) => <option key={provider}>{provider}</option>)}
              </select>
              <input
                value={withdrawForm.accountName}
                onChange={(event) => setWithdrawForm({ ...withdrawForm, accountName: event.target.value })}
                placeholder="Nama penerima"
              />
              <input
                value={withdrawForm.accountNumber}
                onChange={(event) => setWithdrawForm({ ...withdrawForm, accountNumber: event.target.value })}
                placeholder="Nomor e-wallet / rekening"
              />
              <div className="wallet-fee-preview">
                <span>Fee 0,7%: <strong>{formatRupiah(withdrawFee)}</strong></span>
                <span>Diterima: <strong>{formatRupiah(Number(withdrawForm.amount || 0) - withdrawFee)}</strong></span>
              </div>
              <button className="btn btn-outline-success fw-bold" type="submit">Ajukan Tarik Saldo</button>
            </form>
          </section>
        </div>

        <div className="row g-3 mt-1">
          <div className="col-lg-6 col-12">
            <section className="order-card h-100">
              <span className="stamp-eyebrow">Riwayat Saldo</span>
              <h2 className="stamp-section-title">Ledger dompet</h2>
              <div className="wallet-history-list">
                {walletEntries.length === 0 ? (
                  <div className="stamp-empty-state">Belum ada aktivitas saldo.</div>
                ) : walletEntries.map((entry) => (
                  <div className="wallet-history-item" key={entry.id}>
                    <div>
                      <strong>{entry.note}</strong>
                      <p>{entry.kind} · {entry.createdAt}</p>
                    </div>
                    <strong className={entry.delta > 0 ? 'text-success' : 'text-danger'}>
                      {entry.delta > 0 ? '+' : ''}{formatRupiah(entry.delta)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="col-lg-6 col-12">
            <section className="order-card h-100">
              <span className="stamp-eyebrow">Withdrawal</span>
              <h2 className="stamp-section-title">Pengajuan tarik saldo</h2>
              <div className="wallet-history-list">
                {withdrawalRequests.length === 0 ? (
                  <div className="stamp-empty-state">Belum ada pengajuan tarik saldo.</div>
                ) : withdrawalRequests.map((request) => (
                  <div className="wallet-history-item" key={request.id}>
                    <div>
                      <strong>{request.provider} · {request.accountNumber}</strong>
                      <p>{request.accountName} · payout {formatRupiah(request.payoutAmount)}</p>
                    </div>
                    <span className={`stamp-status stamp-status--${request.status}`}>{request.status}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
