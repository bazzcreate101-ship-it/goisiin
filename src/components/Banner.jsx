import React, { useEffect, useRef } from 'react';

const Banner = () => {
  const swiperRef = useRef(null);

  useEffect(() => {
    if (window.Swiper) {
      new window.Swiper('.banner-swiper', {
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
        },
        loop: true,
        autoplay: {
          delay: 3000,
          disableOnInteraction: false,
        },
      });
    }
  }, []);

  return (
    <div className="container col-md-8 col-12">
      <div className="banner-frame skeleton rounded-md mx-auto">
        <div className="swiper banner-swiper rounded-md" ref={swiperRef}>
          <div className="swiper-wrapper">
            <div className="swiper-slide">
              <img src="https://pusat.grv.co.id/image/banner/slide_1769171315.webp" className="banner-slide-image skeleton" alt="Banner slide 1" />
            </div>
            <div className="swiper-slide">
              <img src="https://pusat.grv.co.id/image/banner/slide_1773165603.webp" className="banner-slide-image skeleton" alt="Banner slide 2" />
            </div>
            <div className="swiper-slide">
              <img src="https://pusat.grv.co.id/image/banner/slide_1767514787.webp" className="banner-slide-image skeleton" alt="Banner slide 3" />
            </div>
            <div className="swiper-slide">
              <img src="https://pusat.grv.co.id/image/banner/slide_1765284294.webp" className="banner-slide-image skeleton" alt="Banner slide 4" />
            </div>
            <div className="swiper-slide">
              <img src="https://pusat.grv.co.id/image/banner/slide_1753019433.webp" className="banner-slide-image skeleton" alt="Banner slide 5" />
            </div>
            <div className="swiper-slide">
              <img src="https://pusat.grv.co.id/image/banner/slide_1751769782.webp" className="banner-slide-image skeleton" alt="Banner slide 6" />
            </div>
          </div>
          <div className="swiper-pagination"></div>
        </div>
      </div>
    </div>
  );
};

export default Banner;
