import Catalog from '@/components/Catalog';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';

export default function CatalogPage() {
  return (
    <div className="theme-surface min-h-screen flex flex-col font-sans antialiased">
      <PublicHeader />

      <main className="flex-grow">
        <section className="theme-soft-surface theme-border border-b py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <span className="theme-muted-strong text-xs font-bold tracking-widest uppercase font-mono">
              KATALOG LENGKAP
            </span>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[var(--theme-text)] tracking-tight mt-3">
              Semua Koleksi Kebaya
            </h1>
            <p className="theme-muted-strong text-sm sm:text-base leading-relaxed max-w-2xl mt-4">
              Telusuri koleksi Farsha Studio dengan filter model, ukuran, warna, harga, dan status
              ketersediaan sebelum menghubungi studio untuk jadwal sewa.
            </p>
          </div>
        </section>

        <Catalog />
      </main>

      <PublicFooter />
    </div>
  );
}
