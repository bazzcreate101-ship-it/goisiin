import React from 'react';

const Header = () => {
  return (
    <header id="header" className="header-sticky">
      <nav className="navbar navbar-expand-lg navbar-dark glass-nav py-2 px-0" role="navigation" aria-label="Main Navigation">
        <div className="container col-md-8 col-12 d-flex align-items-center justify-content-between">
          <a href="/" className="navbar-brand flex-shrink-1">
            <img className="img-logo" src="https://pusat.grv.co.id/_azure/garudavoucher__logo.png" alt="Garuda Voucher Indonesia" />
          </a>

          <div className="collapse navbar-collapse gv-main-nav order-lg-1 ms-lg-3" id="mainNav">
            <ul className="navbar-nav gv-nav-list ms-lg-0 me-auto mb-0 align-items-lg-stretch">
              <li className="nav-item">
                <a href="/" className="nav-link active-link">
                  <i className='bx bx-home-alt nav__icon'></i><span>Home</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" className="nav-link" id="btn-login" data-bs-toggle="modal" data-bs-target="#exampleModal">
                  <i className='bx bx-history nav__icon'></i><span>Transaksi</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" className="nav-link" id="btn-login" data-bs-toggle="modal" data-bs-target="#exampleModal">
                  <i className='bx bx-notepad nav__icon'></i><span>Promo</span>
                </a>
              </li>
            </ul>
            <div className="dd-backdrop d-none" id="ddBackdrop"></div>
          </div>

          <div className="navbar-actions d-flex align-items-center ms-auto order-lg-3 gap-2">
            <div className="navbar-live-search-trigger me-1 d-inline-flex">
              <button id="openSearchBar" type="button" className="btn btn-sm d-inline-flex align-items-center gap-1" aria-label="Buka pencarian">
                <i className="bi bi-search"></i>
                <span className="d-none d-md-inline">Cari</span>
                <span className="d-none d-lg-inline ms-1 kbd-hint">/</span>
              </button>
            </div>

            <button type="button" className="btn btn-outline-warning btn-sm d-inline-flex d-lg-none" data-bs-toggle="modal" data-bs-target="#exampleModal">Login</button>
            <button type="button" className="btn btn-outline-warning btn-sm d-none d-lg-inline-flex" data-bs-toggle="modal" data-bs-target="#exampleModal">Login</button>
            
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse"
                    data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
