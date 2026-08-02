import React from 'react';

const paymentLogos = [
  "https://garudavoucher.id/assets/img/logo-payment/qris.png",
  "https://garudavoucher.id/assets/img/logo-payment/dana.png",
  "https://garudavoucher.id/assets/img/logo-payment/gopay.png",
  "https://garudavoucher.id/assets/img/logo-payment/ovo.png",
  "https://garudavoucher.id/assets/img/logo-payment/shopeepay.png",
  "https://garudavoucher.id/assets/img/logo-payment/linkaja.png",
  "https://garudavoucher.id/assets/img/logo-payment/bca.png",
  "https://garudavoucher.id/assets/img/logo-payment/bri.png",
  "https://garudavoucher.id/assets/img/logo-payment/mandiri.png",
  "https://garudavoucher.id/assets/img/logo-payment/bni.png",
  "https://garudavoucher.id/assets/img/logo-payment/bsi.png",
  "https://garudavoucher.id/assets/img/logo-payment/cimb.png",
  "https://garudavoucher.id/assets/img/logo-payment/permatabank.png",
  "https://garudavoucher.id/assets/img/logo-payment/alfamart.png",
  "https://garudavoucher.id/assets/img/logo-payment/indomaret.png"
];

export default function Footer({ onNavigate }) {
  return (
    <footer>
      <div className="container col-md-8 col-12">
        <div className="row">
          
          <div className="col-md-3 col-12 text-start" style={{ marginTop: '20px' }}>
            <h3 className="title-footer">GARUDAVOUCHER</h3>
            <p className="faq-body">
              Platform Voucher Game dan Topup Game <b>Free Fire, Mobile Legends, Garena Shell, Steam Wallet</b> dan masih banyak lainnya dengan pembayaran yang sangat lengkap <b>QRIS dan E-Wallet</b> didukung oleh Customer Service 24 Jam.
            </p>
          </div>
          
          <div className="col-md-3 col-6 text-start" style={{ marginTop: '20px' }}>
            <h3 className="title-footer2">PETA SITUS</h3>
            <a className="contact-a faq-body" href="https://garudavoucher.id/page/privacy" target="_blank" rel="noreferrer">Kebijakan Privasi</a><br />
            <a className="contact-a faq-body" href="https://garudavoucher.id/page/terms" target="_blank" rel="noreferrer">Syarat & Ketentuan</a><br />
            <a className="contact-a faq-body" href="https://garudavoucher.id/page/disclaimer" target="_blank" rel="noreferrer">Disclaimer</a><br />
            <a className="contact-a faq-body" href="https://wa.me/6285607660007" target="_blank" rel="noreferrer">Pendaftaran Mitra / Reseller</a><br />
          </div>

          <div className="col-md-3 col-6 text-start" style={{ marginTop: '20px' }}>
            <h3 className="title-footer2">GAME POPULER</h3>
            <a className="contact-a faq-body" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order', 'mobile-legend'); }}>Top Up Diamond Mobile Legends</a><br />
            <a className="contact-a faq-body" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order', 'free-fire'); }}>Top Up Diamond Free Fire</a><br />
            <a className="contact-a faq-body" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order', 'koin-ungu-md'); }}>Top Up Koin Ungu Md</a><br />
            <a className="contact-a faq-body" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order', 'pubg-mobile'); }}>Top Up UC Pubg Mobile</a><br />
            <a className="contact-a faq-body" href="#" onClick={(e) => { e.preventDefault(); onNavigate('order', 'valorant'); }}>Top Up Valorant</a><br />
          </div>

          <div className="col-md-3 col-12 text-start" style={{ marginTop: '20px' }}>
            <h3 className="title-footer2">BUTUH BANTUAN?</h3>
            <a className="faq-body d-block mb-3" href="https://wa.me/6285607660007" target="_blank" rel="noreferrer">
              <i className="bi bi-chat-dots-fill me-2 text-success"></i> WhatsApp CS: +62 856-0766-0007
            </a>
            
            <h3 className="title-footer2">PEMBAYARAN</h3>
            <div className="gv-footer-payments">
              <div className="gv-footer-payments__grid">
                {paymentLogos.map((logoUrl, i) => (
                  <div className="gv-payment-badge" key={i}>
                    <img className="gv-payment-logo" src={logoUrl} alt="Payment Logo" />
                  </div>
                ))}
              </div>
            </div>

            <a className="dmca-badge--footer" href="//www.dmca.com/Protection/Status.aspx?ID=f60d1e5a-243c-465b-b48c-580ae1c5578c" target="_blank" rel="noreferrer">
              <img src="https://images.dmca.com/Badges/dmca_protected_sml_120c.png?ID=f60d1e5a-243c-465b-b48c-580ae1c5578c" alt="DMCA.com Protection Status" />
            </a>
          </div>

        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Garuda Voucher. Seluruh hak cipta dilindungi undang-undang.</p>
        </div>
      </div>
    </footer>
  );
}
