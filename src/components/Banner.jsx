import React, { useState, useEffect } from 'react';
import { bannerImages } from '../assets/images';


export default function Banner() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % bannerImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="container col-md-8 col-12 my-3">
      <div className="banner-frame position-relative rounded-md mx-auto overflow-hidden">
        {bannerImages.map((imgUrl, index) => (
          <div 
            key={index} 
            className="w-100 h-100 position-absolute top-0 start-0 transition-opacity" 
            style={{ 
              opacity: index === activeIndex ? 1 : 0, 
              transition: 'opacity 0.8s ease-in-out',
              zIndex: index === activeIndex ? 2 : 1
            }}
          >
            <img
              src={imgUrl}
              className="banner-slide-image w-100 h-100"
              alt={`Banner slide ${index + 1}`}
              decoding="async"
              onError={(event) => { event.currentTarget.src = `/gassets/banner/slide_${index + 1}.png`; }}
              style={{ objectFit: 'contain' }}
            />
          </div>
        ))}
        
        {/* Pagination Dots */}
        <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 d-flex gap-2" style={{ zIndex: 10 }}>
          {bannerImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className="border-0 rounded-circle"
              style={{
                width: index === activeIndex ? '28px' : '8px',
                height: '8px',
                borderRadius: '999px',
                backgroundColor: index === activeIndex ? '#6aaa4a' : 'rgba(255, 255, 255, 0.4)',
                transition: 'all 0.3s ease'
              }}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


