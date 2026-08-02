import React, { useState } from 'react';
import {
  STAMP_MIN_TRANSACTION,
  STAMP_REQUIRED_UNIQUE,
  stampPosterImage,
  stampRewards,
  stampTypes,
} from '../data/stampRewards';
import {
  acceptTradeOffer,
  createRedemption,
  createTradeOffer,
  getStampEvents,
  getStampSummary,
  getStampTrades,
  getUserRedemptions,
  giftStamp,
  normalizeEmail,
  rejectTradeOffer,
  submitRedemptionClaim,
} from '../lib/stampService';
import { readStorageList } from '../lib/storage';

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
}).format(num);

const initialClaim = {
  fullName: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  walletProvider: 'DANA',
  walletNumber: '',
};

export default function StampView({ user, onLoginOpen, onNavigate }) {
  const userEmail = normalizeEmail(user?.email);
  const [, setRefreshKey] = useState(0);
  const [message, setMessage] = useState('');
  const [giftForm, setGiftForm] = useState({ stampNo: 1, toEmail: '' });
  const [tradeForm, setTradeForm] = useState({ offeredStamp: 1, requestedStamp: 2, toEmail: '' });
  const [claimDetails, setClaimDetails] = useState(initialClaim);
  const [spinState, setSpinState] = useState({ spinning: false, prizeId: null, redemptionId: null });

  const stampState = userEmail ? getStampSummary(userEmail) : null;
  const events = userEmail ? getStampEvents().filter((event) => normalizeEmail(event.userEmail) === userEmail).slice(0, 12) : [];
  const trades = userEmail
    ? getStampTrades().filter((trade) => [normalizeEmail(trade.fromEmail), normalizeEmail(trade.toEmail)].includes(userEmail)).slice(0, 20)
    : [];
  const redemptions = userEmail ? getUserRedemptions(userEmail) : [];
  const knownUsers = readStorageList('goisiin_users').filter((item) => normalizeEmail(item.email) !== userEmail);

  const reload = (nextMessage = '') => {
    setMessage(nextMessage);
    setRefreshKey((key) => key + 1);
  };

  if (!user) {
    return (
      <div className="main main-surface">
        <div className="container col-md-8 col-12 py-5">
          <section className="stamp-guest-card">
            <div>
              <span className="stamp-eyebrow">Promo Stamp Berhadiah</span>
              <h1>Kumpulkan 6 stamp unik dan tukarkan hadiah Goisiin.</h1>
              <p>
                Login dulu untuk melihat progress stamp, barter dengan user lain, dan klaim hadiah.
              </p>
              <button className="btn btn-success fw-bold" onClick={onLoginOpen}>
                Login untuk mulai
              </button>
            </div>
            <img src={stampPosterImage} alt="Promo Stamp Berhadiah Goisiin" />
          </section>
        </div>
      </div>
    );
  }

  const pendingPrize = redemptions.find((item) => item.status === 'pending_prize');

  const handleGift = (event) => {
    event.preventDefault();
    const result = giftStamp(userEmail, giftForm.toEmail, giftForm.stampNo);
    if (!result.ok) {
      reload('Gift gagal. Pastikan stamp tersedia dan email tujuan benar.');
      return;
    }
    setGiftForm({ stampNo: 1, toEmail: '' });
    reload('Stamp berhasil dikirim.');
  };

  const handleCreateTrade = (event) => {
    event.preventDefault();
    const result = createTradeOffer(userEmail, tradeForm.toEmail, tradeForm.offeredStamp, tradeForm.requestedStamp);
    if (!result.ok) {
      reload('Barter gagal dibuat. Cek stamp tersedia dan email tujuan.');
      return;
    }
    setTradeForm({ offeredStamp: 1, requestedStamp: 2, toEmail: '' });
    reload('Penawaran barter berhasil dibuat.');
  };

  const handleRedeem = () => {
    const result = createRedemption(userEmail);
    if (!result.ok) {
      reload('Stamp belum lengkap atau belum bisa ditukar.');
      return;
    }
    reload('6 stamp berhasil ditukar. Tunggu admin menentukan hadiah, lalu buka reveal/spin.');
  };

  const handleSpinReveal = (redemption) => {
    if (!redemption?.prizeId || spinState.spinning) return;
    setSpinState({ spinning: true, prizeId: null, redemptionId: redemption.id });
    setTimeout(() => {
      setSpinState({ spinning: false, prizeId: redemption.prizeId, redemptionId: redemption.id });
    }, 2400);
  };

  const handleClaimSubmit = (event, redemption) => {
    event.preventDefault();
    const result = submitRedemptionClaim(redemption.id, claimDetails);
    if (!result.ok) {
      reload('Form klaim belum lengkap. Cek alamat atau nomor e-wallet.');
      return;
    }
    setClaimDetails(initialClaim);
    reload(redemption.prizeType === 'voucher_code' ? 'Kode voucher sudah aktif.' : 'Klaim berhasil dikirim ke admin.');
  };

  return (
    <div className="main main-surface">
      <div className="container col-md-8 col-12 py-3">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb m-0" style={{ fontSize: '0.82rem' }}>
            <li className="breadcrumb-item">
              <a href="#" onClick={(event) => { event.preventDefault(); onNavigate('home'); }} className="text-success text-decoration-none">Beranda</a>
            </li>
            <li className="breadcrumb-item active text-secondary">Stamp Saya</li>
          </ol>
        </nav>

        <section className="stamp-hero">
          <div className="stamp-hero__copy">
            <span className="stamp-eyebrow">Promo Stamp Berhadiah</span>
            <h1>Kumpulkan 6 stamp unik.</h1>
            <p>
              Dapatkan 1 stamp acak setiap transaksi sukses minimal {formatRupiah(STAMP_MIN_TRANSACTION)}.
              Duplicate bisa dikirim atau dibarter dengan user lain.
            </p>
            <div className="stamp-hero__stats">
              <div>
                <strong>{stampState.unique}/{STAMP_REQUIRED_UNIQUE}</strong>
                <span>Stamp unik</span>
              </div>
              <div>
                <strong>{stampState.duplicates}</strong>
                <span>Duplicate</span>
              </div>
              <div>
                <strong>{trades.filter((trade) => trade.status === 'pending').length}</strong>
                <span>Barter aktif</span>
              </div>
            </div>
          </div>
          <div className="stamp-hero__poster">
            <img src={stampPosterImage} alt="Promo Stamp Berhadiah Goisiin" />
          </div>
        </section>

        {message && (
          <div className="alert alert-success py-2 mt-3 mb-0">{message}</div>
        )}

        <section className="stamp-board order-card mt-3">
          <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-3">
            <div>
              <span className="stamp-eyebrow">Kartu Stamp</span>
              <h2 className="stamp-section-title mb-1">Progress koleksi kamu</h2>
              <p className="text-secondary mb-0">
                {stampState.complete
                  ? 'Stamp lengkap. Kamu sudah bisa menukar 1 set hadiah.'
                  : `Kurang stamp ${stampState.missing.join(', ') || '-'} untuk lengkap.`}
              </p>
            </div>
            <button className="btn btn-success fw-bold" disabled={!stampState.complete || !!pendingPrize} onClick={handleRedeem}>
              {pendingPrize ? 'Menunggu Hadiah' : 'Tukar 6 Stamp'}
            </button>
          </div>
          <div className="stamp-grid">
            {stampTypes.map((stamp) => {
              const count = stampState.counts[stamp.id] || 0;
              const locked = stampState.locks[stamp.id] || 0;
              return (
                <div className={`stamp-slot ${count > 0 ? 'stamp-slot--owned' : 'stamp-slot--empty'}`} key={stamp.id}>
                  <img src={stamp.image} alt={stamp.name} />
                  <div className="stamp-slot__meta">
                    <span>{stamp.name}</span>
                    <strong>{count} pcs</strong>
                  </div>
                  {locked > 0 && <small className="stamp-slot__lock">{locked} dikunci barter</small>}
                </div>
              );
            })}
          </div>
        </section>

        <div className="row g-3 mt-1">
          <div className="col-lg-6 col-12">
            <section className="order-card h-100">
              <span className="stamp-eyebrow">Gift Stamp</span>
              <h2 className="stamp-section-title">Kirim stamp ke user lain</h2>
              <form className="stamp-form" onSubmit={handleGift}>
                <select value={giftForm.stampNo} onChange={(event) => setGiftForm({ ...giftForm, stampNo: Number(event.target.value) })}>
                  {stampTypes.map((stamp) => (
                    <option value={stamp.id} key={stamp.id}>{stamp.name} tersedia {stampState.available[stamp.id] || 0}</option>
                  ))}
                </select>
                <input
                  type="email"
                  value={giftForm.toEmail}
                  onChange={(event) => setGiftForm({ ...giftForm, toEmail: event.target.value })}
                  placeholder="Email user tujuan"
                  list="goisiin-known-users"
                  required
                />
                <button className="btn btn-outline-success fw-bold" type="submit">Kirim Stamp</button>
              </form>
            </section>
          </div>

          <div className="col-lg-6 col-12">
            <section className="order-card h-100">
              <span className="stamp-eyebrow">Barter Stamp</span>
              <h2 className="stamp-section-title">Tukar duplicate dengan user lain</h2>
              <form className="stamp-form" onSubmit={handleCreateTrade}>
                <input
                  type="email"
                  value={tradeForm.toEmail}
                  onChange={(event) => setTradeForm({ ...tradeForm, toEmail: event.target.value })}
                  placeholder="Email user tujuan"
                  list="goisiin-known-users"
                  required
                />
                <div className="stamp-form__inline">
                  <select value={tradeForm.offeredStamp} onChange={(event) => setTradeForm({ ...tradeForm, offeredStamp: Number(event.target.value) })}>
                    {stampTypes.map((stamp) => (
                      <option value={stamp.id} key={stamp.id}>Kasih {stamp.name}</option>
                    ))}
                  </select>
                  <select value={tradeForm.requestedStamp} onChange={(event) => setTradeForm({ ...tradeForm, requestedStamp: Number(event.target.value) })}>
                    {stampTypes.map((stamp) => (
                      <option value={stamp.id} key={stamp.id}>Minta {stamp.name}</option>
                    ))}
                  </select>
                </div>
                <button className="btn btn-outline-success fw-bold" type="submit">Buat Barter</button>
              </form>
            </section>
          </div>
        </div>

        <datalist id="goisiin-known-users">
          {knownUsers.map((item) => <option value={item.email} key={item.email}>{item.name}</option>)}
        </datalist>

        <section className="order-card mt-3">
          <span className="stamp-eyebrow">Hadiah</span>
          <h2 className="stamp-section-title">Daftar hadiah promo</h2>
          <div className="reward-grid">
            {stampRewards.map((reward) => (
              <article className={`reward-card ${reward.tier === 'Hadiah Utama' ? 'reward-card--main' : ''}`} key={reward.id}>
                <img src={reward.image} alt={reward.name} />
                <div>
                  <span>{reward.tier}</span>
                  <h3>{reward.name}</h3>
                  <p>{reward.description}</p>
                  <small>Stok awal: {reward.stock}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="row g-3 mt-1">
          <div className="col-lg-6 col-12">
            <section className="order-card h-100">
              <span className="stamp-eyebrow">Barter Aktif</span>
              <h2 className="stamp-section-title">Offer masuk & keluar</h2>
              <div className="stamp-list">
                {trades.length === 0 ? (
                  <p className="text-secondary mb-0">Belum ada barter.</p>
                ) : trades.map((trade) => (
                  <div className="stamp-list__item" key={trade.id}>
                    <div>
                      <strong>{trade.fromEmail === userEmail ? 'Kamu menawarkan' : 'Offer masuk'}</strong>
                      <p>
                        Stamp {trade.offeredStamp} ↔ Stamp {trade.requestedStamp}<br />
                        <span>{trade.fromEmail} ke {trade.toEmail}</span>
                      </p>
                    </div>
                    <div className="stamp-list__actions">
                      <span className={`stamp-status stamp-status--${trade.status}`}>{trade.status}</span>
                      {trade.status === 'pending' && trade.toEmail === userEmail && (
                        <button className="btn btn-success btn-sm" onClick={() => { const result = acceptTradeOffer(trade.id, userEmail); reload(result.ok ? 'Barter diterima.' : 'Barter gagal. Stamp tidak tersedia.'); }}>
                          Terima
                        </button>
                      )}
                      {trade.status === 'pending' && (
                        <button className="btn btn-outline-danger btn-sm" onClick={() => { rejectTradeOffer(trade.id, userEmail); reload('Barter ditutup.'); }}>
                          {trade.fromEmail === userEmail ? 'Batal' : 'Tolak'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="col-lg-6 col-12">
            <section className="order-card h-100">
              <span className="stamp-eyebrow">Riwayat</span>
              <h2 className="stamp-section-title">Aktivitas stamp</h2>
              <div className="stamp-list">
                {events.length === 0 ? (
                  <p className="text-secondary mb-0">Belum ada aktivitas stamp.</p>
                ) : events.map((event) => (
                  <div className="stamp-list__item stamp-list__item--compact" key={event.id}>
                    <div>
                      <strong>{event.delta > 0 ? '+' : ''}{event.delta} Stamp {event.stampNo}</strong>
                      <p>{event.note || event.kind}<br /><span>{event.createdAt}</span></p>
                    </div>
                    <span className="stamp-status">{event.kind}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section className="order-card mt-3">
          <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
            <div>
              <span className="stamp-eyebrow">Penukaran</span>
              <h2 className="stamp-section-title">Reveal hadiah</h2>
              <p className="text-secondary mb-0">Setelah admin menentukan hadiah, spin akan berhenti di hadiah yang sudah dipilih.</p>
            </div>
          </div>

          {redemptions.length === 0 ? (
            <div className="stamp-empty-state mt-3">Belum ada penukaran. Lengkapi 6 stamp unik dulu.</div>
          ) : (
            <div className="stamp-redemption-list mt-3">
              {redemptions.map((redemption) => {
                const reward = stampRewards.find((item) => item.id === redemption.prizeId);
                const isVisibleResult = spinState.prizeId === redemption.prizeId && spinState.redemptionId === redemption.id;
                return (
                  <article className="stamp-redemption-card" key={redemption.id}>
                    <div>
                      <span className={`stamp-status stamp-status--${redemption.status}`}>{redemption.status}</span>
                      <h3>Penukaran #{redemption.id.slice(-8).toUpperCase()}</h3>
                      <p className="text-secondary">Dibuat: {redemption.createdAt}</p>
                    </div>

                    {redemption.status === 'pending_prize' && (
                      <div className="stamp-empty-state">Menunggu admin menentukan hadiah.</div>
                    )}

                    {reward && (
                      <div className="stamp-reveal-box">
                        <div className={`stamp-spinner ${spinState.spinning && spinState.redemptionId === redemption.id ? 'stamp-spinner--active' : ''}`}>
                          {stampRewards.slice(0, 6).map((item) => <span key={item.id}>{item.name}</span>)}
                        </div>
                        {!isVisibleResult && redemption.status === 'prize_assigned' && (
                          <button className="btn btn-success fw-bold" onClick={() => handleSpinReveal(redemption)}>
                            Mulai Spin Hadiah
                          </button>
                        )}
                        {(isVisibleResult || redemption.status === 'claimed' || redemption.status === 'fulfilled') && (
                          <div className="stamp-result">
                            <img src={reward.image} alt={reward.name} />
                            <div>
                              <span>{reward.tier}</span>
                              <h3>{reward.name}</h3>
                              {redemption.voucherCode && (
                                <code>{redemption.voucherCode}</code>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {reward && ['prize_assigned'].includes(redemption.status) && (isVisibleResult || reward.type === 'voucher_code') && (
                      <form className="stamp-claim-form" onSubmit={(event) => handleClaimSubmit(event, redemption)}>
                        {reward.type === 'physical' && (
                          <>
                            <input placeholder="Nama penerima" value={claimDetails.fullName} onChange={(event) => setClaimDetails({ ...claimDetails, fullName: event.target.value })} />
                            <input placeholder="Nomor HP" value={claimDetails.phone} onChange={(event) => setClaimDetails({ ...claimDetails, phone: event.target.value })} />
                            <textarea placeholder="Alamat lengkap" value={claimDetails.address} onChange={(event) => setClaimDetails({ ...claimDetails, address: event.target.value })} />
                            <div className="stamp-form__inline">
                              <input placeholder="Kota" value={claimDetails.city} onChange={(event) => setClaimDetails({ ...claimDetails, city: event.target.value })} />
                              <input placeholder="Provinsi" value={claimDetails.province} onChange={(event) => setClaimDetails({ ...claimDetails, province: event.target.value })} />
                              <input placeholder="Kode pos" value={claimDetails.postalCode} onChange={(event) => setClaimDetails({ ...claimDetails, postalCode: event.target.value })} />
                            </div>
                          </>
                        )}
                        {reward.type === 'wallet_balance' && (
                          <div className="stamp-form__inline">
                            <select value={claimDetails.walletProvider} onChange={(event) => setClaimDetails({ ...claimDetails, walletProvider: event.target.value })}>
                              <option>DANA</option>
                              <option>OVO</option>
                              <option>GoPay</option>
                              <option>ShopeePay</option>
                              <option>LinkAja</option>
                            </select>
                            <input placeholder="Nomor e-wallet" value={claimDetails.walletNumber} onChange={(event) => setClaimDetails({ ...claimDetails, walletNumber: event.target.value })} />
                          </div>
                        )}
                        <button className="btn btn-success fw-bold" type="submit">
                          {reward.type === 'voucher_code' ? 'Aktifkan Kode Voucher' : 'Kirim Form Klaim'}
                        </button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
