import React, { useState, useEffect, useRef } from 'react';
import { logo } from '../assets/images';

export default function Header({ 
  currentView, 
  onNavigate, 
  onSearchOpen: onToggleSearch, 
  isSearchOpen, 
  onLoginOpen: onOpenLogin, 
  user, 
  onLogout 
}) {
  const isLoggedIn = !!user;
  const userProfile = user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Click outside dropdown logic
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (view, e) => {
    e.preventDefault();
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header id="header" className="header-sticky">
      <nav class="navbar navbar-expand-lg navbar-dark glass-nav py-2 px-0" role="navigation" aria-label="Main Navigation">
        <div className="container col-md-8 col-12 d-flex align-items-center justify-content-between">
          
          {/* BRAND */}
          <a href="#" onClick={(e) => handleNavClick('home', e)} className="navbar-brand flex-shrink-1 d-flex align-items-center gap-2" style={{ textDecoration: 'none' }}>
            <img src={logo} alt="Goisiin" className="img-logo" style={{ height: '32px', objectFit: 'contain' }} />
            <span className="brand-text" style={{ fontFamily: "'Oxanium', sans-serif", fontSize: '1.5rem', fontWeight: '800', color: '#fff', letterSpacing: '1px' }}>
              GOI<span style={{ color: '#6aaa4a' }}>SIIN</span>
            </span>
          </a>

          {/* MENU UTAMA */}
          <div className={`collapse navbar-collapse gv-main-nav order-lg-1 ms-lg-3 ${mobileMenuOpen ? 'show' : ''}`} id="mainNav">
            <ul className="navbar-nav gv-nav-list ms-lg-0 me-auto mb-0 align-items-lg-stretch">
              <li className="nav-item">
                <a 
                  href="#" 
                  onClick={(e) => handleNavClick('home', e)} 
                  className={`nav-link ${currentView === 'home' ? 'active-link' : ''}`}
                >
                  <i className="bx bx-home-alt nav__icon"></i><span>Home</span>
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#" 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    if (isLoggedIn) {
                      handleNavClick('transactions', e);
                    } else {
                      onOpenLogin();
                    }
                  }} 
                  className={`nav-link ${currentView === 'transactions' ? 'active-link' : ''}`}
                >
                  <i className="bx bx-history nav__icon"></i><span>Transaksi</span>
                </a>
              </li>
              <li className="nav-item">
                <a 
                  href="#" 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    alert("Promo spesial Goisiin akan segera hadir!");
                  }} 
                  className="nav-link"
                >
                  <i className="bx bx-notepad nav__icon"></i><span>Promo</span>
                </a>
              </li>
            </ul>
          </div>

          {/* ACTIONS: Search + Profile/Login + Toggler */}
          <div className="navbar-actions d-flex align-items-center ms-auto order-lg-3 gap-2">
            
            {/* Search Trigger */}
            <div className="navbar-live-search-trigger me-1 d-inline-flex">
              <button 
                id="openSearchBar" 
                type="button" 
                className="btn btn-sm d-inline-flex align-items-center gap-1" 
                onClick={onToggleSearch}
                aria-label="Buka pencarian"
              >
                <i className={`bi ${isSearchOpen ? 'bi-x-lg' : 'bi-search'}`}></i>
                <span className="d-none d-md-inline">{isSearchOpen ? 'Tutup' : 'Cari'}</span>
                <span className="d-none d-lg-inline ms-1 kbd-hint">/</span>
              </button>
            </div>

            {/* Profile or Login */}
            {isLoggedIn ? (
              <div className="dropdown dd-anchor" ref={dropdownRef}>
                <button 
                  className="btn btn-sm p-0 border-0 d-flex align-items-center" 
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  style={{ background: 'transparent' }}
                  type="button"
                >
                  <img 
                    src={userProfile?.picture || "https://lh3.googleusercontent.com/a/default-user=s100"} 
                    alt="Profile" 
                    className="profile_img" 
                  />
                </button>
                
                {profileDropdownOpen && (
                  <div className="dropdown-menu glass-dd show d-block" style={{ position: 'absolute', right: 0, top: '42px' }}>
                    <div className="dd-header">
                      <img 
                        src={userProfile?.picture || "https://lh3.googleusercontent.com/a/default-user=s100"} 
                        alt="Avatar" 
                        className="dd-avatar" 
                      />
                      <div className="dd-userblock">
                        <span className="dd-email fw-bold">{userProfile?.name}</span>
                        <span className="small text-secondary" style={{ fontSize: '0.78rem' }}>{userProfile?.email}</span>
                      </div>
                    </div>
                    
                    <div className="dd-inner mt-2">
                      <div className="wallet-tiles">
                        <div className="wallet-tile tile-coin">
                          <div className="wallet-icon">🪙</div>
                          <div className="wallet-meta">
                            <div className="wallet-title">G-Coin</div>
                            <div className="wallet-value text-success">15.000</div>
                          </div>
                        </div>
                        <div className="wallet-tile tile-gp">
                          <div className="wallet-icon">🎁</div>
                          <div className="wallet-meta">
                            <div className="wallet-title">Poin</div>
                            <div className="wallet-value text-info">320</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="dd-actions mt-3">
                        <ul className="dd-list">
                          <li className="dd-item">
                            <a href="#" onClick={(e) => { e.preventDefault(); alert("Fitur Dompet sedang dipersiapkan!"); setProfileDropdownOpen(false); }}>
                              <i className="bx bx-wallet me-2"></i> Dompet Saya
                            </a>
                          </li>
                          <li className="dd-item">
                            <a href="#" onClick={(e) => { e.preventDefault(); alert("Fitur Voucher saya!"); setProfileDropdownOpen(false); }}>
                              <i className="bx bx-coupon me-2"></i> Voucher Saya
                            </a>
                          </li>
                          <li className="dd-item logout">
                            <a href="#" onClick={(e) => { e.preventDefault(); onLogout(); setProfileDropdownOpen(false); }}>
                              <i className="bx bx-log-out me-2"></i> Keluar
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button 
                  type="button" 
                  className="btn btn-outline-success btn-sm d-inline-flex" 
                  onClick={onOpenLogin}
                >
                  Login
                </button>
              </>
            )}

            {/* Mobile Hamburger Toggler */}
            <button 
              className="navbar-toggler" 
              type="button" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen} 
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}


