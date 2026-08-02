// ============================================================
// SEMUA GAMBAR DI-IMPORT DI SINI — Vite akan bundle & hash
// sehingga tidak akan pernah hilang saat deploy
// ============================================================

// --- LOGO ---
import logoImg from './logo.png';

// --- PAYMENT LOGOS ---
import qrisImg from './payment/qris.svg';
import danaImg from './payment/dana.svg';
import gopayImg from './payment/gopay.svg';
import ovoImg from './payment/ovo.svg';
import shopeepayImg from './payment/shopeepay.svg';
import linkajaImg from './payment/linkaja.svg';
import bcaImg from './payment/bca.svg';
import briImg from './payment/bri.svg';
import mandiriImg from './payment/mandiri.svg';
import bniImg from './payment/bni.svg';
import bsiImg from './payment/bsi.svg';
import cimbImg from './payment/cimb.svg';
import permatabankImg from './payment/permatabank.svg';
import alfamartImg from './payment/alfamart.svg';
import indomaretImg from './payment/indomaret.svg';

// --- PRODUCT IMAGES ---
import mlImg from './product/mobile-legend.webp';
import ffImg from './product/free-fire.webp';
import ffmaxImg from './product/free-fire-max.webp';
import pubgImg from './product/pubg-mobile.webp';
import genshinImg from './product/genshin-impact.webp';
import haikyuImg from './product/haikyu.webp';
import sosImg from './product/state-of-survival.webp';
import higgsImg from './product/higgs-game-island.webp';
import koinunguImg from './product/koin-ungu-md.webp';
import valorantImg from './product/valorant.webp';
import hokImg from './product/honor-of-kings.webp';
import racingImg from './product/racing-master.webp';
import rfImg from './product/rf-return.webp';
import netflixImg from './product/netflix.webp';

// --- BANNER IMAGES ---
import banner1 from './banner/slide_1751769782.webp';
import banner2 from './banner/slide_1753019433.webp';
import banner3 from './banner/slide_1765284294.webp';
import banner4 from './banner/slide_1767514787.webp';
import banner5 from './banner/slide_1769171315.webp';
import banner6 from './banner/slide_1773165603.webp';

// --- ICON IMAGES ---
import iconArticle from './icon/article-svgrepo-com.svg';
import iconGift from './icon/gift-svgrepo-com.svg';
import iconPhone from './icon/cell-phone-svgrepo-com.svg';
import iconGoogle from './icon/google-color-svgrepo-com.svg';

// ============================================================
// EXPORTS
// ============================================================

export const logo = logoImg;

export const paymentImages = {
  qris: qrisImg,
  dana: danaImg,
  gopay: gopayImg,
  ovo: ovoImg,
  shopeepay: shopeepayImg,
  linkaja: linkajaImg,
  bca: bcaImg,
  bri: briImg,
  mandiri: mandiriImg,
  bni: bniImg,
  bsi: bsiImg,
  cimb: cimbImg,
  permatabank: permatabankImg,
  alfamart: alfamartImg,
  indomaret: indomaretImg,
};

export const paymentLogoList = [
  qrisImg, danaImg, gopayImg, ovoImg, shopeepayImg, linkajaImg,
  bcaImg, briImg, mandiriImg, bniImg, bsiImg, cimbImg,
  permatabankImg, alfamartImg, indomaretImg
];

export const productImages = {
  'mobile-legend': mlImg,
  'free-fire': ffImg,
  'free-fire-max': ffmaxImg,
  'pubg-mobile': pubgImg,
  'genshin-impact': genshinImg,
  'haikyu': haikyuImg,
  'state-of-survival': sosImg,
  'higgs-game-island': higgsImg,
  'koin-ungu-md': koinunguImg,
  'valorant': valorantImg,
  'honor-of-kings': hokImg,
  'racing-master': racingImg,
  'rf-return': rfImg,
  'netflix': netflixImg,
};

export const bannerImages = [banner1, banner2, banner3, banner4, banner5, banner6];

export const icons = {
  article: iconArticle,
  gift: iconGift,
  phone: iconPhone,
  google: iconGoogle,
};
