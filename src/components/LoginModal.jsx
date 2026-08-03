import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { icons } from '../assets/images';


export default function LoginModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    if (Date.now() < cooldownUntil) return;
    setLoading(true);
    setError('');
    setCooldownUntil(Date.now() + 5000);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: 'offline', prompt: 'select_account' }
        }
      });
      if (authError) throw authError;
      onClose();
    } catch (err) {
      console.error('Google Login error:', err);
      setError('Login gagal. Pastikan Supabase sudah dikonfigurasi dengan benar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', zIndex: 1080 }}
      tabIndex="-1"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-dialog-centered auth-modal__dialog" style={{ maxWidth: '720px' }}>
        <div className="modal-content auth-modal">
          <button type="button" className="auth-modal__close" onClick={onClose} aria-label="Tutup">
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>

          <div className="auth-modal__grid">
            {/* LEFT — intro */}
            <section className="auth-modal__intro" aria-labelledby="modalTitle">
              <div>
                <span className="auth-modal__eyebrow">Selamat datang</span>
                <h2 className="auth-modal__title" id="modalTitle">Masuk ke Goisiinn</h2>
                <p className="auth-modal__subtitle">Pantau transaksi, kumpulkan hadiah, dan dapatkan bantuan lebih cepat.</p>
              </div>
              <ul className="auth-modal__perks">
                <li className="auth-modal__perk">
                  <span className="auth-modal__perk-icon">
                    <img src={icons.article} alt="" />
                  </span>
                  <p className="auth-modal__perk-text">Pantau dan simpan riwayat transaksi kamu kapan saja.</p>
                </li>
                <li className="auth-modal__perk">
                  <span className="auth-modal__perk-icon">
                    <img src={icons.gift} alt="" />
                  </span>
                  <p className="auth-modal__perk-text">Jadi yang pertama tahu info promo seru dan kumpulkan hadiah.</p>
                </li>
                <li className="auth-modal__perk">
                  <span className="auth-modal__perk-icon">
                    <img src={icons.phone} alt="" />
                  </span>
                  <p className="auth-modal__perk-text">Hubungi tim bantuan lebih mudah ketika ada kendala.</p>
                </li>
              </ul>
            </section>

            {/* RIGHT — CTA */}
            <section className="auth-modal__cta" aria-label="Mulai login">
              <div className="auth-modal__cta-header">
                <h3 className="auth-modal__cta-title">Login lebih cepat</h3>
                <p className="auth-modal__cta-desc">Gunakan akun Google untuk pengalaman transaksi lebih nyaman di Goisiinn.</p>
              </div>

              <div className="auth-modal__google">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className="google-signin-btn"
                    onClick={handleGoogleLogin}
                    disabled={loading || Date.now() < cooldownUntil}
                    id="btn-google-signin"
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                    ) : (
                      <img
                        src={icons.google}
                        alt="Google"
                        width="20"
                        height="20"
                        onError={(e) => { e.target.src = 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'; }}
                        style={{ marginRight: '8px' }}
                      />
                    )}
                    {loading ? 'Mengarahkan...' : 'Sign in with Google'}
                  </button>

                  {error && (
                    <div style={{
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.78rem',
                      color: '#fca5a5',
                      textAlign: 'center',
                      maxWidth: '260px'
                    }}>
                      ⚠️ {error}
                    </div>
                  )}
                </div>
              </div>

              <p className="auth-modal__terms">
                Dengan masuk ke Goisiinn, kamu menyetujui{' '}
                <a href="/page/terms">Syarat dan Ketentuan</a>{' '}
                serta{' '}
                <a href="/page/privacy">Kebijakan Privasi</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
