# PRD - Farsha Studio Showcase (Current State)

> Dokumen ini menjelaskan keadaan produk yang benar-benar ada di repository saat ini.
> Jika ada perbedaan dengan `prd.md`, ikuti file ini untuk prompt berikutnya.

## 1. Ringkasan Produk
Farsha Studio Showcase adalah etalase digital untuk koleksi kebaya Farsha Studio, plus area admin dan PoS internal untuk pengelolaan katalog dan status item.

Fokus utamanya:
- membantu pengunjung melihat koleksi dengan cepat,
- memudahkan pencarian berdasarkan atribut produk,
- membuka WhatsApp untuk tanya ketersediaan item,
- memberi ruang admin untuk mengelola katalog dan pengaturan tampilan,
- menyediakan area PoS internal untuk alur operasional mock/demo.

Catatan penting:
- data katalog dan settings saat ini disimpan di browser `localStorage`,
- tidak ada checkout, pembayaran, atau booking online,
- tidak semua field admin/settings sudah terhubung ke tampilan publik,
- beberapa halaman admin/PoS masih berupa UI kerja internal atau mock yang sengaja disiapkan untuk alur operasional.

## 2. Ruang Lingkup
### Publik
- Homepage dengan header sticky, hero editorial, katalog, about, dan footer.
- Halaman detail item lewat modal.
- Halaman kebijakan privasi bilingual.
- Halaman syarat dan ketentuan bilingual.

### Tertutup
- Login admin Google.
- Dashboard admin.
- Manajemen katalog admin.
- CMS admin.
- Settings admin.
- Area PoS internal.
- Laporan PoS internal.

### Pendukung
- Auth berbasis Google sign-in dengan allowlist email admin.
- Theme system berbasis CSS variables.
- Persistensi browser untuk katalog, settings, dan pilihan grid mobile.
- Endpoint health untuk D1 sebagai pengecekan infrastruktur, bukan sumber data utama produk saat ini.

## 3. Perilaku Publik
### Header dan hero
- Header sticky dengan brand uppercase.
- CTA utama publik mengarah ke browsing katalog, bukan ke admin.
- Hero menampilkan promo bar, judul editorial, gambar besar, CTA ke katalog, dan CTA WhatsApp.
- Section about dan footer memakai copy brand yang sudah disiapkan di seed data.

### Katalog
- Pencarian berdasarkan nama atau kode item.
- Filter multi-kriteria:
  - warna,
  - ukuran,
  - model,
  - status,
  - harga maksimal.
- Switch grid mobile:
  - 1 kolom: kartu penuh dengan carousel gambar yang bisa di-swipe,
  - 2 kolom: kartu ringkas seperti e-commerce,
  - 3 kolom: tile gambar kompak dengan indikator status.
- Switch grid desktop:
  - 2, 3, atau 4 kolom.
- Pilihan grid mobile terakhir disimpan di browser.
- Kartu produk mendukung mode tampilan minimal, standard, dan detailed lewat settings.
- Kartu detail terbuka lewat klik gambar atau judul.

### Detail item
- Modal detail menampilkan galeri gambar, thumbnail, deskripsi, spesifikasi, dan harga sewa.
- Item berstatus rented menampilkan estimasi kembali jika ada tanggal kembali.
- Item berstatus maintenance menampilkan penjelasan status perawatan.
- Tombol WhatsApp membuka pesan terisi otomatis berisi nama item dan kode item.
- Alur ini tetap offline; transaksi final terjadi di studio.

## 4. Perilaku Admin dan PoS
### Login dan akses
- Admin masuk lewat Google.
- Hanya email yang ada di `ADMIN_EMAILS` yang boleh lolos sebagai admin.
- Route protected mencakup `/admin` dan `/pos`.
- Logout mengarah kembali ke `/admin/login`.

### Dashboard admin
- Menampilkan ringkasan KPI dan aktivitas terbaru.
- Saat ini lebih bersifat overview UI daripada dashboard yang terhubung ke backend operasional penuh.

### Manajemen katalog admin
- Admin dapat menambah, mengubah, dan menghapus item katalog.
- Validasi dasar ada untuk nama, kode unik, warna, dan harga.
- Item disimpan di `localStorage`.
- Form admin katalog saat ini hanya mengelola satu gambar utama per item.
- Public catalog bisa menampilkan lebih dari satu gambar jika datanya memang berisi banyak URL gambar.

### CMS admin
- Halaman CMS ada sebagai editor fixed-section untuk konten publik.
- Saat ini berfungsi sebagai UI kerja / mock, belum menjadi sumber hidup untuk seluruh hero/about publik.

### Settings admin
- Admin bisa mengubah:
  - nama studio,
  - tagline,
  - status situs,
  - kontak,
  - sosial media,
  - warna tema,
  - radius border,
  - default grid mobile dan desktop,
  - mode kartu katalog,
  - toggle elemen kartu katalog,
  - logo dan favicon,
  - promo banner.
- Sebagian nilai langsung memengaruhi tampilan publik, terutama tema dan perilaku katalog.
- Sebagian nilai lain masih bersifat admin reference / preview / future integration.
- Settings bisa diekspor dan diimpor sebagai JSON.

### PoS internal
- Ada area `/pos` untuk katalog/status operasional internal.
- Ada halaman laporan `/pos/reports`.
- Data PoS saat ini berupa mock state lokal untuk demonstrasi alur.
- Area ini diproteksi dengan auth yang sama seperti admin.

## 5. Data dan Persistensi
### Seed data
- `mockData.ts` menjadi seed awal untuk:
  - katalog item,
  - CMS content,
  - site settings.

### Struktur data inti
- Item katalog memiliki:
  - id,
  - code,
  - name,
  - color,
  - size,
  - model,
  - rentalPrice,
  - status,
  - rentalEndDate,
  - imageUrls,
  - description.
- Site settings menyimpan theme token, layout default, visibility card, dan metadata studio.
- CMS content menyimpan copy hero, promo, about, dan kontak seed.

### Storage
- Catalog items: `farsha-catalog-items-v1`
- Site settings: `farsha-site-settings-v1`
- Mobile grid preference: `farsha-mobile-grid-view-v1`

### Sinkronisasi
- Perubahan antar-tab disebarkan lewat event browser storage/custom event.
- Saat ini tidak ada shared database produk yang menjadi source of truth utama untuk katalog publik.

## 6. Auth dan Route Map
### Auth
- Provider: Google.
- Sesi memakai role `admin`.
- Login page menolak akun yang tidak ada di allowlist.

### Route map
- `/` - storefront publik
- `/privacy-policy` - kebijakan privasi bilingual
- `/terms` - syarat dan ketentuan bilingual
- `/admin/login` - login admin
- `/admin` - dashboard
- `/admin/catalog` - katalog admin
- `/admin/cms` - CMS admin
- `/admin/settings` - settings admin
- `/pos` - PoS internal
- `/pos/reports` - laporan PoS internal

## 7. UX dan Visual
- Gaya visual minimal-editorial, fokus ke foto kebaya.
- Navigasi publik harus tetap browse-first.
- Tidak ada elemen checkout atau keranjang publik.
- Layout mobile harus padat, cepat discan, dan nyaman disentuh.
- Public pages dan admin pages memakai bahasa visual yang konsisten, tetapi tidak identik.

## 8. Hal yang Sengaja Tidak Ada
- Checkout online.
- Pembayaran online.
- Booking online publik.
- Tracking marketing/cookie banner khusus pemasaran.
- Link admin/login di navigasi publik.
- Klaim real-time sync ke database PoS yang belum benar-benar dipakai di codebase saat ini.
- CMS full WYSIWYG yang kompleks.
- Multi-admin role management.

## 9. Catatan Implementasi untuk Prompt Berikutnya
- Jika prompt berikutnya menyebut "buat sesuai PRD", gunakan file ini sebagai acuan keadaan sekarang, bukan PRD lama.
- Jika ingin memindahkan data ke backend, update PRD ini dulu supaya batasan localStorage, auth, dan sinkronisasi tidak salah dipahami.
- Jika ingin memperluas CMS atau menyambungkan settings ke hero/about publik, itu perlu dianggap perubahan fitur baru, bukan asumsi default.
