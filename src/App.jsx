import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import LoginModal from './components/LoginModal';
import Footer from './components/Footer';
import SeoManager from './components/SeoManager';
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
import { autoRestockProducts } from './lib/productStock';
import { hydrateCloudState, hydrateCloudStateKeys, writeCloudBackedValue } from './lib/cloudState';
import { trackTrafficView } from './lib/trafficTracker';
import { getAccountBlock, isAccountBlocked } from './lib/accountBlocks';

const ADMIN_TOKEN_KEY = 'goisiin_admin_token';

const isAdminUrl = () =>
  window.location.pathname === '/bolehnihadmin' ||
  window.location.hash === '#/bolehnihadmin';

const parseRoute = () => {
  if (isAdminUrl()) return { view: 'admin' };

  const hash = window.location.hash || '';
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'order' && segments[1]) {
    const productId = segments[1] === 'game' ? segments[2] : segments[1];
    return { view: 'order', productId: decodeURIComponent(productId || '') };
  }
  if (segments[0] === 'invoice' && segments[1]) {
    return { view: 'invoice', invoiceId: decodeURIComponent(segments[1]) };
  }
  if (segments[0] === 'transactions') return { view: 'transactions' };
  if (segments[0] === 'stamp') return { view: 'stamp' };
  if (segments[0] === 'wallet') return { view: 'wallet' };
  if (segments[0] === 'vouchers') return { view: 'vouchers' };
  if (segments[0] === 'blog') return { view: 'page', page: 'blog' };
  if (segments[0] === 'page') {
    const allowedPages = ['privacy', 'terms', 'disclaimer'];
    const page = decodeURIComponent(segments[1] || 'privacy');
    return { view: 'page', page: allowedPages.includes(page) ? page : 'privacy' };
  }

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

const routePath = (view, data) => {
  if (view === 'order' && data) return `/order/${encodeURIComponent(data)}`;
  if (view === 'invoice' && data?.invoiceId) return `/invoice/${encodeURIComponent(data.invoiceId)}`;
  if (view === 'transactions') return '/transactions';
  if (view === 'stamp') return '/stamp';
  if (view === 'wallet') return '/wallet';
  if (view === 'vouchers') return '/vouchers';
  if (view === 'page') return data === 'blog' ? '/blog' : `/page/${encodeURIComponent(data || 'privacy')}`;
  return '/';
};

const pushCleanRoute = (view, data) => {
  const nextPath = routePath(view, data);
  if (`${window.location.pathname}${window.location.search}` !== nextPath || window.location.hash) {
    window.history.pushState({}, '', nextPath);
  }
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
  const [blockedNotice, setBlockedNotice] = useState('');

  const [products, setProducts] = useState(() => {
    const normalizedProducts = normalizeStoredProducts(localStorage.getItem('goisiin_products'), initialProducts);
    const restocked = autoRestockProducts(normalizedProducts);
    if (restocked.changed > 0) {
      writeCloudBackedValue('goisiin_products', restocked.products);
    }
    return restocked.products;
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (isAccountBlocked(session.user.email)) {
          const block = getAccountBlock(session.user.email);
          setBlockedNotice(block?.reason || 'Akun ini sedang dibatasi oleh admin.');
          supabase.auth.signOut();
          setUser(null);
          return;
        }
        setUser({
          name: session.user.user_metadata.full_name || session.user.email,
          email: session.user.email,
          picture: session.user.user_metadata.avatar_url || null
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (isAccountBlocked(session.user.email)) {
          const block = getAccountBlock(session.user.email);
          setBlockedNotice(block?.reason || 'Akun ini sedang dibatasi oleh admin.');
          supabase.auth.signOut();
          setUser(null);
          return;
        }
        setUser({
          name: session.user.user_metadata.full_name || session.user.email,
          email: session.user.email,
          picture: session.user.user_metadata.avatar_url || null
        });
        if (isAdminUrl()) return;
        if (window.location.hash.startsWith('#access_token=')) {
          window.history.replaceState({}, '', '/');
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.email) return undefined;

    const enforceAccountBlock = () => {
      if (!isAccountBlocked(user.email)) return;
      const block = getAccountBlock(user.email);
      setBlockedNotice(block?.reason || 'Akun ini sedang dibatasi oleh admin.');
      supabase.auth.signOut();
      setUser(null);
      setCurrentView('home');
      pushCleanRoute('home');
    };

    enforceAccountBlock();
    window.addEventListener('storage', enforceAccountBlock);
    window.addEventListener('goisiin:cloud-state-updated', enforceAccountBlock);
    window.addEventListener('goisiin:blocked-users-updated', enforceAccountBlock);
    const timer = setInterval(async () => {
      await hydrateCloudStateKeys(['goisiin_blocked_users']);
      enforceAccountBlock();
    }, 15000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', enforceAccountBlock);
      window.removeEventListener('goisiin:cloud-state-updated', enforceAccountBlock);
      window.removeEventListener('goisiin:blocked-users-updated', enforceAccountBlock);
    };
  }, [user]);

  useEffect(() => {
    hydrateCloudState().then((result) => {
      if (result.ok && result.hydrated > 0) {
        const normalizedProducts = normalizeStoredProducts(localStorage.getItem('goisiin_products'), initialProducts);
        const restocked = autoRestockProducts(normalizedProducts);
        setProducts(restocked.products);
        if (restocked.changed > 0) {
          writeCloudBackedValue('goisiin_products', restocked.products);
        }
      }
    });
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
        writeCloudBackedValue('goisiin_users', userList);
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
      if (window.location.hash.startsWith('#/') && route.view !== 'home') {
        const routeData = route.view === 'order'
          ? route.productId
          : route.view === 'invoice'
            ? { invoiceId: route.invoiceId }
            : route.view === 'page'
              ? route.page
              : undefined;
        window.history.replaceState({}, '', routePath(route.view, routeData));
      }

      if (route.view === 'admin') {
        setCurrentView('admin');
        verifyAdminSession();
        return;
      }

      if (['transactions', 'wallet', 'vouchers'].includes(route.view)) {
        if (!user) {
          setCurrentView('home');
          setIsLoginOpen(true);
          pushCleanRoute('home');
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

  useEffect(() => {
    trackTrafficView();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') trackTrafficView();
    };

    window.addEventListener('hashchange', trackTrafficView);
    window.addEventListener('popstate', trackTrafficView);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('hashchange', trackTrafficView);
      window.removeEventListener('popstate', trackTrafficView);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

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
    const restocked = autoRestockProducts(newProducts);
    setProducts(restocked.products);
    writeCloudBackedValue('goisiin_products', restocked.products);
  };

  useEffect(() => {
    const runAutoRestock = () => {
      setProducts((currentProducts) => {
        const restocked = autoRestockProducts(currentProducts);
        if (restocked.changed > 0) {
          writeCloudBackedValue('goisiin_products', restocked.products);
          return restocked.products;
        }
        return currentProducts;
      });
    };

    runAutoRestock();
    const timer = setInterval(runAutoRestock, 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNavigate = (view, data) => {
    if (view === 'home') {
      setCurrentView('home');
      setActiveProductId(null);
      setActivePage(null);
      setInvoiceData(null);
      pushCleanRoute('home');
    } else if (view === 'order') {
      if (!data) {
        setCurrentView('home');
        pushCleanRoute('home');
        return;
      }
      setCurrentView('order');
      setActiveProductId(data);
      pushCleanRoute('order', data);
    } else if (view === 'invoice') {
      if (!data?.invoiceId) {
        setCurrentView('home');
        pushCleanRoute('home');
        return;
      }
      setCurrentView('invoice');
      setInvoiceData(data);
      pushCleanRoute('invoice', data);
    } else if (view === 'transactions') {
      if (!user) {
        setIsLoginOpen(true);
        return;
      }
      setCurrentView('transactions');
      pushCleanRoute('transactions');
    } else if (view === 'stamp') {
      setCurrentView('stamp');
      pushCleanRoute('stamp');
    } else if (view === 'wallet') {
      if (!user) {
        setIsLoginOpen(true);
        return;
      }
      setCurrentView('wallet');
      pushCleanRoute('wallet');
    } else if (view === 'vouchers') {
      if (!user) {
        setIsLoginOpen(true);
        return;
      }
      setCurrentView('vouchers');
      pushCleanRoute('vouchers');
    } else if (view === 'page') {
      setActivePage(data);
      setCurrentView('page');
      pushCleanRoute('page', data);
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

      <SeoManager
        currentView={currentView}
        activeProductId={activeProductId}
        activePage={activePage}
        products={products}
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

      {blockedNotice && (
        <div className="account-block-notice" role="alert">
          <div>
            <strong>Akun dibatasi</strong>
            <span>{blockedNotice}</span>
          </div>
          <button type="button" onClick={() => setBlockedNotice('')} aria-label="Tutup notifikasi">
            ×
          </button>
        </div>
      )}

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
            onUpdateProducts={handleUpdateProducts}
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
