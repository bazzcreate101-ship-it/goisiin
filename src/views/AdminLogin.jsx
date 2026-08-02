import React, { useState } from 'react';

const ADMIN_PASSWORD = 'goisiin2025';
const ADMIN_NAMES = ['Ardan', 'Sarah', 'Ardian'];

export default function AdminLogin({ onLogin }) {
  const [name, setName] = useState('Ardan');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminAuth', JSON.stringify({ name, loggedAt: Date.now() }));
        onLogin(name);
      } else {
        setError('Password salah. Coba lagi.');
      }
      setLoading(false);
    }, 700);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0f0d 0%, #111a14 50%, #0d1a10 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(74,222,128,0.15)',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #4ade80, #22c55e)',
            borderRadius: '16px',
            marginBottom: '16px',
            boxShadow: '0 0 30px rgba(74,222,128,0.3)'
          }}>
            <i className="bi bi-shield-lock-fill" style={{ fontSize: '28px', color: '#0a0f0d' }}></i>
          </div>
          <h1 style={{
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-0.02em'
          }}>Admin Goisiin</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '4px 0 0' }}>
            Masuk ke panel kontrol
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Pilih nama */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Login sebagai
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {ADMIN_NAMES.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setName(n)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: '10px',
                    border: name === n ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
                    background: name === n ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                    color: name === n ? '#4ade80' : 'rgba(255,255,255,0.5)',
                    fontSize: '0.85rem',
                    fontWeight: name === n ? 700 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Masukkan password admin"
                required
                style={{
                  width: '100%',
                  padding: '12px 44px 12px 14px',
                  borderRadius: '10px',
                  border: error ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '14px'
                }}
              >
                <i className={`bi bi-eye${showPass ? '-slash' : ''}`}></i>
              </button>
            </div>
            {error && (
              <p style={{ color: '#f87171', fontSize: '0.78rem', margin: '6px 0 0' }}>
                ⚠️ {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #4ade80, #22c55e)',
              color: '#0a0f0d',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              opacity: !password ? 0.5 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <><span className="spinner-border spinner-border-sm" role="status"></span> Memverifikasi...</>
            ) : (
              <><i className="bi bi-box-arrow-in-right"></i> Masuk sebagai {name}</>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', marginTop: '24px', marginBottom: 0 }}>
          Akses terbatas untuk tim Goisiin
        </p>
      </div>
    </div>
  );
}
