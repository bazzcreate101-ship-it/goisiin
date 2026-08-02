import React, { useState, useEffect } from 'react';
import { safeJsonParse } from '../lib/storage';

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

export default function InvoiceView({ invoiceData, onNavigate }) {
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [paymentStatus, setPaymentStatus] = useState('pending'); // 'pending' | 'checking' | 'success' | 'failed'

  // Sync status on mount/update
  useEffect(() => {
    if (invoiceData?.invoiceId) {
      const saved = localStorage.getItem('goisiin_transactions');
      if (saved) {
        const list = safeJsonParse(saved, []);
        const found = list.find(t => t.invoiceId === invoiceData.invoiceId);
        if (found) {
          setPaymentStatus(found.status);
        }
      }
    }
  }, [invoiceData]);

  // Countdown timer logic
  useEffect(() => {
    if (paymentStatus !== 'pending') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setPaymentStatus('failed');

          // Update status in localStorage
          const saved = localStorage.getItem('goisiin_transactions');
          if (saved) {
            const list = safeJsonParse(saved, []);
            const updated = list.map(t => {
              if (t.invoiceId === invoiceData?.invoiceId) {
                return { ...t, status: 'failed' };
              }
              return t;
            });
            localStorage.setItem('goisiin_transactions', JSON.stringify(updated));
          }
          return 0;
        }
        return prev - 1;
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
      const saved = localStorage.getItem('goisiin_transactions');
      const list = safeJsonParse(saved, []);
      const found = list.find(t => t.invoiceId === invoiceData.invoiceId);
      const nextStatus = found?.status || 'pending';
      setPaymentStatus(nextStatus);
    }, 2500);
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
                  <img src={invoiceData.productImage} alt={invoiceData.productName} />
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
                  <img src={invoiceData.paymentImage} alt={invoiceData.paymentMethod} style={{ height: '28px', objectFit: 'contain' }} />
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
                href="https://wa.me/6285607660007"
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


