import React, { useState, useEffect } from 'react';
import { productImages } from '../assets/images';
import { stampRewards, stampTypes } from '../data/stampRewards';
import { readStorageList, writeStorageList } from '../lib/storage';
import {
  assignPrizeToRedemption,
  awardStampForTransaction,
  getStampAuditLogs,
  getStampRedeemCodes,
  getStampRedemptions,
  getStampSummary,
  grantStampToUser,
  revokeStampFromUser,
  updateRedemptionDates,
  updateRedemptionStatus,
} from '../lib/stampService';
import {
  getWalletBalance,
  getWalletLedger,
  getWithdrawalRequests,
  addWalletEntry,
  settleWalletEffectsForTransaction,
  updateWithdrawalStatus,
} from '../lib/walletService';
import {
  countLowStockItems,
  hasManagedStock,
  restockLowStockProduct,
} from '../lib/productStock';
import {
  createChatMessage,
  getChatThreadStats,
  getChatThreads,
  getLatestThreadMessage,
  markChatThreadRead,
  saveChatThread,
} from '../lib/chatThreads';
import {
  blockAccount,
  getAccountBlock,
  getBlockedAccounts,
  unblockAccount,
} from '../lib/accountBlocks';
import { hydrateCloudStateKeys } from '../lib/cloudState';

const initialCategories = [
  { id: '1', name: 'Top up Game' },
  { id: '2', name: 'Voucher Game' },
  { id: '3', name: 'Hiburan' },
  { id: '4', name: 'Pulsa & Paket Data' },
  { id: '6', name: 'E-Wallet' },
  { id: '7', name: 'Tagihan' },
  { id: '8', name: 'Gift Card' },
  { id: '9', name: 'Tools' }
];

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
const formatNumber = (num) => new Intl.NumberFormat('id-ID').format(Number(num || 0));
const cleanAdminText = (value, limit = 160) => String(value ?? '').trim().replace(/[<>`{}]/g, '').slice(0, limit);
const ADMIN_TOKEN_KEY = 'goisiin_admin_token';
const makeAdminMessageId = (prefix = 'msg') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const CHAT_SYNC_KEYS = [
  'goisiin_chat_threads',
  'goisiin_chat_messages',
  'goisiin_chat_admin_mode',
  'goisiin_chat_active_admin',
];
const ORDER_NOTIFICATION_TEMPLATES = [
  {
    id: 'ask_issue',
    label: 'Tanya kendala',
    text: 'Kak, apakah ada kendala atau ada yang ingin ditanyakan seputar pesanan ini? Admin Goisiinn siap bantu.',
  },
  {
    id: 'checking_payment',
    label: 'Cek pembayaran',
    text: 'Pembayaran pesanan Kakak sedang kami cek. Jika sudah transfer/bayar, mohon tunggu sebentar ya.',
  },
  {
    id: 'processing_order',
    label: 'Pesanan diproses',
    text: 'Pesanan Kakak sedang diproses. Admin akan bantu pantau sampai statusnya selesai.',
  },
  {
    id: 'need_data',
    label: 'Butuh data',
    text: 'Admin perlu konfirmasi data pesanan Kakak. Mohon balas chat ini agar pesanan bisa dilanjutkan.',
  },
];
const stampRedemptionStatusLabels = {
  pending_prize: 'Menunggu hadiah',
  prize_assigned: 'Hadiah siap reveal',
  claimed: 'Klaim masuk',
  fulfilled: 'Selesai',
  rejected: 'Ditolak',
};

function mergeUsers(...userLists) {
  const usersByEmail = new Map();

  userLists.flat().forEach((user) => {
    const email = cleanAdminText(user?.email || '', 160).toLowerCase();
    if (!email) return;
    const existing = usersByEmail.get(email) || {};
    usersByEmail.set(email, {
      ...existing,
      ...user,
      email,
      name: cleanAdminText(user?.name || existing.name || email, 120),
      picture: user?.picture || existing.picture || '',
      lastLogin: user?.lastLogin || existing.lastLogin || user?.registeredAt || existing.registeredAt || '',
      registeredAt: user?.registeredAt || existing.registeredAt || '',
    });
  });

  return Array.from(usersByEmail.values())
    .sort((a, b) => String(b.lastLogin || b.registeredAt || '').localeCompare(String(a.lastLogin || a.registeredAt || '')));
}

function topEntries(value, limit = 6) {
  return Object.entries(value || {})
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, limit);
}

function formatTrafficHour(hour) {
  if (!hour) return '-';
  const date = new Date(`${hour}:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return hour;
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function fetchAuthUsersForAdmin() {
  const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return [];

  const response = await fetch('/api/admin-users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) return [];
  return Array.isArray(data.users) ? data.users : [];
}

export default function AdminDashboard({ products, onUpdateProducts, adminUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'transactions' | 'users' | 'chats'

  // Transactions & Users state
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [accountBlockRefreshKey, setAccountBlockRefreshKey] = useState(0);
  const [accountBlockNotice, setAccountBlockNotice] = useState('');
  const [stampRefreshKey, setStampRefreshKey] = useState(0);
  const [walletRefreshKey, setWalletRefreshKey] = useState(0);
  const [stampForm, setStampForm] = useState({ email: '', stampNo: 1 });
  const [stampAdminNotice, setStampAdminNotice] = useState('');

  // Product state
  const [editingProduct, setEditingProduct] = useState(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productAdminNotice, setProductAdminNotice] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: '1',
    popular: false,
    active: true,
    discount: '',
    inputLabel: 'Masukkan Player ID',
    denominations: []
  });

  // Chat state
  const [chatThreads, setChatThreads] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [adminMode, setAdminMode] = useState(false);
  const [activeAdmin, setActiveAdmin] = useState('Ardan'); // 'Ardan' | 'Sarah' | 'Ardian'
  const [adminInput, setAdminInput] = useState('');
  const [adminTyping, setAdminTyping] = useState(false);
  const [chatFilter, setChatFilter] = useState('all');
  const [chatSort, setChatSort] = useState('newest');
  const [transactionReplyDrafts, setTransactionReplyDrafts] = useState({});
  const [transactionAdminNotice, setTransactionAdminNotice] = useState('');
  const [walletCreditForm, setWalletCreditForm] = useState({ email: '', amount: '', note: '' });
  const [walletAdminNotice, setWalletAdminNotice] = useState('');
  const [trafficData, setTrafficData] = useState(null);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [trafficError, setTrafficError] = useState('');
  const [trafficRefreshTick, setTrafficRefreshTick] = useState(0);

  // Load transactions and users from cloud-backed local cache + Supabase Auth
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const transactions = readStorageList('goisiin_transactions');
      const cachedUsers = readStorageList('goisiin_users');
      const authUsers = await fetchAuthUsersForAdmin();
      const mergedUsers = mergeUsers(cachedUsers, authUsers);

      if (!isMounted) return;
      setAdminTransactions(transactions);
      setAdminUsers(mergedUsers);

      if (authUsers.length > 0 && JSON.stringify(mergedUsers) !== JSON.stringify(cachedUsers)) {
        writeStorageList('goisiin_users', mergedUsers);
      }
    };
    loadData();
    const timer = setInterval(loadData, 7000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const refreshBlocks = () => setAccountBlockRefreshKey((key) => key + 1);
    window.addEventListener('storage', refreshBlocks);
    window.addEventListener('goisiin:cloud-state-updated', refreshBlocks);
    window.addEventListener('goisiin:blocked-users-updated', refreshBlocks);
    return () => {
      window.removeEventListener('storage', refreshBlocks);
      window.removeEventListener('goisiin:cloud-state-updated', refreshBlocks);
      window.removeEventListener('goisiin:blocked-users-updated', refreshBlocks);
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'traffic') return undefined;

    let isMounted = true;
    const loadTraffic = async () => {
      const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
      if (!token) return;
      setTrafficLoading(true);
      setTrafficError('');
      try {
        const response = await fetch('/api/traffic', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'Data trafik belum bisa dimuat.');
        }
        if (isMounted) setTrafficData(data);
      } catch (error) {
        if (isMounted) setTrafficError(cleanAdminText(error.message || 'Data trafik belum bisa dimuat.', 160));
      } finally {
        if (isMounted) setTrafficLoading(false);
      }
    };

    loadTraffic();
    const timer = setInterval(loadTraffic, 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeTab, trafficRefreshTick]);

  useEffect(() => {
    if (activeTab !== 'users') return undefined;
    let cancelled = false;
    const syncBlockedUsers = async () => {
      await hydrateCloudStateKeys(['goisiin_blocked_users']);
      if (!cancelled) setAccountBlockRefreshKey((key) => key + 1);
    };
    syncBlockedUsers();
    const timer = setInterval(syncBlockedUsers, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab]);

  const handleUpdateTxStatus = (invoiceId, nextStatus) => {
    let stampResult = null;
    let walletResult = null;
    const updated = adminTransactions.map(t => {
      if (t.invoiceId === invoiceId) {
        const previousStatus = String(t.status || '').toLowerCase();
        const nextTx = {
          ...t,
          status: nextStatus,
          refundableAmount: nextStatus === 'failed' && previousStatus === 'success' && t.transactionType !== 'wallet_topup'
            ? Number(t.total || 0)
            : Number(t.refundableAmount || 0),
        };
        if (nextStatus === 'success') stampResult = awardStampForTransaction(nextTx, adminUser?.email || adminUser?.name || 'admin');
        walletResult = settleWalletEffectsForTransaction(nextTx, adminUser?.email || adminUser?.name || 'admin');
        return nextTx;
      }
      return t;
    });
    setAdminTransactions(updated);
    writeStorageList('goisiin_transactions', updated);
    if (stampResult?.ok || walletResult?.ok) {
      window.dispatchEvent(new Event('storage'));
      setWalletRefreshKey((key) => key + 1);
    }
  };

  const handleDeleteTx = (invoiceId) => {
    if (window.confirm(`Kakak yakin ingin menghapus invoice #${invoiceId}?`)) {
      const updated = adminTransactions.filter(t => t.invoiceId !== invoiceId);
      setAdminTransactions(updated);
      writeStorageList('goisiin_transactions', updated);
    }
  };

  // Load chats from localStorage
  useEffect(() => {
    const loadChats = () => {
      const threads = getChatThreads();
      setChatThreads(threads);

      const nextSelectedId = selectedChatId && threads.some((thread) => thread.id === selectedChatId)
        ? selectedChatId
        : (threads[0]?.id || null);
      if (nextSelectedId !== selectedChatId) setSelectedChatId(nextSelectedId);

      const selectedThread = threads.find((thread) => thread.id === nextSelectedId);
      setChatMessages(selectedThread?.messages || []);
      setAdminMode(Boolean(selectedThread?.adminMode));
      if (selectedThread?.activeAdmin) setActiveAdmin(selectedThread.activeAdmin);
    };

    loadChats();
    // Poll for changes every 2 seconds to simulate real-time updates
    const pollTimer = setInterval(loadChats, 2000);
    return () => clearInterval(pollTimer);
  }, [selectedChatId]);

  useEffect(() => {
    if (activeTab !== 'chats') return undefined;
    let cancelled = false;
    const syncChats = async () => {
      await hydrateCloudStateKeys(CHAT_SYNC_KEYS);
      if (cancelled) return;
      const threads = getChatThreads();
      setChatThreads(threads);
      const nextSelectedId = selectedChatId && threads.some((thread) => thread.id === selectedChatId)
        ? selectedChatId
        : (threads[0]?.id || null);
      if (nextSelectedId !== selectedChatId) setSelectedChatId(nextSelectedId);
      const selectedThread = threads.find((thread) => thread.id === nextSelectedId);
      setChatMessages(selectedThread?.messages || []);
      setAdminMode(Boolean(selectedThread?.adminMode));
      if (selectedThread?.activeAdmin) setActiveAdmin(selectedThread.activeAdmin);
    };

    syncChats();
    const timer = setInterval(syncChats, 4500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeTab, selectedChatId]);

  const selectChatThread = (thread) => {
    if (!thread?.id) return;
    setSelectedChatId(thread.id);
    const marked = markChatThreadRead(thread.id, 'admin');
    if (marked) {
      const threads = getChatThreads();
      setChatThreads(threads);
      setChatMessages(marked.messages || []);
    }
  };

  const openUserChatFromEmail = (email) => {
    const userEmail = cleanAdminText(email || '', 160).toLowerCase();
    if (!userEmail) return null;
    const threadId = `user:${userEmail}`;
    const existing = getChatThreads().find((thread) => thread.id === threadId);
    return existing || {
      id: threadId,
      userName: userEmail,
      userEmail,
      isGuest: false,
      messages: [],
      adminMode: true,
      activeAdmin,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adminLastReadAt: new Date().toISOString(),
      userLastReadAt: '',
    };
  };

  const sendAdminMessageToUser = ({ userEmail, text, invoiceId = null, productName = '' }) => {
    const safeEmail = cleanAdminText(userEmail || '', 160).toLowerCase();
    const safeText = cleanAdminText(text, 700);
    if (!safeEmail || !safeText) return { ok: false, reason: 'Email user atau pesan kosong.' };

    const thread = openUserChatFromEmail(safeEmail);
    const adminMessage = createChatMessage({
      id: makeAdminMessageId('msg'),
      sender: 'cs',
      agent: activeAdmin,
      invoiceId,
      kind: invoiceId ? 'order_followup' : 'admin_message',
      text: invoiceId
        ? `Update pesanan #${invoiceId}${productName ? ` (${productName})` : ''}: ${safeText}`
        : safeText,
    });
    const saved = saveChatThread({
      ...thread,
      userName: thread.userName || safeEmail,
      userEmail: safeEmail,
      isGuest: false,
      adminMode: true,
      activeAdmin,
      messages: [...(thread.messages || []), adminMessage],
      adminLastReadAt: new Date().toISOString(),
      lastOrderInvoiceId: invoiceId || thread.lastOrderInvoiceId || null,
    });
    const threads = getChatThreads();
    setChatThreads(threads);
    setSelectedChatId(saved.id);
    setChatMessages(saved.messages || []);
    setAdminMode(true);
    setTransactionAdminNotice(`Pesan admin terkirim ke ${safeEmail}.`);
    return { ok: true, thread: saved };
  };

  const handleSendTransactionMessage = (transaction, customText = '') => {
    const message = customText || transactionReplyDrafts[transaction.invoiceId] || 'Kak, apakah ada kendala atau ada yang ingin ditanyakan seputar pesanan ini? Admin Goisiinn siap bantu.';
    const result = sendAdminMessageToUser({
      userEmail: transaction.userEmail,
      invoiceId: transaction.invoiceId,
      productName: transaction.productName,
      text: message,
    });
    if (!result.ok) {
      setTransactionAdminNotice(result.reason);
      return;
    }
    setTransactionReplyDrafts((drafts) => ({ ...drafts, [transaction.invoiceId]: '' }));
  };

  const handleManualWalletCredit = (event) => {
    event.preventDefault();
    const email = cleanAdminText(walletCreditForm.email, 160).toLowerCase();
    const amount = Number(walletCreditForm.amount || 0);
    const note = cleanAdminText(walletCreditForm.note || 'Penyesuaian saldo oleh admin', 180);
    if (!email || amount <= 0) {
      setWalletAdminNotice('Email dan nominal saldo wajib valid.');
      return;
    }
    const result = addWalletEntry({
      userEmail: email,
      kind: 'admin_credit',
      delta: amount,
      note,
      metadata: { actor: adminActor },
    });
    if (!result.ok) {
      setWalletAdminNotice('Gagal menambahkan saldo. Cek email dan nominal.');
      return;
    }
    setWalletAdminNotice(`Saldo ${formatRupiah(amount)} berhasil ditambahkan ke ${email}.`);
    setWalletCreditForm({ email: '', amount: '', note: '' });
    setWalletRefreshKey((key) => key + 1);
  };

  const handleManualTransactionRefund = (transaction) => {
    const amount = Number(transaction.refundableAmount || transaction.total || 0);
    if (!transaction.userEmail || amount <= 0) {
      setWalletAdminNotice('Refund manual butuh email user dan nominal valid.');
      return;
    }
    const result = addWalletEntry({
      userEmail: transaction.userEmail,
      kind: 'manual_failed_refund',
      delta: amount,
      invoiceId: transaction.invoiceId,
      note: `Refund manual pesanan gagal ${transaction.invoiceId}`,
      metadata: { actor: adminActor, productName: transaction.productName },
    });
    setWalletAdminNotice(result.ok
      ? `Refund manual ${formatRupiah(amount)} masuk ke saldo ${transaction.userEmail}.`
      : 'Refund manual gagal atau sudah pernah diproses untuk invoice ini.');
    setWalletRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    if (activeTab !== 'chats' || !selectedChatId || chatMessages.length === 0) return;
    const marked = markChatThreadRead(selectedChatId, 'admin');
    if (marked) {
      setChatThreads(getChatThreads());
    }
  }, [activeTab, selectedChatId, chatMessages.length]);

  const handleSaveChats = (msgs, mode = adminMode, adminName = activeAdmin) => {
    if (!selectedChatId) return;
    const safeMessages = Array.isArray(msgs) ? msgs.slice(-300) : [];
    const latestThreads = getChatThreads();
    const existingThread = latestThreads.find((thread) => thread.id === selectedChatId) || chatThreads.find((thread) => thread.id === selectedChatId) || {
      id: selectedChatId,
      userName: 'Pengunjung',
      userEmail: '',
      messages: [],
    };
    const savedThread = saveChatThread({
      ...existingThread,
      messages: safeMessages,
      adminMode: mode,
      activeAdmin: adminName,
    });
    const threads = getChatThreads();
    setChatThreads(threads);
    setSelectedChatId(savedThread.id);
    setChatMessages(savedThread.messages || safeMessages);
    setAdminMode(mode);
    setActiveAdmin(adminName);
  };

  const handleAdminSendChat = (e) => {
    e.preventDefault();
    if (!adminInput.trim() || !selectedChatId) return;

    setAdminTyping(true);
    const textToSend = cleanAdminText(adminInput, 500);
    if (!textToSend) return;
    setAdminInput('');

    // Simulate typing delay (1.5s to 3s)
    const typingDelay = Math.floor(Math.random() * 1500) + 1500;
    setTimeout(() => {
      setAdminTyping(false);
      const latestThread = getChatThreads().find((thread) => thread.id === selectedChatId);
      const baseMessages = latestThread?.messages || chatMessages;
      const adminMsg = createChatMessage({
        id: makeAdminMessageId('msg'),
        sender: 'cs',
        agent: activeAdmin,
        text: textToSend,
      });

      const updated = [...baseMessages, adminMsg];
      handleSaveChats(updated, true, activeAdmin);
    }, typingDelay);
  };

  const handleToggleAdminMode = () => {
    if (!selectedChatId) return;
    const nextMode = !adminMode;
    const latestThread = getChatThreads().find((thread) => thread.id === selectedChatId);
    const baseMessages = latestThread?.messages || chatMessages;
    const sysMsg = createChatMessage({
      id: makeAdminMessageId('sys'),
      sender: 'system',
      text: nextMode
        ? `Chat dialihkan sepenuhnya ke Admin ${activeAdmin}. AI Vindy dinonaktifkan.`
        : 'Chat dialihkan kembali ke AI Vindy. Admin keluar.',
    });
    handleSaveChats([...baseMessages, sysMsg], nextMode, activeAdmin);
  };

  // Product CRUD
  const handleEditProduct = (prod) => {
    setEditingProduct(prod);
    setIsAddingProduct(false);
    setFormData({
      name: cleanAdminText(prod.name, 80),
      category: prod.category,
      popular: prod.popular || false,
      active: prod.active !== false,
      discount: cleanAdminText(prod.discount || '', 40),
      inputLabel: cleanAdminText(prod.inputLabel || 'Masukkan Player ID', 120),
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
      active: true,
      discount: '',
      inputLabel: 'Masukkan Player ID',
      denominations: [
        { id: `d-${Date.now()}-1`, name: '50 Diamonds', originalPrice: 16000, price: 14500, points: 50, stock: 10 }
      ]
    });
  };

  const handleDeleteProduct = (productId) => {
    if (window.confirm('Apakah kakak yakin ingin menghapus produk ini?')) {
      const updated = products.filter(p => p.id !== productId);
      onUpdateProducts(updated);
    }
  };

  const handleToggleProductActive = (productId) => {
    const updated = products.map((product) => (
      product.id === productId ? { ...product, active: product.active === false } : product
    ));
    onUpdateProducts(updated);
  };

  const handleActivateAllProducts = () => {
    const updated = products.map((product) => ({ ...product, active: true }));
    onUpdateProducts(updated);
    setProductAdminNotice('Semua produk sudah diaktifkan.');
  };

  const handleAutoRestockProduct = (productId) => {
    let changed = 0;
    const updated = products.map((product) => {
      if (product.id !== productId || !hasManagedStock(product)) return product;
      const result = restockLowStockProduct(product);
      changed += result.changed;
      return result.product;
    });
    onUpdateProducts(updated);
    setProductAdminNotice(changed > 0
      ? `Auto restock berhasil untuk ${changed} nominal stok rendah.`
      : 'Tidak ada nominal stok rendah di produk ini.');
  };

  const handleAutoRestockAll = () => {
    let changed = 0;
    const updated = products.map((product) => {
      if (!hasManagedStock(product)) return product;
      const result = restockLowStockProduct(product);
      changed += result.changed;
      return result.product;
    });
    onUpdateProducts(updated);
    setProductAdminNotice(changed > 0
      ? `Auto restock semua berhasil. ${changed} nominal stok rendah diisi random 8-25.`
      : 'Tidak ada nominal dengan stok di bawah 3.');
  };

  const handleSaveProduct = (e) => {
    e.preventDefault();
    const safeName = cleanAdminText(formData.name, 80);
    if (!safeName) return;
    const safeDenominations = formData.denominations.map((denom) => ({
      ...denom,
      id: cleanAdminText(denom.id || `d-${Date.now()}`, 80),
      name: cleanAdminText(denom.name, 140),
      originalPrice: Number(denom.originalPrice || denom.price || 0),
      price: Number(denom.price || 0),
      points: Number(denom.points || 0),
      stock: Number(denom.stock || 0),
      accessType: cleanAdminText(denom.accessType || '', 40),
      duration: cleanAdminText(denom.duration || '', 80),
      warranty: cleanAdminText(denom.warranty || '', 100),
      description: cleanAdminText(denom.description || '', 220),
    }));

    if (isAddingProduct) {
      const newId = safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `produk-${Date.now()}`;
      const newProd = {
        id: newId,
        name: safeName,
        category: formData.category,
        image: productImages['mobile-legend'], // Default fallback icon
        popular: formData.popular,
        active: formData.active,
        discount: cleanAdminText(formData.discount, 40),
        inputLabel: cleanAdminText(formData.inputLabel, 120),
        inputFields: [
          { name: 'userId', placeholder: 'Masukkan Player ID', type: 'number' }
        ],
        denominations: safeDenominations
      };
      onUpdateProducts([...products, newProd]);
      setIsAddingProduct(false);
    } else if (editingProduct) {
      const updated = products.map(p => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name: safeName,
            category: formData.category,
            popular: formData.popular,
            active: formData.active,
            discount: cleanAdminText(formData.discount, 40),
            inputLabel: cleanAdminText(formData.inputLabel, 120),
            denominations: safeDenominations
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
      points: 100,
      stock: 10
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

  const reloadStampAdmin = () => setStampRefreshKey((key) => key + 1);
  const stampRedemptions = stampRefreshKey >= 0 ? getStampRedemptions() : [];
  const stampCodes = stampRefreshKey >= 0 ? getStampRedeemCodes() : [];
  const stampAuditLogs = stampRefreshKey >= 0 ? getStampAuditLogs() : [];
  const walletLedger = walletRefreshKey >= 0 ? getWalletLedger() : [];
  const withdrawalRequests = walletRefreshKey >= 0 ? getWithdrawalRequests() : [];
  const adminActor = adminUser?.email || adminUser?.name || 'admin';
  const blockedAccounts = accountBlockRefreshKey >= 0 ? getBlockedAccounts() : [];
  const chatThreadsWithStats = chatThreads.map((thread) => ({
    ...thread,
    stats: getChatThreadStats(thread),
  }));
  const displayedChatThreads = chatThreadsWithStats
    .filter((thread) => {
      if (chatFilter === 'unread') return thread.stats.unreadForAdmin;
      if (chatFilter === 'unanswered') return thread.stats.unanswered;
      if (chatFilter === 'admin') return thread.adminMode;
      return true;
    })
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return chatSort === 'oldest' ? aTime - bTime : bTime - aTime;
    });
  const unreadAdminCount = chatThreadsWithStats.filter((thread) => thread.stats.unreadForAdmin).length;
  const unansweredCount = chatThreadsWithStats.filter((thread) => thread.stats.unanswered).length;

  const reloadBlockedAccounts = () => setAccountBlockRefreshKey((key) => key + 1);

  const handleBlockAccount = (email, defaultName = '') => {
    const targetEmail = cleanAdminText(email, 160).toLowerCase();
    if (!targetEmail) {
      setAccountBlockNotice('Email akun tidak valid.');
      return;
    }
    const reason = window.prompt(
      `Alasan blokir akun ${defaultName || targetEmail}?`,
      'Aktivitas akun dibatasi oleh admin. Hubungi CS Goisiinn untuk bantuan.',
    );
    if (reason === null) return;
    const result = blockAccount(targetEmail, reason, adminActor);
    setAccountBlockNotice(result.ok
      ? `Akun ${targetEmail} berhasil diblokir.`
      : 'Gagal memblokir akun.');
    reloadBlockedAccounts();
  };

  const handleUnblockAccount = (email) => {
    const targetEmail = cleanAdminText(email, 160).toLowerCase();
    if (!targetEmail) {
      setAccountBlockNotice('Email akun tidak valid.');
      return;
    }
    const result = unblockAccount(targetEmail);
    setAccountBlockNotice(result.ok
      ? `Akun ${targetEmail} sudah dibuka kembali.`
      : 'Gagal membuka blokir akun.');
    reloadBlockedAccounts();
  };

  const handleAdminGrantStamp = (e) => {
    e.preventDefault();
    const result = grantStampToUser(stampForm.email, stampForm.stampNo, adminActor);
    if (!result.ok) {
      setStampAdminNotice('Gagal memberi stamp. Cek email dan nomor stamp.');
      return;
    }
    setStampAdminNotice(`Stamp ${stampForm.stampNo} berhasil diberikan ke ${stampForm.email}.`);
    setStampForm({ email: '', stampNo: 1 });
    reloadStampAdmin();
  };

  const handleAdminRevokeStamp = (email, stampNo) => {
    const result = revokeStampFromUser(email, stampNo, adminActor);
    if (!result.ok) {
      setStampAdminNotice('Stamp tidak tersedia untuk dicabut.');
      return;
    }
    setStampAdminNotice(`Stamp ${stampNo} berhasil dicabut dari ${email}.`);
    reloadStampAdmin();
  };

  return (
    <div className="main main-surface py-4">
      <div className="container col-md-8 col-12">
        {/* Header Dashboard */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-white fw-bold mb-1" style={{ fontFamily: "'Oxanium', sans-serif" }}>
              🛡️ Dashboard Admin Goisiinn
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
            {unreadAdminCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {unreadAdminCount}
              </span>
            )}
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'stamps' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setActiveTab('stamps')}
          >
            Stamp Reward
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'traffic' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setActiveTab('traffic')}
          >
            Trafik
          </button>
        </div>

        {/* TAB 1: KELOLA PRODUK */}
        {activeTab === 'products' && (
          <div className="row g-3">
            {/* List Produk */}
            <div className={editingProduct || isAddingProduct ? 'col-md-5 col-12' : 'col-12'}>
              <div className="order-card p-3">
                <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">
                  <h5 className="text-success m-0 fw-bold">Daftar Produk</h5>
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-outline-success btn-sm" onClick={handleActivateAllProducts}>
                      <i className="bi bi-check2-circle me-1"></i> Aktifkan Semua
                    </button>
                    <button className="btn btn-outline-warning btn-sm" onClick={handleAutoRestockAll}>
                      <i className="bi bi-arrow-repeat me-1"></i> Auto Restock Semua
                    </button>
                    {!isAddingProduct && !editingProduct && (
                      <button className="btn btn-success btn-sm" onClick={handleStartAddProduct}>
                        <i className="bi bi-plus-lg me-1"></i> Tambah Produk
                      </button>
                    )}
                  </div>
                </div>
                {productAdminNotice && (
                  <div className="alert alert-success py-2 px-3 mb-3" style={{ fontSize: '0.82rem' }}>
                    {productAdminNotice}
                  </div>
                )}

                <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  <table className="table table-dark table-striped table-hover align-middle" style={{ fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Kategori</th>
                        <th>Populer</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <img
                                src={p.image}
                                alt={p.name}
                                width="32"
                                height="32"
                                className="rounded"
                                onError={(event) => { event.currentTarget.src = '/gassets/logo.png'; }}
                              />
                              <span>
                                {p.name}
                                {countLowStockItems(p) > 0 && (
                                  <small className="d-block text-warning">{countLowStockItems(p)} nominal stok &lt; 3</small>
                                )}
                              </span>
                            </div>
                          </td>
                          <td>
                            {initialCategories.find(c => c.id === p.category)?.name || p.category}
                          </td>
                          <td>{p.popular ? 'Ya' : 'Tidak'}</td>
                          <td>
                            <span className={`badge ${p.active === false ? 'bg-secondary' : 'bg-success'}`}>
                              {p.active === false ? 'Nonaktif' : 'Aktif'}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <button className="btn btn-outline-success btn-sm p-1 px-2" onClick={() => handleEditProduct(p)} aria-label="Edit">
                                <i className="bi bi-pencil-fill"></i>
                              </button>
                              <button
                                className="btn btn-outline-warning btn-sm p-1 px-2"
                                onClick={() => handleToggleProductActive(p.id)}
                                aria-label={p.active === false ? 'Aktifkan' : 'Nonaktifkan'}
                                title={p.active === false ? 'Aktifkan produk' : 'Nonaktifkan produk'}
                              >
                                <i className={`bi ${p.active === false ? 'bi-eye-fill' : 'bi-eye-slash-fill'}`}></i>
                              </button>
                              {hasManagedStock(p) && (
                                <button
                                  className="btn btn-outline-info btn-sm p-1 px-2"
                                  onClick={() => handleAutoRestockProduct(p.id)}
                                  aria-label="Auto restock produk"
                                  title="Isi ulang nominal stok di bawah 3 dengan angka random 8-25"
                                >
                                  <i className="bi bi-arrow-repeat"></i>
                                </button>
                              )}
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
                      <div className="d-flex flex-column gap-2">
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
                        <div className="form-check form-switch">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="switchActive"
                            checked={formData.active}
                            onChange={e => setFormData({ ...formData, active: e.target.checked })}
                          />
                          <label className="form-check-label text-white small" htmlFor="switchActive">Produk aktif dan bisa dibeli</label>
                        </div>
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
                          <div key={denom.id} className="admin-denom-row mb-2 p-2 border border-secondary rounded">
                            <input
                              type="text"
                              className="form-control order-input form-control-sm"
                              value={denom.name}
                              onChange={e => handleUpdateDenom(denom.id, 'name', e.target.value)}
                              placeholder="Nama nominal (misal: 100 Diamonds)"
                              required
                            />
                            <input
                              type="number"
                              className="form-control order-input form-control-sm"
                              value={denom.price}
                              onChange={e => handleUpdateDenom(denom.id, 'price', parseInt(e.target.value) || 0)}
                              placeholder="Harga"
                              required
                            />
                            <input
                              type="number"
                              className="form-control order-input form-control-sm"
                              value={Number.isFinite(Number(denom.stock)) ? denom.stock : ''}
                              onChange={e => handleUpdateDenom(denom.id, 'stock', parseInt(e.target.value) || 0)}
                              placeholder="Stok"
                            />
                            <input
                              type="text"
                              className="form-control order-input form-control-sm"
                              value={denom.description || ''}
                              onChange={e => handleUpdateDenom(denom.id, 'description', e.target.value)}
                              placeholder="Deskripsi nominal"
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
                      if (selectedChatId) handleSaveChats(chatMessages, adminMode, e.target.value);
                    }}
                  >
                    <option value="Ardan">Ardan</option>
                    <option value="Sarah">Sarah</option>
                    <option value="Ardian">Ardian</option>
                  </select>
                </div>

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label text-secondary small mb-0">Percakapan Customer</label>
                    <span className="badge bg-success">{displayedChatThreads.length}</span>
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-7">
                      <select
                        className="form-select form-select-sm order-input"
                        value={chatFilter}
                        onChange={(event) => setChatFilter(event.target.value)}
                      >
                        <option value="all">Semua ({chatThreads.length})</option>
                        <option value="unread">Belum dibaca ({unreadAdminCount})</option>
                        <option value="unanswered">Belum dijawab ({unansweredCount})</option>
                        <option value="admin">Admin mode</option>
                      </select>
                    </div>
                    <div className="col-5">
                      <select
                        className="form-select form-select-sm order-input"
                        value={chatSort}
                        onChange={(event) => setChatSort(event.target.value)}
                      >
                        <option value="newest">Terbaru</option>
                        <option value="oldest">Terlama</option>
                      </select>
                    </div>
                  </div>
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {displayedChatThreads.length === 0 ? (
                      <div className="text-secondary small border border-secondary rounded p-2">
                        Belum ada percakapan masuk.
                      </div>
                    ) : (
                      displayedChatThreads.map((thread) => {
                        const latest = getLatestThreadMessage(thread);
                        const isActive = thread.id === selectedChatId;
                        return (
                          <button
                            type="button"
                            key={thread.id}
                            className={`btn text-start border ${isActive ? 'btn-success border-success' : 'btn-dark border-secondary'}`}
                            onClick={() => selectChatThread(thread)}
                            style={{ fontSize: '0.82rem' }}
                          >
                            <div className="d-flex justify-content-between gap-2">
                              <strong className="text-truncate">{thread.userName || 'Pengunjung'}</strong>
                              <span className="d-flex gap-1 flex-wrap justify-content-end">
                                {thread.stats.unreadForAdmin && <span className="badge bg-warning text-dark">Baru</span>}
                                {thread.stats.unanswered && <span className="badge bg-info text-dark">Belum dijawab</span>}
                                {thread.adminMode && <span className="badge bg-danger">Admin</span>}
                              </span>
                            </div>
                            <div className={isActive ? 'text-white-50 text-truncate' : 'text-secondary text-truncate'}>
                              {thread.userEmail || 'Guest'}
                            </div>
                            <div className={isActive ? 'text-white-50 text-truncate' : 'text-secondary text-truncate'}>
                              {latest?.text || 'Belum ada pesan'}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
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
                <h5 className="text-success fw-bold mb-3">
                  Obrolan Customer
                  {selectedChatId && (
                    <span className="text-secondary fw-normal ms-2" style={{ fontSize: '0.85rem' }}>
                      {chatThreads.find((thread) => thread.id === selectedChatId)?.userName || 'Pengunjung'}
                    </span>
                  )}
                </h5>

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
                    disabled={!adminMode || !selectedChatId}
                  />
                  <button type="submit" className="btn btn-success" disabled={!adminInput.trim() || !adminMode || !selectedChatId}>
                    Kirim
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
        {/* TAB 3: TRANSAKSI CUSTOMER */}
        {activeTab === 'transactions' && (
          <>
            <div className="order-card p-3">
              <h5 className="text-success fw-bold mb-3">Daftar Transaksi Customer</h5>
              {transactionAdminNotice && (
                <div className="alert alert-info py-2 px-3" style={{ fontSize: '0.84rem' }}>
                  {transactionAdminNotice}
                </div>
              )}
              <div className="table-responsive">
              <table className="table table-dark table-striped table-hover align-middle" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Email Pembeli</th>
                    <th>Produk / Nominal</th>
                    <th>ID Game / Nick</th>
                    <th>Pembayaran</th>
                    <th>Total</th>
                    <th>Tanggal</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {adminTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-4 text-secondary">Belum ada transaksi masuk.</td>
                    </tr>
                  ) : (
                    adminTransactions.map(t => (
                      <tr key={t.invoiceId}>
                        <td className="fw-semibold">#{t.invoiceId}</td>
                        <td>{t.userEmail || <span className="text-secondary">Guest (No Login)</span>}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <img
                              src={t.productImage}
                              alt={t.productName}
                              width="24"
                              height="24"
                              className="rounded"
                              onError={(event) => { event.currentTarget.src = '/gassets/logo.png'; }}
                            />
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
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {t.paymentImage && (
                              <img
                                src={t.paymentImage}
                                alt={t.paymentMethod}
                                width="34"
                                height="22"
                                className="rounded bg-light p-1"
                                style={{ objectFit: 'contain' }}
                                onError={(event) => { event.currentTarget.style.display = 'none'; }}
                              />
                            )}
                            <div>
                              <strong>{t.paymentMethod || '-'}</strong>
                              <div className="text-secondary" style={{ fontSize: '0.73rem' }}>{t.paymentCategory || '-'}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold text-success">{formatRupiah(t.total)}</div>
                          <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                            Subtotal {formatRupiah(t.subtotal)} · Fee {formatRupiah(t.fee)}
                          </div>
                        </td>
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
                          <div className="d-flex flex-column gap-1" style={{ minWidth: '240px' }}>
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
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-outline-info btn-sm py-0 px-2"
                                style={{ height: '28px', fontSize: '0.74rem' }}
                                disabled={!t.userEmail}
                                onClick={() => handleSendTransactionMessage(t)}
                                title="Kirim popup/notifikasi pesanan ke user"
                              >
                                Kirim Notif
                              </button>
                              <select
                                className="form-select form-select-sm order-input py-0"
                                style={{ width: '132px', fontSize: '0.74rem', height: '28px' }}
                                defaultValue=""
                                disabled={!t.userEmail}
                                onChange={(event) => {
                                  const template = ORDER_NOTIFICATION_TEMPLATES.find((item) => item.id === event.target.value);
                                  if (template) {
                                    handleSendTransactionMessage(t, template.text);
                                    event.target.value = '';
                                  }
                                }}
                              >
                                <option value="">Template notif</option>
                                {ORDER_NOTIFICATION_TEMPLATES.map((template) => (
                                  <option value={template.id} key={template.id}>{template.label}</option>
                                ))}
                              </select>
                              {t.status === 'failed' && (
                                <button
                                  type="button"
                                  className="btn btn-outline-warning btn-sm py-0 px-2"
                                  style={{ height: '28px', fontSize: '0.74rem' }}
                                  disabled={!t.userEmail}
                                  onClick={() => handleManualTransactionRefund(t)}
                                >
                                  Refund saldo
                                </button>
                              )}
                            </div>
                            <div className="input-group input-group-sm">
                              <input
                                className="form-control order-input"
                                placeholder="Tulis notif pesanan khusus..."
                                value={transactionReplyDrafts[t.invoiceId] || ''}
                                onChange={(event) => setTransactionReplyDrafts((drafts) => ({
                                  ...drafts,
                                  [t.invoiceId]: event.target.value,
                                }))}
                              />
                              <button
                                type="button"
                                className="btn btn-success"
                                disabled={!t.userEmail || !transactionReplyDrafts[t.invoiceId]?.trim()}
                                onClick={() => handleSendTransactionMessage(t, transactionReplyDrafts[t.invoiceId])}
                                title="Kirim sebagai notifikasi popup dan masuk ke chat user"
                              >
                                Kirim Notif
                              </button>
                            </div>
                            <small className="text-secondary">
                              Notif muncul di layar user saat dia buka web/login, dan juga masuk ke chat.
                            </small>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </div>
            <div className="order-card p-3 mt-3">
              <h5 className="text-success fw-bold mb-2">Tambah Saldo Goisiinn Manual</h5>
              <p className="text-secondary mb-3" style={{ fontSize: '0.84rem' }}>
                Dipakai admin untuk refund/penyesuaian saldo ketika pembayaran gagal atau ada kendala yang sudah dicek manual.
              </p>
              <form className="row g-2 align-items-end" onSubmit={handleManualWalletCredit}>
                <div className="col-lg-4 col-12">
                  <label className="form-label text-secondary small">Email user</label>
                  <input
                    className="form-control order-input"
                    type="email"
                    placeholder="email@contoh.com"
                    value={walletCreditForm.email}
                    onChange={(event) => setWalletCreditForm({ ...walletCreditForm, email: event.target.value })}
                    list="admin-wallet-users"
                    required
                  />
                </div>
                <div className="col-lg-3 col-12">
                  <label className="form-label text-secondary small">Nominal saldo</label>
                  <input
                    className="form-control order-input"
                    type="number"
                    min="1"
                    placeholder="100000"
                    value={walletCreditForm.amount}
                    onChange={(event) => setWalletCreditForm({ ...walletCreditForm, amount: event.target.value })}
                    required
                  />
                </div>
                <div className="col-lg-3 col-12">
                  <label className="form-label text-secondary small">Catatan</label>
                  <input
                    className="form-control order-input"
                    placeholder="Refund transaksi gagal"
                    value={walletCreditForm.note}
                    onChange={(event) => setWalletCreditForm({ ...walletCreditForm, note: event.target.value })}
                  />
                </div>
                <div className="col-lg-2 col-12">
                  <button className="btn btn-success w-100 fw-bold" type="submit">Tambah Saldo</button>
                </div>
                <datalist id="admin-wallet-users">
                  {adminUsers.map((userItem) => <option value={userItem.email} key={userItem.email}>{userItem.name}</option>)}
                </datalist>
              </form>
              {walletAdminNotice && (
                <div className="alert alert-info py-2 px-3 mt-3 mb-0" style={{ fontSize: '0.84rem' }}>
                  {walletAdminNotice}
                </div>
              )}
            </div>
            <div className="order-card p-3 mt-3">
              <h5 className="text-success fw-bold mb-3">Pengajuan Tarik Saldo Goisiinn</h5>
              <div className="table-responsive">
                <table className="table table-dark table-striped align-middle" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Tujuan</th>
                      <th>Nominal</th>
                      <th>Fee</th>
                      <th>Diterima</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawalRequests.length === 0 ? (
                      <tr><td colSpan="6" className="text-secondary text-center">Belum ada pengajuan tarik saldo.</td></tr>
                    ) : withdrawalRequests.map((request) => (
                      <tr key={request.id}>
                        <td>{request.userEmail}<br /><small>{request.createdAt}</small></td>
                        <td>{request.destinationType} · {request.provider}<br /><small>{request.accountName} / {request.accountNumber}</small></td>
                        <td className="fw-bold">{formatRupiah(request.amount)}</td>
                        <td>{formatRupiah(request.fee)}</td>
                        <td className="text-success fw-bold">{formatRupiah(request.payoutAmount)}</td>
                        <td>
                          <select
                            className="form-select form-select-sm order-input"
                            value={request.status}
                            onChange={(event) => {
                              updateWithdrawalStatus(request.id, event.target.value, adminActor);
                              setWalletRefreshKey((key) => key + 1);
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Diproses</option>
                            <option value="fulfilled">Selesai</option>
                            <option value="rejected">Ditolak / Refund</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="order-card p-3 mt-3">
              <h5 className="text-success fw-bold mb-3">Ledger Saldo Terbaru</h5>
              <div className="stamp-admin-log">
                {walletLedger.length === 0 ? (
                  <p className="text-secondary">Belum ada aktivitas saldo.</p>
                ) : walletLedger.slice(0, 30).map((entry) => (
                  <div className="stamp-admin-log__item" key={entry.id}>
                    <strong className={entry.delta > 0 ? 'text-success' : 'text-danger'}>
                      {entry.delta > 0 ? '+' : ''}{formatRupiah(entry.delta)}
                    </strong>
                    <span>{entry.userEmail} · {entry.kind}<br />{entry.note} · {entry.createdAt}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* TAB 4: AKUN PENGGUNA */}
        {activeTab === 'users' && (
          <div className="order-card p-3">
            <h5 className="text-success fw-bold mb-3">Daftar Akun Pengguna Terdaftar</h5>
            {accountBlockNotice && (
              <div className="alert alert-info py-2 px-3" style={{ fontSize: '0.84rem' }}>
                {accountBlockNotice}
              </div>
            )}
            <div className="table-responsive">
              <table className="table table-dark table-striped table-hover align-middle" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Avatar</th>
                    <th>Nama Lengkap</th>
                    <th>Email Pengguna</th>
                    <th>Saldo Goisiinn</th>
                    <th>Tanggal Terdaftar / Login Terakhir</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-secondary">Belum ada pengguna terdaftar.</td>
                    </tr>
                  ) : (
                    adminUsers.map((u, i) => {
                      const block = getAccountBlock(u.email);
                      const blocked = Boolean(block);
                      return (
                      <tr key={i} className={blocked ? 'table-danger' : ''}>
                        <td>
                          <img
                            src={u.picture || "https://lh3.googleusercontent.com/a/default-user=s100"}
                            alt="Avatar"
                            width="32"
                            height="32"
                            className="rounded-circle"
                            onError={(event) => { event.currentTarget.src = '/gassets/logo.png'; }}
                          />
                        </td>
                        <td className="fw-semibold text-white">{u.name}</td>
                        <td>{u.email}</td>
                        <td className="text-success fw-bold">{formatRupiah(getWalletBalance(u.email))}</td>
                        <td>{u.lastLogin || 'N/A'}</td>
                        <td>
                          {blocked ? (
                            <div>
                              <span className="badge bg-danger">Diblokir</span>
                              <div className="text-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                                {block.reason}<br />
                                {block.blockedAt}
                              </div>
                            </div>
                          ) : (
                            <span className="badge bg-success">Aktif</span>
                          )}
                        </td>
                        <td>
                          {blocked ? (
                            <button
                              className="btn btn-outline-success btn-sm"
                              type="button"
                              onClick={() => handleUnblockAccount(u.email)}
                            >
                              Buka Blokir
                            </button>
                          ) : (
                            <button
                              className="btn btn-outline-danger btn-sm"
                              type="button"
                              onClick={() => handleBlockAccount(u.email, u.name)}
                            >
                              Blokir Akun
                            </button>
                          )}
                        </td>
                      </tr>
                    );})
                  )}
                </tbody>
              </table>
            </div>
            {blockedAccounts.length > 0 && (
              <div className="mt-3">
                <h6 className="text-danger fw-bold mb-2">Akun Terblokir ({blockedAccounts.length})</h6>
                <div className="d-flex flex-column gap-2">
                  {blockedAccounts.slice(0, 30).map((account) => (
                    <div className="blocked-account-row" key={account.email}>
                      <div>
                        <strong>{account.email}</strong>
                        <span>{account.reason} · {account.blockedAt}</span>
                      </div>
                      <button
                        className="btn btn-outline-success btn-sm"
                        type="button"
                        onClick={() => handleUnblockAccount(account.email)}
                      >
                        Buka Blokir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'traffic' && (
          <div className="row g-3">
            <div className="col-12">
              <div className="order-card p-3">
                <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                  <div>
                    <h5 className="text-success fw-bold mb-1">Trafik Pengunjung Website</h5>
                    <p className="text-secondary mb-0" style={{ fontSize: '0.84rem' }}>
                      Agregasi hemat 72 jam terakhir. Data perangkat di-hash, tanpa menyimpan IP mentah.
                    </p>
                  </div>
                  <button
                    className="btn btn-outline-success btn-sm"
                    type="button"
                    onClick={() => setTrafficRefreshTick((tick) => tick + 1)}
                    disabled={trafficLoading}
                  >
                    <i className="bi bi-arrow-repeat me-1"></i>
                    {trafficLoading ? 'Memuat...' : 'Refresh'}
                  </button>
                </div>

                {trafficError && (
                  <div className="alert alert-warning py-2 px-3 mt-3 mb-0" style={{ fontSize: '0.82rem' }}>
                    {trafficError}
                  </div>
                )}
              </div>
            </div>

            {[
              ['Total hit', trafficData?.totals?.visits, 'Semua heartbeat pengunjung'],
              ['Unique device', trafficData?.totals?.uniqueDevices, 'Perangkat/browser berbeda'],
              ['Session', trafficData?.totals?.sessions, 'Sesi aktif yang tercatat'],
              ['Hit perangkat sama', trafficData?.totals?.sameDeviceVisits, 'Kunjungan ulang dari device yang sama'],
            ].map(([label, value, hint]) => (
              <div className="col-lg-3 col-6" key={label}>
                <div className="order-card p-3 h-100">
                  <div className="text-secondary" style={{ fontSize: '0.78rem' }}>{label}</div>
                  <div className="text-white fw-bold mt-1" style={{ fontSize: '1.45rem', fontFamily: "'Oxanium', sans-serif" }}>
                    {trafficLoading && !trafficData ? '...' : formatNumber(value)}
                  </div>
                  <div className="text-secondary" style={{ fontSize: '0.74rem' }}>{hint}</div>
                </div>
              </div>
            ))}

            <div className="col-lg-4 col-12">
              <div className="order-card p-3 h-100">
                <h6 className="text-success fw-bold mb-3">Jenis Perangkat</h6>
                {topEntries(trafficData?.totals?.devices).length === 0 ? (
                  <p className="text-secondary mb-0">Belum ada data perangkat.</p>
                ) : topEntries(trafficData?.totals?.devices).map(([name, count]) => (
                  <div className="d-flex justify-content-between border-bottom border-secondary py-2" key={name}>
                    <span>{name}</span>
                    <strong className="text-success">{formatNumber(count)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-4 col-12">
              <div className="order-card p-3 h-100">
                <h6 className="text-success fw-bold mb-3">Browser</h6>
                {topEntries(trafficData?.totals?.browsers).length === 0 ? (
                  <p className="text-secondary mb-0">Belum ada data browser.</p>
                ) : topEntries(trafficData?.totals?.browsers).map(([name, count]) => (
                  <div className="d-flex justify-content-between border-bottom border-secondary py-2" key={name}>
                    <span>{name}</span>
                    <strong className="text-success">{formatNumber(count)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-4 col-12">
              <div className="order-card p-3 h-100">
                <h6 className="text-success fw-bold mb-3">Sistem Operasi</h6>
                {topEntries(trafficData?.totals?.os).length === 0 ? (
                  <p className="text-secondary mb-0">Belum ada data OS.</p>
                ) : topEntries(trafficData?.totals?.os).map(([name, count]) => (
                  <div className="d-flex justify-content-between border-bottom border-secondary py-2" key={name}>
                    <span>{name}</span>
                    <strong className="text-success">{formatNumber(count)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-5 col-12">
              <div className="order-card p-3 h-100">
                <h6 className="text-success fw-bold mb-3">Halaman Paling Sering Dibuka</h6>
                {topEntries(trafficData?.totals?.pages, 10).length === 0 ? (
                  <p className="text-secondary mb-0">Belum ada data halaman.</p>
                ) : topEntries(trafficData?.totals?.pages, 10).map(([page, count]) => (
                  <div className="d-flex justify-content-between gap-2 border-bottom border-secondary py-2" key={page}>
                    <span className="text-truncate">{page}</span>
                    <strong className="text-success">{formatNumber(count)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-7 col-12">
              <div className="order-card p-3 h-100">
                <h6 className="text-success fw-bold mb-3">Trafik per Jam</h6>
                <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <table className="table table-dark table-striped align-middle" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Jam</th>
                        <th>Hit</th>
                        <th>Device</th>
                        <th>Baru</th>
                        <th>Returning</th>
                        <th>Device Sama</th>
                        <th>Dominan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(trafficData?.hours || []).length === 0 ? (
                        <tr><td colSpan="7" className="text-center text-secondary py-4">Belum ada data trafik.</td></tr>
                      ) : trafficData.hours.slice(0, 24).map((hour) => {
                        const dominantDevice = topEntries(hour.devices, 1)[0]?.[0] || '-';
                        return (
                          <tr key={hour.hour}>
                            <td>{formatTrafficHour(hour.hour)}</td>
                            <td className="fw-bold text-success">{formatNumber(hour.visits)}</td>
                            <td>{formatNumber(hour.uniqueDevices)}</td>
                            <td>{formatNumber(hour.newDevices)}</td>
                            <td>{formatNumber(hour.returningDevices)}</td>
                            <td>{formatNumber(hour.sameDeviceVisits)}</td>
                            <td>{dominantDevice}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-secondary mt-2 mb-0" style={{ fontSize: '0.75rem' }}>
                  “Device sama” = total hit dikurangi unique device pada jam itu. Cocok untuk melihat refresh/kunjungan ulang dari perangkat yang sama.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stamps' && (
          <div className="row g-3">
            <div className="col-lg-4 col-12">
              <div className="order-card p-3 h-100">
                <h5 className="text-success fw-bold mb-3">Kasih Stamp Manual</h5>
                <form onSubmit={handleAdminGrantStamp} className="d-flex flex-column gap-2">
                  <input
                    className="form-control order-input"
                    type="email"
                    placeholder="Email user"
                    value={stampForm.email}
                    onChange={(e) => setStampForm({ ...stampForm, email: e.target.value })}
                    list="admin-stamp-users"
                    required
                  />
                  <select
                    className="form-select order-input"
                    value={stampForm.stampNo}
                    onChange={(e) => setStampForm({ ...stampForm, stampNo: Number(e.target.value) })}
                  >
                    {stampTypes.map((stamp) => (
                      <option value={stamp.id} key={stamp.id}>{stamp.name}</option>
                    ))}
                  </select>
                  <button className="btn btn-success fw-bold" type="submit">Tambah Stamp</button>
                </form>
                {stampAdminNotice && (
                  <div className={`alert ${stampAdminNotice.toLowerCase().includes('gagal') || stampAdminNotice.toLowerCase().includes('tidak') ? 'alert-warning' : 'alert-success'} py-2 mt-3 mb-0`}>
                    {stampAdminNotice}
                  </div>
                )}
                <datalist id="admin-stamp-users">
                  {adminUsers.map((u) => <option value={u.email} key={u.email}>{u.name}</option>)}
                </datalist>
              </div>
            </div>

            <div className="col-lg-8 col-12">
              <div className="order-card p-3 h-100">
                <h5 className="text-success fw-bold mb-3">Stamp User</h5>
                <div className="table-responsive">
                  <table className="table table-dark table-striped align-middle" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Progress</th>
                        <th>Inventory</th>
                        <th>Cabut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.length === 0 ? (
                        <tr><td colSpan="4" className="text-secondary text-center">Belum ada user.</td></tr>
                      ) : adminUsers.map((u) => {
                        const summary = getStampSummary(u.email);
                        return (
                          <tr key={u.email}>
                            <td>
                              <strong>{u.name}</strong><br />
                              <span className="text-secondary">{u.email}</span>
                            </td>
                            <td>{summary.unique}/6 unik<br /><small>{summary.duplicates} duplicate</small></td>
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {stampTypes.map((stamp) => (
                                  <span className="badge bg-success" key={stamp.id}>S{stamp.id}: {summary.counts[stamp.id] || 0}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <select
                                className="form-select form-select-sm order-input"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAdminRevokeStamp(u.email, Number(e.target.value));
                                    e.target.value = '';
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="">Pilih</option>
                                {stampTypes.map((stamp) => (
                                  <option value={stamp.id} key={stamp.id}>Stamp {stamp.id}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="order-card p-3">
                <h5 className="text-success fw-bold mb-3">Redemption / Penukaran Hadiah</h5>
                <div className="table-responsive">
                  <table className="table table-dark table-striped align-middle" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Status</th>
                        <th>Hadiah</th>
                        <th>Klaim & Tanggal</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stampRedemptions.length === 0 ? (
                        <tr><td colSpan="5" className="text-secondary text-center">Belum ada penukaran.</td></tr>
                      ) : stampRedemptions.map((r) => (
                        <tr key={r.id}>
                          <td>{r.userEmail}<br /><small>{r.id}</small></td>
                          <td>
                            <span className={`stamp-status stamp-status--${r.status}`}>
                              {stampRedemptionStatusLabels[r.status] || r.status}
                            </span>
                            <br />
                            <small className="text-secondary">{r.assignedBy ? `Dipilih: ${r.assignedBy}` : 'Belum dipilih'}</small>
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm order-input"
                              value={r.prizeId || ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  assignPrizeToRedemption(r.id, e.target.value, adminActor);
                                  reloadStampAdmin();
                                }
                              }}
                            >
                              <option value="">Pilih hadiah</option>
                              {stampRewards.map((reward) => (
                                <option value={reward.id} key={reward.id}>{reward.name}</option>
                              ))}
                            </select>
                            {r.voucherCode && <code className="d-block mt-1">{r.voucherCode}</code>}
                          </td>
                          <td>
                            {r.claimDetails ? (
                              <small>
                                {r.claimDetails.fullName || r.claimDetails.walletProvider}<br />
                                {r.claimDetails.phone || r.claimDetails.walletNumber}<br />
                                {r.claimDetails.address || '-'}
                              </small>
                            ) : <span className="text-secondary">Belum isi</span>}
                            <div className="admin-stamp-date-grid mt-2">
                              {[
                                ['createdAt', 'Dibuat'],
                                ['assignedAt', 'Hadiah'],
                                ['claimedAt', 'Klaim'],
                                ['updatedAt', 'Update'],
                              ].map(([field, label]) => (
                                <label className="admin-stamp-date-field" key={field}>
                                  <span>{label}</span>
                                  <input
                                    className="form-control form-control-sm order-input"
                                    value={r[field] || ''}
                                    placeholder="-"
                                    onChange={(e) => {
                                      updateRedemptionDates(r.id, { [field]: e.target.value }, adminActor);
                                      reloadStampAdmin();
                                    }}
                                  />
                                </label>
                              ))}
                            </div>
                          </td>
                          <td>
                            <select
                              className="form-select form-select-sm order-input"
                              value={r.status}
                              onChange={(e) => {
                                updateRedemptionStatus(r.id, e.target.value, adminActor);
                                reloadStampAdmin();
                              }}
                            >
                              <option value="pending_prize">Menunggu Hadiah</option>
                              <option value="prize_assigned">Hadiah Dipilih</option>
                              <option value="claimed">Diklaim User</option>
                              <option value="fulfilled">Selesai Dikirim</option>
                              <option value="rejected">Ditolak</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-6 col-12">
              <div className="order-card p-3 h-100">
                <h5 className="text-success fw-bold mb-3">Kode Redeem Stamp</h5>
                <div className="stamp-admin-log">
                  {stampCodes.length === 0 ? (
                    <p className="text-secondary">Belum ada kode redeem.</p>
                  ) : stampCodes.slice(0, 30).map((code) => (
                    <div className="stamp-admin-log__item" key={code.id}>
                      <strong>{code.status} · S{code.stampNo}</strong>
                      <span>
                        {code.code}<br />
                        Owner: {code.ownerEmail}<br />
                        {code.redeemedBy ? `Redeemed: ${code.redeemedBy}` : `Dibuat: ${code.createdAt}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-lg-6 col-12">
              <div className="order-card p-3 h-100">
                <h5 className="text-success fw-bold mb-3">Audit Log Stamp</h5>
                <div className="stamp-admin-log">
                  {stampAuditLogs.length === 0 ? (
                    <p className="text-secondary">Belum ada audit.</p>
                  ) : stampAuditLogs.slice(0, 20).map((log) => (
                    <div className="stamp-admin-log__item" key={log.id}>
                      <strong>{log.action}</strong>
                      <span>{log.detail}<br />{log.createdAt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

