import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import LoginModal from './components/LoginModal';
import Footer from './components/Footer';
import HomeView from './views/HomeView';
import OrderView from './views/OrderView';
import InvoiceView from './views/InvoiceView';
import AdminDashboard from './views/AdminDashboard';
import ChatWidget from './components/ChatWidget';
import { products as initialProducts } from './data/products';
import { supabase } from './lib/supabaseClient';

function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'order' | 'invoice' | 'admin'
  const [activeProductId, setActiveProductId] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState(null);
  
  // Dynamic products state with localStorage persistence
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('goisiin_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  // Listen for Supabase Auth state changes (Google Login Session)
  useEffect(() => {
    // 1. Ambil session aktif saat pertama dimuat
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          name: session.user.user_metadata.full_name || session.user.email,
          email: session.user.email,
          picture: session.user.user_metadata.avatar_url || 'https://lh3.googleusercontent.com/a/default-user=s100'
        });
      }
    });

    // 2. Dengarkan perubahan event login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          name: session.user.user_metadata.full_name || session.user.email,
          email: session.user.email,
          picture: session.user.user_metadata.avatar_url || 'https://lh3.googleusercontent.com/a/default-user=s100'
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen to hash change for admin access
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#/bolehnihadmin' || window.location.pathname === '/bolehnihadmin') {
        setCurrentView('admin');
      } else if (currentView === 'admin') {
        setCurrentView('home');
      }
    };

    // Check on mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleUpdateProducts = (newProducts) => {
    setProducts(newProducts);
    localStorage.setItem('goisiin_products', JSON.stringify(newProducts));
  };

  const handleNavigate = (view, data) => {
    if (view === 'home') {
      setCurrentView('home');
      setActiveProductId(null);
      setInvoiceData(null);
      window.location.hash = '';
    } else if (view === 'order') {
      setCurrentView('order');
      setActiveProductId(data);
      window.location.hash = `#/order/${data}`;
    } else if (view === 'invoice') {
      setCurrentView('invoice');
      setInvoiceData(data);
      window.location.hash = `#/invoice/${data.invoiceId}`;
    } else if (view === 'admin') {
      setCurrentView('admin');
      window.location.hash = '#/bolehnihadmin';
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
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />

      <SearchPanel
        isOpen={isSearchOpen}
        products={products}
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
          <HomeView products={products} onSelectProduct={handleSelectProduct} />
        )}
        {currentView === 'order' && (
          <OrderView
            productId={activeProductId}
            products={products}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'invoice' && (
          <InvoiceView
            invoiceData={invoiceData}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'admin' && (
          <AdminDashboard
            products={products}
            onUpdateProducts={handleUpdateProducts}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />
      
      {/* Floating Interactive Chat Widget */}
      <ChatWidget products={products} />
    </>
  );
}

export default App;


