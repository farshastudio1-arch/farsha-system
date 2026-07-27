import type { Metadata } from 'next';
import { Lora, Manrope } from 'next/font/google';
import ThemeProvider from '@/components/ThemeProvider';
import BackToTop from '@/components/BackToTop';
import { getSiteSettings } from '@/lib/farsha-db';
import './globals.css';

const lora = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
  display: 'swap',
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Farsha Studio — Sewa Kebaya dan Dress Makassar',
  description:
    'Tempat sewa kebaya dan dress di Makassar yang bisa datang langsung tanpa appointment. Koleksi lengkap dan selalu update, cocok untuk semua momen spesialmu.',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteSettings = await getSiteSettings();

  return (
    <html lang="id" className={`${lora.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--theme-background)] text-[var(--theme-text)] font-sans">
        <ThemeProvider initialSettings={siteSettings} />
        {children}
        <BackToTop />
        <script src="/farsha-catalog-fallback.js" defer />
      </body>
    </html>
  );
}
