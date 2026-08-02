import stamp1 from '../assets/stamp/stamp_1.webp';
import stamp2 from '../assets/stamp/stamp_2.webp';
import stamp3 from '../assets/stamp/stamp_3.webp';
import stamp4 from '../assets/stamp/stamp_4.webp';
import stamp5 from '../assets/stamp/stamp_5.webp';
import stamp6 from '../assets/stamp/stamp_6.webp';
import stampPoster from '../assets/stamp/stamp_poster.webp';
import merchModel from '../assets/reward/merch_model.webp';
import merchBaju from '../assets/reward/merch_baju.webp';
import merchJaket from '../assets/reward/merch_jaket.webp';
import merchHelm from '../assets/reward/merch_helm.webp';
import merchTumbler from '../assets/reward/merch_tumbler.webp';

export const STAMP_REQUIRED_UNIQUE = 6;
export const STAMP_MIN_TRANSACTION = 100000;

export const stampPosterImage = stampPoster;

export const stampTypes = [
  { id: 1, name: 'Stamp 1', image: stamp1 },
  { id: 2, name: 'Stamp 2', image: stamp2 },
  { id: 3, name: 'Stamp 3', image: stamp3 },
  { id: 4, name: 'Stamp 4', image: stamp4 },
  { id: 5, name: 'Stamp 5', image: stamp5 },
  { id: 6, name: 'Stamp 6', image: stamp6 },
];

export const stampRewards = [
  {
    id: 'samsung-a57-5g',
    name: 'Samsung Galaxy A57 5G 8GB/128GB',
    type: 'physical',
    tier: 'Hadiah Utama',
    stock: 1,
    image: merchModel,
    description: 'Hadiah utama promo stamp Goisiin.',
  },
  {
    id: 'sepeda-listrik',
    name: 'Sepeda Listrik',
    type: 'physical',
    tier: 'Hadiah Utama',
    stock: 1,
    image: merchModel,
    description: 'Hadiah utama untuk pengguna beruntung.',
  },
  {
    id: 'merch-baju',
    name: 'Baju Goisiin',
    type: 'physical',
    tier: 'Merchandise',
    stock: 25,
    image: merchBaju,
    description: 'Merchandise resmi Goisiin.',
  },
  {
    id: 'merch-jaket',
    name: 'Jaket Goisiin',
    type: 'physical',
    tier: 'Merchandise',
    stock: 15,
    image: merchJaket,
    description: 'Jaket eksklusif Goisiin.',
  },
  {
    id: 'merch-tumbler',
    name: 'Tumbler Goisiin',
    type: 'physical',
    tier: 'Merchandise',
    stock: 30,
    image: merchTumbler,
    description: 'Tumbler edisi promo stamp.',
  },
  {
    id: 'merch-helm',
    name: 'Helm Goisiin',
    type: 'physical',
    tier: 'Merchandise',
    stock: 10,
    image: merchHelm,
    description: 'Helm merchandise Goisiin.',
  },
  {
    id: 'google-play-100k',
    name: 'Google Play Rp100.000',
    type: 'voucher_code',
    tier: 'Digital',
    stock: 20,
    image: merchModel,
    description: 'Kode voucher Google Play langsung tampil setelah hadiah ditentukan.',
  },
  {
    id: 'ewallet-50k',
    name: 'Saldo E-Wallet Rp50.000',
    type: 'wallet_balance',
    tier: 'Digital',
    stock: 10,
    image: merchTumbler,
    description: 'Saldo dikirim ke nomor e-wallet yang diklaim.',
  },
  {
    id: 'ewallet-100k',
    name: 'Saldo E-Wallet Rp100.000',
    type: 'wallet_balance',
    tier: 'Digital',
    stock: 10,
    image: merchTumbler,
    description: 'Saldo dikirim ke nomor e-wallet yang diklaim.',
  },
];
