import React from 'react';
import { stampRewards } from '../data/stampRewards';
import { getStampRedeemCodes, getUserRedemptions, normalizeEmail } from '../lib/stampService';

export default function VouchersView({ user, onNavigate }) {
  const userEmail = normalizeEmail(user?.email);
  const redemptions = getUserRedemptions(userEmail);
  const stampCodes = getStampRedeemCodes()
    .filter((code) => [normalizeEmail(code.ownerEmail), normalizeEmail(code.redeemedBy)].includes(userEmail))
    .slice(0, 30);

  return (
    <div className="main main-surface">
      <div className="container col-md-8 col-12 py-3">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb m-0" style={{ fontSize: '0.82rem' }}>
            <li className="breadcrumb-item">
              <a href="#" onClick={(event) => { event.preventDefault(); onNavigate('home'); }} className="text-success text-decoration-none">Beranda</a>
            </li>
            <li className="breadcrumb-item active text-secondary">Voucher Saya</li>
          </ol>
        </nav>

        <section className="wallet-page-hero">
          <div>
            <span className="stamp-eyebrow">Voucher & Kode</span>
            <h1>Voucher Saya</h1>
            <p>Kumpulan voucher hadiah dan kode redeem stamp milik akun kamu.</p>
          </div>
          <button className="btn btn-success fw-bold" onClick={() => onNavigate('stamp')}>Buka Stamp</button>
        </section>

        <section className="order-card mt-3">
          <span className="stamp-eyebrow">Hadiah Stamp</span>
          <h2 className="stamp-section-title">Voucher hadiah</h2>
          <div className="voucher-card-grid">
            {redemptions.length === 0 ? (
              <div className="stamp-empty-state">Belum ada voucher hadiah. Tukarkan 6 stamp unik dulu.</div>
            ) : redemptions.map((redemption) => {
              const reward = stampRewards.find((item) => item.id === redemption.prizeId);
              return (
                <article className="voucher-card" key={redemption.id}>
                  {reward?.image && <img src={reward.image} alt={reward.name} />}
                  <div>
                    <span className={`stamp-status stamp-status--${redemption.status}`}>{redemption.status}</span>
                    <h3>{redemption.prizeName || reward?.name || 'Menunggu hadiah'}</h3>
                    <p>Penukaran #{redemption.id.slice(-8).toUpperCase()}</p>
                    {redemption.voucherCode && <code>{redemption.voucherCode}</code>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="order-card mt-3">
          <span className="stamp-eyebrow">Kode Redeem Stamp</span>
          <h2 className="stamp-section-title">Kode stamp</h2>
          <div className="stamp-code-list">
            {stampCodes.length === 0 ? (
              <p className="text-secondary mb-0">Belum ada kode redeem stamp.</p>
            ) : stampCodes.map((code) => (
              <div className="stamp-code-item" key={code.id}>
                <div>
                  <strong>{code.code}</strong>
                  <p>
                    Stamp {code.stampNo} · {normalizeEmail(code.ownerEmail) === userEmail ? 'Dibuat oleh kamu' : `Diterima dari ${code.ownerEmail}`}
                    <br />
                    <span>{code.status === 'redeemed' ? `Dipakai oleh ${code.redeemedBy}` : `Dibuat ${code.createdAt}`}</span>
                  </p>
                </div>
                <span className={`stamp-status stamp-status--${code.status}`}>{code.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
