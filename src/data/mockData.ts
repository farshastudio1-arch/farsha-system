export interface KebayaItem {
  id: string;
  code: string;
  name: string;
  color: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'Custom';
  model: 'Modern' | 'Klasik' | 'Kartini' | 'Kutubaru';
  rentalPrice: number;
  status: 'available' | 'rented' | 'maintenance' | 'archived';
  rentalEndDate: string | null;
  imageUrls: string[];
  description: string;
}

export interface CMSContent {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  promoText: string;
  aboutTitle: string;
  aboutText: string;
  studioAddress: string;
  studioPhone: string;
}

export interface SiteSettings {
  studioName: string;
  tagline: string;
  status: 'active' | 'maintenance' | 'coming-soon';
  locationLabel: string;
  whatsappNumber: string;
  email: string;
  address: string;
  instagramUrl: string;
  tiktokUrl: string;
  mapsUrl: string;
  currency: 'IDR';
  defaultProductStatus: 'available' | 'rented' | 'maintenance' | 'archived';
  defaultSort: 'newest' | 'price-low' | 'price-high' | 'featured';
  catalogCardMode: 'minimal' | 'standard' | 'detailed';
  showPrices: boolean;
  showAvailabilityBadges: boolean;
  showProductCode: boolean;
  showProductModel: boolean;
  showProductSize: boolean;
  showProductColor: boolean;
  showProductDescription: boolean;
  showCardCta: boolean;
  defaultMobileGrid: 1 | 2 | 3;
  defaultDesktopGrid: 2 | 3 | 4;
  brandColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
  surfaceColor: string;
  borderColor: string;
  borderRadius: number;
  logoUrl: string;
  faviconUrl: string;
  showPromoBanner: boolean;
  updatedAt: string;
}

export const mockCMS: CMSContent = {
  heroTitle: 'Sewa Kebaya Premium untuk Momen Istimewamu',
  heroSubtitle:
    'Temukan koleksi kebaya modern dan klasik terbaik di Farsha Studio. Pilihan elegan, ukuran lengkap, dan siap membuat penampilanmu memukau.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1600&auto=format&fit=crop&q=80',
  promoText:
    '✨ Dapatkan diskon sewa 10% untuk penyewaan di hari kerja (Senin - Kamis)! Hubungi admin sekarang. ✨',
  aboutTitle: 'Tentang Farsha Studio',
  aboutText:
    'Farsha Studio adalah destinasi utama penyewaan kebaya premium yang berfokus pada kualitas jahatan, detail payet yang indah, dan kecocokan fitting yang sempurna. Koleksi kami berkisar dari kebaya tradisional klasik hingga desain modern kontemporer untuk wisuda, pernikahan, pertunangan, dan acara formal lainnya. Kami percaya bahwa setiap wanita berhak tampil anggun dan percaya diri di hari spesialnya.',
  studioAddress: 'Jl. Kebon Jeruk Raya No. 45, Jakarta Barat, DKI Jakarta 11530',
  studioPhone: '+62 812-3456-7890',
};

export const mockSiteSettings: SiteSettings = {
  studioName: 'Farsha Studio',
  tagline: 'Premium kebaya rental studio',
  status: 'active',
  locationLabel: 'Jakarta Barat, Indonesia',
  whatsappNumber: '+62 812-3456-7890',
  email: 'hello@farshastudio.com',
  address: 'Jl. Kebon Jeruk Raya No. 45, Jakarta Barat, DKI Jakarta 11530',
  instagramUrl: 'https://instagram.com/farshastudio',
  tiktokUrl: 'https://tiktok.com/@farshastudio',
  mapsUrl: 'https://maps.google.com/?q=Farsha%20Studio%20Jakarta%20Barat',
  currency: 'IDR',
  defaultProductStatus: 'available',
  defaultSort: 'newest',
  catalogCardMode: 'standard',
  showPrices: true,
  showAvailabilityBadges: true,
  showProductCode: false,
  showProductModel: true,
  showProductSize: true,
  showProductColor: false,
  showProductDescription: false,
  showCardCta: false,
  defaultMobileGrid: 1,
  defaultDesktopGrid: 3,
  brandColor: '#111111',
  accentColor: '#111111',
  backgroundColor: '#FFFFFF',
  textColor: '#111111',
  primaryColor: '#111111',
  surfaceColor: '#FFFFFF',
  borderColor: '#E5E5E5',
  borderRadius: 0,
  logoUrl: '',
  faviconUrl: '',
  showPromoBanner: true,
  updatedAt: '2026-06-29T00:00:00.000Z',
};

export const mockKebayas: KebayaItem[] = [
  {
    id: '1',
    code: 'KB-SGE-01',
    name: 'Kebaya Brokat Modern Sage Green',
    color: 'Sage Green',
    size: 'M',
    model: 'Modern',
    rentalPrice: 250000,
    status: 'available',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya brokat modern dengan nuansa Sage Green yang sedang tren. Dihiasi payet premium berkilau di bagian dada dan kerah shanghai yang tegak elegan. Sangat cocok untuk acara wisuda, lamaran, atau kondangan formal. Bagian belakang dilengkapi resleting tersembunyi untuk fitting yang pas.',
  },
  {
    id: '2',
    code: 'KB-BLV-02',
    name: 'Kebaya Klasik Solo Beludru Hitam',
    color: 'Hitam',
    size: 'L',
    model: 'Klasik',
    rentalPrice: 300000,
    status: 'rented',
    rentalEndDate: '2026-07-05',
    imageUrls: [
      'https://images.unsplash.com/photo-1539008885759-c290df62751f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya beludru hitam tradisional khas Solo dengan bordir benang emas bermotif floral klasik di sepanjang tepi pakaian. Potongan kutubaru yang mempertegas lekuk tubuh secara anggun. Bahan beludru stretch berkualitas tinggi yang nyaman dipakai sepanjang hari.',
  },
  {
    id: '3',
    code: 'KB-IVR-03',
    name: 'Kebaya Kartini Putih Gading (Ivory)',
    color: 'Putih',
    size: 'S',
    model: 'Kartini',
    rentalPrice: 220000,
    status: 'available',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1549064482-6779ba3292fe?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518612393370-2c822a76e93e?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya model Kartini dengan potongan leher V-neck yang bersih dan kain katun lace premium warna putih gading. Desain elegan yang sederhana namun tetap anggun, sangat cocok untuk prosesi akad nikah atau pertunangan bertema tradisional suci.',
  },
  {
    id: '4',
    code: 'KB-KTB-04',
    name: 'Kebaya Kutubaru Sutra Merah Floral',
    color: 'Merah',
    size: 'M',
    model: 'Kutubaru',
    rentalPrice: 200000,
    status: 'maintenance',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551806235-6629bc24457e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya Kutubaru klasik berbahan sutra satin bermotif floral warna merah menyala. Dilengkapi dengan angkin (stagen penutup perut) berwarna kontras yang mempercantik tampilan pinggang. Pilihan berani untuk hari-hari perayaan budaya dan pesta pernikahan.',
  },
  {
    id: '5',
    code: 'KB-RSG-05',
    name: 'Kebaya Modern Premium Rose Gold',
    color: 'Rose Gold',
    size: 'XL',
    model: 'Modern',
    rentalPrice: 280000,
    status: 'available',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1550639525-c97d455acf70?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya modern bersiluet asimetris dengan payet 3D berwarna Rose Gold mewah. Menggunakan tile polos transparan di bagian pundak untuk memberikan efek melayang (floating effect) yang menakjubkan. Ukuran XL dengan potongan bersahabat yang tetap memberi efek langsing.',
  },
  {
    id: '6',
    code: 'KB-LIL-06',
    name: 'Kebaya Balinese Lace Lilac Dream',
    color: 'Lilac',
    size: 'S',
    model: 'Modern',
    rentalPrice: 180000,
    status: 'available',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya khas Bali dengan bahan brokat prada halus bernuansa Lilac lembut. Dilengkapi obi (selendang pinggang) berbahan satin ungu tua dengan bros kuningan tradisional Bali di tengahnya. Menghadirkan kecantikan eksotis pulau dewata dalam balutan warna modern.',
  },
  {
    id: '7',
    code: 'KB-AUR-07',
    name: 'Kebaya Aurora Sapphire Blue Velvet',
    color: 'Biru',
    size: 'M',
    model: 'Klasik',
    rentalPrice: 320000,
    status: 'rented',
    rentalEndDate: '2026-07-01',
    imageUrls: [
      'https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618244953282-1f55f2429622?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya mewah berbahan beludru tebal warna biru safir tua dengan potongan ekor panjang menyapu lantai. Detail payet perak handmade menyebar di seluruh lengan dan punggung. Sempurna untuk pengantin wanita tradisional Jawa yang menginginkan sentuhan royal aristokrat.',
  },
  {
    id: '8',
    code: 'KB-TER-08',
    name: 'Kebaya Modern Terracotta Organza',
    color: 'Terracotta',
    size: 'L',
    model: 'Modern',
    rentalPrice: 260000,
    status: 'available',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya modern dengan kombinasi bahan organza terstruktur dan brokat chantilly warna Terracotta hangat yang segar. Desain lengan balon/puffy yang memberikan kesan anggun dan kekinian. Dilengkapi bustier sewarna yang nyaman di kulit.',
  },
  {
    id: '9',
    code: 'KB-GLD-09',
    name: 'Kebaya Kutubaru Royal Gold Brocade',
    color: 'Emas',
    size: 'Custom',
    model: 'Kutubaru',
    rentalPrice: 350000,
    status: 'available',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya kutubaru eksklusif dengan sulaman benang emas metalik berkilau tinggi. Model klasik dengan kerah tinggi yang memberikan wibawa ningrat. Disediakan dalam size Custom (bisa di-fit sesuai lingkar dada peminjam 94-102 cm) di studio kami.',
  },
  {
    id: '10',
    code: 'KB-PNK-10',
    name: 'Kebaya Kartini Soft Pink Tulip',
    color: 'Pink',
    size: 'M',
    model: 'Kartini',
    rentalPrice: 210000,
    status: 'archived',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1549064482-6779ba3292fe?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya Kartini berbahan sifon tipis warna merah muda lembut bermotif floral tulip kecil. Sangat anggun dengan bros susun tiga antik berwarna perak bakar di kerah dada. Koleksi edisi terbatas yang elegan untuk foto keluarga atau hari Kartinian.',
  },
];
