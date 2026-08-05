import React, { useState, useEffect, useMemo, useRef } from 'react';
import { paymentChannels } from '../data/products';
import { STAMP_MIN_TRANSACTION, stampRewards, stampTypes } from '../data/stampRewards';
import { promoInfo, siteMechanics, supportInfo } from '../data/siteInfo';
import { getWalletBalance, getWalletEntries, getWithdrawalRequests } from '../lib/walletService';
import {
  createChatMessage,
  getChatIdentity,
  getChatThread,
  getChatThreadStats,
  markChatThreadRead,
  saveChatThread,
} from '../lib/chatThreads';
import { hydrateCloudStateKeys } from '../lib/cloudState';

const MAX_MESSAGE_LENGTH = 600;
const CLIENT_COOLDOWN_MS = 1800;
const CHAT_HISTORY_LIMIT = 300;
const CHAT_SYNC_KEYS = [
  'goisiin_chat_threads',
  'goisiin_chat_messages',
  'goisiin_chat_admin_mode',
  'goisiin_chat_active_admin',
];
const makeMessageId = (prefix = 'msg') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export default function ChatWidget({ products, user, transactions }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [activeAdmin, setActiveAdmin] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [currentThread, setCurrentThread] = useState(null);
  const messagesEndRef = useRef(null);
  const chatIdentity = useMemo(() => getChatIdentity(user), [user]);

  useEffect(() => {
    const thread = getChatThread(chatIdentity);
    setCurrentThread(thread);
    setMessages(thread.messages);
    setAdminMode(Boolean(thread.adminMode));
    setActiveAdmin(thread.activeAdmin || null);
    saveChatThread({
      ...thread,
      userName: chatIdentity.userName,
      userEmail: chatIdentity.userEmail,
      isGuest: chatIdentity.isGuest,
    });
  }, [chatIdentity]);

  useEffect(() => {
    let cancelled = false;
    const syncChat = async () => {
      await hydrateCloudStateKeys(CHAT_SYNC_KEYS);
      if (!cancelled) {
        const thread = getChatThread(chatIdentity);
        setCurrentThread(thread);
        setMessages(thread.messages);
        setAdminMode(Boolean(thread.adminMode));
        setActiveAdmin(thread.activeAdmin || null);
      }
    };
    syncChat();
    const timer = setInterval(syncChat, isOpen ? 4500 : 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isOpen, chatIdentity]);

  useEffect(() => {
    const handleStorageChange = () => {
      const thread = getChatThread(chatIdentity);
      setCurrentThread(thread);
      setMessages(thread.messages);
      setAdminMode(Boolean(thread.adminMode));
      setActiveAdmin(thread.activeAdmin || null);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('goisiin:cloud-state-updated', handleStorageChange);
    window.addEventListener('goisiin:chat-threads-updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('goisiin:cloud-state-updated', handleStorageChange);
      window.removeEventListener('goisiin:chat-threads-updated', handleStorageChange);
    };
  }, [chatIdentity]);

  useEffect(() => {
    if (!isOpen) return;
    const marked = markChatThreadRead(chatIdentity.id, 'user');
    if (marked) setCurrentThread(marked);
  }, [isOpen, chatIdentity.id, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveState = (newMsgs, newAdminMode = adminMode, newAdmin = activeAdmin) => {
    const limitedMessages = newMsgs.slice(-CHAT_HISTORY_LIMIT);
    setMessages(limitedMessages);
    setAdminMode(newAdminMode);
    setActiveAdmin(newAdmin);
    const existingThread = getChatThread(chatIdentity);
    const savedThread = saveChatThread({
      ...existingThread,
      userName: chatIdentity.userName,
      userEmail: chatIdentity.userEmail,
      isGuest: chatIdentity.isGuest,
      messages: limitedMessages,
      adminMode: newAdminMode,
      activeAdmin: newAdmin || null,
    });
    setCurrentThread(savedThread);
  };

  const threadStats = getChatThreadStats(currentThread || { messages });
  const latestAdminMessage = threadStats.lastAdminMessage;
  const hasUnreadAdminMessage = Boolean(!isOpen && threadStats.unreadForUser && latestAdminMessage);

  const buildChatContext = () => {
    const walletBalance = user?.email ? getWalletBalance(user.email) : 0;
    const walletEntries = user?.email ? getWalletEntries(user.email).slice(0, 12) : [];
    const withdrawals = user?.email
      ? getWithdrawalRequests().filter((request) => request.userEmail === user.email).slice(0, 12)
      : [];

    const activeProducts = products.filter((product) => product.active !== false);
    const aiProduct = activeProducts.find((product) => product.id === 'kebutuhan-ai' || /kebutuhan ai|chatgpt|claude|gemini|grok/i.test(`${product.name} ${product.description || ''}`));

    return ({
    user: user ? { name: user.name, email: user.email } : null,
    products: activeProducts.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      cardLabel: product.cardLabel,
      description: product.description,
      popular: product.popular,
      discount: product.discount,
      inputLabel: product.inputLabel,
      denominations: product.denominations?.map((denom) => ({
        id: denom.id,
        name: denom.name,
        price: denom.price,
        originalPrice: denom.originalPrice,
        points: denom.points,
        stock: denom.stock,
        accessType: denom.accessType,
        duration: denom.duration,
        warranty: denom.warranty,
        description: denom.description,
      })),
    })),
    aiCatalog: aiProduct ? {
      productId: aiProduct.id,
      productName: aiProduct.name,
      description: aiProduct.description,
      inputLabel: aiProduct.inputLabel,
      packages: (aiProduct.denominations || []).map((denom) => ({
        id: denom.id,
        name: denom.name,
        price: denom.price,
        stock: denom.stock,
        accessType: denom.accessType || 'Private',
        duration: denom.duration,
        warranty: denom.warranty,
        description: denom.description,
      })),
    } : null,
    paymentChannels: paymentChannels.map((channel) => ({
      id: channel.id,
      category: channel.category,
      name: channel.name,
      feePercent: channel.feePercent,
      feeFlat: channel.feeFlat,
    })),
    transactions,
    wallet: {
      balance: walletBalance,
      topupMin: 50000,
      topupMax: 5000000,
      topupMethod: 'QRIS only',
      withdrawalMin: 100000,
      withdrawalFeePercent: 0.7,
      rules: [
        'Saldo Goisiinn bisa dipakai untuk checkout jika saldo cukup.',
        'Jika saldo tidak cukup, user harus top up saldo atau pilih metode pembayaran lain.',
        'Top up saldo Goisiinn hanya melalui QRIS, minimal Rp50.000 dan maksimal Rp5.000.000.',
        'Transaksi gagal yang sudah mendebit dana akan refund otomatis ke Saldo Goisiinn.',
        'Tarik saldo bisa ke e-wallet atau bank, minimal Rp100.000, fee 0,7%.',
      ],
      entries: walletEntries,
      withdrawals,
    },
    promos: promoInfo,
    mechanics: siteMechanics,
    stampPromo: {
      minimumTransaction: STAMP_MIN_TRANSACTION,
      requiredUniqueStamp: stampTypes.length,
      rules: [
        'User mendapat 1 stamp acak dari stamp 1 sampai 6 setiap transaksi sukses minimal Rp100.000.',
        'Stamp duplicate bisa dibagikan ke user lain dengan klik stamp lalu membuat kode redeem. Kode hanya bisa dipakai 1 kali.',
        'Hadiah bisa ditukar setelah user punya stamp 1, 2, 3, 4, 5, dan 6.',
        'Hasil spin hadiah ditentukan admin sebelum reveal dan user mengisi form klaim sesuai tipe hadiah.',
      ],
      rewards: stampRewards.map((reward) => ({
        id: reward.id,
        name: reward.name,
        type: reward.type,
        tier: reward.tier,
      })),
    },
    support: supportInfo,
    });
  };

  const handoffToAdmin = (baseMessages, text = 'Chat dialihkan ke Admin CS Goisiinn. Kakak sedang terhubung dengan antrean admin.') => {
    const sysMsg = createChatMessage({
      id: makeMessageId('sys'),
      sender: 'system',
      text,
    });
    saveState([...baseMessages, sysMsg], true, null);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageText = inputText.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!messageText || isTyping || Date.now() < cooldownUntil) return;

    setCooldownUntil(Date.now() + CLIENT_COOLDOWN_MS);

    const userMsg = createChatMessage({
      id: makeMessageId('msg'),
      sender: 'user',
      text: messageText,
    });

    const updatedMsgs = [...messages, userMsg];
    saveState(updatedMsgs);
    setInputText('');

    const textLower = messageText.toLowerCase();
    const needsAdmin = textLower.includes('admin') ||
      textLower.includes('manusia') ||
      textLower.includes('cs asli') ||
      textLower.includes('whatsapp') ||
      textLower.includes('refund') ||
      textLower.includes('komplain');

    if (adminMode || needsAdmin) {
      if (needsAdmin && !adminMode) {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          handoffToAdmin(updatedMsgs, 'Menghubungkan ke Tim CS Goisiinn. Silakan tunggu.');
        }, 900);
      }
      return;
    }

    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: updatedMsgs.slice(-8),
          context: buildChatContext(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chat sedang dibatasi.');
      }

      const csMsg = createChatMessage({
        id: makeMessageId('msg'),
        sender: 'cs',
        agent: 'Vindy',
        text: data.reply || 'Ada yang bisa Vindy bantu lagi seputar Goisiinn, Kak?',
      });
      const nextMsgs = [...updatedMsgs, csMsg];

      if (data.forwardToAdmin) {
        handoffToAdmin(nextMsgs);
      } else {
        saveState(nextMsgs);
      }
    } catch (err) {
      const errorMsg = createChatMessage({
        id: makeMessageId('msg'),
        sender: 'cs',
        agent: 'Vindy',
        text: err.message || 'Maaf Kak, jaringan Vindy sedang terganggu. Coba lagi sebentar atau hubungi admin Goisiinn.',
      });
      saveState([...updatedMsgs, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="goisiin-chat-widget">
      <button
        className="chat-float-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Hubungi Customer Service"
      >
        <span className="chat-badge-pulse"></span>
        {isOpen ? (
          <i className="bi bi-x-lg text-white" style={{ fontSize: '1.4rem' }}></i>
        ) : (
          <i className="bi bi-chat-dots-fill text-white" style={{ fontSize: '1.6rem' }}></i>
        )}
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="d-flex align-items-center gap-2">
              <div className="chat-avatar-wrapper">
                <div className="chat-avatar-icon">CS</div>
                <span className="chat-status-dot"></span>
              </div>
              <div className="chat-header-text">
                <div className="chat-agent-name">
                  {adminMode
                    ? (activeAdmin ? `Admin ${activeAdmin}` : 'Menghubungkan ke Admin...')
                    : 'Vindy - CS Goisiinn'}
                </div>
                <div className="chat-agent-sub">
                  {adminMode ? 'Admin Live Support' : 'AI Customer Assistant'}
                </div>
              </div>
            </div>
          </div>

          <div className="chat-messages-container">
            {messages.map((m) => {
              if (m.sender === 'system') {
                return (
                  <div key={m.id} className="chat-msg-system">
                    <span>{m.text}</span>
                  </div>
                );
              }

              const isMe = m.sender === 'user';
              return (
                <div key={m.id} className={`chat-bubble-row ${isMe ? 'chat-row-user' : 'chat-row-agent'}`}>
                  {!isMe && (
                    <span className="chat-bubble-sender">
                      {m.agent || 'Admin'}
                    </span>
                  )}
                  <div className={`chat-bubble ${isMe ? 'bubble-user' : 'bubble-agent'}`}>
                    {m.text}
                    <div className="chat-bubble-time">{m.timestamp}</div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="chat-bubble-row chat-row-agent">
                <span className="chat-bubble-sender">Vindy</span>
                <div className="chat-bubble bubble-agent">
                  <div className="chat-typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Tulis pesan seputar Goisiinn..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="chat-input-field"
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!inputText.trim() || isTyping || Date.now() < cooldownUntil}
            >
              <i className="bi bi-send-fill text-white"></i>
            </button>
          </form>
        </div>
      )}

      {hasUnreadAdminMessage && (
        <button
          type="button"
          className="chat-admin-notice"
          onClick={() => setIsOpen(true)}
        >
          <span className="chat-admin-notice__badge">Balasan Admin</span>
          <strong>{latestAdminMessage.agent || 'Admin Goisiinn'}</strong>
          <span>{latestAdminMessage.text}</span>
        </button>
      )}
    </div>
  );
}
