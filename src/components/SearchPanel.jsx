import React, { useState, useEffect } from 'react';
import { products } from '../data/products';

export default function SearchPanel({ isOpen, onClose, onSelectProduct }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query.trim().length >= 3) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query]);

  if (!isOpen) return null;

  const handleResultClick = (productId) => {
    onSelectProduct(productId);
    setQuery('');
    onClose();
  };

  return (
    <div id="searchPanel" className="search-panel show d-block" aria-hidden="false">
      <div className="container col-md-8 col-12 d-flex justify-content-center">
        <div className="search-col w-100">
          <div className="search-inner">
            <span className="search-icon-lg"><i className="bi bi-search"></i></span>
            <input 
              id="globalSearchInput" 
              type="search" 
              className="form-control"
              placeholder="Cari game, voucher, atau digital e-wallet..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off" 
              aria-label="Pencarian"
            />
            {query.trim().length > 0 && (
              <button 
                id="clearSearchInput" 
                type="button" 
                className="search-clear-btn" 
                onClick={() => setQuery('')}
                style={{ right: '40px' }}
                aria-label="Bersihkan"
              >
                <i className="bi bi-x-lg text-secondary"></i>
              </button>
            )}
            <button 
              id="closeSearchPanel" 
              type="button" 
              className="search-clear-btn" 
              onClick={onClose}
              aria-label="Tutup" 
              title="Tutup"
            >
              <i className="bi bi-x-lg text-white"></i>
            </button>
          </div>

          {/* RESULTS */}
          {query.trim().length >= 3 && (
            <div id="globalSearchResults" className="search-results-panel d-block" role="listbox" aria-label="Hasil pencarian">
              <div className="search-section-title">Hasil Pencarian untuk "{query}"</div>
              {results.length > 0 ? (
                <ul className="search-list">
                  {results.map(prod => (
                    <li key={prod.id} className="search-item">
                      <a 
                        href={`#/order/game/${prod.id}`}
                        onClick={(e) => { e.preventDefault(); handleResultClick(prod.id); }}
                        className="d-flex align-items-center"
                      >
                        <img src={prod.image} className="me-2 p-1" width="50" height="50" loading="lazy" alt={prod.name} />
                        <div className="flex-grow-1">
                          <div className="fw-semibold text-white">{prod.name}</div>
                          <div className="small text-secondary" style={{ opacity: 0.85 }}>Mulai top up instan murah</div>
                        </div>
                        {prod.discount && <span className="badge rounded-pill ms-2 search-badge">{prod.discount}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="search-list">
                  <li className="px-3 py-3 text-secondary text-center">
                    Tidak ada hasil untuk "<strong>{query}</strong>"
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

