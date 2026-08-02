import React, { useState, useEffect } from 'react';
import { productImages } from '../assets/images';

const flashSaleItems = [
  {
    productId: 'higgs-game-island',
    name: 'Higgs Game Island',
    meta: 'Tukar Kartu (1B)',
    image: productImages['higgs-game-island'],
    originalPrice: 'Rp 64.000',
    price: 'Rp 63.360'
  },
  {
    productId: 'higgs-game-island',
    name: 'Higgs Game Island',
    meta: 'Tukar Kartu (2B)',
    image: productImages['higgs-game-island'],
    originalPrice: 'Rp 128.000',
    price: 'Rp 126.720'
  },
  {
    productId: 'higgs-game-island',
    name: 'Higgs Game Island',
    meta: 'Tukar Kartu (3B)',
    image: productImages['higgs-game-island'],
    originalPrice: 'Rp 192.000',
    price: 'Rp 190.080'
  },
  {
    productId: 'mobile-legend',
    name: 'Mobile Legend',
    meta: '250 Diamonds',
    image: productImages['mobile-legend'],
    originalPrice: 'Rp 77.000',
    price: 'Rp 69.300'
  },
  {
    productId: 'free-fire',
    name: 'Free Fire',
    meta: '355 Diamonds',
    image: productImages['free-fire'],
    originalPrice: 'Rp 55.000',
    price: 'Rp 49.500'
  },
  {
    productId: 'valorant',
    name: 'Valorant',
    meta: '1000 VP',
    image: productImages['valorant'],
    originalPrice: 'Rp 120.000',
    price: 'Rp 108.000'
  }
];

export default function FlashSale({ onSelectProduct }) {
  // Let's set countdown to count down 8 hours from now repeatedly, or show a timer
  const [timeLeft, setTimeLeft] = useState({ hours: '08', minutes: '00', seconds: '00' });

  useEffect(() => {
    // End time is 8 hours from now
    const endTime = Date.now() + 8 * 60 * 60 * 1000;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft({ hours: '00', minutes: '00', seconds: '00' });
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeLeft({
          hours: h < 10 ? '0' + h : String(h),
          minutes: m < 10 ? '0' + m : String(m),
          seconds: s < 10 ? '0' + s : String(s)
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCardClick = (prodId, e) => {
    e.preventDefault();
    onSelectProduct(prodId);
  };

  // Duplicate items for seamless marquee scrolling
  const marqueeItems = [...flashSaleItems, ...flashSaleItems];

  return (
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
              <span id="countdown-hours" className="flash-sale-countdown__time">{timeLeft.hours}</span>
              <span className="flash-sale-countdown__separator">:</span>
              <span id="countdown-minutes" className="flash-sale-countdown__time">{timeLeft.minutes}</span>
              <span className="flash-sale-countdown__separator">:</span>
              <span id="countdown-seconds" className="flash-sale-countdown__time">{timeLeft.seconds}</span>
            </div>
          </div>
        </div>

        <div className="flash-sale-marquee" role="list">
          <div className="flash-sale-track">
            {marqueeItems.map((item, idx) => (
              <a 
                href={`#/order/game/${item.productId}`} 
                className="flash-sale-card" 
                key={idx} 
                onClick={(e) => handleCardClick(item.productId, e)}
                role="listitem"
              >
                <span className="flash-sale-card__glow"></span>
                <div className="flash-sale-card__thumb">
                  <img src={item.image} alt={item.name} loading="lazy" />
                  <span className="flash-sale-card__tag">{item.price}</span>
                </div>
                <div className="flash-sale-card__body">
                  <div className="flash-sale-card__heading">
                    <span className="flash-sale-card__title text-white">{item.name}</span>
                    <span className="flash-sale-card__discount">
                      <strong style={{ textDecoration: 'line-through' }}>{item.originalPrice}</strong>
                    </span>
                  </div>
                  <span className="flash-sale-card__meta">{item.meta}</span>
                  <div className="flash-sale-card__cta">
                    <span className="flash-sale-card__subtitle text-secondary">Mulai top up instan</span>
                    <span className="flash-sale-card__button">Beli</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


