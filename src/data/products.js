import { productImages, paymentImages } from '../assets/images';

export const categories = [
  { id: 'popular', name: 'Populer' },
  { id: '1', name: 'Top up Game' },
  { id: '2', name: 'Voucher Game' },
  { id: '3', name: 'Hiburan' },
  { id: '4', name: 'Pulsa & Paket Data' },
  { id: '6', name: 'E-Wallet' },
  { id: '7', name: 'Tagihan' },
  { id: '8', name: 'Gift Card' }
];

export const products = [
  {
    id: 'mobile-legend',
    name: 'Mobile Legend',
    category: '1',
    image: productImages['mobile-legend'],

    popular: true,
    discount: 'DISKON 10%',
    inputLabel: 'Masukkan User ID & Zone ID',
    inputFields: [
      { name: 'userId', placeholder: 'Masukkan User ID', type: 'number' },
      { name: 'zoneId', placeholder: 'Zone ID', type: 'number' }
    ],
    denominations: [
      { id: 'ml-5', name: '5 Diamonds', originalPrice: 1600, price: 1440, points: 5 },
      { id: 'ml-12', name: '12 Diamonds', originalPrice: 3800, price: 3420, points: 12 },
      { id: 'ml-50', name: '50 Diamonds', originalPrice: 16000, price: 14400, points: 50 },
      { id: 'ml-100', name: '100 Diamonds', originalPrice: 31000, price: 27900, points: 100 },
      { id: 'ml-250', name: '250 Diamonds', originalPrice: 77000, price: 69300, points: 250 },
      { id: 'ml-500', name: '500 Diamonds', originalPrice: 154000, price: 138600, points: 500 },
      { id: 'ml-1000', name: '1000 Diamonds', originalPrice: 308000, price: 277200, points: 1000 }
    ]
  },
  {
    id: 'free-fire',
    name: 'Free Fire',
    category: '1',
    image: productImages['free-fire'],
    popular: true,
    discount: '',
    inputLabel: 'Masukkan Player ID',
    inputFields: [
      { name: 'userId', placeholder: 'Masukkan Player ID', type: 'number' }
    ],
    denominations: [
      { id: 'ff-5', name: '5 Diamonds', originalPrice: 1000, price: 900, points: 3 },
      { id: 'ff-12', name: '12 Diamonds', originalPrice: 2000, price: 1800, points: 6 },
      { id: 'ff-50', name: '50 Diamonds', originalPrice: 8000, price: 7200, points: 25 },
      { id: 'ff-100', name: '100 Diamonds', originalPrice: 16000, price: 14400, points: 50 },
      { id: 'ff-140', name: '140 Diamonds', originalPrice: 22000, price: 19800, points: 70 },
      { id: 'ff-355', name: '355 Diamonds', originalPrice: 55000, price: 49500, points: 175 },
      { id: 'ff-720', name: '720 Diamonds', originalPrice: 110000, price: 99000, points: 350 }
    ]
  },
  {
    id: 'free-fire-max',
    name: 'Free Fire Max',
    category: '1',
    image: productImages['free-fire-max'],
    popular: false,
    discount: '',
    inputLabel: 'Masukkan Player ID',
    inputFields: [
      { name: 'userId', placeholder: 'Masukkan Player ID', type: 'number' }
    ],
    denominations: [
      { id: 'ffm-50', name: '50 Diamonds', originalPrice: 8000, price: 7300, points: 25 },
      { id: 'ffm-100', name: '100 Diamonds', originalPrice: 16000, price: 14500, points: 50 },
      { id: 'ffm-355', name: '355 Diamonds', originalPrice: 55000, price: 50000, points: 175 }
    ]
  },
  {
    id: 'pubg-mobile',
    name: 'Pubg Mobile',
    category: '1',
    image: productImages['pubg-mobile'],
    popular: true,
    discount: '',
    inputLabel: 'Masukkan Character ID',
    inputFields: [
      { name: 'userId', placeholder: 'Masukkan Character ID', type: 'number' }
    ],
    denominations: [
      { id: 'pubg-32', name: '32 Unknown Cash', originalPrice: 7500, price: 6800, points: 15 },
      { id: 'pubg-63', name: '63 Unknown Cash', originalPrice: 15000, price: 13500, points: 30 },
      { id: 'pubg-325', name: '325 Unknown Cash', originalPrice: 75000, price: 67500, points: 150 },
      { id: 'pubg-660', name: '660 Unknown Cash', originalPrice: 150000, price: 135000, points: 300 }
    ]
  },
  {
    id: 'genshin-impact',
    name: 'Genshin Impact',
    category: '1',
    image: productImages['genshin-impact'],
    popular: false,
    discount: '',
    inputLabel: 'Masukkan UID & Pilih Server',
    inputFields: [
      { name: 'userId', placeholder: 'Masukkan UID', type: 'number' },
      { name: 'server', placeholder: 'Pilih Server', type: 'select', options: ['America', 'Europe', 'Asia', 'TW_HK_MO'] }
    ],
    denominations: [
      { id: 'genshin-60', name: '60 Genesis Crystals', originalPrice: 16000, price: 14500, points: 30 },
      { id: 'genshin-300', name: '300+30 Genesis Crystals', originalPrice: 79000, price: 71000, points: 150 },
      { id: 'genshin-980', name: '980+110 Genesis Crystals', originalPrice: 249000, price: 224000, points: 490 }
    ]
  },
  {
    id: 'haikyu-fly-high-garena',
    name: 'Haikyu Fly High - Garena',
    category: '1',
    image: productImages['haikyu'],
    popular: false,
    discount: '',
    inputLabel: 'Masukkan Player ID',
    inputFields: [
      { name: 'userId', placeholder: 'Player ID', type: 'number' }
    ],
    denominations: [
      { id: 'hq-60', name: '60 Wings', originalPrice: 15000, price: 13500, points: 20 },
      { id: 'hq-300', name: '300 Wings', originalPrice: 75000, price: 67000, points: 100 }
    ]
  },
  {
    id: 'state-of-survival-zombie-war',
    name: 'State Of Survival : Zombie War',
    category: '1',
    image: productImages['state-of-survival'],
    popular: true,
    discount: '',
    inputLabel: 'Masukkan State & Player ID',
    inputFields: [
      { name: 'userId', placeholder: 'Player ID', type: 'number' },
      { name: 'state', placeholder: 'State (e.g. 1045)', type: 'number' }
    ],
    denominations: [
      { id: 'sos-100', name: '100 Biocaps', originalPrice: 5000, price: 4500, points: 10 },
      { id: 'sos-500', name: '500 Biocaps', originalPrice: 25000, price: 22500, points: 50 }
    ]
  },
  {
    id: 'higgs-game-island',
    name: 'Higgs Game Island',
    category: '1',
    image: productImages['higgs-game-island'],
    popular: true,
    discount: 'DISKON 10%',
    inputLabel: 'Masukkan Player ID',
    inputFields: [
      { name: 'userId', placeholder: 'Player ID', type: 'number' }
    ],
    denominations: [
      { id: 'higgs-1b', name: 'Tukar Kartu (1B)', originalPrice: 64000, price: 63360, points: 100 },
      { id: 'higgs-2b', name: 'Tukar Kartu (2B)', originalPrice: 128000, price: 126720, points: 200 },
      { id: 'higgs-3b', name: 'Tukar Kartu (3B)', originalPrice: 192000, price: 190080, points: 300 }
    ]
  },
  {
    id: 'koin-ungu-md',
    name: 'Koin Ungu Md',
    category: '1',
    image: productImages['koin-ungu-md'],
    popular: true,
    discount: '',
    inputLabel: 'Masukkan Player ID',
    inputFields: [
      { name: 'userId', placeholder: 'Player ID ID', type: 'number' }
    ],
    denominations: [
      { id: 'md-200m', name: '200M Koin Ungu', originalPrice: 15000, price: 14000, points: 20 },
      { id: 'md-400m', name: '400M Koin Ungu', originalPrice: 30000, price: 28000, points: 40 }
    ]
  },
  {
    id: 'valorant',
    name: 'Valorant',
    category: '1',
    image: productImages['valorant'],
    popular: true,
    discount: '',
    inputLabel: 'Masukkan Riot ID (e.g. Username#TAG)',
    inputFields: [
      { name: 'userId', placeholder: 'Riot ID (Username#1234)', type: 'text' }
    ],
    denominations: [
      { id: 'val-125', name: '125 Valorant Points', originalPrice: 15000, price: 13500, points: 25 },
      { id: 'val-375', name: '375 Valorant Points', originalPrice: 45000, price: 40500, points: 75 },
      { id: 'val-1000', name: '1000 Valorant Points', originalPrice: 120000, price: 108000, points: 200 }
    ]
  },
  {
    id: 'honor-of-kings',
    name: 'Honor of Kings',
    category: '1',
    image: productImages['honor-of-kings'],
    popular: true,
    discount: '',
    inputLabel: 'Masukkan Player ID',
    inputFields: [
      { name: 'userId', placeholder: 'Player ID', type: 'number' }
    ],
    denominations: [
      { id: 'hok-8', name: '8 Tokens', originalPrice: 2000, price: 1800, points: 2 },
      { id: 'hok-80', name: '80+8 Tokens', originalPrice: 18000, price: 16200, points: 18 },
      { id: 'hok-240', name: '240+17 Tokens', originalPrice: 50000, price: 45000, points: 50 }
    ]
  },
  {
    id: 'racing-master',
    name: 'Racing Master',
    category: '1',
    image: productImages['racing-master'],
    popular: true,
    discount: '',
    inputLabel: 'Masukkan Player ID',
    inputFields: [
      { name: 'userId', placeholder: 'Player ID', type: 'number' }
    ],
    denominations: [
      { id: 'rm-60', name: '60 Gems', originalPrice: 15000, price: 13800, points: 20 },
      { id: 'rm-300', name: '300 Gems', originalPrice: 75000, price: 69000, points: 100 }
    ]
  },
  // Voucher games
  {
    id: 'rf-return-rpg-beyond',
    name: 'RF Return RPG Beyond',
    category: '2',
    image: productImages['rf-return'],
    popular: true,
    discount: '',
    inputLabel: 'Masukkan Nickname Akun',
    inputFields: [
      { name: 'userId', placeholder: 'Nickname Akun', type: 'text' }
    ],
    denominations: [
      { id: 'rf-10k', name: '10.000 Cash', originalPrice: 10000, price: 9500, points: 10 },
      { id: 'rf-50k', name: '50.000 Cash', originalPrice: 50000, price: 47500, points: 50 }
    ]
  },
  // Entertainment
  {
    id: 'netflix-premium',
    name: 'Netflix Premium',
    category: '3',
    image: productImages['netflix'],
    popular: true,
    discount: '',
    inputLabel: 'Masukkan E-mail Akun',
    inputFields: [
      { name: 'userId', placeholder: 'E-mail Akun Netflix', type: 'email' }
    ],
    denominations: [
      { id: 'nf-1m-1u', name: 'Premium 1 Bulan (1 User Sharing)', originalPrice: 35000, price: 31000, points: 25 },
      { id: 'nf-1m-5u', name: 'Premium 1 Bulan (Private Account)', originalPrice: 150000, price: 139000, points: 150 }
    ]
  },
  {
    id: 'spotify-premium',
    name: 'Spotify Premium',
    category: '3',
    image: productImages['netflix'],
    popular: false,
    discount: '',
    inputLabel: 'Masukkan E-mail Spotify',
    inputFields: [
      { name: 'userId', placeholder: 'E-mail Spotify', type: 'email' }
    ],
    denominations: [
      { id: 'sp-1m', name: 'Spotify Premium 1 Bulan', originalPrice: 20000, price: 18000, points: 15 }
    ]
  },
  // E-Wallet
  {
    id: 'dana-topup',
    name: 'DANA',
    category: '6',
    image: productImages['koin-ungu-md'],
    popular: false,
    discount: '',
    inputLabel: 'Masukkan Nomor Telepon DANA',
    inputFields: [
      { name: 'userId', placeholder: 'Nomor DANA (e.g. 0812xxx)', type: 'number' }
    ],
    denominations: [
      { id: 'dana-10', name: 'Saldo Rp 10.000', originalPrice: 11500, price: 10800, points: 10 },
      { id: 'dana-50', name: 'Saldo Rp 50.000', originalPrice: 51500, price: 50400, points: 50 },
      { id: 'dana-100', name: 'Saldo Rp 100.000', originalPrice: 101500, price: 100200, points: 100 }
    ]
  },
  {
    id: 'gopay-topup',
    name: 'GoPay',
    category: '6',
    image: productImages['koin-ungu-md'],
    popular: false,
    discount: '',
    inputLabel: 'Masukkan Nomor Telepon GoPay',
    inputFields: [
      { name: 'userId', placeholder: 'Nomor GoPay (e.g. 0812xxx)', type: 'number' }
    ],
    denominations: [
      { id: 'gopay-20', name: 'Saldo Rp 20.000', originalPrice: 21500, price: 20500, points: 15 },
      { id: 'gopay-50', name: 'Saldo Rp 50.000', originalPrice: 51500, price: 50400, points: 45 }
    ]
  }
];

export const paymentChannels = [
  {
    id: 'goisiin_balance',
    category: 'Saldo',
    name: 'Saldo Goisiin',
    image: paymentImages.goisiinBalance,
    feePercent: 0,
    feeFlat: 0
  },
  {
    id: 'qris',
    category: 'QRIS',
    name: 'QRIS',
    image: paymentImages.qris,
    feePercent: 0.007,
    feeFlat: 0
  },
  {
    id: 'dana',
    category: 'E-Wallet',
    name: 'DANA',
    image: paymentImages.dana,
    feePercent: 0,
    feeFlat: 1500
  },
  {
    id: 'gopay',
    category: 'E-Wallet',
    name: 'GoPay',
    image: paymentImages.gopay,
    feePercent: 0.02,
    feeFlat: 0
  },
  {
    id: 'ovo',
    category: 'E-Wallet',
    name: 'OVO',
    image: paymentImages.ovo,
    feePercent: 0.015,
    feeFlat: 0
  },
  {
    id: 'shopeepay',
    category: 'E-Wallet',
    name: 'ShopeePay',
    image: paymentImages.shopeepay,
    feePercent: 0.01,
    feeFlat: 0
  },
  {
    id: 'linkaja',
    category: 'E-Wallet',
    name: 'LinkAja',
    image: paymentImages.linkaja,
    feePercent: 0.01,
    feeFlat: 0
  },
  {
    id: 'bca',
    category: 'Bank Transfer',
    name: 'BCA Virtual Account',
    image: paymentImages.bca,
    feePercent: 0,
    feeFlat: 2000
  },
  {
    id: 'bri',
    category: 'Bank Transfer',
    name: 'BRI Virtual Account',
    image: paymentImages.bri,
    feePercent: 0,
    feeFlat: 2000
  },
  {
    id: 'mandiri',
    category: 'Bank Transfer',
    name: 'Mandiri Virtual Account',
    image: paymentImages.mandiri,
    feePercent: 0,
    feeFlat: 2000
  },
  {
    id: 'bni',
    category: 'Bank Transfer',
    name: 'BNI Virtual Account',
    image: paymentImages.bni,
    feePercent: 0,
    feeFlat: 2000
  },
  {
    id: 'bsi',
    category: 'Bank Transfer',
    name: 'BSI Virtual Account',
    image: paymentImages.bsi,
    feePercent: 0,
    feeFlat: 2000
  },
  {
    id: 'cimb',
    category: 'Bank Transfer',
    name: 'CIMB Virtual Account',
    image: paymentImages.cimb,
    feePercent: 0,
    feeFlat: 2000
  },
  {
    id: 'permatabank',
    category: 'Bank Transfer',
    name: 'Permata Virtual Account',
    image: paymentImages.permatabank,
    feePercent: 0,
    feeFlat: 2000
  },
  {
    id: 'alfamart',
    category: 'Retail',
    name: 'Alfamart',
    image: paymentImages.alfamart,
    feePercent: 0,
    feeFlat: 3500
  },
  {
    id: 'indomaret',
    category: 'Retail',
    name: 'Indomaret',
    image: paymentImages.indomaret,
    feePercent: 0,
    feeFlat: 3500
  }
];


