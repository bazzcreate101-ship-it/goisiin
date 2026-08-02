import React, { useState, useEffect, useRef } from 'react';
import { paymentChannels } from '../data/products';
import { STAMP_MIN_TRANSACTION, stampRewards, stampTypes } from '../data/stampRewards';
import { promoInfo, siteMechanics, supportInfo } from '../data/siteInfo';
import { safeJsonParse } from '../lib/storage';
import { getWalletBalance, getWalletEntries, getWithdrawalRequests } from '../lib/walletService';

const MAX_MESSAGE_LENGTH = 600;
const CLIENT_COOLDOWN_MS = 1800;

export default function ChatWidget({ products, user, transactions }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [activeAdmin, setActiveAdmin] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedMsgs = localStorage.getItem('goisiin_chat_messages');
    const savedAdminMode = localStorage.getItem('goisiin_chat_admin_mode');
    const savedActiveAdmin = localStorage.getItem('goisiin_chat_active_admin');

    if (savedMsgs) {
      setMessages(safeJsonParse(savedMsgs, []));
    } else {
      const initial = [
        {
          id: 'init-1',
          sender: 'cs',
          agent: 'Vindy',
          text: 'Halo Kak! Selamat datang di Goisiin. Vindy siap bantu soal produk, harga, pembayaran, promo, transaksi, dan bantuan CS.',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setMessages(initial);
      localStorage.setItem('goisiin_chat_messages', JSON.stringify(initial));
    }

    if (savedAdminMode) setAdminMode(Boolean(safeJsonParse(savedAdminMode, false)));
    if (savedActiveAdmin) setActiveAdmin(savedActiveAdmin);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'goisiin_chat_messages' && e.newValue) {
        setMessages(safeJsonParse(e.newValue, []));
      }
      if (e.key === 'goisiin_chat_admin_mode' && e.newValue) {
        setAdminMode(Boolean(safeJsonParse(e.newValue, false)));
      }
      if (e.key === 'goisiin_chat_active_admin') {
        setActiveAdmin(e.newValue || null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveState = (newMsgs, newAdminMode = adminMode, newAdmin = activeAdmin) => {
    const limitedMessages = newMsgs.slice(-60);
    setMessages(limitedMessages);
    setAdminMode(newAdminMode);
    setActiveAdmin(newAdmin);
    localStorage.setItem('goisiin_chat_messages', JSON.stringify(limitedMessages));
    localStorage.setItem('goisiin_chat_admin_mode', JSON.stringify(newAdminMode));
    if (newAdmin) {
      localStorage.setItem('goisiin_chat_active_admin', newAdmin);
    } else {
      localStorage.removeItem('goisiin_chat_active_admin');
    }
  };

  const buildChatContext = () => {
    const walletBalance = user?.email ? getWalletBalance(user.email) : 0;
    const walletEntries = user?.email ? getWalletEntries(user.email).slice(0, 12) : [];
    const withdrawals = user?.email
      ? getWithdrawalRequests().filter((request) => request.userEmail === user.email).slice(0, 12)
      : [];

    return ({
    user: user ? { name: user.name, email: user.email } : null,
    products: products.filter((product) => product.active !== false).map((product) => ({
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
        'Saldo Goisiin bisa dipakai untuk checkout jika saldo cukup.',
        'Jika saldo tidak cukup, user harus top up saldo atau pilih metode pembayaran lain.',
        'Top up saldo Goisiin hanya melalui QRIS, minimal Rp50.000 dan maksimal Rp5.000.000.',
        'Transaksi gagal yang sudah mendebit dana akan refund otomatis ke Saldo Goisiin.',
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

  const handoffToAdmin = (baseMessages, text = 'Chat dialihkan ke Admin CS Goisiin. Kakak sedang terhubung dengan antrean admin.') => {
    const sysMsg = {
      id: `sys-${Date.now()}`,
      sender: 'system',
      text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    saveState([...baseMessages, sysMsg], true, null);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messageText = inputText.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!messageText || isTyping || Date.now() < cooldownUntil) return;

    setCooldownUntil(Date.now() + CLIENT_COOLDOWN_MS);

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

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
          handoffToAdmin(updatedMsgs, 'Menghubungkan ke Tim CS Goisiin. Silakan tunggu.');
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

      const csMsg = {
        id: `msg-${Date.now()}`,
        sender: 'cs',
        agent: 'Vindy',
        text: data.reply || 'Ada yang bisa Vindy bantu lagi seputar Goisiin, Kak?',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      const nextMsgs = [...updatedMsgs, csMsg];

      if (data.forwardToAdmin) {
        handoffToAdmin(nextMsgs);
      } else {
        saveState(nextMsgs);
      }
    } catch (err) {
      const errorMsg = {
        id: `msg-${Date.now()}`,
        sender: 'cs',
        agent: 'Vindy',
        text: err.message || 'Maaf Kak, jaringan Vindy sedang terganggu. Coba lagi sebentar atau hubungi admin Goisiin.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
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
                    : 'Vindy - CS Goisiin'}
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
              placeholder="Tulis pesan seputar Goisiin..."
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
    </div>
  );
}
