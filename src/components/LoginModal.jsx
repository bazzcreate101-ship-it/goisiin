import React from 'react';

const LoginModal = () => {
  return (
    <div className="modal fade" id="exampleModal" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered auth-modal__dialog" id="myModal">
        <div className="modal-content auth-modal">
          <button type="button" className="auth-modal__close" data-bs-dismiss="modal" aria-label="Tutup">
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
          <div className="auth-modal__grid">
            <section className="auth-modal__intro" aria-labelledby="exampleModalLabel">
              <div>
                <span className="auth-modal__eyebrow">Selamat datang</span>
                <h2 className="auth-modal__title" id="exampleModalLabel">Masuk ke Garuda</h2>
                <p className="auth-modal__subtitle">Masuk untuk menikmati kemudahan transaksi dan promo khusus member.</p>
              </div>
              <ul className="auth-modal__perks">
                <li className="auth-modal__perk">
                  <div className="auth-modal__perk-icon">
                    <img src="https://garudavoucher.id/assets/img/icon/fast.svg" alt="Instan" />
                  </div>
                  <p className="auth-modal__perk-text">Transaksi instan 24/7 tanpa ribet.</p>
                </li>
                <li className="auth-modal__perk">
                  <div className="auth-modal__perk-icon">
                    <img src="https://garudavoucher.id/assets/img/icon/discount.svg" alt="Promo" />
                  </div>
                  <p className="auth-modal__perk-text">Dapatkan cashback & harga spesial member.</p>
                </li>
              </ul>
            </section>
            
            <section className="auth-modal__cta">
              <div className="auth-modal__cta-header">
                <h3 className="auth-modal__cta-title">Lanjutkan dengan Google</h3>
                <p className="auth-modal__cta-desc">Hanya satu klik, aman dan cepat.</p>
              </div>
              <div className="auth-modal__google mt-4">
                <a href="#" className="btn btn-light d-flex align-items-center gap-2 w-100 justify-content-center py-2 rounded-pill shadow-sm">
                  <img src="https://garudavoucher.id/assets/img/icon/google.svg" alt="Google" width="24" height="24" />
                  <span className="fw-semibold text-dark">Masuk dengan Google</span>
                </a>
              </div>
              <p className="auth-modal__terms mt-4 text-center">
                Dengan masuk, kamu menyetujui <a href="#">Syarat Ketentuan</a> & <a href="#">Kebijakan Privasi</a> Garuda Voucher.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
