import React from 'react';

const paymentLogoList = [
  ['Saldo Goisiin', '/gassets/payment/goisiin-balance.svg'],
  ['Alfamart', '/gassets/payment/ref/alfamart.png'],
  ['AstraPay', '/gassets/payment/ref/astrapay.png'],
  ['BCA', '/gassets/payment/ref/bca.png'],
  ['BNC', '/gassets/payment/ref/bnc.png'],
  ['BNI', '/gassets/payment/ref/bni.png'],
  ['BRIVA', '/gassets/payment/ref/briva.png'],
  ['Visa Mastercard', '/gassets/payment/ref/visa-mastercard.webp'],
  ['DANA', '/gassets/payment/ref/dana.png'],
  ['LinkAja', '/gassets/payment/ref/linkaja.png'],
  ['Mandiri', '/gassets/payment/ref/mandiri.png'],
  ['OVO', '/gassets/payment/ref/ovo.png'],
  ['PermataBank', '/gassets/payment/ref/permata.png'],
  ['QRIS', '/gassets/payment/ref/qris.png'],
  ['ShopeePay', '/gassets/payment/ref/shopeepay.png'],
  ['GoPay', '/gassets/payment/gopay.svg'],
  ['Indomaret', '/gassets/payment/indomaret.svg'],
];


export default function Footer({ onNavigate }) {
  return (
    <footer>
      <div className="container col-md-8 col-12">
        <div className="row">
          
          <div className="col-md-3 col-12 text-start" style={{ marginTop: '20px' }}>
            <h3 className="title-footer">GOISIIN</h3>
            <p className="faq-body">
              Platform Voucher Game dan Topup Game <b>Free Fire, Mobile Legends, Garena Shell, Steam Wallet</b> dan masih banyak lainnya dengan pembayaran yang sangat lengkap <b>QRIS dan E-Wallet</b> didukung oleh Customer Service 24 Jam.
            </p>
          </div>
          
          <div className="col-md-3 col-6 text-start" style={{ marginTop: '20px' }}>
            <h3 className="title-footer2">PETA SITUS</h3>
            <a className="contact-a faq-body" href="#/page/privacy">Kebijakan Privasi</a><br />
            <a className="contact-a faq-body" href="#/page/terms">Syarat & Ketentuan</a><br />
            <a className="contact-a faq-body" href="#/page/disclaimer">Disclaimer</a><br />
            <a className="contact-a faq-body" href="https://wa.me/6281388427196" target="_blank" rel="noreferrer">Pendaftaran Mitra / Reseller</a><br />
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
            <a className="faq-body d-block mb-3" href="https://wa.me/6281388427196" target="_blank" rel="noreferrer">
              <i className="bi bi-chat-dots-fill me-2 text-success"></i> WhatsApp CS: +62 813-8842-7196
            </a>
            
            <h3 className="title-footer2">PEMBAYARAN</h3>
            <div className="gv-footer-payments">
              <div className="gv-footer-payments__grid">
                {paymentLogoList.map(([name, logoUrl]) => (
                  <div className="gv-payment-badge" key={name}>
                    <span className="gv-payment-fallback">{name}</span>
                    <img
                      className="gv-payment-logo"
                      src={logoUrl}
                      alt={name}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                        event.currentTarget.closest('.gv-payment-badge')?.classList.add('gv-payment-badge--fallback');
                      }}
                    />
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
          <p>© {new Date().getFullYear()} Goisiin. Seluruh hak cipta dilindungi undang-undang.</p>
        </div>
      </div>
    </footer>
  );
}


