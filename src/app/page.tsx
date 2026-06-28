'use client';

import React from 'react';
import Hero from '@/components/Hero';
import Catalog from '@/components/Catalog';
import { mockCMS } from '@/data/mockData';

export default function Home() {
  const scrollToCatalog = () => {
    const catalogEl = document.getElementById('catalog-section');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFFFFF] text-[#000000] font-sans antialiased">
      {/* 1. STICKY BRAND HEADER */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/80 backdrop-blur-md border-b border-[#E5E5E5] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-widest text-[#000000] uppercase">
              FARSHA
            </span>
            <span className="text-[9px] tracking-[0.25em] font-mono text-[#757575] uppercase -mt-1 pl-[2px] font-bold">
              STUDIO
            </span>
          </div>

          <nav className="hidden sm:flex items-center gap-8 text-xs font-semibold tracking-widest uppercase">
            <button 
              onClick={scrollToCatalog}
              className="text-[#4A4A4A] hover:text-[#000000] transition-colors cursor-pointer"
            >
              Koleksi Kebaya
            </button>
            <a 
              href="#about-section" 
              className="text-[#4A4A4A] hover:text-[#000000] transition-colors"
            >
              Tentang Kami
            </a>
            <a 
              href="#contact-section" 
              className="text-[#4A4A4A] hover:text-[#000000] transition-colors"
            >
              Kontak Studio
            </a>
          </nav>

          <div>
            <a
              href={`https://wa.me/${mockCMS.studioPhone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#000000] hover:bg-[#333333] text-[#FFFFFF] hover:text-[#000000] text-[10px] sm:text-xs font-semibold tracking-widest uppercase px-4.5 py-3 rounded-lg transition-all duration-300 flex items-center gap-1.5 shadow-xs"
            >
              Hubungi Admin
            </a>
          </div>
        </div>
      </header>

      {/* 2. DYNAMIC HERO SECTION */}
      <Hero />

      {/* 3. DYNAMIC CATALOG SECTION (Filters, Switcher, Cards) */}
      <main className="flex-grow">
        <Catalog />
      </main>

      {/* 4. ABOUT SECTION */}
      <section id="about-section" className="w-full bg-[#FAFAFA] py-16 sm:py-24 border-t border-[#E5E5E5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 sm:space-y-8">
          <span className="text-xs font-bold tracking-widest text-[#333333] uppercase font-mono">
            KENALI KAMI LEBIH DEKAT
          </span>
          
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#000000] tracking-tight">
            {mockCMS.aboutTitle}
          </h2>
          
          <p className="text-[#4A4A4A] text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-sans">
            {mockCMS.aboutText}
          </p>

          <div className="w-12 h-[1px] bg-[#333333] mx-auto pt-2" />
        </div>
      </section>

      {/* 5. FOOTER & CONTACT SECTION */}
      <footer id="contact-section" className="bg-[#000000] text-[#FFFFFF] pt-16 pb-12 border-t border-[#333333] font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 pb-12 border-b border-[#333333]">
            
            {/* Column 1: Brand details */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold tracking-widest text-white uppercase">
                  FARSHA
                </span>
                <span className="text-[10px] tracking-[0.25em] font-mono text-[#757575] uppercase -mt-1 pl-[2px] font-bold">
                  STUDIO
                </span>
              </div>
              <p className="text-[#757575] text-xs sm:text-sm leading-relaxed max-w-sm">
                Penyewaan kebaya premium bernuansa modern-klasik untuk hari bahagia Anda. Menghadirkan fitting sempurna, detail payet eksklusif, dan layanan profesional.
              </p>
            </div>

            {/* Column 2: Studio Information */}
            <div className="md:col-span-4 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white font-mono">
                Informasi Studio
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-[#757575]">
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-[#333333] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{mockCMS.studioAddress}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-[#333333] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{mockCMS.studioPhone}</span>
                </li>
              </ul>
            </div>

            {/* Column 3: Navigation Links */}
            <div className="md:col-span-3 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-white font-mono">
                Tautan Pintas
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm text-[#757575]">
                <li>
                  <button 
                    onClick={scrollToCatalog}
                    className="hover:text-white transition-colors text-left"
                  >
                    Katalog Kebaya
                  </button>
                </li>
                <li>
                  <a href="#about-section" className="hover:text-white transition-colors">
                    Tentang Kami
                  </a>
                </li>
                <li>
                  <a 
                    href={`https://wa.me/${mockCMS.studioPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Tanya Ketersediaan
                  </a>
                </li>
                <li>
                  <a href="/privacy-policy" className="hover:text-white transition-colors">
                    Kebijakan Privasi / Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-white transition-colors">
                    Syarat & Ketentuan / Terms & Conditions
                  </a>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] sm:text-xs text-[#4A4A4A] font-mono uppercase tracking-wider">
            <p>© {new Date().getFullYear()} Farsha Studio. All rights reserved.</p>
            <p>Zara & TheVolte Inspired Aesthetic</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
