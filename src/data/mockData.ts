export const kebayaOccasions = ['wisuda', 'lamaran', 'kondangan', 'bridesmaid', 'pengajian'] as const;
export type KebayaCategory = (typeof kebayaOccasions)[number];

export const kebayaModelOptions = [
  'Kebaya Modern',
  'Kebaya Kutubaru',
  'Kebaya Janggan',
  'Dress Premium',
  'Bajubodo Modern',
  'Kurung Melayu',
] as const;
export type KebayaModel = (typeof kebayaModelOptions)[number];

export const kebayaSizeOptions = ['S-M', 'L-XL'] as const;
export type KebayaSize = (typeof kebayaSizeOptions)[number];

export const kebayaRentalCategoryOptions = ['Makassar Only', 'Bisa Luar Kota'] as const;
export const kebayaWearStyleOptions = ['Hijab', 'Non-Hijab'] as const;
export type KebayaWearStyle = (typeof kebayaWearStyleOptions)[number];

export interface KebayaMeasurements {
  bust: string;
  waist: string;
  length: string;
  sleeveLength: string;
  armhole: string;
  otherDetails: string;
  rentalCategory: string;
}

export interface KebayaItem {
  id: string;
  code: string;
  name: string;
  color: string;
  size: KebayaSize;
  model: KebayaModel;
  rentalPrice: number;
  status: 'available' | 'rented' | 'maintenance';
  rentalEndDate: string | null;
  imageUrls: string[];
  description: string;
  wearStyles: KebayaWearStyle[];
  categories?: KebayaCategory[];
  measurements?: Partial<KebayaMeasurements>;
}

export interface CMSContent {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  primaryCtaLabel: string;
  whatsappCtaLabel: string;
  mapsCtaLabel: string;
  mapsCtaUrl: string;
  tiktokCtaLabel: string;
  heroMetaText: string;
  reminderLabel: string;
  promoText: string;
  categoryEyebrow: string;
  categoryTitle: string;
  trustPoints: string[];
  finalEyebrow: string;
  aboutTitle: string;
  aboutText: string;
  finalCtaLabel: string;
  studioAddress: string;
  studioPhone: string;
  landingCategories: LandingCategoryContent[];
}

export interface LandingCategoryContent {
  slug: KebayaCategory;
  emoji: string;
  title: string;
  descriptor: string;
  action: string;
  availabilityCue: string;
  availabilityTone: 'ready' | 'soon';
  imageUrl: string;
  imageUrls: string[];
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
  defaultProductStatus: 'available' | 'rented' | 'maintenance';
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
    size: 'S-M',
    model: 'Kebaya Modern',
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
    wearStyles: ['Hijab', 'Non-Hijab'],
  },
  {
    id: '2',
    code: 'KB-BLV-02',
    name: 'Kebaya Klasik Solo Beludru Hitam',
    color: 'Hitam',
    size: 'L-XL',
    model: 'Kebaya Janggan',
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
    wearStyles: ['Hijab'],
  },
  {
    id: '3',
    code: 'KB-IVR-03',
    name: 'Kebaya Kartini Putih Gading (Ivory)',
    color: 'Putih',
    size: 'S-M',
    model: 'Kebaya Janggan',
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
    wearStyles: ['Hijab'],
  },
  {
    id: '4',
    code: 'KB-KTB-04',
    name: 'Kebaya Kutubaru Sutra Merah Floral',
    color: 'Merah',
    size: 'S-M',
    model: 'Kebaya Kutubaru',
    rentalPrice: 200000,
    status: 'available',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1551806235-6629bc24457e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya Kutubaru klasik berbahan sutra satin bermotif floral warna merah menyala. Dilengkapi dengan angkin (stagen penutup perut) berwarna kontras yang mempercantik tampilan pinggang. Pilihan berani untuk hari-hari perayaan budaya dan pesta pernikahan.',
    wearStyles: ['Non-Hijab'],
  },
  {
    id: '5',
    code: 'KB-RSG-05',
    name: 'Kebaya Modern Premium Rose Gold',
    color: 'Rose Gold',
    size: 'L-XL',
    model: 'Kebaya Modern',
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
    wearStyles: ['Non-Hijab'],
  },
  {
    id: '6',
    code: 'KB-LIL-06',
    name: 'Kebaya Balinese Lace Lilac Dream',
    color: 'Lilac',
    size: 'S-M',
    model: 'Bajubodo Modern',
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
    wearStyles: ['Hijab', 'Non-Hijab'],
  },
  {
    id: '7',
    code: 'KB-AUR-07',
    name: 'Kebaya Aurora Sapphire Blue Velvet',
    color: 'Biru',
    size: 'S-M',
    model: 'Dress Premium',
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
    wearStyles: ['Non-Hijab'],
  },
  {
    id: '8',
    code: 'KB-TER-08',
    name: 'Kebaya Modern Terracotta Organza',
    color: 'Terracotta',
    size: 'L-XL',
    model: 'Dress Premium',
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
    wearStyles: ['Hijab', 'Non-Hijab'],
  },
  {
    id: '9',
    code: 'KB-GLD-09',
    name: 'Kebaya Kutubaru Royal Gold Brocade',
    color: 'Emas',
    size: 'L-XL',
    model: 'Kebaya Kutubaru',
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
    wearStyles: ['Hijab'],
  },
  {
    id: '10',
    code: 'KB-PNK-10',
    name: 'Kebaya Kartini Soft Pink Tulip',
    color: 'Pink',
    size: 'S-M',
    model: 'Kurung Melayu',
    rentalPrice: 210000,
    status: 'available',
    rentalEndDate: null,
    imageUrls: [
      'https://images.unsplash.com/photo-1549064482-6779ba3292fe?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&auto=format&fit=crop&q=80',
    ],
    description:
      'Kebaya Kartini berbahan sifon tipis warna merah muda lembut bermotif floral tulip kecil. Sangat anggun dengan bros susun tiga antik berwarna perak bakar di kerah dada. Koleksi edisi terbatas yang elegan untuk foto keluarga atau hari Kartinian.',
    wearStyles: ['Hijab'],
  },
];

const fallbackCategoryImage = mockKebayas[0]?.imageUrls[0] ?? '';

export const defaultLandingCategories: LandingCategoryContent[] = [
  {
    slug: 'wisuda',
    emoji: '🎓',
    title: 'Kebaya for Wisuda',
    descriptor: 'Rapi, ringan, dan fotogenik untuk hari kelulusan.',
    action: 'Lihat wisuda',
    availabilityCue: 'Now Ready',
    availabilityTone: 'ready',
    imageUrl: mockKebayas[5]?.imageUrls[0] ?? fallbackCategoryImage,
    imageUrls: mockKebayas[5]?.imageUrls.slice(0, 3) ?? [fallbackCategoryImage],
  },
  {
    slug: 'lamaran',
    emoji: '💍',
    title: 'Kebaya for Lamaran',
    descriptor: 'Siluet lembut untuk momen keluarga yang lebih formal.',
    action: 'Lihat lamaran',
    availabilityCue: 'Now Ready',
    availabilityTone: 'ready',
    imageUrl: mockKebayas[2]?.imageUrls[0] ?? fallbackCategoryImage,
    imageUrls: mockKebayas[2]?.imageUrls.slice(0, 3) ?? [fallbackCategoryImage],
  },
  {
    slug: 'kondangan',
    emoji: '✨',
    title: 'Dress premium untuk kondangan',
    descriptor: 'Pilihan dressy dan kebaya modern untuk undangan malam.',
    action: 'Lihat kondangan',
    availabilityCue: 'Now Ready',
    availabilityTone: 'ready',
    imageUrl: mockKebayas[4]?.imageUrls[0] ?? fallbackCategoryImage,
    imageUrls: mockKebayas[4]?.imageUrls.slice(0, 3) ?? [fallbackCategoryImage],
  },
  {
    slug: 'bridesmaid',
    emoji: '🌸',
    title: 'Seragam bridesmaid',
    descriptor: 'Nuansa senada untuk look rombongan yang tetap personal.',
    action: 'Lihat bridesmaid',
    availabilityCue: 'Coming Soon',
    availabilityTone: 'soon',
    imageUrl: mockKebayas[7]?.imageUrls[1] ?? fallbackCategoryImage,
    imageUrls: mockKebayas[7]?.imageUrls.slice(0, 3) ?? [fallbackCategoryImage],
  },
];

export const mockCMS: CMSContent = {
  heroEyebrow: 'Sewa Kebaya & Dress / {location}',
  heroTitle: 'Sewa Kebaya Premium untuk Momen Istimewamu',
  heroSubtitle:
    'Temukan koleksi kebaya modern dan klasik terbaik di Farsha Studio. Pilihan elegan, ukuran lengkap, dan siap membuat penampilanmu memukau.',
  heroImageUrl:
    'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1600&auto=format&fit=crop&q=80',
  primaryCtaLabel: 'LIHAT KATALOG',
  whatsappCtaLabel: 'Hubungi WhatsApp',
  mapsCtaLabel: 'Lihat Lokasi',
  mapsCtaUrl: 'https://maps.app.goo.gl/DgNjPLoBTzHhxRx3A',
  tiktokCtaLabel: 'Tiktok Studio',
  heroMetaText: 'walk in studio / {location}',
  reminderLabel: 'REMINDER',
  promoText:
    '✨ Dapatkan diskon sewa 10% untuk penyewaan di hari kerja (Senin - Kamis)! Hubungi admin sekarang. ✨',
  categoryEyebrow: 'Sort by occasion',
  categoryTitle: 'Pilih momen spesial kamu',
  trustPoints: [
    'datang langsung tanpa appointment',
    'banyak pilihan model',
    'studio di {location}',
  ],
  finalEyebrow: 'full catalog',
  aboutTitle: 'Tentang Farsha Studio',
  aboutText:
    'Farsha Studio adalah destinasi utama penyewaan kebaya premium yang berfokus pada kualitas jahatan, detail payet yang indah, dan kecocokan fitting yang sempurna. Koleksi kami berkisar dari kebaya tradisional klasik hingga desain modern kontemporer untuk wisuda, pernikahan, pertunangan, dan acara formal lainnya. Kami percaya bahwa setiap wanita berhak tampil anggun dan percaya diri di hari spesialnya.',
  finalCtaLabel: 'LIHAT KATALOG',
  studioAddress: 'Jl. Kebon Jeruk Raya No. 45, Jakarta Barat, DKI Jakarta 11530',
  studioPhone: '+62 812-3456-7890',
  landingCategories: defaultLandingCategories,
};
