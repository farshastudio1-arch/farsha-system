import type { Metadata } from 'next';
import Link from 'next/link';

import PrivacyPolicyTabs from '@/components/PrivacyPolicyTabs';
import { mockCMS } from '@/data/mockData';

export const metadata: Metadata = {
  title: 'Privacy Policy | Farsha Studio',
  description:
    'Bilingual privacy information for Farsha Studio covering catalog browsing, WhatsApp contact, and admin Google login.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#FFFFFF] text-[#000000] font-sans">
      <header className="border-b border-[#E5E5E5] bg-[#FFFFFF]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex flex-col">
            <span className="font-serif text-xl font-bold uppercase tracking-widest text-[#000000] sm:text-2xl">
              FARSHA
            </span>
            <span className="-mt-1 pl-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-[#757575]">
              STUDIO
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-[#E5E5E5] px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#4A4A4A] transition-colors hover:border-[#000000] hover:text-[#000000] sm:text-xs"
          >
            Kembali
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <PrivacyPolicyTabs />
      </div>

      <footer className="border-t border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-xs text-[#757575] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Farsha Studio. All rights reserved.</p>
          <p>{mockCMS.studioPhone}</p>
        </div>
      </footer>
    </main>
  );
}
