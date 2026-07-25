import React from 'react';

const SearchPanel = () => {
  return (
    <div id="searchPanel" className="search-panel collapse" aria-hidden="true">
      <div className="container col-md-8 col-12 d-flex justify-content-center">
        <div className="search-col">
          <div className="search-inner">
            <span className="search-icon-lg"><i className="bi bi-search"></i></span>
            <input id="globalSearchInput" type="search" className="form-control"
                   placeholder="Cari produk, promo, transaksi…" autoComplete="off" aria-label="Pencarian" />
            <button id="closeSearchPanel" type="button" className="search-clear-btn" aria-label="Tutup" title="Tutup">
              <span className="icon-wrap"><i className="bi bi-x-lg"></i></span>
            </button>
          </div>
          <div id="globalSearchResults" className="search-results-panel d-none" role="listbox" aria-label="Hasil pencarian">
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;
