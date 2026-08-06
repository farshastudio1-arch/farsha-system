import Link from 'next/link';

import PublicHeader from '@/components/PublicHeader';
import { getCmsContent, getSiteSettings } from '@/lib/farsha-db';

export default async function ConsignmentLandingPage() {
  const [cmsContent, siteSettings] = await Promise.all([getCmsContent(), getSiteSettings()]);
  const whatsapp = siteSettings.whatsappNumber.replace(/[^0-9]/g, '');
  const whatsappHref = `https://wa.me/${whatsapp}?text=Halo%20saya%20ingin%20tanya%20program%20konsinyasi%20Farsha%20Studio.`;

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <PublicHeader showSearchButton={false} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="border border-neutral-200 bg-neutral-50 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500">
              Konsinyasi Farsha Studio
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">{cmsContent.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-700">
              Titip kebaya kamu untuk disewakan ulang, atau tawarkan untuk buyout lewat WhatsApp.
              Dashboard consignor menunjukkan status item dan earnings langsung dari POS, bukan input manual.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={whatsappHref} className="border border-neutral-900 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white">
                WhatsApp Studio
              </a>
              <Link href="/login" className="border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900">
                Masuk consignor
              </Link>
            </div>
          </section>
          <section className="border border-neutral-200 p-6 sm:p-8">
            <h2 className="text-lg font-semibold">Cara kerjanya</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-neutral-700">
              <li>1. Studio inspeksi item lewat WhatsApp.</li>
              <li>2. Item consignment dilisting secara manual oleh admin.</li>
              <li>3. Earnings muncul hanya setelah rental POS ditutup.</li>
              <li>4. Buyout tetap offline dan tidak memakai dashboard.</li>
            </ul>
          </section>
        </div>
      </main>
      <footer className="border-t border-neutral-200 px-4 py-6 text-sm text-neutral-600">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>Consignment by Farsha Studio</span>
          <div className="flex gap-4">
            <a href={whatsappHref} className="underline">
              WhatsApp
            </a>
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
