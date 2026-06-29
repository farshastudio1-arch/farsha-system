import type { Metadata } from 'next';
import { Lora, Manrope } from 'next/font/google';
import ThemeProvider from '@/components/ThemeProvider';
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
  title: 'Farsha Studio — Etalase Kebaya Premium',
  description:
    'Koleksi kebaya modern dan klasik terlengkap di Farsha Studio. Temukan kebaya impianmu untuk momen spesial.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${lora.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--theme-background)] text-[var(--theme-text)] font-sans">
        <ThemeProvider />
        {children}
        <script src="/farsha-catalog-fallback.js" defer />
      </body>
    </html>
  );
}
