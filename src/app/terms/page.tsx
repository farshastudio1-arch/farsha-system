import type { Metadata } from 'next';
import Link from 'next/link';

import TermsTabs from '@/components/TermsTabs';
import { mockCMS } from '@/data/mockData';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Farsha Studio',
  description:
    'Bilingual terms and conditions for Farsha Studio covering bookings, rentals, and payments.',
};

export default function TermsPage() {
  return (
    <main className="theme-surface min-h-screen font-sans">
      <header className="theme-surface theme-border border-b">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex flex-col">
            <span className="font-serif text-xl font-bold uppercase tracking-widest text-[var(--theme-text)] sm:text-2xl">
              FARSHA
            </span>
            <span className="theme-muted -mt-1 pl-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.25em]">
              STUDIO
            </span>
          </Link>

          <Link
            href="/"
            className="theme-outline-action border px-4 py-3 text-[10px] font-semibold uppercase tracking-widest transition-colors sm:text-xs"
          >
            Kembali
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <TermsTabs />
      </div>

      <footer className="theme-soft-surface theme-border border-t">
        <div className="theme-muted mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Farsha Studio. All rights reserved.</p>
          <p>{mockCMS.studioPhone}</p>
        </div>
      </footer>
    </main>
  );
}
