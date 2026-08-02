import React, { useState, useEffect } from 'react';
import { productImages } from '../assets/images';
import { safeJsonParse } from '../lib/storage';

const initialCategories = [
  { id: '1', name: 'Top up Game' },
  { id: '2', name: 'Voucher Game' },
  { id: '3', name: 'Hiburan' },
  { id: '6', name: 'E-Wallet' }
];

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

export default function AdminDashboard({ products, onUpdateProducts, adminUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'transactions' | 'users' | 'chats'
  
  // Transactions & Users state
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);

  // Product state
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '1',
    popular: false,
    discount: '',
    inputLabel: 'Masukkan Player ID',
    denominations: []
  });

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [adminMode, setAdminMode] = useState(false);
  const [activeAdmin, setActiveAdmin] = useState('Ardan'); // 'Ardan' | 'Sarah' | 'Ardian'
  const [adminInput, setAdminInput] = useState('');
  const [adminTyping, setAdminTyping] = useState(false);

  // Load transactions and users from localStorage
  useEffect(() => {
    const loadData = () => {
      const savedTx = localStorage.getItem('goisiin_transactions');
      const savedUsers = localStorage.getItem('goisiin_users');
      if (savedTx) setAdminTransactions(safeJsonParse(savedTx, []));
      if (savedUsers) setAdminUsers(safeJsonParse(savedUsers, []));
    };
    loadData();
    const timer = setInterval(loadData, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdateTxStatus = (invoiceId, nextStatus) => {
    const updated = adminTransactions.map(t => {
      if (t.invoiceId === invoiceId) {
        return { ...t, status: nextStatus };
      }
      return t;
    });
    setAdminTransactions(updated);
    localStorage.setItem('goisiin_transactions', JSON.stringify(updated));
  };

  const handleDeleteTx = (invoiceId) => {
    if (window.confirm(`Kakak yakin ingin menghapus invoice #${invoiceId}?`)) {
      const updated = adminTransactions.filter(t => t.invoiceId !== invoiceId);
      setAdminTransactions(updated);
      localStorage.setItem('goisiin_transactions', JSON.stringify(updated));
    }
  };

  // Load chats from localStorage
  useEffect(() => {
    const loadChats = () => {
      const savedMsgs = localStorage.getItem('goisiin_chat_messages');
      const savedAdminMode = localStorage.getItem('goisiin_chat_admin_mode');
      const savedActiveAdmin = localStorage.getItem('goisiin_chat_active_admin');

      if (savedMsgs) setChatMessages(safeJsonParse(savedMsgs, []));
      if (savedAdminMode) setAdminMode(Boolean(safeJsonParse(savedAdminMode, false)));
      if (savedActiveAdmin) setActiveAdmin(savedActiveAdmin);
    };

    loadChats();
    // Poll for changes every 2 seconds to simulate real-time updates
    const pollTimer = setInterval(loadChats, 2000);
    return () => clearInterval(pollTimer);
  }, []);

  const handleSaveChats = (msgs, mode = adminMode, adminName = activeAdmin) => {
    setChatMessages(msgs);
    setAdminMode(mode);
    localStorage.setItem('goisiin_chat_messages', JSON.stringify(msgs));
    localStorage.setItem('goisiin_chat_admin_mode', JSON.stringify(mode));
    localStorage.setItem('goisiin_chat_active_admin', adminName);
    // Sync storage event
    window.dispatchEvent(new Event('storage'));
  };

  const handleAdminSendChat = (e) => {
    e.preventDefault();
    if (!adminInput.trim()) return;

    setAdminTyping(true);
    const textToSend = adminInput;
    setAdminInput('');

    // Simulate typing delay (1.5s to 3s)
    const typingDelay = Math.floor(Math.random() * 1500) + 1500;
    setTimeout(() => {
      setAdminTyping(false);
      const adminMsg = {
        id: `msg-${Date.now()}`,
        sender: 'cs',
        agent: activeAdmin,
        text: textToSend,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };

      const updated = [...chatMessages, adminMsg];
      handleSaveChats(updated, true, activeAdmin);
    }, typingDelay);
  };

  const handleToggleAdminMode = () => {
    const nextMode = !adminMode;
    const sysMsg = {
      id: `sys-${Date.now()}`,
      sender: 'system',
      text: nextMode 
        ? `Chat dialihkan sepenuhnya ke Admin ${activeAdmin}. AI Vindy dinonaktifkan.` 
        : 'Chat dialihkan kembali ke AI Vindy. Admin keluar.',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    handleSaveChats([...chatMessages, sysMsg], nextMode, activeAdmin);
  };

  // Product CRUD
  const handleEditProduct = (prod) => {
    setEditingProduct(prod);
    setIsAddingProduct(false);
    setFormData({
      name: prod.name,
      category: prod.category,
      popular: prod.popular || false,
      discount: prod.discount || '',
      inputLabel: prod.inputLabel || 'Masukkan Player ID',
      denominations: [...prod.denominations]
    });
  };

  const handleStartAddProduct = () => {
    setIsAddingProduct(true);
    setEditingProduct(null);
    setFormData({
      name: '',
      category: '1',
      popular: false,
      discount: '',
      inputLabel: 'Masukkan Player ID',
      denominations: [
        { id: `d-${Date.now()}-1`, name: '50 Diamonds', originalPrice: 16000, price: 14500, points: 50 }
      ]
    });
  };

  const handleDeleteProduct = (productId) => {
    if (window.confirm('Apakah kakak yakin ingin menghapus produk ini?')) {
      const updated = products.filter(p => p.id !== productId);
      onUpdateProducts(updated);
    }
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (isAddingProduct) {
      const newId = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newProd = {
        id: newId,
        name: formData.name,
        category: formData.category,
        image: productImages['mobile-legend'], // Default fallback icon
        popular: formData.popular,
        discount: formData.discount,
        inputLabel: formData.inputLabel,
        inputFields: [
          { name: 'userId', placeholder: 'Masukkan Player ID', type: 'number' }
        ],
        denominations: formData.denominations
      };
      onUpdateProducts([...products, newProd]);
      setIsAddingProduct(false);
    } else if (editingProduct) {
      const updated = products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name: formData.name,
            category: formData.category,
            popular: formData.popular,
            discount: formData.discount,
            inputLabel: formData.inputLabel,
            denominations: formData.denominations
          };
        }
        return p;
      });
      onUpdateProducts(updated);
      setEditingProduct(null);
    }
  };

  const handleAddDenom = () => {
    const newDenom = {
      id: `d-${Date.now()}`,
      name: '100 Diamonds',
      originalPrice: 30000,
      price: 28000,
      points: 100
    };
    setFormData({
      ...formData,
      denominations: [...formData.denominations, newDenom]
    });
  };

  const handleRemoveDenom = (id) => {
    setFormData({
      ...formData,
      denominations: formData.denominations.filter(d => d.id !== id)
    });
  };

  const handleUpdateDenom = (id, field, value) => {
    const updated = formData.denominations.map(d => {
      if (d.id === id) {
        return { ...d, [field]: value };
      }
      return d;
    });
    setFormData({ ...formData, denominations: updated });
  };

  return (
    <div className="main main-surface py-4">
      <div className="container col-md-8 col-12">
        {/* Header Dashboard */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-white fw-bold mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>
              🛡️ Dashboard Admin Goisiin
            </h2>
            <p className="text-secondary mb-0" style={{ fontSize: '0.86rem' }}>
              Halo, <strong style={{ color: '#4ade80' }}>{adminUser?.name || 'Admin'}</strong> — Kelola produk & jawab chat customer.
            </p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-success btn-sm" onClick={() => window.open('/', '_blank')}>
              <i className="bi bi-house-fill me-1"></i> Lihat Toko
            </button>
            <button className="btn btn-outline-danger btn-sm" onClick={onLogout}>
              <i className="bi bi-box-arrow-right me-1"></i> Logout
            </button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="d-flex gap-2 mb-3 flex-wrap">
          <button 
            className={`btn btn-sm ${activeTab === 'products' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setActiveTab('products')}
          >
            📦 Kelola Produk
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'transactions' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setActiveTab('transactions')}
          >
            📊 Transaksi Customer
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'users' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setActiveTab('users')}
          >
            👤 Akun Pengguna
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'chats' ? 'btn-success' : 'btn-outline-success'} position-relative`}
            onClick={() => setActiveTab('chats')}
          >
            💬 Live Chat Hub
            {adminMode && <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>}
          </button>
        </div>

        {/* TAB 1: KELOLA PRODUK */}
        {activeTab === 'products' && (
          <div className="row g-3">
            {/* List Produk */}
            <div className={editingProduct || isAddingProduct ? 'col-md-5 col-12' : 'col-12'}>
              <div className="order-card p-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="text-success m-0 fw-bold">Daftar Produk</h5>
                  {!isAddingProduct && !editingProduct && (
                    <button className="btn btn-success btn-sm" onClick={handleStartAddProduct}>
                      <i className="bi bi-plus-lg me-1"></i> Tambah Produk
                    </button>
                  )}
                </div>

                <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="table table-dark table-striped table-hover align-middle" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Kategori</th>
                        <th>Populer</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <img src={p.image} alt={p.name} width="32" height="32" className="rounded" />
                              <span>{p.name}</span>
                            </div>
                          </td>
                          <td>
                            {initialCategories.find(c => c.id === p.category)?.name || p.category}
                          </td>
                          <td>{p.popular ? '🟢 Ya' : '⚪ Tidak'}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <button className="btn btn-outline-success btn-sm p-1 px-2" onClick={() => handleEditProduct(p)} aria-label="Edit">
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                              <button className="btn btn-outline-danger btn-sm p-1 px-2" onClick={() => handleDeleteProduct(p.id)} aria-label="Hapus">
                                <i className="bi bi-trash-fill"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Form Tambah/Edit */}
            {(editingProduct || isAddingProduct) && (
              <div className="col-md-7 col-12">
                <div className="order-card p-3">
                  <h5 className="text-success fw-bold mb-3">
                    {isAddingProduct ? 'Tambah Produk Baru' : `Edit Produk: ${editingProduct.name}`}
                  </h5>

                  <form onSubmit={handleSaveProduct}>
                    <div className="mb-3">
                      <label className="form-label text-secondary small">Nama Produk</label>
                      <input 
                        type="text" 
                        className="form-control order-input"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Contoh: Mobile Legend"
                        required
                      />
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-md-6 col-12">
                        <label className="form-label text-secondary small">Kategori</label>
                        <select 
                          className="form-select order-input"
                          value={formData.category}
                          onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                          {initialCategories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6 col-12">
                        <label className="form-label text-secondary small">Diskon Promo (Opsional)</label>
                        <input 
                          type="text" 
                          className="form-control order-input"
                          value={formData.discount}
                          onChange={e => setFormData({ ...formData, discount: e.target.value })}
                          placeholder="Contoh: DISKON 10%"
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="form-check form-switch">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          role="switch" 
                          id="switchPopular"
                          checked={formData.popular}
                          onChange={e => setFormData({ ...formData, popular: e.target.checked })}
                        />
                        <label className="form-check-label text-white small" htmlFor="switchPopular">Tampilkan di Produk Populer Beranda</label>
                      </div>
                    </div>

                    {/* Denominations List */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="form-label text-secondary small m-0">Pilihan Nominal & Harga</label>
                        <button type="button" className="btn btn-outline-success btn-sm p-1 px-2" style={{ fontSize: '0.72rem' }} onClick={handleAddDenom}>
                          + Tambah Nominal
                        </button>
                      </div>

                      <div className="denom-builder-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {formData.denominations.map((denom) => (
                          <div key={denom.id} className="d-flex gap-2 align-items-center mb-2 p-2 border border-secondary rounded">
                            <input 
                              type="text" 
                              className="form-control order-input form-control-sm"
                              style={{ flex: 2 }}
                              value={denom.name}
                              onChange={e => handleUpdateDenom(denom.id, 'name', e.target.value)}
                              placeholder="Nama nominal (misal: 100 Diamonds)"
                              required
                            />
                            <input 
                              type="number" 
                              className="form-control order-input form-control-sm"
                              style={{ flex: 1 }}
                              value={denom.price}
                              onChange={e => handleUpdateDenom(denom.id, 'price', parseInt(e.target.value) || 0)}
                              placeholder="Harga"
                              required
                            />
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleRemoveDenom(denom.id)}>
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="d-flex gap-2">
                      <button type="submit" className="btn btn-success flex-grow-1">Simpan Produk</button>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => { setEditingProduct(null); setIsAddingProduct(false); }}>
                        Batal
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE CHAT HUB */}
        {activeTab === 'chats' && (
          <div className="row g-3">
            {/* Sidebar Controller */}
            <div className="col-md-4 col-12">
              <div className="order-card p-3">
                <h5 className="text-success fw-bold mb-3">Pengaturan Admin</h5>
                
                {/* Select Admin Name */}
                <div className="mb-3">
                  <label className="form-label text-secondary small">Nama Admin Kamu</label>
                  <select 
                    className="form-select order-input"
                    value={activeAdmin}
                    onChange={e => {
                      setActiveAdmin(e.target.value);
                      localStorage.setItem('goisiin_chat_active_admin', e.target.value);
                    }}
                  >
                    <option value="Ardan">Ardan</option>
                    <option value="Sarah">Sarah</option>
                    <option value="Ardian">Ardian</option>
                  </select>
                </div>

                {/* Status Mode */}
                <div className="mb-3 p-2 rounded bg-dark border border-secondary">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <div className="fw-semibold text-white" style={{ fontSize: '0.85rem' }}>Status Chat Hub</div>
                      <div className="small text-secondary" style={{ fontSize: '0.75rem' }}>
                        {adminMode ? '🔴 Live Admin Mode (AI Off)' : '🟢 AI Vindy Auto (AI On)'}
                      </div>
                    </div>
                    <button 
                      className={`btn btn-sm ${adminMode ? 'btn-outline-success' : 'btn-success'}`}
                      onClick={handleToggleAdminMode}
                    >
                      {adminMode ? 'Aktifkan AI' : 'Ambil Alih'}
                    </button>
                  </div>
                </div>

                <div className="small text-secondary" style={{ fontSize: '0.78rem' }}>
                  💡 <strong>Tips:</strong> Klik "Ambil Alih" jika ingin menjawab secara manual dan menonaktifkan chatbot AI Vindy.
                </div>
              </div>
            </div>

            {/* Chat Box Viewer */}
            <div className="col-md-8 col-12">
              <div className="order-card p-3 d-flex flex-column" style={{ height: '500px' }}>
                <h5 className="text-success fw-bold mb-3">Obrolan Customer</h5>
                
                {/* Message Box */}
                <div className="flex-grow-1 border border-secondary rounded p-3 mb-3" style={{ overflowY: 'auto', background: 'rgba(0,0,0,0.2)' }}>
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-secondary py-5">Belum ada chat masuk.</div>
                  ) : (
                    chatMessages.map(m => {
                      if (m.sender === 'system') {
                        return (
                          <div key={m.id} className="text-center my-2">
                            <span className="badge bg-secondary py-1 px-2" style={{ fontSize: '0.72rem', whiteSpace: 'normal' }}>
                              {m.text}
                            </span>
                          </div>
                        );
                      }

                      const isMe = m.sender === 'cs';
                      return (
                        <div key={m.id} className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'} mb-2`}>
                          <span className="text-secondary mb-1" style={{ fontSize: '0.72rem' }}>
                            {isMe ? `${m.agent || 'Admin'}` : 'User'} ({m.timestamp})
                          </span>
                          <div 
                            className={`p-2 rounded`} 
                            style={{ 
                              maxWidth: '80%', 
                              fontSize: '0.85rem',
                              backgroundColor: isMe ? '#6aaa4a' : 'rgba(255,255,255,0.08)',
                              color: '#fff'
                            }}
                          >
                            {m.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {adminTyping && (
                    <div className="d-flex flex-column align-items-end mb-2">
                      <span className="text-secondary mb-1" style={{ fontSize: '0.72rem' }}>Admin sedang mengetik...</span>
                      <div className="p-2 rounded bg-success text-white">...</div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleAdminSendChat} className="d-flex gap-2">
                  <input 
                    type="text" 
                    className="form-control order-input"
                    value={adminInput}
                    onChange={e => setAdminInput(e.target.value)}
                    placeholder={`Kirim balasan sebagai Admin ${activeAdmin}...`}
                    disabled={!adminMode}
                  />
                  <button type="submit" className="btn btn-success" disabled={!adminInput.trim() || !adminMode}>
                    Kirim
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* TAB 3: TRANSAKSI CUSTOMER */}
        {activeTab === 'transactions' && (
          <div className="order-card p-3">
            <h5 className="text-success fw-bold mb-3">Daftar Transaksi Customer</h5>
            <div className="table-responsive">
              <table className="table table-dark table-striped table-hover align-middle" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Email Pembeli</th>
                    <th>Produk / Nominal</th>
                    <th>ID Game / Nick</th>
                    <th>Total</th>
                    <th>Tanggal</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {adminTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-secondary">Belum ada transaksi masuk.</td>
                    </tr>
                  ) : (
                    adminTransactions.map(t => (
                      <tr key={t.invoiceId}>
                        <td className="fw-semibold">#{t.invoiceId}</td>
                        <td>{t.userEmail || <span className="text-secondary">Guest (No Login)</span>}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img src={t.productImage} alt={t.productName} width="24" height="24" className="rounded" />
                            <div>
                              <strong>{t.productName}</strong>
                              <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{t.denomination}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{t.userId}</div>
                          <div className="text-success" style={{ fontSize: '0.75rem' }}>{t.nick}</div>
                        </td>
                        <td className="fw-bold text-success">{formatRupiah(t.total)}</td>
                        <td>{t.createdAt}</td>
                        <td>
                          <span className={`badge ${
                            t.status === 'success' ? 'bg-success' : 
                            t.status === 'failed' ? 'bg-danger' : 'bg-warning text-dark'
                          }`}>
                            {t.status === 'success' ? 'Berhasil' : 
                             t.status === 'failed' ? 'Gagal' : 'Menunggu'}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <select
                              className="form-select form-select-sm order-input py-0"
                              style={{ width: '110px', fontSize: '0.78rem', height: '28px' }}
                              value={t.status}
                              onChange={(e) => handleUpdateTxStatus(t.invoiceId, e.target.value)}
                            >
                              <option value="pending">Menunggu</option>
                              <option value="success">Berhasil</option>
                              <option value="failed">Gagal</option>
                            </select>
                            <button 
                              className="btn btn-outline-danger btn-sm py-0 px-2"
                              style={{ height: '28px' }}
                              onClick={() => handleDeleteTx(t.invoiceId)}
                              title="Hapus"
                            >
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: AKUN PENGGUNA */}
        {activeTab === 'users' && (
          <div className="order-card p-3">
            <h5 className="text-success fw-bold mb-3">Daftar Akun Pengguna Terdaftar</h5>
            <div className="table-responsive">
              <table className="table table-dark table-striped table-hover align-middle" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Avatar</th>
                    <th>Nama Lengkap</th>
                    <th>Email Pengguna</th>
                    <th>Tanggal Terdaftar / Login Terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-secondary">Belum ada pengguna terdaftar.</td>
                    </tr>
                  ) : (
                    adminUsers.map((u, i) => (
                      <tr key={i}>
                        <td>
                          <img 
                            src={u.picture || "https://lh3.googleusercontent.com/a/default-user=s100"} 
                            alt="Avatar" 
                            width="32" 
                            height="32" 
                            className="rounded-circle" 
                          />
                        </td>
                        <td className="fw-semibold text-white">{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.lastLogin || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

