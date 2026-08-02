import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import LoginModal from './components/LoginModal';
import Footer from './components/Footer';
import HomeView from './views/HomeView';
import OrderView from './views/OrderView';
import InvoiceView from './views/InvoiceView';
import AdminLogin from './views/AdminLogin';
import AdminDashboard from './views/AdminDashboard';
import ChatWidget from './components/ChatWidget';
import { products as initialProducts } from './data/products';
import { supabase } from './lib/supabaseClient';

// Cek apakah URL adalah halaman admin (path atau hash)
const isAdminUrl = () =>
  window.location.pathname === '/bolehnihadmin' ||
  window.location.hash === '#/bolehnihadmin';

// Ambil sesi admin dari sessionStorage
const getAdminSession = () => {
  try {
    const saved = sessionStorage.getItem('adminAuth');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Sesi expired setelah 8 jam
    if (Date.now() - parsed.loggedAt > 8 * 60 * 60 * 1000) {
      sessionStorage.removeItem('adminAuth');
      return null;
    }
    return parsed;
  } catch { return null; }
};

function App() {
  const [currentView, setCurrentView] = useState(() => isAdminUrl() ? 'admin' : 'home');
  const [activeProductId, setActiveProductId] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(() => isAdminUrl() ? getAdminSession() : null);

  // Dynamic products state with localStorage persistence
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('goisiin_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  // Supabase Auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          name: session.user.user_metadata.full_name || session.user.email,
          email: session.user.email,
          picture: session.user.user_metadata.avatar_url || null
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          name: session.user.user_metadata.full_name || session.user.email,
          email: session.user.email,
          picture: session.user.user_metadata.avatar_url || null
        });
        // Jika login berhasil dan URL masih di halaman login, arahkan ke home
        if (isAdminUrl()) return;
        // Kalau ada hash dari Supabase OAuth redirect, bersihkan ke home
        if (window.location.hash.startsWith('#access_token=')) {
          window.location.hash = '';
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen URL changes
  useEffect(() => {
    const checkUrl = () => {
      if (isAdminUrl()) {
        setCurrentView('admin');
      }
    };
    checkUrl();
    window.addEventListener('hashchange', checkUrl);
    window.addEventListener('popstate', checkUrl);
    return () => {
      window.removeEventListener('hashchange', checkUrl);
      window.removeEventListener('popstate', checkUrl);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAdminLogin = (name) => {
    setAdminUser({ name, loggedAt: Date.now() });
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('adminAuth');
    setAdminUser(null);
    setCurrentView('home');
    window.location.href = '/';
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
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (productId) => handleNavigate('order', productId);
  const handleLoginSuccess = (userData) => setUser(userData);

  // ── ADMIN ROUTE ──────────────────────────────────────
  if (currentView === 'admin') {
    if (!adminUser) {
      return <AdminLogin onLogin={handleAdminLogin} />;
    }
    return (
      <AdminDashboard
        products={products}
        onUpdateProducts={handleUpdateProducts}
        adminUser={adminUser}
        onLogout={handleAdminLogout}
        onNavigate={handleNavigate}
      />
    );
  }

  // ── MAIN APP ─────────────────────────────────────────
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
      </main>

      <Footer onNavigate={handleNavigate} />

      <ChatWidget products={products} />
    </>
  );
}

export default App;
