import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { readStorageList, writeStorageList } from '../lib/storage';
import { awardStampForTransaction } from '../lib/stampService';
import { buildDynamicQrisPayload } from '../lib/qris';
import { settleWalletEffectsForTransaction } from '../lib/walletService';

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

export default function InvoiceView({ invoiceData, onNavigate }) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.floor(((invoiceData?.expiresAt || Date.now() + 60 * 60 * 1000) - Date.now()) / 1000)));
  const [paymentStatus, setPaymentStatus] = useState('pending'); // 'pending' | 'checking' | 'success' | 'failed'
  const [qrisDataUrl, setQrisDataUrl] = useState('');

  // Sync status on mount/update
  useEffect(() => {
    if (invoiceData?.invoiceId) {
      const list = readStorageList('goisiin_transactions');
      if (list.length > 0) {
        const found = list.find(t => t.invoiceId === invoiceData.invoiceId);
        if (found) {
          setPaymentStatus(found.status);
          if (found.status === 'success') awardStampForTransaction(found, 'invoice-check');
          settleWalletEffectsForTransaction(found, 'invoice-check');
        }
      }
    }
  }, [invoiceData]);

  useEffect(() => {
    let alive = true;
    if (invoiceData?.paymentId === 'qris') {
      const payload = invoiceData.qrisPayload || buildDynamicQrisPayload(invoiceData.total);
      QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 340,
        color: { dark: '#000000', light: '#ffffff' },
      }).then((url) => {
        if (alive) setQrisDataUrl(url);
      }).catch(() => {
        if (alive) setQrisDataUrl('/gassets/payment/qris-cropped.png');
      });
    }
    return () => { alive = false; };
  }, [invoiceData]);

  // Countdown timer logic
  useEffect(() => {
    if (paymentStatus !== 'pending') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, Math.floor(((invoiceData?.expiresAt || Date.now() + 60 * 60 * 1000) - Date.now()) / 1000));
        if (next <= 0 || prev <= 1) {
          clearInterval(timer);
          setPaymentStatus('failed');

          // Update status in localStorage
          const list = readStorageList('goisiin_transactions');
          if (list.length > 0) {
            const updated = list.map(t => {
              if (t.invoiceId === invoiceData?.invoiceId) {
                const failedTx = { ...t, status: 'failed' };
                settleWalletEffectsForTransaction(failedTx, 'invoice-timeout');
                return failedTx;
              }
              return t;
            });
            writeStorageList('goisiin_transactions', updated);
          }
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentStatus, invoiceData]);

  if (!invoiceData) {
    return (
      <div className="container col-md-8 col-12 py-5 text-center">
        <h3 className="text-success">Invoice tidak ditemukan</h3>
        <button className="btn btn-success mt-3" onClick={() => onNavigate('home', null)}>Kembali ke Beranda</button>
      </div>
    );
  }

  const formatCountdown = () => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const handleCheckStatus = () => {
    setPaymentStatus('checking');
    setTimeout(() => {
      const list = readStorageList('goisiin_transactions');
      const found = list.find(t => t.invoiceId === invoiceData.invoiceId);
      const nextStatus = ['success', 'failed'].includes(found?.status) ? found.status : 'pending';
      setPaymentStatus(nextStatus);
      if (nextStatus === 'success') awardStampForTransaction(found, 'invoice-check');
      if (found) settleWalletEffectsForTransaction(found, 'invoice-check');
    }, 2500);
  };

  const renderBarcode = (value) => {
    const digits = String(value || '').replace(/\D/g, '').padEnd(16, '0').slice(0, 18);
    return (
      <div className="retail-barcode" aria-label={`Barcode ${digits}`}>
        <div className="retail-barcode__bars">
          {digits.split('').map((digit, index) => (
            <span
              key={`${digit}-${index}`}
              style={{
                width: `${Number(digit) % 3 + 2}px`,
                height: `${64 + (Number(digit) % 4) * 8}px`,
              }}
            />
          ))}
        </div>
        <strong>{digits.replace(/(\d{4})(?=\d)/g, '$1 ')}</strong>
      </div>
    );
  };

  return (
    <div className="main main-surface">
      {/* Breadcrumb */}
      <div className="container col-md-8 col-12 pt-3 pb-1">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb m-0" style={{ fontSize: '0.82rem' }}>
            <li className="breadcrumb-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home', null); }} className="text-success text-decoration-none">Beranda</a>
            </li>
            <li className="breadcrumb-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('order', invoiceData.productId); }} className="text-success text-decoration-none">{invoiceData.productName}</a>
            </li>
            <li className="breadcrumb-item active text-secondary">Invoice</li>
          </ol>
        </nav>
      </div>

      <div className="container col-md-8 col-12 py-2">
        <div className="row g-3 justify-content-center">
          <div className="col-md-7 col-12">

            {/* Status Card */}
            {paymentStatus === 'success' && (
              <div className="invoice-status-card invoice-status-card--success mb-3">
                <div className="invoice-status-icon">
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <div>
                  <h5>Pembayaran Berhasil!</h5>
                  <p className="mb-0 text-secondary">Item telah berhasil dikirim ke akunmu. Terima kasih!</p>
                </div>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="invoice-status-card invoice-status-card--failed mb-3">
                <div className="invoice-status-icon">
                  <i className="bi bi-x-circle-fill"></i>
                </div>
                <div>
                  <h5>Pembayaran Gagal / Kadaluarsa</h5>
                  <p className="mb-0 text-secondary">Pembayaran tidak diterima. Coba lagi atau hubungi CS.</p>
                </div>
              </div>
            )}

            {paymentStatus === 'checking' && (
              <div className="invoice-status-card invoice-status-card--checking mb-3">
                <div className="invoice-status-icon">
                  <span className="spinner-border text-success" role="status"></span>
                </div>
                <div>
                  <h5>Mengecek Status Pembayaran...</h5>
                  <p className="mb-0 text-secondary">Harap tunggu beberapa saat.</p>
                </div>
              </div>
            )}

            {/* Invoice Card */}
            <div className="order-card invoice-main-card">
              <div className="invoice-header">
                <div>
                  <div className="invoice-id">#{invoiceData.invoiceId}</div>
                  <div className="invoice-date text-secondary">{invoiceData.createdAt}</div>
                </div>
                <div className="invoice-header-logo">
                  <img
                    src={invoiceData.productImage}
                    alt={invoiceData.productName}
                    onError={(event) => { event.currentTarget.src = '/gassets/logo.png'; }}
                  />
                </div>
              </div>

              <hr className="order-summary-divider" />

              <div className="invoice-rows">
                <div className="invoice-row">
                  <span className="invoice-label">Produk</span>
                  <span className="invoice-value text-success">{invoiceData.productName}</span>
                </div>
                <div className="invoice-row">
                  <span className="invoice-label">Nominal</span>
                  <span className="invoice-value">{invoiceData.denomination}</span>
                </div>
                <div className="invoice-row">
                  <span className="invoice-label">ID / Akun</span>
                  <span className="invoice-value">{invoiceData.userId}</span>
                </div>
                <div className="invoice-row">
                  <span className="invoice-label">Nickname</span>
                  <span className="invoice-value text-success">{invoiceData.nick}</span>
                </div>
              </div>

              <hr className="order-summary-divider" />

              <div className="invoice-rows">
                <div className="invoice-row">
                  <span className="invoice-label">Subtotal</span>
                  <span className="invoice-value">{formatRupiah(invoiceData.subtotal)}</span>
                </div>
                <div className="invoice-row">
                  <span className="invoice-label">Biaya Layanan</span>
                  <span className="invoice-value">{formatRupiah(invoiceData.fee)}</span>
                </div>
                <div className="invoice-row invoice-row--total">
                  <span className="invoice-label fw-bold">Total Bayar</span>
                  <span className="invoice-value text-success fw-bold">{formatRupiah(invoiceData.total)}</span>
                </div>
              </div>

              <hr className="order-summary-divider" />

              {/* Payment Method */}
              <div className="invoice-payment-method">
                <span className="invoice-label">Metode Pembayaran</span>
                <div className="d-flex align-items-center gap-2 mt-2">
                  <img
                    src={invoiceData.paymentImage}
                    alt={invoiceData.paymentMethod}
                    style={{ height: '28px', objectFit: 'contain' }}
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  />
                  <span className="text-white fw-semibold">{invoiceData.paymentMethod}</span>
                </div>
              </div>

              {/* Countdown */}
              {paymentStatus === 'pending' && (
                <div className="invoice-countdown-box mt-3">
                  <span className="invoice-countdown-label">Selesaikan pembayaran dalam</span>
                  <div className="invoice-countdown-timer">{formatCountdown()}</div>
                  <p className="text-secondary mb-0" style={{ fontSize: '0.8rem' }}>Segera lakukan pembayaran sebelum waktu habis</p>
                </div>
              )}

              {paymentStatus === 'pending' && invoiceData.paymentId === 'qris' && (
                <div className="invoice-payment-box mt-3">
                  <span className="invoice-label">Scan QRIS</span>
                  <div className="invoice-qris-frame">
                    {qrisDataUrl ? (
                      <img src={qrisDataUrl} alt="QRIS pembayaran Goisiin" />
                    ) : (
                      <div className="spinner-border text-success" role="status"></div>
                    )}
                  </div>
                  <p className="text-secondary mb-0" style={{ fontSize: '0.78rem' }}>
                    QR dibuat otomatis sesuai total bayar invoice ini.
                  </p>
                </div>
              )}

              {paymentStatus === 'pending' && invoiceData.paymentId === 'indomaret' && (
                <div className="invoice-payment-box mt-3">
                  <span className="invoice-label">Kode Pembayaran Indomaret</span>
                  {renderBarcode(invoiceData.retailBarcode)}
                  <p className="text-secondary mb-0" style={{ fontSize: '0.78rem' }}>
                    Tunjukkan barcode ini ke kasir dan bayar sesuai total invoice.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="d-flex gap-2 mt-3 flex-wrap">
              {paymentStatus === 'pending' && (
                <button
                  className="btn btn-success flex-grow-1 fw-bold"
                  onClick={handleCheckStatus}
                  id="btn-check-status"
                >
                  <i className="bi bi-arrow-repeat me-2"></i>
                  Cek Status Pembayaran
                </button>
              )}
              {(paymentStatus === 'success' || paymentStatus === 'failed') && (
                <button
                  className="btn btn-success flex-grow-1 fw-bold"
                  onClick={() => onNavigate('home', null)}
                >
                  <i className="bi bi-house-fill me-2"></i>
                  Kembali ke Beranda
                </button>
              )}
              <a
                href="https://wa.me/6281388427196"
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline-success"
              >
                <i className="bi bi-whatsapp me-1"></i>
                Bantuan CS
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


