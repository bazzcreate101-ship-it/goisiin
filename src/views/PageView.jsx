import React from 'react';
import { supportInfo } from '../data/siteInfo';

const pageContent = {
  privacy: {
    title: 'Kebijakan Privasi',
    eyebrow: 'Privasi & Data',
    paragraphs: [
      'Goisiin mengumpulkan data yang diperlukan untuk menjalankan layanan top up, termasuk nama, email, riwayat transaksi, metode pembayaran yang dipilih, dan data akun game yang kamu isi saat checkout.',
      'Data transaksi digunakan untuk memproses pesanan, membantu pengecekan status, mencegah penyalahgunaan layanan, dan memberikan bantuan pelanggan.',
      'Goisiin tidak meminta password akun game. Jangan pernah membagikan password, kode OTP, atau data sensitif lain kepada siapa pun.',
      'Data login dikelola melalui penyedia autentikasi yang terhubung. Akses admin dibatasi dengan sesi bertanda tangan dan tidak menggunakan password hardcoded di aplikasi browser.',
    ],
  },
  terms: {
    title: 'Syarat & Ketentuan',
    eyebrow: 'Ketentuan Layanan',
    paragraphs: [
      'Dengan menggunakan Goisiin, pengguna wajib mengisi data akun tujuan secara benar. Kesalahan input ID, server, zone, atau nomor tujuan menjadi tanggung jawab pengguna.',
      'Pesanan diproses setelah pembayaran valid. Status invoice dapat berubah menjadi pending, processing, success, failed, atau refunded sesuai hasil pengecekan.',
      'Pengguna dilarang melakukan spam pembuatan akun, percobaan manipulasi URL, penyalahgunaan promo, fraud pembayaran, scraping berlebihan, atau aktivitas lain yang mengganggu layanan.',
      'Goisiin berhak menolak, menahan, atau membatalkan transaksi yang terindikasi penyalahgunaan, duplikasi mencurigakan, atau pelanggaran ketentuan.',
    ],
  },
  disclaimer: {
    title: 'Disclaimer',
    eyebrow: 'Informasi Layanan',
    paragraphs: [
      'Goisiin adalah platform layanan top up dan voucher digital. Nama game, produk, logo publisher, dan merek pembayaran digunakan untuk identifikasi produk.',
      'Waktu proses dapat berbeda tergantung antrean provider, gangguan publisher, validasi pembayaran, atau kendala jaringan.',
      'Jika pembayaran sudah berhasil tetapi item belum masuk, pengguna harus menghubungi admin dengan menyertakan nomor invoice dan bukti pembayaran.',
      'Chatbot Goisiin hanya memberikan bantuan seputar layanan Goisiin. Untuk refund, komplain pembayaran, atau kasus yang tidak bisa dipastikan otomatis, percakapan akan diarahkan ke admin.',
    ],
  },
};

const blogPosts = [
  {
    title: 'Promo Diamond Mobile Legends Merdeka 2026',
    body: 'Pantau halaman utama Goisiin untuk flash sale dan promo produk pilihan. Pastikan login agar transaksi dan bantuan CS lebih mudah dilacak.',
  },
  {
    title: 'Event Top Up Free Fire x Spider-Man',
    body: 'Isi Player ID dengan benar sebelum checkout. Goisiin tidak membutuhkan password akun game untuk memproses top up.',
  },
  {
    title: 'Tips Aman Top Up Akun Game Online',
    body: 'Jangan bagikan OTP, password, atau akses akun ke pihak mana pun. Simpan nomor invoice untuk pengecekan status transaksi.',
  },
];

export default function PageView({ page = 'privacy', onNavigate }) {
  const isBlog = page === 'blog';
  const content = pageContent[page] || pageContent.privacy;

  return (
    <div className="main main-surface">
      <div className="container col-md-8 col-12 py-4">
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb m-0" style={{ fontSize: '0.82rem' }}>
            <li className="breadcrumb-item">
              <a href="#" onClick={(event) => { event.preventDefault(); onNavigate('home'); }} className="text-success text-decoration-none">Beranda</a>
            </li>
            <li className="breadcrumb-item active text-secondary">{isBlog ? 'Blog' : content.title}</li>
          </ol>
        </nav>

        {isBlog ? (
          <section className="order-card">
            <span className="gvx-faq-badge">Berita</span>
            <h1 className="order-product-name mt-3 mb-2">Update terbaru dari Goisiin</h1>
            <p className="text-secondary">Promo, panduan keamanan, dan informasi layanan resmi Goisiin.</p>
            <div className="row g-3 mt-1">
              {blogPosts.map((post) => (
                <article className="col-md-4 col-12" key={post.title}>
                  <div className="gvx-faq-highlight h-100">
                    <span className="gvx-faq-highlight-badge">Info</span>
                    <h2 className="gvx-faq-highlight-title">{post.title}</h2>
                    <p className="gvx-faq-highlight-copy">{post.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="order-card">
            <span className="gvx-faq-badge">{content.eyebrow}</span>
            <h1 className="order-product-name mt-3 mb-3">{content.title}</h1>
            {content.paragraphs.map((paragraph) => (
              <p className="text-secondary" key={paragraph}>{paragraph}</p>
            ))}
            <div className="alert alert-success mt-4 mb-0">
              Butuh bantuan? Hubungi WhatsApp CS Goisiin di{' '}
              <a href={supportInfo.whatsappUrl} target="_blank" rel="noreferrer" className="alert-link">
                {supportInfo.whatsapp}
              </a>.
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
