import Link from 'next/link';
import { ArrowRight, CalendarCheck, Compass, MapPin } from 'lucide-react';

import LandingCategoryCard from '@/components/LandingCategoryCard';
import PublicFooter from '@/components/PublicFooter';
import PublicHeader from '@/components/PublicHeader';
import StoreStatusBadge from '@/components/StoreStatusBadge';
import { mergeLandingCategories } from '@/lib/landing-categories';
import { getCmsContent, getSiteSettings } from '@/lib/farsha-db';

const rentalPaths = [
  {
    optionLabel: 'Opsi A',
    title: 'Datang Langsung',
    icon: MapPin,
    suitableFor: 'Acara mendadak atau kebutuhan mepet.',
    benefit:
      'Tanpa perlu membuat appointment atau membayar biaya booking di awal. Cukup kunjungi studio kami di jam operasional, pilih koleksi yang tersedia, lakukan fitting, dan bawa pulang hari itu juga.',
    note: 'Pilihan baju terbatas sepenuhnya pada ketersediaan stok di hari kunjungan tersebut.',
    ctaLabel: 'Kunjungi Kami',
    ctaType: 'maps',
  },
  {
    optionLabel: 'Opsi B',
    title: 'Booking Dulu',
    icon: CalendarCheck,
    suitableFor: 'Persiapan acara jauh-jauh hari.',
    benefit:
      'Dapatkan prioritas utama untuk memilih style favorit tanpa takut kehabisan slot. Tanggal acara kamu akan kami kunci secara eksklusif dalam sistem reservasi kami.',
    note:
      'Melakukan pengisian tanggal dan membayar biaya booking sebesar Rp100.000/kebaya untuk mengunci slot.',
    ctaLabel: 'Cek Tanggal',
    ctaHref: '/catalog?view=all',
  },
];

export default async function Home() {
  const [cmsContent, siteSettings] = await Promise.all([getCmsContent(), getSiteSettings()]);
  const cleanWhatsapp = siteSettings.whatsappNumber.replace(/[^0-9]/g, '');
  const whatsappLink = `https://wa.me/${cleanWhatsapp}?text=Halo%20Admin%20Farsha%20Studio,%20saya%20tertarik%20tanya%20sewa%20kebaya.`;
  const tiktokLink = siteSettings.tiktokUrl || 'https://tiktok.com';
  const mapsLink = cmsContent.mapsCtaUrl;

  const heroImageUrl = cmsContent.heroImageUrl;
  const landingCategories = mergeLandingCategories(cmsContent.landingCategories);
  const applyLocation = (value: string) =>
    value.replaceAll('{location}', siteSettings.locationLabel);
  const trustPoints = cmsContent.trustPoints.map(applyLocation);

  return (
    <div className="theme-surface flex min-h-screen flex-col font-sans antialiased">
      <PublicHeader logoUrl={siteSettings.logoUrl} />

      <main className="flex-grow">
        <section className="landing-hero-satin relative overflow-hidden">
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
            <div className="landing-hero-grid">
              <div className="theme-border border-b pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8 md:text-center lg:text-left">
                <span className="theme-muted-strong font-mono text-xs font-bold uppercase tracking-widest">
                  {applyLocation(cmsContent.heroEyebrow)}
                </span>
                <h1 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-tight tracking-tight text-[var(--theme-text)] sm:text-5xl md:mx-auto lg:mx-0">
                  {cmsContent.heroTitle}
                </h1>
                <p className="theme-muted-strong mt-4 max-w-md text-sm leading-relaxed sm:text-base md:mx-auto lg:mx-0">
                  {cmsContent.heroSubtitle}
                </p>
                <div className="mt-6 flex flex-col gap-2.5 w-full sm:max-w-[420px] md:mx-auto lg:mx-0">
                  <Link
                    href="/catalog?view=all"
                    className="theme-primary-action flex items-center justify-center gap-3 px-6 py-4 text-xs font-semibold uppercase tracking-widest transition-all w-full text-center"
                  >
                    <Compass className="w-4 h-4 shrink-0" />
                    {cmsContent.primaryCtaLabel}
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
                    {cmsContent.whatsappCtaLabel}
                  </a>
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="theme-border flex items-center justify-center gap-3 border bg-[var(--theme-surface)] px-6 py-4 text-center text-xs font-semibold uppercase tracking-widest text-[var(--theme-text)] shadow-xs transition-all hover:bg-[var(--theme-soft-surface)] w-full"
                  >
                    <MapPin className="w-4 h-4 shrink-0" />
                    {cmsContent.mapsCtaLabel}
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
                    {cmsContent.tiktokCtaLabel}
                  </a>
                </div>
              </div>

              <div>
                <div className="theme-border grid grid-cols-[minmax(0,1fr)_96px] gap-3 border p-2 sm:grid-cols-[minmax(0,1fr)_128px]">
                  <div className="theme-soft-surface aspect-[3/2] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImageUrl}
                      alt={cmsContent.heroTitle}
                      className="h-full w-full object-cover"
                      loading="eager"
                    />
                  </div>
                  <div className="theme-surface theme-border flex flex-col justify-between border-l px-3 py-3">
                    <p className="theme-muted font-mono text-[10px] uppercase leading-relaxed tracking-widest">
                      {applyLocation(cmsContent.heroMetaText)}
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
              <span>{cmsContent.reminderLabel}</span>
              <span aria-hidden="true">✨</span>
            </span>
            <p className="landing-reminder-quote font-serif italic text-base sm:text-lg text-neutral-950 text-center leading-relaxed">
              &quot;{cmsContent.promoText || 'Rent the look, own the moment'}&quot;
            </p>
          </div>
        </section>

        <section className="theme-surface theme-border border-t py-8 sm:py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="theme-border mb-5 flex items-end justify-between gap-5 border-b pb-4">
              <div>
                <span className="theme-muted font-mono text-[10px] font-semibold uppercase tracking-widest">
                  {cmsContent.categoryEyebrow}
                </span>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-[var(--theme-text)] sm:text-3xl">
                  {cmsContent.categoryTitle}
                </h2>
              </div>
              <div className="hidden h-px flex-1 bg-[var(--theme-border)] sm:block" />
            </div>

            <div className="landing-category-grid">
              {landingCategories.map((category) => (
                <LandingCategoryCard key={category.slug} category={category} />
              ))}
            </div>
          </div>
        </section>

        <section className="landing-rental-section theme-surface theme-border border-t py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            {/* Section header */}
            <div className="landing-rental-intro">
              <span className="landing-rental-eyebrow font-mono text-[10px] font-bold uppercase tracking-[0.45em]">
                panduan sewa
              </span>
              <h2 className="landing-rental-title font-serif font-semibold leading-[1.02] text-[var(--theme-text)]">
                Cara Sewa di<br />Farsha Studio
              </h2>
              <p className="landing-rental-subtitle theme-muted-strong leading-relaxed">
                Kami menyediakan dua jalur penyewaan yang dirancang untuk kenyamanan jadwal kamu.
              </p>
            </div>

            {/* Two path panels */}
            <div className="landing-rental-panels">

              {/* Panel A — Walk-in (light outlined) */}
              {(() => {
                const pathA = rentalPaths[0];
                const IconA = pathA.icon;
                return (
                  <article className="landing-rental-panel landing-rental-panel-light group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-mark.png" alt="" aria-hidden="true"
                      className="landing-rental-panel-watermark"
                      style={{ opacity: 0.022 }} />

                    {/* Top accent bar */}
                    <div className="landing-rental-panel-accent" />

                    <div className="landing-rental-panel-inner">
                      {/* Header row */}
                      <div className="landing-rental-panel-header">
                        <div className="landing-rental-panel-badge">
                          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em]">Opsi A</span>
                        </div>
                        <span className="landing-rental-panel-icon-wrap">
                          <IconA className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </div>

                      {/* Title block */}
                      <div className="landing-rental-panel-title-block">
                        <h3 className="landing-rental-panel-title font-serif font-semibold text-[var(--theme-text)]">
                          {pathA.title}
                        </h3>
                        <p className="landing-rental-panel-tagline font-serif italic text-[var(--theme-text)]">
                          {pathA.suitableFor}
                        </p>
                      </div>

                      {/* Steps */}
                      <ol className="landing-rental-steps">
                        <li className="landing-rental-step">
                          <span className="landing-rental-step-num">1</span>
                          <div className="landing-rental-step-content">
                            <span className="landing-rental-step-label">Datang ke studio</span>
                            <p className="landing-rental-step-desc">Kunjungi kami di jam operasional tanpa perlu appointment sebelumnya.</p>
                          </div>
                        </li>
                        <li className="landing-rental-step">
                          <span className="landing-rental-step-num">2</span>
                          <div className="landing-rental-step-content">
                            <span className="landing-rental-step-label">Pilih & coba koleksi</span>
                            <p className="landing-rental-step-desc">Pilih dari stok yang tersedia, lakukan fitting langsung di tempat.</p>
                          </div>
                        </li>
                        <li className="landing-rental-step">
                          <span className="landing-rental-step-num">3</span>
                          <div className="landing-rental-step-content">
                            <span className="landing-rental-step-label">Bawa pulang hari itu</span>
                            <p className="landing-rental-step-desc">Selesai fitting, langsung bawa pulang — tanpa biaya booking di awal.</p>
                          </div>
                        </li>
                      </ol>

                      {/* Note */}
                      <div className="landing-rental-panel-note">
                        <span className="landing-rental-note-icon" aria-hidden="true">!</span>
                        <p className="landing-rental-note-text">{pathA.note}</p>
                      </div>

                      {/* CTA */}
                      <a
                        href={mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="landing-rental-panel-cta landing-rental-panel-cta-outline group/cta"
                      >
                        <span>{pathA.ctaLabel}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden="true" />
                      </a>
                    </div>
                  </article>
                );
              })()}

              {/* Panel B — Booking */}
              {(() => {
                const pathB = rentalPaths[1];
                const IconB = pathB.icon;
                return (
                  <article className="landing-rental-panel landing-rental-panel-light group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo-mark.png" alt="" aria-hidden="true"
                      className="landing-rental-panel-watermark"
                      style={{ opacity: 0.022 }} />

                    {/* Top accent bar */}
                    <div className="landing-rental-panel-accent" />

                    <div className="landing-rental-panel-inner">
                      {/* Header row */}
                      <div className="landing-rental-panel-header">
                        <div className="landing-rental-panel-badge">
                          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.3em]">Opsi B</span>
                        </div>
                        <span className="landing-rental-panel-icon-wrap">
                          <IconB className="h-5 w-5" aria-hidden="true" />
                        </span>
                      </div>

                      {/* Title block */}
                      <div className="landing-rental-panel-title-block">
                        <h3 className="landing-rental-panel-title font-serif font-semibold text-[var(--theme-text)]">
                          {pathB.title}
                        </h3>
                        <p className="landing-rental-panel-tagline font-serif italic text-[var(--theme-text)]">
                          {pathB.suitableFor}
                        </p>
                      </div>

                      {/* Steps */}
                      <ol className="landing-rental-steps">
                        <li className="landing-rental-step">
                          <span className="landing-rental-step-num">1</span>
                          <div className="landing-rental-step-content">
                            <span className="landing-rental-step-label">Pilih tanggal acara</span>
                            <p className="landing-rental-step-desc">Tentukan tanggal acara kamu dan cek ketersediaan slot di sistem kami.</p>
                          </div>
                        </li>
                        <li className="landing-rental-step">
                          <span className="landing-rental-step-num">2</span>
                          <div className="landing-rental-step-content">
                            <span className="landing-rental-step-label">Bayar biaya booking</span>
                            <p className="landing-rental-step-desc">Amankan slot dengan biaya Rp100.000/kebaya untuk mengunci tanggal kamu.</p>
                          </div>
                        </li>
                        <li className="landing-rental-step">
                          <span className="landing-rental-step-num">3</span>
                          <div className="landing-rental-step-content">
                            <span className="landing-rental-step-label">Datang & fitting prioritas</span>
                            <p className="landing-rental-step-desc">Kamu mendapat akses prioritas memilih style favorit tanpa khawatir kehabisan.</p>
                          </div>
                        </li>
                      </ol>

                      {/* Note */}
                      <div className="landing-rental-panel-note">
                        <span className="landing-rental-note-icon" aria-hidden="true">!</span>
                        <p className="landing-rental-note-text">{pathB.note}</p>
                      </div>

                      {/* CTA */}
                      <Link
                        href={pathB.ctaHref!}
                        className="landing-rental-panel-cta landing-rental-panel-cta-outline group/cta"
                      >
                        <span>{pathB.ctaLabel}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })()}
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
              {cmsContent.finalEyebrow}
            </span>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-[var(--theme-text)] sm:text-4xl">
              {cmsContent.aboutTitle}
            </h2>
            <p className="theme-muted-strong mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
              {cmsContent.aboutText}
            </p>
            <Link
              href="/catalog"
              className="theme-primary-action mt-6 px-7 py-3.5 text-xs font-semibold uppercase tracking-widest transition-all"
            >
              {cmsContent.finalCtaLabel}
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter cmsContent={cmsContent} siteSettings={siteSettings} />
    </div>
  );
}
