import React, { useState } from 'react';
import {
  STAMP_MIN_TRANSACTION,
  STAMP_REQUIRED_UNIQUE,
  stampPosterImage,
  stampRewards,
  stampTypes,
} from '../data/stampRewards';
import {
  cancelStampRedeemCode,
  createRedemption,
  createStampRedeemCode,
  getStampEvents,
  getStampRedeemCodes,
  getStampSummary,
  getUserRedemptions,
  normalizeEmail,
  redeemStampCode,
  submitRedemptionClaim,
} from '../lib/stampService';

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

const statusCopy = {
  pending_prize: {
    label: 'Menunggu hadiah',
    title: 'Admin sedang menentukan hadiah',
    description: 'Set stamp sudah diterima sistem. Admin akan memilih hadiah, lalu tombol reveal/spin akan muncul di halaman ini.',
    step: 2,
  },
  prize_assigned: {
    label: 'Siap reveal',
    title: 'Hadiah sudah dipilih admin',
    description: 'Tekan tombol spin untuk membuka hadiah. Setelah hadiah muncul, lengkapi form klaim sesuai tipe hadiah.',
    step: 3,
  },
  claimed: {
    label: 'Klaim dikirim',
    title: 'Form klaim sudah diterima',
    description: 'Tim Goisiin sedang memproses pengiriman hadiah atau saldo ke data klaim yang kamu isi.',
    step: 4,
  },
  fulfilled: {
    label: 'Selesai',
    title: 'Hadiah sudah selesai diproses',
    description: 'Hadiah sudah dipenuhi. Simpan bukti/kode voucher jika tersedia.',
    step: 4,
  },
  rejected: {
    label: 'Perlu cek admin',
    title: 'Klaim perlu ditinjau ulang',
    description: 'Hubungi admin Goisiin untuk konfirmasi data klaim atau status penukaran.',
    step: 4,
  },
};

const codeStatusCopy = {
  active: 'Aktif',
  redeemed: 'Sudah dipakai',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
};

const eventKindCopy = {
  earned: 'Dapat stamp',
  admin_grant: 'Bonus admin',
  admin_revoke: 'Dicabut',
  code_out: 'Kode dibuat',
  code_in: 'Kode diredeem',
  redeem_consume: 'Ditukar hadiah',
};

function getRedemptionCopy(status) {
  return statusCopy[status] || {
    label: status || 'Status',
    title: 'Status penukaran',
    description: 'Status penukaran sedang diperbarui.',
    step: 1,
  };
}

function getClaimHint(reward) {
  if (!reward) return '';
  if (reward.type === 'physical') return 'Isi nama penerima, nomor HP, dan alamat lengkap untuk pengiriman barang.';
  if (reward.type === 'wallet_balance') return 'Isi provider dan nomor e-wallet aktif agar saldo bisa diproses.';
  if (reward.type === 'voucher_code') return 'Kode voucher akan tampil langsung setelah diaktifkan.';
  return '';
}

export default function StampView({ user, onLoginOpen, onNavigate }) {
  const userEmail = normalizeEmail(user?.email);
  const [, setRefreshKey] = useState(0);
  const [message, setMessage] = useState('');
  const [claimDetails, setClaimDetails] = useState(initialClaim);
  const [spinState, setSpinState] = useState({ spinning: false, prizeId: null, redemptionId: null });
  const [redeemInput, setRedeemInput] = useState('');

  const stampState = userEmail ? getStampSummary(userEmail) : null;
  const events = userEmail ? getStampEvents().filter((event) => normalizeEmail(event.userEmail) === userEmail).slice(0, 12) : [];
  const redemptions = userEmail ? getUserRedemptions(userEmail) : [];
  const stampCodes = userEmail
    ? getStampRedeemCodes().filter((code) => [normalizeEmail(code.ownerEmail), normalizeEmail(code.redeemedBy)].includes(userEmail)).slice(0, 20)
    : [];

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
                Login dulu untuk melihat progress stamp, membuat kode redeem, dan klaim hadiah.
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

  const handleCreateStampCode = (stampNo) => {
    const available = stampState.available[stampNo] || 0;
    if (available <= 0) {
      reload('Stamp ini belum tersedia untuk dibuat kode redeem.');
      return;
    }
    const result = createStampRedeemCode(userEmail, stampNo);
    reload(result.ok
      ? `Kode redeem ${result.code.code} berhasil dibuat. Bagikan kode ini ke user lain.`
      : 'Gagal membuat kode redeem. Cek stok stamp tersedia.');
  };

  const handleRedeemCode = (event) => {
    event.preventDefault();
    const result = redeemStampCode(redeemInput, userEmail);
    if (!result.ok) {
      const copy = {
        invalid_code: 'Kode redeem tidak valid atau sudah dipakai.',
        self_redeem_blocked: 'Kode buatan akun sendiri tidak bisa diredeem sendiri.',
        expired: 'Kode redeem sudah kedaluwarsa.',
      };
      reload(copy[result.reason] || 'Kode redeem gagal diproses.');
      return;
    }
    setRedeemInput('');
    reload(`Berhasil redeem Stamp ${result.code.stampNo}.`);
  };

  const handleCancelCode = (codeId) => {
    const result = cancelStampRedeemCode(codeId, userEmail);
    reload(result.ok ? 'Kode redeem dibatalkan dan stamp dikembalikan.' : 'Kode redeem tidak bisa dibatalkan.');
  };

  const handleRedeemSet = () => {
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
              Stamp duplicate bisa dibagikan dengan mengubahnya menjadi kode redeem.
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
                <strong>{stampCodes.filter((code) => code.status === 'active' && normalizeEmail(code.ownerEmail) === userEmail).length}</strong>
                <span>Kode aktif</span>
              </div>
            </div>
          </div>
          <div className="stamp-hero__poster">
            <img src={stampPosterImage} alt="Promo Stamp Berhadiah Goisiin" />
          </div>
        </section>

        {message && (
          <div className={`alert ${message.toLowerCase().includes('gagal') || message.toLowerCase().includes('tidak') ? 'alert-warning' : 'alert-success'} py-2 mt-3 mb-0`}>
            {message}
          </div>
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
            <button className="btn btn-success fw-bold" disabled={!stampState.complete || !!pendingPrize} onClick={handleRedeemSet}>
              {pendingPrize ? 'Menunggu Hadiah' : 'Tukar 6 Stamp'}
            </button>
          </div>
          <div className="stamp-grid">
            {stampTypes.map((stamp) => {
              const count = stampState.counts[stamp.id] || 0;
              const available = stampState.available[stamp.id] || 0;
              return (
                <button
                  type="button"
                  className={`stamp-slot stamp-slot--button ${count > 0 ? 'stamp-slot--owned' : 'stamp-slot--empty'}`}
                  key={stamp.id}
                  onClick={() => handleCreateStampCode(stamp.id)}
                  disabled={available <= 0}
                  title={available > 0 ? `Buat kode redeem ${stamp.name}` : `${stamp.name} belum tersedia`}
                >
                  <img src={stamp.image} alt={stamp.name} />
                  <div className="stamp-slot__meta">
                    <span>{stamp.name}</span>
                    <strong>{count} pcs</strong>
                  </div>
                  {available > 0 && <small className="stamp-slot__lock">Klik buat kode</small>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="stamp-share-panel mt-3">
          <article className="order-card h-100">
            <span className="stamp-eyebrow">Bagikan Stamp</span>
            <h2 className="stamp-section-title">Kirim stamp lewat kode</h2>
            <p className="text-secondary mb-2">
              Klik stamp yang kamu punya untuk membuat kode redeem. Stamp akan keluar dari akun kamu
              saat kode dibuat, lalu masuk ke akun user yang menukarkan kode tersebut.
            </p>
            <ul className="stamp-info-list">
              <li>Kode hanya bisa dipakai 1 kali.</li>
              <li>Kode aktif atau kedaluwarsa bisa dibatalkan kalau belum diredeem.</li>
              <li>Kode buatan akun sendiri tidak bisa diredeem sendiri.</li>
            </ul>
          </article>

          <article className="order-card h-100">
            <span className="stamp-eyebrow">Redeem Kode</span>
            <h2 className="stamp-section-title">Masukkan kode stamp</h2>
            <form className="stamp-form" onSubmit={handleRedeemCode}>
              <input
                value={redeemInput}
                onChange={(event) => setRedeemInput(event.target.value.toUpperCase())}
                placeholder="Contoh: GSI-S1-ABCDE-23456"
                required
              />
              <button className="btn btn-success fw-bold" type="submit">Redeem Stamp</button>
            </form>
          </article>
        </section>

        <section className="order-card mt-3">
          <span className="stamp-eyebrow">Kode Stamp</span>
          <h2 className="stamp-section-title">Kode redeem saya</h2>
          <div className="stamp-code-list">
            {stampCodes.length === 0 ? (
              <p className="text-secondary mb-0">Belum ada kode redeem.</p>
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
                <div className="stamp-list__actions">
                  <span className={`stamp-status stamp-status--${code.status}`}>{codeStatusCopy[code.status] || code.status}</span>
                  {['active', 'expired'].includes(code.status) && normalizeEmail(code.ownerEmail) === userEmail && (
                    <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleCancelCode(code.id)}>
                      Batalkan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="order-card mt-3">
          <span className="stamp-eyebrow">Hadiah</span>
          <h2 className="stamp-section-title">Daftar hadiah promo</h2>
          <div className="reward-grid">
            {stampRewards.map((reward) => (
              <article className={`reward-card ${reward.tier === 'Hadiah Utama' ? 'reward-card--main' : ''}`} key={reward.id}>
                <div className="reward-card__media">
                  <img src={reward.image} alt={reward.name} />
                </div>
                <div>
                  <span>{reward.tier}</span>
                  <h3>{reward.name}</h3>
                  <p>{reward.description}</p>
                  <small>Stok saat ini: {reward.stock}</small>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="row g-3 mt-1">
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
                    <span className="stamp-status">{eventKindCopy[event.kind] || event.kind}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="col-lg-6 col-12">
            <section className="order-card h-100 stamp-flow-card">
              <span className="stamp-eyebrow">Alur Penukaran</span>
              <h2 className="stamp-section-title">Cara klaim hadiah</h2>
              <ol className="stamp-flow-list">
                <li><strong>Lengkapi 6 stamp unik</strong><span>Stamp 1 sampai 6 harus lengkap.</span></li>
                <li><strong>Tukar 1 set stamp</strong><span>Stamp dipakai dan masuk antrean admin.</span></li>
                <li><strong>Reveal hadiah</strong><span>Hadiah dipilih admin, lalu kamu spin untuk membuka hasil.</span></li>
                <li><strong>Isi klaim</strong><span>Alamat untuk barang, nomor e-wallet untuk saldo, atau kode voucher langsung aktif.</span></li>
              </ol>
            </section>
          </div>
        </div>

        <section className="order-card mt-3">
          <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap mb-3">
            <div>
              <span className="stamp-eyebrow">Penukaran</span>
              <h2 className="stamp-section-title mb-1">Hadiah saya</h2>
              <p className="text-secondary mb-0">Pantau status penukaran, reveal hadiah, dan isi data klaim di sini.</p>
            </div>
          </div>
          {redemptions.length === 0 ? (
            <div className="stamp-empty-state">Belum ada penukaran. Lengkapi 6 stamp unik dulu.</div>
          ) : (
            <div className="stamp-redemption-list">
              {redemptions.map((redemption) => {
                const reward = stampRewards.find((item) => item.id === redemption.prizeId);
                const isVisibleResult = spinState.prizeId === redemption.prizeId && spinState.redemptionId === redemption.id;
                const copy = getRedemptionCopy(redemption.status);
                return (
                  <article className="stamp-redemption-card" key={redemption.id}>
                    <div className="stamp-redemption-card__summary">
                      <span className={`stamp-status stamp-status--${redemption.status}`}>{copy.label}</span>
                      <h3>{copy.title}</h3>
                      <p className="text-secondary mb-2">
                        ID Penukaran: #{redemption.id.slice(-6).toUpperCase()}<br />
                        Dibuat: {redemption.createdAt || '-'}<br />
                        {redemption.assignedAt && <>Hadiah dipilih: {redemption.assignedAt}<br /></>}
                        {redemption.claimedAt && <>Klaim masuk: {redemption.claimedAt}<br /></>}
                        {redemption.updatedAt && <>Update terakhir: {redemption.updatedAt}</>}
                      </p>
                      <div className="stamp-progress-steps" aria-label={`Tahap ${copy.step} dari 4`}>
                        {[1, 2, 3, 4].map((step) => (
                          <span className={step <= copy.step ? 'is-active' : ''} key={step}>{step}</span>
                        ))}
                      </div>
                    </div>

                    {redemption.status === 'pending_prize' && (
                      <div className="stamp-empty-state stamp-empty-state--action">
                        <strong>{copy.description}</strong>
                        <span>Biasanya status berubah setelah admin mengecek antrean penukaran.</span>
                      </div>
                    )}

                    {reward && (
                      <div className="stamp-reveal-box">
                        {redemption.status === 'prize_assigned' && (
                          <>
                            <div className={`stamp-spinner ${spinState.spinning && spinState.redemptionId === redemption.id ? 'stamp-spinner--active' : ''}`}>
                              {stampRewards.map((item) => <span key={item.id}>{item.name}</span>)}
                            </div>
                            {!isVisibleResult && (
                              <button className="btn btn-success fw-bold" onClick={() => handleSpinReveal(redemption)}>
                                Mulai Spin Hadiah
                              </button>
                            )}
                          </>
                        )}
                        {(isVisibleResult || redemption.status === 'claimed' || redemption.status === 'fulfilled') && (
                          <div className="stamp-result">
                            <div className="reward-card__media">
                              <img src={reward.image} alt={reward.name} />
                            </div>
                            <div>
                              <span>{reward.tier}</span>
                              <h3>{reward.name}</h3>
                              <p>{getClaimHint(reward)}</p>
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
                        <p className="stamp-claim-hint">{getClaimHint(reward)}</p>
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
