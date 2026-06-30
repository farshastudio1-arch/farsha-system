import Link from 'next/link';

import Hero from '@/components/Hero';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import { mockCMS, mockKebayas } from '@/data/mockData';

export default function Home() {
  const featuredProducts = mockKebayas.slice(0, 3);

  return (
    <div className="theme-surface min-h-screen flex flex-col font-sans antialiased">
      <PublicHeader />

      <Hero />

      <main className="flex-grow">
        <section className="theme-surface theme-border w-full py-12 sm:py-16 border-t">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="theme-border flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b">
              <div className="max-w-2xl">
                <span className="theme-muted-strong text-xs font-bold tracking-widest uppercase font-mono">
                  PILIHAN STUDIO
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--theme-text)] tracking-tight mt-2">
                  Preview Koleksi Terbaru
                </h2>
                <p className="theme-muted-strong text-sm sm:text-base leading-relaxed mt-3">
                  Lihat beberapa kebaya pilihan sebelum membuka katalog lengkap dengan filter,
                  ukuran, status ketersediaan, dan detail sewa.
                </p>
              </div>

              <Link
                href="/catalog"
                className="theme-primary-action text-xs font-sans font-semibold tracking-widest uppercase px-6 py-3.5 transition-all duration-300 text-center shadow-xs"
              >
                Buka Katalog
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 pt-8">
              {featuredProducts.map((product) => (
                <Link
                  key={product.id}
                  href="/catalog"
                  className="theme-surface theme-border group block overflow-hidden border transition-all duration-300 hover:shadow-sm"
                >
                  <div className="theme-soft-surface aspect-[4/5] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.imageUrls[0]}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <span className="theme-muted text-[10px] font-semibold uppercase tracking-wider font-mono">
                      {product.model} / {product.size}
                    </span>
                    <h3 className="font-serif text-lg font-medium text-[var(--theme-text)] mt-1 leading-tight">
                      {product.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 4. ABOUT SECTION */}
      <section
        id="about-section"
        className="theme-soft-surface theme-border w-full py-16 sm:py-24 border-t"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 sm:space-y-8">
          <span className="theme-muted-strong text-xs font-bold tracking-widest uppercase font-mono">
            KENALI KAMI LEBIH DEKAT
          </span>

          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--theme-text)] tracking-tight">
            {mockCMS.aboutTitle}
          </h2>

          <p className="theme-muted-strong text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-sans">
            {mockCMS.aboutText}
          </p>

          <div className="w-12 h-[1px] bg-[var(--theme-accent)] mx-auto pt-2" />
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
