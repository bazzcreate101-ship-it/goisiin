import React, { useEffect, useRef } from 'react';

// =====================================================
// CARA SETUP GOOGLE LOGIN:
// 1. Buka https://console.cloud.google.com/
// 2. Buat project baru (atau pilih yang ada)
// 3. Pergi ke "APIs & Services" → "Credentials"
// 4. Klik "Create Credentials" → "OAuth 2.0 Client ID"
// 5. Application type: "Web application"
// 6. Tambahkan Authorized JavaScript origins:
//    - http://localhost:5173 (untuk development)
//    - https://domain-kamu.com (untuk production)
// 7. Copy "Client ID" dan paste di bawah
// =====================================================
const GOOGLE_CLIENT_ID = 'PASTE_YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load Google Identity Services SDK
    const loadGoogleScript = () => {
      if (window.google?.accounts) {
        initGoogle();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    };

    const initGoogle = () => {
      if (!window.google?.accounts || !googleBtnRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        shape: 'pill',
        theme: 'outline',
        text: 'signin_with',
        size: 'large',
        logo_alignment: 'left',
        width: 280,
      });
    };

    loadGoogleScript();
  }, [isOpen]);

  const handleCredentialResponse = (response) => {
    // Decode JWT token dari Google
    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const userData = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      sub: payload.sub,
    };
    onLoginSuccess(userData);
    onClose();
  };

  if (!isOpen) return null;

  const isDemoMode = GOOGLE_CLIENT_ID.includes('PASTE_YOUR');

  const handleDemoLogin = () => {
    const mockUser = {
      name: 'Bagas Pratama',
      email: 'bagas.pratama@gmail.com',
      picture: 'https://ui-avatars.com/api/?name=Bagas+Pratama&background=fbbf24&color=000&bold=true',
    };
    onLoginSuccess(mockUser);
    onClose();
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
                <h2 className="auth-modal__title" id="modalTitle">Masuk ke Garuda</h2>
                <p className="auth-modal__subtitle">Pantau transaksi, kumpulkan hadiah, dan dapatkan bantuan lebih cepat.</p>
              </div>
              <ul className="auth-modal__perks">
                <li className="auth-modal__perk">
                  <span className="auth-modal__perk-icon">
                    <img src="/assets/icon/article-svgrepo-com.svg" alt="" onError={(e) => e.target.style.display='none'} />
                  </span>
                  <p className="auth-modal__perk-text">Pantau dan simpan riwayat transaksi kamu kapan saja.</p>
                </li>
                <li className="auth-modal__perk">
                  <span className="auth-modal__perk-icon">
                    <img src="/assets/icon/gift-svgrepo-com.svg" alt="" onError={(e) => e.target.style.display='none'} />
                  </span>
                  <p className="auth-modal__perk-text">Jadi yang pertama tahu info promo seru dan kumpulkan hadiah.</p>
                </li>
                <li className="auth-modal__perk">
                  <span className="auth-modal__perk-icon">
                    <img src="/assets/icon/cell-phone-svgrepo-com.svg" alt="" onError={(e) => e.target.style.display='none'} />
                  </span>
                  <p className="auth-modal__perk-text">Hubungi tim bantuan lebih mudah ketika ada kendala.</p>
                </li>
              </ul>
            </section>

            {/* RIGHT — CTA */}
            <section className="auth-modal__cta" aria-label="Mulai login">
              <div className="auth-modal__cta-header">
                <h3 className="auth-modal__cta-title">Login lebih cepat</h3>
                <p className="auth-modal__cta-desc">Gunakan akun Google untuk pengalaman transaksi lebih nyaman di Garuda.</p>
              </div>

              <div className="auth-modal__google">
                {isDemoMode ? (
                  // Demo mode — tampilkan tombol simulasi
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <button type="button" className="google-signin-btn" onClick={handleDemoLogin}>
                      <img src="/assets/icon/google-color-svgrepo-com.svg" alt="Google" width="20" height="20"
                        onError={(e) => { e.target.src='https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'; }}
                        style={{ marginRight: '8px' }}
                      />
                      Sign in with Google
                    </button>
                    <div style={{
                      background: 'rgba(251,191,36,0.12)',
                      border: '1px solid rgba(251,191,36,0.3)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.72rem',
                      color: '#fde68a',
                      textAlign: 'center',
                      maxWidth: '260px'
                    }}>
                      ⚠️ <strong>Demo Mode</strong> — untuk Google Login nyata, daftarkan Client ID di Google Cloud Console
                    </div>
                  </div>
                ) : (
                  // Google Identity Services real button
                  <div ref={googleBtnRef} id="google-signin-btn"></div>
                )}
              </div>

              <p className="auth-modal__terms">
                Dengan masuk ke Garuda, kamu menyetujui{' '}
                <a href="https://garudavoucher.id/page/terms" target="_blank" rel="noopener noreferrer">Syarat dan Ketentuan</a>{' '}
                serta{' '}
                <a href="https://garudavoucher.id/page/privacy" target="_blank" rel="noopener noreferrer">Kebijakan Privasi</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
