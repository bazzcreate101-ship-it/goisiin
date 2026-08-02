import React, { useState } from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import LoginModal from './components/LoginModal';
import Footer from './components/Footer';
import HomeView from './views/HomeView';
import OrderView from './views/OrderView';
import InvoiceView from './views/InvoiceView';

function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'order' | 'invoice'
  const [activeProductId, setActiveProductId] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState(null);

  const handleNavigate = (view, data) => {
    if (view === 'home') {
      setCurrentView('home');
      setActiveProductId(null);
      setInvoiceData(null);
    } else if (view === 'order') {
      setCurrentView('order');
      setActiveProductId(data);
    } else if (view === 'invoice') {
      setCurrentView('invoice');
      setInvoiceData(data);
    }
    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (productId) => {
    handleNavigate('order', productId);
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  return (
    <>
      <Header
        currentView={currentView}
        onSearchOpen={() => setIsSearchOpen(true)}
        isSearchOpen={isSearchOpen}
        onLoginOpen={() => setIsLoginOpen(true)}
        user={user}
        onLogout={() => setUser(null)}
        onNavigate={handleNavigate}
      />

      <SearchPanel
        isOpen={isSearchOpen}
        onSelectProduct={(id) => {
          setIsSearchOpen(false);
          handleSelectProduct(id);
        }}
        onClose={() => setIsSearchOpen(false)}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Main content rendered by view */}
      <main id="main-content">
        {currentView === 'home' && (
          <HomeView onSelectProduct={handleSelectProduct} />
        )}
        {currentView === 'order' && (
          <OrderView
            productId={activeProductId}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'invoice' && (
          <InvoiceView
            invoiceData={invoiceData}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />
    </>
  );
}

export default App;
