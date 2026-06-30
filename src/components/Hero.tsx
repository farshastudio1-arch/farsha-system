import Link from 'next/link';

import { mockCMS } from '@/data/mockData';

export default function Hero() {
  return (
    <section className="theme-surface relative w-full flex flex-col">
      {/* 1. TOP PROMO BANNER (Marquee/Notice bar style) */}
      {mockCMS.promoText && (
        <div className="theme-inverse w-full py-3 px-4 border-b border-[color-mix(in_srgb,var(--theme-background)_18%,var(--theme-accent))] text-center overflow-hidden">
          <p className="text-[11px] sm:text-xs font-semibold tracking-widest uppercase font-mono animate-pulse">
            {mockCMS.promoText}
          </p>
        </div>
      )}

      {/* 2. MAIN EDITORIAL HERO (Zara / TheVolte Split layout style) */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-24 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* Left Side: Elegant typography */}
        <div className="md:col-span-6 flex flex-col items-start text-left space-y-6 sm:space-y-8">
          {/* Subtle logo/sub-brand tag */}
          <span className="theme-muted-strong text-xs font-bold tracking-widest uppercase font-mono">
            EST. 2022 — KOLEKSI EKSKLUSIF
          </span>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[var(--theme-text)] font-bold leading-[1.1] tracking-tight">
            {mockCMS.heroTitle}
          </h1>

          <p className="theme-muted-strong text-sm sm:text-base md:text-lg leading-relaxed max-w-xl font-sans">
            {mockCMS.heroSubtitle}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/catalog"
              className="theme-primary-action px-8 py-4 text-xs sm:text-sm font-semibold tracking-widest uppercase transition-all duration-300 shadow-xs hover:shadow-md text-center cursor-pointer"
            >
              Jelajahi Katalog
            </Link>

            <a
              href={`https://wa.me/${mockCMS.studioPhone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="theme-outline-action border px-8 py-4 text-xs sm:text-sm font-semibold tracking-widest uppercase transition-all duration-300 text-center flex items-center justify-center gap-2"
            >
              Hubungi Studio
            </a>
          </div>
        </div>

        {/* Right Side: Large Fashion Portrait */}
        <div className="md:col-span-6 relative w-full">
          <div className="theme-border relative aspect-[4/5] w-full overflow-hidden shadow-lg border">
            {/* Background design elements */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000]/30 via-transparent to-transparent z-10 pointer-events-none" />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mockCMS.heroImageUrl}
              alt="Editorial Kebaya Fashion Farsha Studio"
              className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-[2000ms]"
              loading="eager"
            />

            {/* Corner Badge detail */}
            <div className="theme-surface theme-border absolute bottom-5 right-5 z-20 bg-[color-mix(in_srgb,var(--theme-surface)_90%,transparent)] backdrop-blur-xs px-4.5 py-2.5 border shadow-xs">
              <span className="theme-muted block text-[9px] uppercase tracking-widest font-mono">
                Lokasi Studio
              </span>
              <span className="text-[11px] font-bold text-[var(--theme-text)]">
                Jakarta Barat, Indonesia
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
