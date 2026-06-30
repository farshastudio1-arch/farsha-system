import Link from 'next/link';

import { mockCMS } from '@/data/mockData';

export default function PublicFooter() {
  return (
    <footer
      id="contact-section"
      className="theme-inverse pt-16 pb-12 border-t border-[var(--theme-accent)] font-sans"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 pb-12 border-b border-[color-mix(in_srgb,var(--theme-background)_18%,var(--theme-accent))]">
          <div className="md:col-span-5 space-y-4">
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-widest text-[var(--theme-background)] uppercase">
                FARSHA
              </span>
              <span className="theme-inverse-muted text-[10px] tracking-[0.25em] font-mono uppercase -mt-1 pl-[2px] font-bold">
                STUDIO
              </span>
            </div>
            <p className="theme-inverse-muted text-xs sm:text-sm leading-relaxed max-w-sm">
              Penyewaan kebaya premium bernuansa modern-klasik untuk hari bahagia Anda.
              Menghadirkan fitting sempurna, detail payet eksklusif, dan layanan profesional.
            </p>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--theme-background)] font-mono">
              Informasi Studio
            </h4>
            <ul className="theme-inverse-muted space-y-2.5 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5">
                <svg
                  className="w-4 h-4 text-[var(--theme-primary)] shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>{mockCMS.studioAddress}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <svg
                  className="w-4 h-4 text-[var(--theme-primary)] shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <span>{mockCMS.studioPhone}</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--theme-background)] font-mono">
              Tautan Pintas
            </h4>
            <ul className="theme-inverse-muted space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/catalog"
                  className="hover:text-[var(--theme-background)] transition-colors"
                >
                  Katalog Kebaya
                </Link>
              </li>
              <li>
                <Link
                  href="/#about-section"
                  className="hover:text-[var(--theme-background)] transition-colors"
                >
                  Tentang Kami
                </Link>
              </li>
              <li>
                <a
                  href={`https://wa.me/${mockCMS.studioPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--theme-background)] transition-colors"
                >
                  Tanya Ketersediaan
                </a>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="hover:text-[var(--theme-background)] transition-colors"
                >
                  Kebijakan Privasi / Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[var(--theme-background)] transition-colors">
                  Syarat & Ketentuan / Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="theme-inverse-muted pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] sm:text-xs font-mono uppercase tracking-wider">
          <p>© {new Date().getFullYear()} Farsha Studio. All rights reserved.</p>
          <p>Monochrome Editorial Rental Studio</p>
        </div>
      </div>
    </footer>
  );
}
