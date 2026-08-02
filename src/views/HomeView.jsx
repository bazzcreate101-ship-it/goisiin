import React, { useState } from 'react';
import Banner from '../components/Banner';
import FlashSale from '../components/FlashSale';
import Categories from '../components/Categories';
import { products } from '../data/products';

export default function HomeView({ onSelectProduct }) {
  const [activeCategory, setActiveCategory] = useState('popular');

  const filteredProducts = activeCategory === 'popular'
    ? products.filter(p => p.popular)
    : products.filter(p => p.category === activeCategory);

  const handleProductClick = (prodId, e) => {
    e.preventDefault();
    onSelectProduct(prodId);
  };

  return (
    <div className="main main-surface">

      {/* 1. HERO BANNER SLIDER */}
      <Banner />

      <div className="container col-md-8 col-12">

        {/* 2. LIST PRODUCT WRAPPER — same structure as original */}
        <div className="list-product">

          {/* 2a. CATEGORIES STICKY BAR (comes FIRST in original) */}
          <Categories activeCategory={activeCategory} onSelectCategory={setActiveCategory} />

          {/* 2b. FLASH SALE */}
          <FlashSale onSelectProduct={onSelectProduct} />

          {/* 2c. PRODUCT GRID HEADER */}
          <div id="allContent" className="row pt-1">
            <div className="col-lg-12 col-12" id="populerContent">
              <div
                className="card-header d-flex justify-content-between mb-3"
                style={{ backgroundColor: 'rgb(38,38,38)', color: '#6aaa4a', padding: '10px 16px', borderRadius: '8px' }}
              >
                <h3 className="p-0 m-0" style={{ fontSize: '1.1rem' }}>
                  <b>{activeCategory === 'popular' ? 'Populer' : 'Daftar Produk'}</b>
                </h3>
              </div>

              {/* 2d. PRODUCT GRID — col-6 col-lg-3 with custom-card horizontal layout */}
              <div className="row mb-3" id="populer-grid-max">
                {filteredProducts.map(prod => (
                  <div key={prod.id} className="col-6 col-lg-3 mb-3 p-1" style={{ minHeight: '80px' }}>
                    <a
                      href={`#/order/game/${prod.id}`}
                      onClick={(e) => handleProductClick(prod.id, e)}
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        className="custom-card h-60 position-relative"
                        style={{ backgroundImage: `url('${prod.image}')` }}
                      >
                        <div className="custom-card-left">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="custom-card-icon"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                        <div className="custom-card-body">
                          {prod.name}<br />
                          <p style={{ fontSize: '0.75rem' }}>Top up Game</p>
                        </div>
                        {prod.discount && (
                          <>
                            <div className="d-flex justify-content-end" style={{ position: 'absolute', top: 0, right: 0, left: 0 }}>
                              <div className="v36_9 shimmer"></div>
                            </div>
                            <span className="v36_10 text-white">{prod.discount}</span>
                          </>
                        )}
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>{/* end .list-product */}

        {/* 3. NEWS SECTION */}
        <div className="news-section mb-4" style={{ background: 'transparent', padding: 0 }}>
          <div className="news-section-header">
            <div className="news-section-title">
              <span>Berita</span>
              <h3>Update terbaru dari Goisiin</h3>
              <p className="news-section-subtitle">Dapatkan tips, promo, dan highlight komunitas setiap minggunya.</p>
            </div>
            <a href="https://garudavoucher.id/blog/" target="_blank" rel="noopener noreferrer" className="news-section-link">
              Lihat semua <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
          <div className="news-card-track">
            <a href="https://garudavoucher.id/blog/" target="_blank" rel="noreferrer" className="news-card">
              <div className="news-card-thumb">
                <img src="/gassets/banner/slide_1769171315.webp" alt="News 1" />
              </div>
              <div className="news-card-content">
                <h4 className="news-card-title">Promo Diamond Mobile Legends Merdeka 2026</h4>
                <p className="news-card-description">Rayakan bulan kemerdekaan dengan promo diskon up to 15% top up Diamond Mobile Legends hanya di Goisiin!</p>
                <span className="news-card-cta">Baca selengkapnya &rarr;</span>
              </div>
            </a>
            <a href="https://garudavoucher.id/blog/" target="_blank" rel="noreferrer" className="news-card">
              <div className="news-card-thumb">
                <img src="/gassets/banner/slide_1773165603.webp" alt="News 2" />
              </div>
              <div className="news-card-content">
                <h4 className="news-card-title">Event Top Up Free Fire x Spider-Man</h4>
                <p className="news-card-description">Dapatkan token eksklusif kolaborasi FF x Spider-Man dengan melakukan top up minimal 100 Diamonds di Goisiin.</p>
                <span className="news-card-cta">Baca selengkapnya &rarr;</span>
              </div>
            </a>
            <a href="https://garudavoucher.id/blog/" target="_blank" rel="noreferrer" className="news-card">
              <div className="news-card-thumb">
                <img src="/gassets/banner/slide_1767514787.webp" alt="News 3" />
              </div>
              <div className="news-card-content">
                <h4 className="news-card-title">Tips Aman Top Up Akun Game Online</h4>
                <p className="news-card-description">Pastikan akun game kamu aman! Pelajari tips top up tanpa memasukkan password dan menghindari scam digital shop.</p>
                <span className="news-card-cta">Baca selengkapnya &rarr;</span>
              </div>
            </a>
          </div>
        </div>

        {/* 4. FAQ SECTION */}
        <section className="gvx-faq-section mb-4" aria-labelledby="faqTitle">
          <div className="gvx-faq-container">
            <div className="gvx-faq-wrapper">
              <header className="gvx-faq-header">
                <div className="gvx-faq-heading">
                  <span className="gvx-faq-badge">FAQ</span>
                  <h2 id="faqTitle" className="gvx-faq-title">Hal yang paling sering ditanyakan</h2>
                </div>
                <p className="gvx-faq-copy">Temukan jawaban singkat terkait pengalaman top up, opsi pembayaran, hingga cara mendapatkan bantuan dari tim Goisiin.</p>
                <div className="gvx-faq-chips" role="list">
                  <span className="gvx-faq-chip" role="listitem">Dukungan 24/7</span>
                  <span className="gvx-faq-chip" role="listitem">Transaksi Anti Ribet</span>
                  <span className="gvx-faq-chip gvx-faq-chip--promo" role="listitem">Promo Tiap Minggu</span>
                </div>
              </header>

              <div className="gvx-faq-highlights">
                <article className="gvx-faq-highlight">
                  <span className="gvx-faq-highlight-badge">Instan</span>
                  <h3 className="gvx-faq-highlight-title">Top up cuma hitungan detik</h3>
                  <p className="gvx-faq-highlight-copy">Balance langsung masuk setelah pembayaran berhasil tanpa perlu menunggu lama.</p>
                </article>
                <article className="gvx-faq-highlight">
                  <span className="gvx-faq-highlight-badge">Fleksibel</span>
                  <h3 className="gvx-faq-highlight-title">Metode pembayaran lengkap</h3>
                  <p className="gvx-faq-highlight-copy">Dari e-wallet, bank, pulsa, sampai minimarket - pilih cara yang paling nyaman buat kamu.</p>
                </article>
                <article className="gvx-faq-highlight">
                  <span className="gvx-faq-highlight-badge">Support</span>
                  <h3 className="gvx-faq-highlight-title">Tim bantuan yang selalu siap</h3>
                  <p className="gvx-faq-highlight-copy">WhatsApp kami aktif 24 jam untuk memastikan pengalaman top up kamu selalu mulus.</p>
                </article>
              </div>

              <div className="accordion gvx-faq-accordion" id="faqAccordion">
                <div className="accordion-item">
                  <h3 className="accordion-header" id="faqHeadingOne">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faqCollapseOne" aria-expanded="false" aria-controls="faqCollapseOne">
                      <span className="gvx-faq-question">Apa itu Goisiin?</span>
                      <span className="gvx-faq-toggle" aria-hidden="true"></span>
                    </button>
                  </h3>
                  <div id="faqCollapseOne" className="accordion-collapse collapse" aria-labelledby="faqHeadingOne" data-bs-parent="#faqAccordion">
                    <div className="accordion-body gvx-faq-body">
                      <strong>Goisiin</strong> merupakan tempat terpercaya untuk kamu beli voucher game dan juga top up game. Kami menyediakan banyak sekali game terkenal seperti Free Fire, Mobile Legends, Genshin Impact, PUBG, Valorant dan kamu masih bisa menemukan lebih dari 100+ game.
                    </div>
                  </div>
                </div>
                <div className="accordion-item">
                  <h3 className="accordion-header" id="faqHeadingTwo">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faqCollapseTwo" aria-expanded="false" aria-controls="faqCollapseTwo">
                      <span className="gvx-faq-question">Kenapa memilih Goisiin?</span>
                      <span className="gvx-faq-toggle" aria-hidden="true"></span>
                    </button>
                  </h3>
                  <div id="faqCollapseTwo" className="accordion-collapse collapse" aria-labelledby="faqHeadingTwo" data-bs-parent="#faqAccordion">
                    <div className="accordion-body gvx-faq-body">
                      Kami tahu kalau waktu kamu sangat berharga! Untuk itu kami membuatnya lebih mudah, sehingga proses top up game sangat cepat. Setelah kamu melakukan pembayaran, voucher game akan langsung masuk ke akunmu tanpa delay. Selain itu, kami juga menyediakan metode pembayaran yang lengkap, kamu bisa top up kapan saja, di mana saja.
                    </div>
                  </div>
                </div>
                <div className="accordion-item">
                  <h3 className="accordion-header" id="faqHeadingThree">
                    <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faqCollapseThree" aria-expanded="false" aria-controls="faqCollapseThree">
                      <span className="gvx-faq-question">Bagaimana cara beli voucher game?</span>
                      <span className="gvx-faq-toggle" aria-hidden="true"></span>
                    </button>
                  </h3>
                  <div id="faqCollapseThree" className="accordion-collapse collapse" aria-labelledby="faqHeadingThree" data-bs-parent="#faqAccordion">
                    <div className="accordion-body gvx-faq-body">
                      <p><strong>Gampang banget:</strong></p>
                      <ul>
                        <li>Pilih game yang kamu mainkan di halaman utama website</li>
                        <li>Masukkan ID akun kamu</li>
                        <li>Pilih jumlah yang ingin kamu top up</li>
                        <li>Bayar dengan metode yang kamu mau</li>
                        <li>Voucher langsung masuk ke game!</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>{/* end container col-md-8 */}

      {/* 5. MAIN DESCRIPTION / SEO SECTION */}
      <div className="main-description-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8 col-12">
              <div className="main-description-content">
                <h1 className="main-description-heading">
                  <span className="heading-lead">Tempat top up voucher game murah,</span>
                  <span className="heading-accent">Beli voucher game sekarang!</span>
                </h1>
                <p className="main-description-copy">Goisiin adalah tempat terbaik untuk top up game yang menyediakan banyak pilihan voucher. Kamu ingin beli diamond atau voucher hiburan? Semua bisa kamu dapatkan di sini. Proses top up-nya gampang dan metode pembayarannya lengkap. Yuk, beli voucher game di Goisiin dan dapatkan peluang bonus voucher!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


