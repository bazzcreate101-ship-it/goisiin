import React, { useState, useEffect, useRef } from 'react';
import { logo } from '../assets/images';
import { getStampSummary } from '../lib/stampService';
import { readStorageList } from '../lib/storage';
import { getWalletBalance } from '../lib/walletService';

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
  const userTransactions = isLoggedIn ? readStorageList('goisiin_transactions').filter((tx) => tx.userEmail === user.email) : [];
  const successTransactions = userTransactions.filter((tx) => tx.status === 'success');
  const userPoints = successTransactions.reduce((sum, tx) => sum + Number(tx.points || 0), 0);
  const stampSummary = isLoggedIn ? getStampSummary(user.email) : null;
  const walletBalance = isLoggedIn ? getWalletBalance(user.email) : 0;
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
      <nav className="navbar navbar-expand-lg navbar-dark glass-nav py-2 px-0" role="navigation" aria-label="Main Navigation">
        <div className="container col-md-8 col-12 d-flex align-items-center justify-content-between">
          
          {/* BRAND */}
          <a href="#" onClick={(e) => handleNavClick('home', e)} className="navbar-brand flex-shrink-1 d-flex align-items-center" style={{ textDecoration: 'none' }}>
            <img src={logo} alt="Goisiinn" className="img-logo" onError={(event) => { event.currentTarget.src = '/gassets/logo.png'; }} />
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
                    handleNavClick('stamp', e);
                  }} 
                  className={`nav-link ${currentView === 'stamp' ? 'active-link' : ''}`}
                >
                  <i className="bx bx-gift nav__icon"></i><span>Stamp</span>
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
                    onError={(event) => { event.currentTarget.src = '/gassets/logo.png'; }}
                  />
                </button>
                
                {profileDropdownOpen && (
                  <div className="dropdown-menu glass-dd show d-block" style={{ position: 'absolute', right: 0, top: '42px' }}>
                    <div className="dd-header dd-header--profile">
                      <img 
                        src={userProfile?.picture || "https://lh3.googleusercontent.com/a/default-user=s100"} 
                        alt="Avatar" 
                        className="dd-avatar" 
                        onError={(event) => { event.currentTarget.src = '/gassets/logo.png'; }}
                      />
                      <div className="dd-userblock">
                        <span className="dd-email fw-bold">{userProfile?.name || 'Member Goisiinn'}</span>
                        <span className="small text-secondary" style={{ fontSize: '0.78rem' }}>{userProfile?.email}</span>
                        <span className="dd-member-badge">Member Goisiinn</span>
                      </div>
                    </div>
                    
                    <div className="dd-inner mt-2">
                      <div className="wallet-tiles">
                        <div className="wallet-tile tile-coin">
                          <div className="wallet-icon">🪙</div>
                          <div className="wallet-meta">
                            <div className="wallet-title">Saldo</div>
                            <div className="wallet-value text-success">Rp{walletBalance.toLocaleString('id-ID')}</div>
                          </div>
                        </div>
                        <div className="wallet-tile tile-gp">
                          <div className="wallet-icon">🎁</div>
                          <div className="wallet-meta">
                            <div className="wallet-title">Poin</div>
                            <div className="wallet-value text-info">{userPoints.toLocaleString('id-ID')}</div>
                          </div>
                        </div>
                      </div>
                      <div className="profile-mini-stats">
                        <div>
                          <strong>{stampSummary?.unique || 0}/6</strong>
                          <span>Stamp unik</span>
                        </div>
                        <div>
                          <strong>{userTransactions.length}</strong>
                          <span>Transaksi</span>
                        </div>
                        <div>
                          <strong>{successTransactions.length}</strong>
                          <span>Sukses</span>
                        </div>
                      </div>
                      
                      <div className="dd-actions mt-3">
                        <ul className="dd-list">
                          <li className="dd-item">
                            <a href="#" onClick={(e) => { e.preventDefault(); handleNavClick('stamp', e); setProfileDropdownOpen(false); }}>
                              <i className="bx bx-gift me-2"></i> Stamp Saya
                            </a>
                          </li>
                          <li className="dd-item">
                            <a href="#/wallet" onClick={(e) => { handleNavClick('wallet', e); setProfileDropdownOpen(false); }}>
                              <i className="bx bx-wallet me-2"></i> Dompet Saya
                            </a>
                          </li>
                          <li className="dd-item">
                            <a href="#/vouchers" onClick={(e) => { handleNavClick('vouchers', e); setProfileDropdownOpen(false); }}>
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


