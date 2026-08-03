import React, { useState, useEffect } from 'react';
import { readStorageList } from '../lib/storage';

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

export default function TransactionsView({ user, onNavigate }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const loadTransactions = () => {
      const list = readStorageList('goisiin_transactions');
      // Filter by current user email if logged in
      if (user?.email) {
        setTransactions(list.filter(t => t.userEmail === user.email));
      } else {
        setTransactions(list);
      }
    };
    loadTransactions();
    window.addEventListener('storage', loadTransactions);
    window.addEventListener('goisiin:cloud-state-updated', loadTransactions);
    return () => {
      window.removeEventListener('storage', loadTransactions);
      window.removeEventListener('goisiin:cloud-state-updated', loadTransactions);
    };
  }, [user]);

  return (
    <div className="main main-surface py-4">
      <div className="container col-md-8 col-12">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb m-0" style={{ fontSize: '0.82rem' }}>
            <li className="breadcrumb-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home', null); }} className="text-success text-decoration-none">Beranda</a>
            </li>
            <li className="breadcrumb-item active text-secondary">Riwayat Transaksi</li>
          </ol>
        </nav>

        {/* Content Box */}
        <div className="order-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-white fw-bold mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>
                📜 Riwayat Transaksi Kamu
              </h3>
              <p className="text-secondary mb-0" style={{ fontSize: '0.86rem' }}>
                Berikut daftar top up game yang pernah kamu lakukan di Goisiinn.
              </p>
            </div>
            <button className="btn btn-outline-success btn-sm" onClick={() => onNavigate('home', null)}>
              <i className="bi bi-plus-lg me-1"></i> Top Up Lagi
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛒</div>
              <h5 className="text-white fw-semibold">Belum Ada Transaksi</h5>
              <p className="text-secondary small">Kamu belum melakukan pembelian voucher atau top up game.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-dark table-striped table-hover align-middle" style={{ fontSize: '0.88rem' }}>
                <thead>
                  <tr className="border-secondary">
                    <th>Invoice ID</th>
                    <th>Produk</th>
                    <th>Detail Akun</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.invoiceId} className="border-secondary">
                      <td className="fw-semibold text-white">#{tx.invoiceId}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <img
                            src={tx.productImage}
                            alt={tx.productName}
                            width="28"
                            height="28"
                            className="rounded"
                            onError={(event) => { event.currentTarget.src = '/gassets/logo.png'; }}
                          />
                          <div>
                            <div className="fw-bold">{tx.productName}</div>
                            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{tx.denomination}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>{tx.userId}</div>
                        <div className="text-success" style={{ fontSize: '0.75rem' }}>Nick: {tx.nick}</div>
                      </td>
                      <td className="fw-bold text-success">{formatRupiah(tx.total)}</td>
                      <td>
                        <span className={`badge ${
                          tx.status === 'success' ? 'bg-success' : 
                          tx.status === 'failed' ? 'bg-danger' : 'bg-warning text-dark'
                        }`}>
                          {tx.status === 'success' ? 'Berhasil' : 
                           tx.status === 'failed' ? 'Gagal' : 'Menunggu'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-success btn-sm p-1 px-3" 
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => onNavigate('invoice', tx)}
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
