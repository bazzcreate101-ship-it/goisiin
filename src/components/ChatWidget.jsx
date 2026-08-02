import React, { useState, useEffect, useRef } from 'react';

const PREMZONE_API_KEY = import.meta.env.VITE_PREMZONE_API_KEY || 'sk-up048z-c1a5e8a921c1527be96202049595bf0a';
const PREMZONE_BASE_URL = 'https://api.premzone.co/v1/chat/completions';


export default function ChatWidget({ products }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [activeAdmin, setActiveAdmin] = useState(null); // 'Ardan' | 'Sarah' | 'Ardian'
  const messagesEndRef = useRef(null);

  // Load chat history from localStorage
  useEffect(() => {
    const savedMsgs = localStorage.getItem('goisiin_chat_messages');
    const savedAdminMode = localStorage.getItem('goisiin_chat_admin_mode');
    const savedActiveAdmin = localStorage.getItem('goisiin_chat_active_admin');

    if (savedMsgs) {
      setMessages(JSON.parse(savedMsgs));
    } else {
      // Initial greeting from Vindy
      const initial = [
        {
          id: 'init-1',
          sender: 'cs',
          agent: 'Vindy',
          text: 'Halo Kak! Selamat datang di Goisiin. Vindy siap membantu kakak untuk top up game favorit kakak dengan instan dan aman. Ada yang bisa Vindy bantu?',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setMessages(initial);
      localStorage.setItem('goisiin_chat_messages', JSON.stringify(initial));
    }

    if (savedAdminMode) setAdminMode(JSON.parse(savedAdminMode));
    if (savedActiveAdmin) setActiveAdmin(savedActiveAdmin);
  }, []);

  // Listen for admin replies from other tabs/dashboard via storage events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'goisiin_chat_messages' && e.newValue) {
        setMessages(JSON.parse(e.newValue));
      }
      if (e.key === 'goisiin_chat_admin_mode' && e.newValue) {
        setAdminMode(JSON.parse(e.newValue));
      }
      if (e.key === 'goisiin_chat_active_admin' && e.newValue) {
        setActiveAdmin(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveState = (newMsgs, newAdminMode = adminMode, newAdmin = activeAdmin) => {
    setMessages(newMsgs);
    setAdminMode(newAdminMode);
    setActiveAdmin(newAdmin);
    localStorage.setItem('goisiin_chat_messages', JSON.stringify(newMsgs));
    localStorage.setItem('goisiin_chat_admin_mode', JSON.stringify(newAdminMode));
    if (newAdmin) {
      localStorage.setItem('goisiin_chat_active_admin', newAdmin);
    } else {
      localStorage.removeItem('goisiin_chat_active_admin');
    }
    // Dispatch local storage event for current tab synchronization
    window.dispatchEvent(new Event('storage'));
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMsgs = [...messages, userMsg];
    saveState(updatedMsgs);
    setInputText('');

    // Check if user specifically requests admin or humana
    const textLower = inputText.toLowerCase();
    const needsAdmin = textLower.includes('admin') || 
                        textLower.includes('manusia') || 
                        textLower.includes('cs asli') || 
                        textLower.includes('whatsapp') ||
                        textLower.includes('bantuan');

    if (adminMode || needsAdmin) {
      if (needsAdmin && !adminMode) {
        // Transition to admin mode
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const systemMsg = {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: 'Menghubungkan ke Tim CS Goisiin... Silakan tunggu.',
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          };
          const nextMsgs = [...updatedMsgs, systemMsg];
          saveState(nextMsgs, true, null);
        }, 1500);
      }
      return;
    }

    // AI Chatbot logic using Premzone API
    setIsTyping(true);

    // Simulate natural typing delay (between 2 to 4 seconds)
    const delay = Math.floor(Math.random() * 2000) + 2000;
    setTimeout(async () => {
      try {
        const productInfoStr = products.map(p => {
          const denoms = p.denominations.map(d => `${d.name} (${d.price} IDR)`).join(', ');
          return `- ${p.name}: ${denoms}`;
        }).join('\n');

        const systemPrompt = `Kamu adalah Vindy, customer service AI dari Goisiin.com, sebuah platform top up game dan voucher game termurah, terpercaya, dan tercepat di Indonesia.
Gaya bicaramu harus sangat ramah, asyik, membantu, natural, semi-formal khas anak muda Indonesia, dan seolah-olah kamu adalah manusia asli. Gunakan panggilan "Kakak" atau "Kak" untuk menyapa pelanggan.

Informasi produk dan harga terbaru di Goisiin:
${productInfoStr}

Aturan penting:
1. Jawab pertanyaan seputar game yang didukung, cara top up, metode pembayaran (QRIS, DANA, GoPay, OVO, ShopeePay, LinkAja, VA BCA, Mandiri, BRI, BNI, BSI, CIMB Niaga, Permata Bank, Alfamart, Indomaret).
2. Jika pelanggan bertanya hal di luar Goisiin, meminta refund, komplain transaksi gagal/belum masuk setelah beberapa jam, atau meminta berbicara dengan manusia/admin/CS asli, jawab dengan sangat sopan bahwa kamu akan mengalihkan obrolan ini ke admin/tim CS Goisiin (Ardan/Sarah/Ardian). Lalu tambahkan teks '[FORWARD_TO_ADMIN]' di baris terakhir jawabanmu.
3. Batasi respon maksimal 2-3 kalimat pendek agar terlihat seperti sedang mengetik di aplikasi chat biasa. Jangan memberikan penjelasan yang terlalu panjang lebar sekaligus.`;

        // Format history
        const apiHistory = updatedMsgs.slice(-8).map(m => {
          if (m.sender === 'user') return { role: 'user', content: m.text };
          if (m.sender === 'cs') return { role: 'assistant', content: m.text };
          return { role: 'system', content: m.text };
        });

        const response = await fetch(PREMZONE_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${PREMZONE_API_KEY}`
          },
          body: JSON.stringify({
            model: 'cx/gpt-5.4-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...apiHistory
            ],
            temperature: 0.7
          })
        });

        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        let reply = data.choices[0].message.content || '';

        setIsTyping(false);

        let shouldRouteToAdmin = reply.includes('[FORWARD_TO_ADMIN]');
        reply = reply.replace('[FORWARD_TO_ADMIN]', '').trim();

        const csMsg = {
          id: `msg-${Date.now()}`,
          sender: 'cs',
          agent: 'Vindy',
          text: reply || 'Ada yang bisa Vindy bantu lagi, Kak?',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };

        let nextMsgs = [...updatedMsgs, csMsg];

        if (shouldRouteToAdmin) {
          const sysMsg = {
            id: `sys-${Date.now()}`,
            sender: 'system',
            text: 'Chat dialihkan ke Admin CS Goisiin. Kakak sedang terhubung dengan antrean admin.',
            timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          };
          nextMsgs.push(sysMsg);
          saveState(nextMsgs, true, null);
        } else {
          saveState(nextMsgs);
        }

      } catch (err) {
        setIsTyping(false);
        const errorMsg = {
          id: `msg-${Date.now()}`,
          sender: 'cs',
          agent: 'Vindy',
          text: 'Maaf Kak, jaringan Vindy sedang sedikit terganggu. Ada yang bisa Vindy bantu terkait produk game?',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };
        saveState([...updatedMsgs, errorMsg]);
      }
    }, delay);
  };

  return (
    <div className="goisiin-chat-widget">
      {/* Floating Chat Button */}
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

      {/* Chat Drawer Window */}
      {isOpen && (
        <div className="chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="d-flex align-items-center gap-2">
              <div className="chat-avatar-wrapper">
                <div className="chat-avatar-icon">👩‍💻</div>
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

          {/* Messages list */}
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

          {/* Input Form */}
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              placeholder="Tulis pesan kakak di sini..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="chat-input-field"
            />
            <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
              <i className="bi bi-send-fill text-white"></i>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

