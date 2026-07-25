import React from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import Banner from './components/Banner';
import Categories from './components/Categories';
import FlashSale from './components/FlashSale';
import ProductGrid from './components/ProductGrid';
import LoginModal from './components/LoginModal';
import Footer from './components/Footer';
import './index.css';

function App() {
  return (
    <>
      <Header />
      <SearchPanel />
      
      <main className="main main-surface">
        <Banner />
        <Categories />
        <FlashSale />
        <ProductGrid />
      </main>
      
      <Footer />

      <LoginModal />
    </>
  );
}

export default App;
