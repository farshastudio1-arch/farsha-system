import Link from 'next/link';
import { Compass } from 'lucide-react';

import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import StoreStatusBadge from '@/components/StoreStatusBadge';
import { landingCategories } from '@/lib/landing-categories';
import { mockSiteSettings } from '@/data/mockData';

export default function Home() {
  const cleanWhatsapp = mockSiteSettings.whatsappNumber.replace(/[^0-9]/g, '');
  const whatsappLink = `https://wa.me/${cleanWhatsapp}?text=Halo%20Admin%20Farsha%20Studio,%20saya%20tertarik%20tanya%20sewa%20kebaya.`;
  const tiktokLink = mockSiteSettings.tiktokUrl || 'https://tiktok.com';

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
                  Sewa Kebaya & Dress / Makassar
                </span>
                <h1 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-tight tracking-tight text-[var(--theme-text)] sm:text-5xl">
                  Your next &quot;wow&quot; moment is just a rental away.
                </h1>
                <p className="theme-muted-strong mt-4 max-w-md text-sm leading-relaxed sm:text-base">
                  Sewa kebaya dan dress premium untuk momen sekali pakai, tanpa harus beli
                  mahal-mahal.
                </p>
                <div className="mt-6 flex flex-col gap-2.5 w-full sm:max-w-[280px]">
                  <Link
                    href="/catalog"
                    className="theme-primary-action flex items-center justify-center gap-3 px-6 py-4 text-xs font-semibold uppercase tracking-widest transition-all w-full text-center"
                  >
                    <Compass className="w-4 h-4 shrink-0" />
                    LIHAT KATALOG
                  </Link>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 px-6 py-4 text-xs font-semibold uppercase tracking-widest transition-all w-full text-center bg-[#25D366] text-white hover:bg-[#20BA5A] shadow-xs"
                  >
                    <svg className="w-4.5 h-4.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.908-6.993-1.879-1.88-4.359-2.912-7-2.912-5.439 0-9.873 4.432-9.877 9.877-.001 1.769.479 3.498 1.39 5.031l-.963 3.518 3.6-.944z" />
                    </svg>
                    Hubungi WhatsApp
                  </a>
                  <a
                    href={tiktokLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 px-6 py-4 text-xs font-semibold uppercase tracking-widest transition-all w-full text-center bg-[var(--theme-surface)] border theme-border text-[var(--theme-text)] hover:bg-[var(--theme-soft-surface)] shadow-xs"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.99-1.72-.08 1.56-.01 3.12-.01 4.69 0 2.29-.46 4.64-1.92 6.42-1.75 2.23-4.56 3.4-7.3 3.42-3.13.03-6.27-1.57-7.79-4.34-1.7-3.07-1.39-7.28 1.05-9.97 1.79-2.03 4.54-3.07 7.21-2.73v4.05c-1.36-.27-2.86.15-3.76 1.25-.97 1.15-1.07 2.9-.31 4.19.8 1.37 2.44 2.14 4.01 1.88 1.58-.23 2.87-1.56 3.11-3.14.15-2.51.04-5.03.07-7.54.02-3.62.01-7.23.01-10.85z" />
                    </svg>
                    Tiktok Studio
                  </a>
                </div>
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
                    <p className="theme-muted font-mono text-[10px] uppercase leading-relaxed tracking-widest">
                      walk in studio / Makassar
                    </p>
                    <StoreStatusBadge />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-reminder-strip border-y border-neutral-900/10 py-6 sm:py-7">
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center gap-1.5 px-4 sm:px-6 lg:px-8">
            <span className="landing-reminder-label text-neutral-500 font-mono text-[9px] font-bold uppercase tracking-widest">
              <span aria-hidden="true">✨</span>
              <span>REMINDER</span>
              <span aria-hidden="true">✨</span>
            </span>
            <p className="landing-reminder-quote font-serif italic text-base sm:text-lg text-neutral-950 text-center leading-relaxed">
              &quot;Rent the look, own the moment&quot;
            </p>
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
                    <h3 className="font-serif text-lg font-semibold leading-tight text-[var(--theme-text)] sm:text-xl">
                      {category.title}
                    </h3>
                    <p className="theme-muted-strong mt-2 mb-5 text-sm leading-relaxed">
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
              LIHAT KATALOG
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
