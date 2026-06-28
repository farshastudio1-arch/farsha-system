CREATE TABLE IF NOT EXISTS kebaya_items (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'Custom')),
  model TEXT NOT NULL CHECK (model IN ('Modern', 'Klasik', 'Kartini', 'Kutubaru')),
  rental_price INTEGER NOT NULL CHECK (rental_price >= 0),
  status TEXT NOT NULL CHECK (status IN ('available', 'rented', 'maintenance', 'archived')),
  rental_end_date TEXT,
  image_urls TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kebaya_items_code ON kebaya_items (code);
CREATE INDEX IF NOT EXISTS idx_kebaya_items_status ON kebaya_items (status);
CREATE INDEX IF NOT EXISTS idx_kebaya_items_model ON kebaya_items (model);

CREATE TABLE IF NOT EXISTS cms_content (
  id TEXT PRIMARY KEY CHECK (id = 'main'),
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT NOT NULL,
  hero_image_url TEXT NOT NULL,
  promo_text TEXT NOT NULL,
  about_title TEXT NOT NULL,
  about_text TEXT NOT NULL,
  studio_address TEXT NOT NULL,
  studio_phone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO kebaya_items (
  id,
  code,
  name,
  color,
  size,
  model,
  rental_price,
  status,
  rental_end_date,
  image_urls,
  description
)
VALUES
  (
    '1',
    'KB-SGE-01',
    'Kebaya Brokat Modern Sage Green',
    'Sage Green',
    'M',
    'Modern',
    250000,
    'available',
    NULL,
    '["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya brokat modern dengan nuansa Sage Green yang sedang tren. Dihiasi payet premium berkilau di bagian dada dan kerah shanghai yang tegak elegan. Sangat cocok untuk acara wisuda, lamaran, atau kondangan formal. Bagian belakang dilengkapi resleting tersembunyi untuk fitting yang pas.'
  ),
  (
    '2',
    'KB-BLV-02',
    'Kebaya Klasik Solo Beludru Hitam',
    'Hitam',
    'L',
    'Klasik',
    300000,
    'rented',
    '2026-07-05',
    '["https://images.unsplash.com/photo-1539008885759-c290df62751f?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya beludru hitam tradisional khas Solo dengan bordir benang emas bermotif floral klasik di sepanjang tepi pakaian. Potongan kutubaru yang mempertegas lekuk tubuh secara anggun. Bahan beludru stretch berkualitas tinggi yang nyaman dipakai sepanjang hari.'
  ),
  (
    '3',
    'KB-IVR-03',
    'Kebaya Kartini Putih Gading (Ivory)',
    'Putih',
    'S',
    'Kartini',
    220000,
    'available',
    NULL,
    '["https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1549064482-6779ba3292fe?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1518612393370-2c822a76e93e?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya model Kartini dengan potongan leher V-neck yang bersih dan kain katun lace premium warna putih gading. Desain elegan yang sederhana namun tetap anggun, sangat cocok untuk prosesi akad nikah atau pertunangan bertema tradisional suci.'
  ),
  (
    '4',
    'KB-KTB-04',
    'Kebaya Kutubaru Sutra Merah Floral',
    'Merah',
    'M',
    'Kutubaru',
    200000,
    'maintenance',
    NULL,
    '["https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1551806235-6629bc24457e?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya Kutubaru klasik berbahan sutra satin bermotif floral warna merah menyala. Dilengkapi dengan angkin (stagen penutup perut) berwarna kontras yang mempercantik tampilan pinggang. Pilihan berani untuk hari-hari perayaan budaya dan pesta pernikahan.'
  ),
  (
    '5',
    'KB-RSG-05',
    'Kebaya Modern Premium Rose Gold',
    'Rose Gold',
    'XL',
    'Modern',
    280000,
    'available',
    NULL,
    '["https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1550639525-c97d455acf70?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya modern bersiluet asimetris dengan payet 3D berwarna Rose Gold mewah. Menggunakan tile polos transparan di bagian pundak untuk memberikan efek melayang (floating effect) yang menakjubkan. Ukuran XL dengan potongan bersahabat yang tetap memberi efek langsing.'
  ),
  (
    '6',
    'KB-LIL-06',
    'Kebaya Balinese Lace Lilac Dream',
    'Lilac',
    'S',
    'Modern',
    180000,
    'available',
    NULL,
    '["https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya khas Bali dengan bahan brokat prada halus bernuansa Lilac lembut. Dilengkapi obi (selendang pinggang) berbahan satin ungu tua dengan bros kuningan tradisional Bali di tengahnya. Menghadirkan kecantikan eksotis pulau dewata dalam balutan warna modern.'
  ),
  (
    '7',
    'KB-AUR-07',
    'Kebaya Aurora Sapphire Blue Velvet',
    'Biru',
    'M',
    'Klasik',
    320000,
    'rented',
    '2026-07-01',
    '["https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1618244953282-1f55f2429622?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya mewah berbahan beludru tebal warna biru safir tua dengan potongan ekor panjang menyapu lantai. Detail payet perak handmade menyebar di seluruh lengan dan punggung. Sempurna untuk pengantin wanita tradisional Jawa yang menginginkan sentuhan royal aristokrat.'
  ),
  (
    '8',
    'KB-TER-08',
    'Kebaya Modern Terracotta Organza',
    'Terracotta',
    'L',
    'Modern',
    260000,
    'available',
    NULL,
    '["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya modern dengan kombinasi bahan organza terstruktur dan brokat chantilly warna Terracotta hangat yang segar. Desain lengan balon/puffy yang memberikan kesan anggun dan kekinian. Dilengkapi bustier sewarna yang nyaman di kulit.'
  ),
  (
    '9',
    'KB-GLD-09',
    'Kebaya Kutubaru Royal Gold Brocade',
    'Emas',
    'Custom',
    'Kutubaru',
    350000,
    'available',
    NULL,
    '["https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1603252109303-2751441dd157?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya kutubaru eksklusif dengan sulaman benang emas metalik berkilau tinggi. Model klasik dengan kerah tinggi yang memberikan wibawa ningrat. Disediakan dalam size Custom (bisa di-fit sesuai lingkar dada peminjam 94-102 cm) di studio kami.'
  ),
  (
    '10',
    'KB-PNK-10',
    'Kebaya Kartini Soft Pink Tulip',
    'Pink',
    'M',
    'Kartini',
    210000,
    'archived',
    NULL,
    '["https://images.unsplash.com/photo-1549064482-6779ba3292fe?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80","https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=800&auto=format&fit=crop&q=80"]',
    'Kebaya Kartini berbahan sifon tipis warna merah muda lembut bermotif floral tulip kecil. Sangat anggun dengan bros susun tiga antik berwarna perak bakar di kerah dada. Koleksi edisi terbatas yang elegan untuk foto keluarga atau hari Kartinian.'
  )
ON CONFLICT(id) DO UPDATE SET
  code = excluded.code,
  name = excluded.name,
  color = excluded.color,
  size = excluded.size,
  model = excluded.model,
  rental_price = excluded.rental_price,
  status = excluded.status,
  rental_end_date = excluded.rental_end_date,
  image_urls = excluded.image_urls,
  description = excluded.description,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO cms_content (
  id,
  hero_title,
  hero_subtitle,
  hero_image_url,
  promo_text,
  about_title,
  about_text,
  studio_address,
  studio_phone
)
VALUES (
  'main',
  'Sewa Kebaya Premium untuk Momen Istimewamu',
  'Temukan koleksi kebaya modern dan klasik terbaik di Farsha Studio. Pilihan elegan, ukuran lengkap, dan siap membuat penampilanmu memukau.',
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1600&auto=format&fit=crop&q=80',
  '✨ Dapatkan diskon sewa 10% untuk penyewaan di hari kerja (Senin - Kamis)! Hubungi admin sekarang. ✨',
  'Tentang Farsha Studio',
  'Farsha Studio adalah destinasi utama penyewaan kebaya premium yang berfokus pada kualitas jahatan, detail payet yang indah, dan kecocokan fitting yang sempurna. Koleksi kami berkisar dari kebaya tradisional klasik hingga desain modern kontemporer untuk wisuda, pernikahan, pertunangan, dan acara formal lainnya. Kami percaya bahwa setiap wanita berhak tampil anggun dan percaya diri di hari spesialnya.',
  'Jl. Kebon Jeruk Raya No. 45, Jakarta Barat, DKI Jakarta 11530',
  '+62 812-3456-7890'
)
ON CONFLICT(id) DO UPDATE SET
  hero_title = excluded.hero_title,
  hero_subtitle = excluded.hero_subtitle,
  hero_image_url = excluded.hero_image_url,
  promo_text = excluded.promo_text,
  about_title = excluded.about_title,
  about_text = excluded.about_text,
  studio_address = excluded.studio_address,
  studio_phone = excluded.studio_phone,
  updated_at = CURRENT_TIMESTAMP;
