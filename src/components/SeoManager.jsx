import { useEffect } from 'react';
import { categories } from '../data/products';

const SITE_URL = 'https://www.goisiinn.com';
const SITE_NAME = 'Goisiinn';
const DEFAULT_TITLE = 'Goisiinn - Jual Voucher Game dan Top up Game Indonesia Murah';
const DEFAULT_DESCRIPTION = 'Goisiinn adalah tempat top up game, voucher digital, kebutuhan AI, hiburan, dan e-wallet dengan proses cepat serta promo stamp berhadiah.';

function rupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function ensureMeta(selector, createAttrs = {}) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    Object.entries(createAttrs).forEach(([key, value]) => element.setAttribute(key, value));
    document.head.appendChild(element);
  }
  return element;
}

function setMeta(name, content) {
  const element = ensureMeta(`meta[name="${name}"]`, { name });
  element.setAttribute('content', content);
}

function setProperty(property, content) {
  const element = ensureMeta(`meta[property="${property}"]`, { property });
  element.setAttribute('content', content);
}

function setCanonical(url) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }
  element.setAttribute('href', url);
}

function setJsonLd(data) {
  const id = 'goisiinn-jsonld';
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
}

function minProductPrice(product) {
  const prices = (product?.denominations || [])
    .map((item) => Number(item.price || 0))
    .filter((price) => price > 0);
  return prices.length ? Math.min(...prices) : 0;
}

function absoluteImage(src) {
  if (!src) return `${SITE_URL}/logo.png`;
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${String(src).startsWith('/') ? src : `/${src}`}`;
}

function pageSeo({ currentView, activeProductId, activePage, products }) {
  const publicProducts = (products || []).filter((product) => product.active !== false && product.id !== 'goisiin_balance');
  const product = publicProducts.find((item) => item.id === activeProductId);

  if (currentView === 'order' && product) {
    const categoryName = categories.find((category) => category.id === product.category)?.name || 'Produk Digital';
    const price = minProductPrice(product);
    const image = absoluteImage(product.image);
    const title = `${product.name} Murah & Cepat | Goisiinn`;
    const description = product.description
      || `Top up ${product.name} di Goisiinn. Pilih nominal ${categoryName.toLowerCase()}, bayar QRIS atau saldo Goisiinn, dan pantau status transaksi dengan mudah.`;
    return {
      title,
      description: price ? `${description} Harga mulai ${rupiah(price)}.` : description,
      canonical: `${SITE_URL}/order/${product.id}`,
      robots: 'index,follow',
      image,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description,
        image,
        brand: { '@type': 'Brand', name: SITE_NAME },
        category: categoryName,
        offers: price ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'IDR',
          lowPrice: String(price),
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/order/${product.id}`,
        } : undefined,
      },
    };
  }

  if (currentView === 'stamp') {
    return {
      title: 'Promo Stamp Berhadiah Goisiinn | Kumpulkan 6 Stamp',
      description: 'Kumpulkan 6 stamp unik dari transaksi Goisiinn minimal Rp100.000 dan tukarkan peluang hadiah Samsung Galaxy, sepeda listrik, merchandise, voucher, atau saldo e-wallet.',
      canonical: `${SITE_URL}/stamp`,
      robots: 'index,follow',
      image: `${SITE_URL}/logo.png`,
    };
  }

  if (currentView === 'page' && activePage === 'blog') {
    return {
      title: 'Blog Goisiinn - Promo, Tips Top Up, dan Info Voucher',
      description: 'Baca update promo, tips aman top up game, dan informasi layanan Goisiinn terbaru.',
      canonical: `${SITE_URL}/blog`,
      robots: 'index,follow',
      image: `${SITE_URL}/logo.png`,
    };
  }

  if (currentView === 'page') {
    const pageMap = {
      privacy: ['Kebijakan Privasi Goisiinn', 'Informasi pengelolaan data, transaksi, dan keamanan pengguna Goisiinn.'],
      terms: ['Syarat & Ketentuan Goisiinn', 'Ketentuan layanan top up, pembayaran, refund, dan penggunaan promo di Goisiinn.'],
      disclaimer: ['Disclaimer Goisiinn', 'Informasi batasan layanan, merek pihak ketiga, proses transaksi, dan bantuan pelanggan Goisiinn.'],
    };
    const [title, description] = pageMap[activePage] || pageMap.privacy;
    return {
      title,
      description,
      canonical: `${SITE_URL}/page/${activePage || 'privacy'}`,
      robots: 'index,follow',
      image: `${SITE_URL}/logo.png`,
    };
  }

  if (['admin', 'invoice', 'transactions', 'wallet', 'vouchers'].includes(currentView)) {
    return {
      title: `${SITE_NAME} - Area Pengguna`,
      description: DEFAULT_DESCRIPTION,
      canonical: SITE_URL,
      robots: 'noindex,nofollow',
      image: `${SITE_URL}/logo.png`,
    };
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonical: `${SITE_URL}/`,
    robots: 'index,follow',
    image: `${SITE_URL}/logo.png`,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        description: DEFAULT_DESCRIPTION,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          availableLanguage: ['id-ID'],
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Apa itu Goisiinn?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Goisiinn adalah platform top up game, voucher digital, kebutuhan AI, hiburan, dan e-wallet untuk pengguna Indonesia.',
            },
          },
          {
            '@type': 'Question',
            name: 'Bagaimana cara top up di Goisiinn?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Pilih produk, isi ID atau data akun tujuan, pilih nominal, pilih metode pembayaran, lalu pantau invoice sampai transaksi selesai.',
            },
          },
        ],
      },
    ],
  };
}

export default function SeoManager({ currentView, activeProductId, activePage, products }) {
  useEffect(() => {
    const seo = pageSeo({ currentView, activeProductId, activePage, products });
    document.title = seo.title;
    setMeta('description', seo.description);
    setMeta('robots', seo.robots);
    setProperty('og:type', currentView === 'order' ? 'product' : 'website');
    setProperty('og:site_name', SITE_NAME);
    setProperty('og:title', seo.title);
    setProperty('og:description', seo.description);
    setProperty('og:url', seo.canonical);
    setProperty('og:image', seo.image);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', seo.title);
    setMeta('twitter:description', seo.description);
    setMeta('twitter:image', seo.image);
    setCanonical(seo.canonical);
    setJsonLd(seo.jsonLd || {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
    });
  }, [currentView, activeProductId, activePage, products]);

  return null;
}
