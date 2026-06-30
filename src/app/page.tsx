import Link from 'next/link';

import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import { landingCategories } from '@/lib/landing-categories';

export default function Home() {
  const heroImageUrl =
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80';
  const trustPoints = [
    'datang langsung tanpa appointment',
    'banyak pilihan model',
    'studio di Paccerakkang, Makassar',
  ];

  return (
    <div className="theme-surface flex min-h-screen flex-col font-sans antialiased">
      <PublicHeader />

      <main className="flex-grow">
        <section className="theme-surface relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'linear-gradient(var(--theme-text) 1px, transparent 1px), linear-gradient(90deg, var(--theme-text) 1px, transparent 1px)',
              backgroundSize: '42px 42px',
            }}
          />

          <div className="relative mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
            <div className="landing-hero-grid">
              <div className="theme-border border-b pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
                <span className="theme-muted-strong font-mono text-xs font-bold uppercase tracking-widest">
                  Farsha Studio / Paccerakkang
                </span>
                <h1 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-tight tracking-tight text-[var(--theme-text)] sm:text-5xl">
                  Choose the mood. Find the look.
                </h1>
                <p className="theme-muted-strong mt-4 max-w-md text-sm leading-relaxed sm:text-base">
                  Sewa kebaya dan dress premium untuk momen sekali pakai, tanpa harus beli
                  mahal-mahal.
                </p>
                <Link
                  href="/catalog"
                  className="theme-primary-action mt-6 inline-flex px-6 py-3.5 text-xs font-semibold uppercase tracking-widest transition-all"
                >
                  LIHAT KOLEKSI
                </Link>
              </div>

              <div>
                <div className="theme-border grid grid-cols-[minmax(0,1fr)_96px] gap-3 border p-2 sm:grid-cols-[minmax(0,1fr)_128px]">
                  <div className="theme-soft-surface aspect-[16/9] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImageUrl}
                      alt="Dress rental store interior"
                      className="h-full w-full object-cover"
                      loading="eager"
                    />
                  </div>
                  <div className="theme-surface theme-border flex flex-col justify-between border-l px-3 py-3">
                    <span className="landing-visit-badge border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-left font-mono text-[10px] font-semibold uppercase tracking-widest text-emerald-700 shadow-sm">
                      visit langsung
                    </span>
                    <p className="theme-muted font-mono text-[10px] uppercase leading-relaxed tracking-widest">
                      walk in studio / Makassar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="theme-surface theme-border border-t py-8 sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="theme-border mb-5 flex items-end justify-between gap-5 border-b pb-4">
              <div>
                <span className="theme-muted font-mono text-[10px] font-semibold uppercase tracking-widest">
                  Sort by occasion
                </span>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--theme-text)] sm:text-3xl">
                  Pilih momen spesial kamu
                </h2>
              </div>
              <div className="hidden h-px flex-1 bg-[var(--theme-border)] sm:block" />
            </div>

            <div className="landing-category-grid">
              {landingCategories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/catalog?category=${category.slug}`}
                  className="theme-surface theme-border group flex min-h-[340px] flex-col border transition-all duration-300 hover:-translate-y-1 hover:shadow-md sm:min-h-[380px]"
                >
                  <div className="theme-border flex items-center justify-between border-b px-4 py-3">
                    <span className="text-base" aria-hidden="true">
                      {category.emoji}
                    </span>
                    <span
                      className={`border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest ${
                        category.availabilityTone === 'ready'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {category.availabilityCue}
                    </span>
                  </div>
                  <div className="theme-soft-surface mx-3 mt-3 aspect-[4/3] overflow-hidden sm:aspect-[3/4]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={category.imageUrl}
                      alt={category.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-serif text-2xl font-semibold leading-tight text-[var(--theme-text)]">
                      {category.title}
                    </h3>
                    <p className="theme-muted-strong mt-3 text-sm leading-relaxed">
                      {category.descriptor}
                    </p>
                    <span className="theme-border mt-auto inline-flex border-t pt-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-text)]">
                      {category.action}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="theme-soft-surface theme-border border-t py-7">
          <div className="landing-trust-grid mx-auto max-w-7xl divide-y divide-[var(--theme-border)] px-4 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
            {trustPoints.map((point) => (
              <p
                key={point}
                className="py-3 text-center font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--theme-text)] sm:px-4"
              >
                {point}
              </p>
            ))}
          </div>
        </section>

        <section className="theme-surface theme-border border-t py-12 sm:py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
            <span className="theme-muted font-mono text-[10px] font-semibold uppercase tracking-widest">
              full catalog
            </span>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-[var(--theme-text)] sm:text-4xl">
              Browse semua koleksi Farsha Studio
            </h2>
            <p className="theme-muted-strong mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
              Gunakan katalog lengkap untuk cek model, warna, ukuran, harga sewa, dan status
              ketersediaan sebelum datang ke studio.
            </p>
            <Link
              href="/catalog"
              className="theme-primary-action mt-6 px-7 py-3.5 text-xs font-semibold uppercase tracking-widest transition-all"
            >
              LIHAT KOLEKSI
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
