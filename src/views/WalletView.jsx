import React from 'react';
import { getStampSummary, normalizeEmail } from '../lib/stampService';
import { readStorageList } from '../lib/storage';

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(Number(num || 0));

export default function WalletView({ user, onNavigate }) {
  const userEmail = normalizeEmail(user?.email);
  const transactions = readStorageList('goisiin_transactions').filter((tx) => normalizeEmail(tx.userEmail) === userEmail);
  const successTransactions = transactions.filter((tx) => String(tx.status).toLowerCase() === 'success');
  const pendingTransactions = transactions.filter((tx) => String(tx.status).toLowerCase() === 'pending');
  const points = successTransactions.reduce((sum, tx) => sum + Number(tx.points || 0), 0);
  const totalSuccess = successTransactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0);
  const stampSummary = getStampSummary(userEmail);

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
            <p>Ringkasan poin, transaksi, dan stamp akun kamu.</p>
          </div>
          <div className="wallet-balance-card">
            <span>G-Coin</span>
            <strong>0</strong>
            <small>Saldo promo internal Goisiin</small>
          </div>
        </section>

        <section className="wallet-stats-grid mt-3">
          <article className="wallet-stat-card">
            <span>Poin</span>
            <strong>{points.toLocaleString('id-ID')}</strong>
            <small>Dari transaksi sukses</small>
          </article>
          <article className="wallet-stat-card">
            <span>Total belanja sukses</span>
            <strong>{formatRupiah(totalSuccess)}</strong>
            <small>{successTransactions.length} transaksi sukses</small>
          </article>
          <article className="wallet-stat-card">
            <span>Stamp unik</span>
            <strong>{stampSummary.unique}/6</strong>
            <small>{stampSummary.duplicates} duplicate</small>
          </article>
          <article className="wallet-stat-card">
            <span>Pending</span>
            <strong>{pendingTransactions.length}</strong>
            <small>Menunggu pembayaran</small>
          </article>
        </section>

        <section className="order-card mt-3">
          <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
            <div>
              <span className="stamp-eyebrow">Riwayat Dompet</span>
              <h2 className="stamp-section-title">Aktivitas transaksi</h2>
            </div>
            <button className="btn btn-outline-success btn-sm fw-bold" onClick={() => onNavigate('transactions')}>Lihat Transaksi</button>
          </div>
          <div className="wallet-history-list mt-3">
            {transactions.length === 0 ? (
              <div className="stamp-empty-state">Belum ada aktivitas transaksi.</div>
            ) : transactions.slice(0, 8).map((tx) => (
              <div className="wallet-history-item" key={tx.invoiceId || tx.id}>
                <div>
                  <strong>{tx.productName || 'Transaksi Goisiin'}</strong>
                  <p>{tx.invoiceId || '-'} · {tx.createdAt || tx.date || '-'}</p>
                </div>
                <div className="text-end">
                  <strong>{formatRupiah(tx.total)}</strong>
                  <span className={`stamp-status stamp-status--${tx.status}`}>{tx.status || 'pending'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
