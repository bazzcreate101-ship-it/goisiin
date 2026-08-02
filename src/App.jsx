import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import LoginModal from './components/LoginModal';
import Footer from './components/Footer';
import HomeView from './views/HomeView';
import OrderView from './views/OrderView';
import InvoiceView from './views/InvoiceView';
import TransactionsView from './views/TransactionsView';
import AdminLogin from './views/AdminLogin';
import AdminDashboard from './views/AdminDashboard';
import ChatWidget from './components/ChatWidget';
import { products as initialProducts } from './data/products';
import { supabase } from './lib/supabaseClient';
import {
  findTransactionByInvoiceId,
  normalizeStoredProducts,
  readUserTransactions,
  safeJsonParse,
} from './lib/storage';

const ADMIN_TOKEN_KEY = 'goisiin_admin_token';

const isAdminUrl = () =>
  window.location.pathname === '/bolehnihadmin' ||
  window.location.hash === '#/bolehnihadmin';

const parseRoute = () => {
  if (isAdminUrl()) return { view: 'admin' };

  const hash = window.location.hash || '';
  if (hash.startsWith('#/order/')) {
    return { view: 'order', productId: decodeURIComponent(hash.replace('#/order/', '')) };
  }
  if (hash.startsWith('#/invoice/')) {
    return { view: 'invoice', invoiceId: decodeURIComponent(hash.replace('#/invoice/', '')) };
  }
  if (hash === '#/transactions') {
    return { view: 'transactions' };
  }
  return { view: 'home' };
};

function App() {
  const [initialRoute] = useState(parseRoute);
  const [currentView, setCurrentView] = useState(initialRoute.view);
  const [activeProductId, setActiveProductId] = useState(initialRoute.productId || null);
  const [invoiceData, setInvoiceData] = useState(() => (
    initialRoute.invoiceId ? findTransactionByInvoiceId(initialRoute.invoiceId) : null
  ));
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [adminChecking, setAdminChecking] = useState(() => initialRoute.view === 'admin');

  const [products, setProducts] = useState(() => (
    normalizeStoredProducts(localStorage.getItem('goisiin_products'), initialProducts)
  ));

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
        if (isAdminUrl()) return;
        if (window.location.hash.startsWith('#access_token=')) {
          window.location.hash = '';
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.email) {
      const userList = safeJsonParse(localStorage.getItem('goisiin_users'), []);
      if (!userList.some(u => u.email === user.email)) {
        userList.push({
          name: user.name,
          email: user.email,
          picture: user.picture,
          lastLogin: new Date().toLocaleString('id-ID')
        });
        localStorage.setItem('goisiin_users', JSON.stringify(userList));
      }
    }
  }, [user]);

  const verifyAdminSession = async () => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      setAdminUser(null);
      setAdminChecking(false);
      return;
    }

    setAdminChecking(true);
    try {
      const response = await fetch('/api/admin-verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok || !data.valid) {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdminUser(null);
        return;
      }
      setAdminUser(data.admin);
    } catch {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
      setAdminUser(null);
    } finally {
      setAdminChecking(false);
    }
  };

  useEffect(() => {
    const checkUrl = () => {
      const route = parseRoute();
      if (route.view === 'admin') {
        setCurrentView('admin');
        verifyAdminSession();
        return;
      }

      if (route.view === 'transactions') {
        if (!user) {
          setCurrentView('home');
          setIsLoginOpen(true);
          window.location.hash = '';
          return;
        }
        setCurrentView('transactions');
        return;
      }

      if (route.view === 'order') {
        setActiveProductId(route.productId);
        setCurrentView('order');
        return;
      }

      if (route.view === 'invoice') {
        setInvoiceData(findTransactionByInvoiceId(route.invoiceId));
        setCurrentView('invoice');
        return;
      }

      setCurrentView('home');
      setActiveProductId(null);
      setInvoiceData(null);
    };

    checkUrl();
    window.addEventListener('hashchange', checkUrl);
    window.addEventListener('popstate', checkUrl);
    return () => {
      window.removeEventListener('hashchange', checkUrl);
      window.removeEventListener('popstate', checkUrl);
    };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAdminLogin = (admin, token) => {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    setAdminUser(admin);
    setAdminChecking(false);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
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
      if (!data) {
        setCurrentView('home');
        window.location.hash = '';
        return;
      }
      setCurrentView('order');
      setActiveProductId(data);
      window.location.hash = `#/order/${data}`;
    } else if (view === 'invoice') {
      setCurrentView('invoice');
      setInvoiceData(data);
      window.location.hash = `#/invoice/${data.invoiceId}`;
    } else if (view === 'transactions') {
      if (!user) {
        setIsLoginOpen(true);
        return;
      }
      setCurrentView('transactions');
      window.location.hash = '#/transactions';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (productId) => handleNavigate('order', productId);
  if (currentView === 'admin') {
    if (adminChecking) {
      return (
        <div className="main main-surface d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
          <div className="text-success fw-bold">Memverifikasi sesi admin...</div>
        </div>
      );
    }

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
            user={user}
          />
        )}
        {currentView === 'invoice' && (
          <InvoiceView
            invoiceData={invoiceData}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'transactions' && (
          <TransactionsView
            user={user}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />

      <ChatWidget
        products={products}
        user={user}
        transactions={readUserTransactions(user)}
      />
    </>
  );
}

export default App;
