import Link from 'next/link';

import { mockCMS } from '@/data/mockData';

export default function PublicFooter() {
  return (
    <footer
      id="contact-section"
      className="theme-inverse border-t border-[var(--theme-accent)] py-8 font-sans"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 border-b border-[color-mix(in_srgb,var(--theme-background)_18%,var(--theme-accent))] pb-8 md:grid-cols-12 md:items-start">
          <div className="space-y-3 md:col-span-5">
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-widest text-[var(--theme-background)] uppercase">
                FARSHA
              </span>
              <span className="theme-inverse-muted text-[10px] tracking-[0.25em] font-mono uppercase -mt-1 pl-[2px] font-bold">
                STUDIO
              </span>
            </div>
            <p className="theme-inverse-muted max-w-sm text-xs leading-relaxed sm:text-sm">
              Studio sewa kebaya dan dress premium untuk wisuda, lamaran, kondangan, dan
              bridesmaid.
            </p>
          </div>

          <div className="space-y-3 md:col-span-4">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--theme-background)]">
              Informasi Studio
            </h4>
            <ul className="theme-inverse-muted space-y-2 text-xs sm:text-sm">
              <li>Paccerakkang, Makassar</li>
              <li>{mockCMS.studioPhone}</li>
            </ul>
          </div>

          <div className="space-y-3 md:col-span-3">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--theme-background)]">
              Tautan
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

        <div className="theme-inverse-muted flex flex-col items-center justify-between gap-3 pt-6 font-mono text-[10px] uppercase tracking-wider sm:flex-row sm:text-xs">
          <p>© {new Date().getFullYear()} Farsha Studio. All rights reserved.</p>
          <p>Paccerakkang, Makassar</p>
        </div>
      </div>
    </footer>
  );
}
