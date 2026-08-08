import React, { useState } from 'react';
import { paymentChannels } from '../data/products';
import { readStorageList, writeStorageList } from '../lib/storage';
import { buildDynamicQrisPayload, makeRetailBarcodeValue } from '../lib/qris';
import { debitWalletForPurchase, getWalletBalance } from '../lib/walletService';
import { awardStampForTransaction } from '../lib/stampService';
import { decrementProductStock } from '../lib/productStock';
import { getAccountBlock, isAccountBlocked } from '../lib/accountBlocks';

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
const cleanInput = (value, type) => {
  const trimmed = String(value ?? '').trim().slice(0, 80);
  if (type === 'number') return trimmed.replace(/[^\d]/g, '').slice(0, 30);
  return trimmed.replace(/[<>`{}]/g, '');
};

export default function OrderView({ productId, products, onNavigate, user, onLoginOpen, onUpdateProducts }) {
  const product = products.find(p => p.id === productId && p.active !== false);

  const [formData, setFormData] = useState({});
  const [selectedDenom, setSelectedDenom] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentCategory, setPaymentCategory] = useState('QRIS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [nickPreview, setNickPreview] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');

  if (!product) {
    return (
      <div className="container col-md-8 col-12 py-5 text-center">
        <h3 className="text-success">Produk tidak ditemukan</h3>
        <button className="btn btn-success mt-3" onClick={() => onNavigate('home', null)}>Kembali ke Beranda</button>
      </div>
    );
  }

  const paymentCategories = [...new Set(paymentChannels.map(p => p.category))];
  const filteredPayments = paymentChannels.filter(p => p.category === paymentCategory);
  const walletBalance = user?.email ? getWalletBalance(user.email) : 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const field = product.inputFields.find(item => item.name === name);
    const safeValue = cleanInput(value, field?.type);
    setFormData(prev => ({ ...prev, [name]: safeValue }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    // Simulate nick preview
    if (name === 'userId' && safeValue.length >= 5) {
      setNickPreview('GamePlayer' + Math.floor(Math.random() * 9999));
    } else {
      setNickPreview('');
    }
  };

  const validate = () => {
    const newErrors = {};
    product.inputFields.forEach(field => {
      const value = cleanInput(formData[field.name], field.type);
      if (!value) {
        newErrors[field.name] = `${field.placeholder} wajib diisi`;
      } else if (field.type === 'number' && !/^\d{3,30}$/.test(value)) {
        newErrors[field.name] = `${field.placeholder} tidak valid`;
      } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[field.name] = `${field.placeholder} tidak valid`;
      } else if (field.type === 'select' && field.options && !field.options.includes(value)) {
        newErrors[field.name] = `${field.placeholder} tidak valid`;
      }
    });
    if (!selectedDenom) newErrors.denom = 'Pilih nominal terlebih dahulu';
    if (selectedDenom && Number(selectedDenom.stock) <= 0) newErrors.denom = 'Stok pilihan ini sedang kosong. Pilih varian lain.';
    if (!selectedPayment) newErrors.payment = 'Pilih metode pembayaran terlebih dahulu';
    return newErrors;
  };

  const calcTotal = () => {
    if (!selectedDenom || !selectedPayment) return 0;
    const base = selectedDenom.price;
    const fee = Math.round(base * selectedPayment.feePercent) + selectedPayment.feeFlat;
    return base + fee;
  };

  const calcFee = () => {
    if (!selectedDenom || !selectedPayment) return 0;
    return Math.round(selectedDenom.price * selectedPayment.feePercent) + selectedPayment.feeFlat;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!user?.email) {
      setPaymentNotice('Login dulu untuk melanjutkan pembayaran dan menyimpan riwayat transaksi.');
      onLoginOpen?.();
      return;
    }
    if (isAccountBlocked(user.email)) {
      const block = getAccountBlock(user.email);
      setPaymentNotice(block?.reason || 'Akun kamu sedang dibatasi oleh admin dan tidak bisa membuat pesanan.');
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!['qris', 'indomaret'].includes(selectedPayment.id)) {
      if (selectedPayment.id === 'goisiin_balance') {
        const total = calcTotal();
        if (walletBalance < total) {
          setPaymentNotice(`Saldo Goisiinn tidak cukup. Saldo kamu ${formatRupiah(walletBalance)}, total pesanan ${formatRupiah(total)}.`);
          return;
        }
      } else {
        setIsSubmitting(true);
        setPaymentNotice('');
        setTimeout(() => {
          setIsSubmitting(false);
          setPaymentNotice('Metode pembayaran ini sedang gangguan. Silakan coba beberapa saat lagi atau pilih metode lain.');
        }, 1200);
        return;
      }
    }
    setIsSubmitting(true);
    // Small delay to simulate request
    setTimeout(() => {
      const invoiceId = 'GSI-' + Date.now().toString().slice(-8).toUpperCase();
      const total = calcTotal();
      const isWalletPayment = selectedPayment.id === 'goisiin_balance';
      const createdAtIso = new Date().toISOString();
      const invoiceData = {
        invoiceId,
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        denomination: selectedDenom.name,
        userId: product.inputFields.map(field => cleanInput(formData[field.name], field.type)).join(' / '),
        nick: nickPreview || 'User',
        paymentId: selectedPayment.id,
        paymentCategory: selectedPayment.category,
        paymentMethod: selectedPayment.name,
        paymentImage: selectedPayment.image,
        subtotal: selectedDenom.price,
        fee: calcFee(),
        total,
        points: Number(selectedDenom.points || 0),
        createdAt: new Date(createdAtIso).toLocaleString('id-ID'),
        createdAtIso,
        updatedAtIso: createdAtIso,
        expiresAt: Date.now() + 60 * 60 * 1000,
        status: isWalletPayment ? 'success' : 'pending',
        userEmail: user.email,
        qrisPayload: selectedPayment.id === 'qris' ? buildDynamicQrisPayload(total) : null,
        retailBarcode: selectedPayment.id === 'indomaret' ? makeRetailBarcodeValue(invoiceId) : null,
        walletDebited: isWalletPayment,
        refundableAmount: isWalletPayment ? total : 0,
      };

      if (isWalletPayment) {
        const debitResult = debitWalletForPurchase(invoiceData);
        if (!debitResult.ok) {
          setIsSubmitting(false);
          setPaymentNotice('Saldo Goisiinn tidak cukup atau sedang tidak bisa dipakai. Coba top up saldo dulu.');
          return;
        }
        awardStampForTransaction(invoiceData, 'wallet-payment');
      }

      // Simpan transaksi ke localStorage
      const list = readStorageList('goisiin_transactions');
      list.unshift(invoiceData);
      writeStorageList('goisiin_transactions', list);
      const stockResult = decrementProductStock(products, product.id, selectedDenom.id);
      if (stockResult.changed) {
        onUpdateProducts?.(stockResult.products);
      }

      setIsSubmitting(false);
      onNavigate('invoice', invoiceData);
    }, 1200);
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
            <li className="breadcrumb-item active text-secondary">{product.name}</li>
          </ol>
        </nav>
      </div>

      <div className="container col-md-8 col-12 py-2">
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            {/* LEFT COLUMN */}
            <div className="col-md-8 col-12">
              {/* Product header */}
              <div className="order-card mb-3">
                <div className="d-flex align-items-center gap-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="order-product-img"
                    onError={(event) => { event.currentTarget.src = '/gassets/logo.png'; }}
                  />
                  <div>
                    <h2 className="order-product-name">{product.name}</h2>
                    <span className="badge bg-success text-white">{product.cardLabel || 'Top Up Instan'}</span>
                    {product.discount && <span className="badge bg-danger ms-1">{product.discount}</span>}
                    {product.description && <p className="text-secondary mt-2 mb-0" style={{ fontSize: '0.84rem' }}>{product.description}</p>}
                  </div>
                </div>
              </div>

              {/* 1. User ID Fields */}
              <div className="order-card mb-3">
                <h5 className="order-section-title">
                  <span className="order-step-num">1</span>
                  Masukkan Data Akun
                </h5>
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>{product.inputLabel}</p>
                <div className="row g-2">
                  {product.inputFields.map((field) => (
                    <div className="col-12" key={field.name}>
                      {field.type === 'select' ? (
                        <select
                          className={`form-select order-input ${errors[field.name] ? 'is-invalid' : ''}`}
                          name={field.name}
                          value={formData[field.name] || ''}
                          onChange={handleInputChange}
                        >
                          <option value="">{field.placeholder}</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className={`form-control order-input ${errors[field.name] ? 'is-invalid' : ''}`}
                          type={field.type === 'number' ? 'text' : field.type || 'text'}
                          inputMode={field.type === 'number' ? 'numeric' : undefined}
                          pattern={field.type === 'number' ? '[0-9]*' : undefined}
                          maxLength={field.type === 'number' ? 30 : 80}
                          name={field.name}
                          placeholder={field.placeholder}
                          value={formData[field.name] || ''}
                          onChange={handleInputChange}
                        />
                      )}
                      {errors[field.name] && <div className="invalid-feedback">{errors[field.name]}</div>}
                    </div>
                  ))}

                  {/* Nickname preview */}
                  {nickPreview && (
                    <div className="col-12">
                      <div className="nick-preview-bar">
                        <i className="bi bi-person-check-fill text-success me-2"></i>
                        Nickname: <strong className="text-success ms-1">{nickPreview}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Denomination Grid */}
              <div className="order-card mb-3">
                <h5 className="order-section-title">
                  <span className="order-step-num">2</span>
                  Pilih Nominal
                </h5>
                {errors.denom && <div className="alert alert-danger py-1 px-2 mb-2" style={{ fontSize: '0.83rem' }}>{errors.denom}</div>}
                <div className="denom-grid">
                  {product.denominations.map(denom => {
                    const isOutOfStock = Number(denom.stock) <= 0;
                    return (
                    <button
                      key={denom.id}
                      type="button"
                      className={`denom-card ${selectedDenom?.id === denom.id ? 'denom-card--active' : ''} ${isOutOfStock ? 'denom-card--disabled' : ''}`}
                      onClick={() => !isOutOfStock && setSelectedDenom(denom)}
                      disabled={isOutOfStock}
                    >
                      {denom.image && (
                        <img
                          src={denom.image}
                          alt={denom.sourceTitle || denom.name}
                          className="denom-card__image"
                          loading="lazy"
                          decoding="async"
                          onError={(event) => { event.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      {denom.originalPrice !== denom.price && (
                        <span className="denom-card__old-price">{formatRupiah(denom.originalPrice)}</span>
                      )}
                      <span className="denom-card__name">{denom.name}</span>
                      {denom.accessType && <span className="denom-card__meta">{denom.accessType} · {denom.duration || 'Sesuai paket'}</span>}
                      <span className="denom-card__price">{formatRupiah(denom.price)}</span>
                      {Number.isFinite(Number(denom.stock)) && <span className="denom-card__stock">{isOutOfStock ? 'Stok kosong' : `Stok ${denom.stock}`}</span>}
                      {denom.description && <span className="denom-card__description">{denom.description}</span>}
                    </button>
                  );})}
                </div>
              </div>

              {/* 3. Payment Channels */}
              <div className="order-card mb-3">
                <h5 className="order-section-title">
                  <span className="order-step-num">3</span>
                  Pilih Metode Pembayaran
                </h5>
                {errors.payment && <div className="alert alert-danger py-1 px-2 mb-2" style={{ fontSize: '0.83rem' }}>{errors.payment}</div>}
                {paymentNotice && <div className="alert alert-warning py-2 px-3 mb-2" style={{ fontSize: '0.84rem' }}>{paymentNotice}</div>}
                {user?.email && (
                  <div className="wallet-payment-hint mb-2">
                    <i className="bi bi-wallet2"></i>
                    Saldo Goisiinn kamu: <strong>{formatRupiah(walletBalance)}</strong>
                  </div>
                )}

                {/* Category Tabs */}
                <div className="payment-tabs mb-3">
                  {paymentCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`payment-tab-btn ${paymentCategory === cat ? 'active' : ''}`}
                      onClick={() => setPaymentCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Payment Options */}
                <div className="payment-grid">
                  {filteredPayments.map(ch => (
                    <div
                      key={ch.id}
                      className={`payment-option ${selectedPayment?.id === ch.id ? 'payment-option--active' : ''}`}
                      onClick={() => setSelectedPayment(ch)}
                    >
                      <img
                        src={ch.image}
                        alt={ch.name}
                        className="payment-option__logo"
                        onError={(event) => { event.currentTarget.style.display = 'none'; }}
                      />
                      <span className="payment-option__name">{ch.name}</span>
                      {(ch.feeFlat > 0 || ch.feePercent > 0) && (
                        <span className="payment-option__fee">
                          +{ch.feeFlat > 0 ? `Rp ${ch.feeFlat.toLocaleString('id-ID')}` : `${(ch.feePercent * 100).toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Order Summary */}
            <div className="col-md-4 col-12">
              <div className="order-summary-sticky">
                <div className="order-card order-summary-card">
                  <h5 className="order-section-title mb-3">Ringkasan Pesanan</h5>

                  <div className="order-summary-row">
                    <span>Produk</span>
                    <span className="text-success">{product.name}</span>
                  </div>
                  <div className="order-summary-row">
                    <span>Nominal</span>
                    <span>{selectedDenom ? selectedDenom.name : '-'}</span>
                  </div>
                  <div className="order-summary-row">
                    <span>Harga</span>
                    <span>{selectedDenom ? formatRupiah(selectedDenom.price) : '-'}</span>
                  </div>
                  <div className="order-summary-row">
                    <span>Biaya Layanan</span>
                    <span>{selectedPayment && selectedDenom ? formatRupiah(calcFee()) : '-'}</span>
                  </div>
                  <hr className="order-summary-divider" />
                  <div className="order-summary-row order-summary-row--total">
                    <span>Total</span>
                    <span className="text-success fw-bold">{selectedDenom && selectedPayment ? formatRupiah(calcTotal()) : '-'}</span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-success w-100 mt-3 fw-bold"
                    disabled={isSubmitting}
                    id="btn-checkout"
                  >
                    {isSubmitting ? (
                      <span className="d-flex align-items-center justify-content-center gap-2">
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        Memproses...
                      </span>
                    ) : (
                      'Bayar Sekarang'
                    )}
                  </button>

                  <div className="mt-3 text-center" style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    <i className="bi bi-shield-check-fill text-success me-1"></i>
                    Transaksi aman & terenkripsi SSL
                  </div>
                </div>

                <div className="order-card mt-3" style={{ fontSize: '0.83rem', color: '#9ca3af' }}>
                  <h6 className="text-success mb-2">
                    <i className="bi bi-info-circle-fill me-1"></i>Info Penting
                  </h6>
                  <ul className="ps-3 mb-0">
                    <li>Pastikan ID akun yang kamu masukkan sudah benar</li>
                    <li>Item akan dikirim otomatis setelah pembayaran berhasil</li>
                    <li>Hubungi CS jika ada kendala</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


