'use client';

import React from 'react';
import { mockCMS } from '@/data/mockData';

export default function Hero() {
  const scrollToCatalog = () => {
    const catalogEl = document.getElementById('catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full flex flex-col bg-[#FFFFFF]">
      {/* 1. TOP PROMO BANNER (Marquee/Notice bar style) */}
      {mockCMS.promoText && (
        <div className="w-full bg-[#000000] text-[#FFFFFF] py-3 px-4 border-b border-[#333333] text-center overflow-hidden">
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
          <span className="text-xs font-bold tracking-widest text-[#333333] uppercase font-mono">
            EST. 2022 — KOLEKSI EKSKLUSIF
          </span>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-[#000000] font-bold leading-[1.1] tracking-tight">
            {mockCMS.heroTitle}
          </h1>

          <p className="text-[#4A4A4A] text-sm sm:text-base md:text-lg leading-relaxed max-w-xl font-sans">
            {mockCMS.heroSubtitle}
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={scrollToCatalog}
              className="bg-[#000000] hover:bg-[#333333] text-[#FFFFFF] hover:text-[#000000] px-8 py-4 rounded-xl text-xs sm:text-sm font-semibold tracking-widest uppercase transition-all duration-300 shadow-xs hover:shadow-md text-center cursor-pointer"
            >
              Jelajahi Katalog
            </button>
            
            <a
              href={`https://wa.me/${mockCMS.studioPhone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#E5E5E5] hover:border-[#000000] text-[#000000] px-8 py-4 rounded-xl text-xs sm:text-sm font-semibold tracking-widest uppercase transition-all duration-300 hover:bg-[#E5E5E5] text-center flex items-center justify-center gap-2"
            >
              Hubungi Studio
            </a>
          </div>
        </div>

        {/* Right Side: Large Fashion Portrait */}
        <div className="md:col-span-6 relative w-full">
          <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden shadow-lg border border-[#E5E5E5]">
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
            <div className="absolute bottom-5 right-5 z-20 bg-[#FFFFFF]/90 backdrop-blur-xs px-4.5 py-2.5 rounded-lg border border-[#E5E5E5] shadow-xs">
              <span className="block text-[9px] uppercase tracking-widest text-[#757575] font-mono">Lokasi Studio</span>
              <span className="text-[11px] font-bold text-[#000000]">Jakarta Barat, Indonesia</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
