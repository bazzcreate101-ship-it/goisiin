import React from 'react';

const FlashSale = () => {
  return (
    <div className="container col-md-8 col-12">
      <section className="flash-sale-section mb-4">
        <div className="flash-sale-container">
          <div className="flash-sale-header">
            <div className="flash-sale-heading">
              <span className="flash-sale-badge">Flash Sale</span>
              <p className="flash-sale-subtext">Segera checkout sebelum <span className="flash-sale-subtext__wrap">stok promo habis.</span></p>
            </div>
            <div className="flash-sale-countdown">
              <span className="flash-sale-countdown__label">Berakhir dalam</span>
              <div className="flash-sale-countdown__timer">
                <span id="countdown-hours" className="flash-sale-countdown__time">144</span>
                <span className="flash-sale-countdown__separator">:</span>
                <span id="countdown-minutes" className="flash-sale-countdown__time">27</span>
                <span className="flash-sale-countdown__separator">:</span>
                <span id="countdown-seconds" className="flash-sale-countdown__time">46</span>
              </div>
            </div>
          </div>
          <div className="flash-sale-marquee" role="list">
            <div className="flash-sale-track">
              {/* Item 1 */}
              <a href="#" className="flash-sale-card" role="listitem">
                <span className="flash-sale-card__glow"></span>
                <div className="flash-sale-card__thumb">
                  <img src="https://pusat.grv.co.id/image/product/213d765bf2c78ef3b719f7b909405103.webp" alt="Netflix Premium" loading="lazy" decoding="async" />
                  <span className="flash-sale-card__tag">Rp 25.000</span>
                </div>
                <div className="flash-sale-card__body">
                  <div className="flash-sale-card__heading">
                    <span className="flash-sale-card__title">Netflix Premium</span>
                    <span className="flash-sale-card__discount">
                      <strong style={{ textDecoration: 'line-through' }}>Rp 50.000</strong>
                    </span>
                  </div>
                  <span className="flash-sale-card__meta" style={{ fontSize: '12px' }}>1 Bulan - Sharing</span>
                  <div className="flash-sale-card__cta">
                    <span className="flash-sale-card__subtitle">Mulai top up instan</span>
                    <span className="flash-sale-card__button">Beli</span>
                  </div>
                </div>
              </a>
              {/* Item 2 */}
              <a href="#" className="flash-sale-card" role="listitem">
                <span className="flash-sale-card__glow"></span>
                <div className="flash-sale-card__thumb">
                  <img src="https://pusat.grv.co.id/image/product/213d765bf2c78ef3b719f7b909405103.webp" alt="Netflix Premium" loading="lazy" decoding="async" />
                  <span className="flash-sale-card__tag">Rp 49.000</span>
                </div>
                <div className="flash-sale-card__body">
                  <div className="flash-sale-card__heading">
                    <span className="flash-sale-card__title">Netflix Premium</span>
                    <span className="flash-sale-card__discount">
                      <strong style={{ textDecoration: 'line-through' }}>Rp 98.000</strong>
                    </span>
                  </div>
                  <span className="flash-sale-card__meta" style={{ fontSize: '12px' }}>1 Bulan - Private</span>
                  <div className="flash-sale-card__cta">
                    <span className="flash-sale-card__subtitle">Mulai top up instan</span>
                    <span className="flash-sale-card__button">Beli</span>
                  </div>
                </div>
              </a>
              {/* Item 3 */}
              <a href="#" className="flash-sale-card" role="listitem">
                <span className="flash-sale-card__glow"></span>
                <div className="flash-sale-card__thumb">
                  <img src="https://pusat.grv.co.id/image/product/cd43c3962845ee8e89037fdfdaf0c4c2.webp" alt="Higgs Game Island" loading="lazy" decoding="async" />
                  <span className="flash-sale-card__tag">Rp 63.360</span>
                </div>
                <div className="flash-sale-card__body">
                  <div className="flash-sale-card__heading">
                    <span className="flash-sale-card__title">Higgs Game Island</span>
                    <span className="flash-sale-card__discount">
                      <strong style={{ textDecoration: 'line-through' }}>Rp 64.000</strong>
                    </span>
                  </div>
                  <span className="flash-sale-card__meta" style={{ fontSize: '12px' }}>Tukar Kartu (1B)</span>
                  <div className="flash-sale-card__cta">
                    <span className="flash-sale-card__subtitle">Mulai top up instan</span>
                    <span className="flash-sale-card__button">Beli</span>
                  </div>
                </div>
              </a>
              {/* Item 4 */}
              <a href="#" className="flash-sale-card" role="listitem">
                <span className="flash-sale-card__glow"></span>
                <div className="flash-sale-card__thumb">
                  <img src="https://pusat.grv.co.id/image/product/cd43c3962845ee8e89037fdfdaf0c4c2.webp" alt="Higgs Game Island" loading="lazy" decoding="async" />
                  <span className="flash-sale-card__tag">Rp 126.720</span>
                </div>
                <div className="flash-sale-card__body">
                  <div className="flash-sale-card__heading">
                    <span className="flash-sale-card__title">Higgs Game Island</span>
                    <span className="flash-sale-card__discount">
                      <strong style={{ textDecoration: 'line-through' }}>Rp 128.000</strong>
                    </span>
                  </div>
                  <span className="flash-sale-card__meta" style={{ fontSize: '12px' }}>Tukar Kartu (2B)</span>
                  <div className="flash-sale-card__cta">
                    <span className="flash-sale-card__subtitle">Mulai top up instan</span>
                    <span className="flash-sale-card__button">Beli</span>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FlashSale;
