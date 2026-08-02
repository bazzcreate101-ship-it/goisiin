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
import PageView from './views/PageView';
import StampView from './views/StampView';
import WalletView from './views/WalletView';
import VouchersView from './views/VouchersView';
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
  if (hash.startsWith('#/order/game/')) {
    return { view: 'order', productId: decodeURIComponent(hash.replace('#/order/game/', '')) };
  }
  if (hash.startsWith('#/order/')) {
    return { view: 'order', productId: decodeURIComponent(hash.replace('#/order/', '')) };
  }
  if (hash.startsWith('#/invoice/')) {
    return { view: 'invoice', invoiceId: decodeURIComponent(hash.replace('#/invoice/', '')) };
  }
  if (hash === '#/transactions') {
    return { view: 'transactions' };
  }
  if (hash === '#/stamp') {
    return { view: 'stamp' };
  }
  if (hash === '#/wallet') {
    return { view: 'wallet' };
  }
  if (hash === '#/vouchers') {
    return { view: 'vouchers' };
  }
  if (hash === '#/blog') {
    return { view: 'page', page: 'blog' };
  }
  if (hash.startsWith('#/page/')) {
    const page = decodeURIComponent(hash.replace('#/page/', ''));
    const allowedPages = ['privacy', 'terms', 'disclaimer'];
    return { view: 'page', page: allowedPages.includes(page) ? page : 'privacy' };
  }
  return { view: 'home' };
};

function App() {
  const [initialRoute] = useState(parseRoute);
  const [currentView, setCurrentView] = useState(initialRoute.view);
  const [activeProductId, setActiveProductId] = useState(initialRoute.productId || null);
  const [activePage, setActivePage] = useState(initialRoute.page || null);
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

      if (['transactions', 'wallet', 'vouchers'].includes(route.view)) {
        if (!user) {
          setCurrentView('home');
          setIsLoginOpen(true);
          window.location.hash = '';
          return;
        }
        setCurrentView(route.view);
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

      if (route.view === 'stamp') {
        setCurrentView('stamp');
        return;
      }

      if (route.view === 'page') {
        setActivePage(route.page);
        setCurrentView('page');
        return;
      }

      setCurrentView('home');
      setActiveProductId(null);
      setActivePage(null);
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
      setActivePage(null);
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
      window.location.hash = `#/order/${encodeURIComponent(data)}`;
    } else if (view === 'invoice') {
      if (!data?.invoiceId) {
        setCurrentView('home');
        window.location.hash = '';
        return;
      }
      setCurrentView('invoice');
      setInvoiceData(data);
      window.location.hash = `#/invoice/${encodeURIComponent(data.invoiceId)}`;
    } else if (view === 'transactions') {
      if (!user) {
        setIsLoginOpen(true);
        return;
      }
      setCurrentView('transactions');
      window.location.hash = '#/transactions';
    } else if (view === 'stamp') {
      setCurrentView('stamp');
      window.location.hash = '#/stamp';
    } else if (view === 'wallet') {
      if (!user) {
        setIsLoginOpen(true);
        return;
      }
      setCurrentView('wallet');
      window.location.hash = '#/wallet';
    } else if (view === 'vouchers') {
      if (!user) {
        setIsLoginOpen(true);
        return;
      }
      setCurrentView('vouchers');
      window.location.hash = '#/vouchers';
    } else if (view === 'page') {
      setActivePage(data);
      setCurrentView('page');
      window.location.hash = data === 'blog' ? '#/blog' : `#/page/${encodeURIComponent(data || 'privacy')}`;
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
          <HomeView products={products} onSelectProduct={handleSelectProduct} onNavigate={handleNavigate} />
        )}
        {currentView === 'order' && (
          <OrderView
            productId={activeProductId}
            products={products}
            onNavigate={handleNavigate}
            user={user}
            onLoginOpen={() => setIsLoginOpen(true)}
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
        {currentView === 'stamp' && (
          <StampView
            user={user}
            onLoginOpen={() => setIsLoginOpen(true)}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'wallet' && (
          <WalletView
            user={user}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'vouchers' && (
          <VouchersView
            user={user}
            onNavigate={handleNavigate}
          />
        )}
        {currentView === 'page' && (
          <PageView
            page={activePage}
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
