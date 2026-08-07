import Link from 'next/link';
import {
  ArrowRight,
  LayoutDashboard,
  MessageCircle,
  PackageCheck,
  ScanSearch,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import PublicHeader from '@/components/PublicHeader';
import { getCmsContent, getSiteSettings } from '@/lib/farsha-db';

const steps = [
  {
    icon: MessageCircle,
    label: 'Chat kami di WA',
    desc: 'Chat dan bilang mau titip sewa. Kami kirim form untuk kamu isi — atau langsung datang ke store dan bilang ke admin, "Kak, mau titip sewa."',
  },
  {
    icon: ScanSearch,
    label: 'Review',
    desc: 'Tim kami mereview detail bajumu. Jika disetujui, kami kirimkan kontrak dan T&C lengkap untuk kamu pelajari.',
  },
  {
    icon: PackageCheck,
    label: 'Kirim bajumu',
    desc: 'Setelah kamu setuju dengan kontrak, kirim bajumu ke kami untuk diproses dan disiapkan agar siap disewakan.',
  },
  {
    icon: Wallet,
    label: 'Terima passive income',
    desc: 'Pantau bajumu lewat dashboard. Kami buatkan akun khusus partner untuk login dan cek status serta penghasilan setiap baju tersewa.',
  },
];

const trustPoints = [
  {
    icon: ShieldCheck,
    title: 'Kontrak & T&C jelas',
    desc: 'Setiap titipan berjalan di atas perjanjian tertulis yang transparan sebelum bajumu diproses.',
  },
  {
    icon: LayoutDashboard,
    title: 'Dashboard partner',
    desc: 'Status baju dan penghasilan tampil langsung dari sistem POS kami, bukan catatan manual.',
  },
  {
    icon: TrendingUp,
    title: 'Aset yang bekerja',
    desc: 'Baju yang menganggur di lemari berubah jadi sumber penghasilan tambahan.',
  },
];

export default async function ConsignmentLandingPage() {
  const [cmsContent, siteSettings] = await Promise.all([getCmsContent(), getSiteSettings()]);
  const whatsapp = siteSettings.whatsappNumber.replace(/[^0-9]/g, '');
  const whatsappHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    'Halo Admin Farsha, saya mau titip sewa baju. Boleh info caranya?',
  )}`;

  return (
    <div className="theme-surface flex min-h-screen flex-col font-sans antialiased">
      <PublicHeader showSearchButton={false} />

      <main className="flex-grow">
        {/* Hero */}
        <section className="landing-hero-satin relative overflow-hidden">
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="landing-hero-grid">
              <div className="theme-border border-b pb-8 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
                <span className="theme-muted-strong font-mono text-xs font-bold uppercase tracking-widest">
                  Farsha Consign · Titip Sewa
                </span>
                <h1 className="mt-3 max-w-xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--theme-text)] sm:text-5xl">
                  Punya baju cantik tapi nganggur di lemari?
                </h1>
                <p className="theme-muted-strong mt-5 max-w-md text-base leading-relaxed">
                  Yuk titip sewa aja di kami. Biarkan koleksimu bekerja dan menghasilkan{' '}
                  <span className="font-serif italic text-[var(--theme-text)]">passive income</span> setiap
                  kali disewa.
                </p>
                <div className="mt-7 flex flex-col gap-2.5 sm:max-w-[420px]">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 bg-[#25D366] px-6 py-4 text-xs font-semibold uppercase tracking-widest text-white shadow-xs transition-all hover:bg-[#20BA5A]"
                  >
                    <svg className="h-4.5 w-4.5 shrink-0 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.908-6.993-1.879-1.88-4.359-2.912-7-2.912-5.439 0-9.873 4.432-9.877 9.877-.001 1.769.479 3.498 1.39 5.031l-.963 3.518 3.6-.944z" />
                    </svg>
                    Titip Sewa via WhatsApp
                  </a>
                  <Link
                    href="/login"
                    className="theme-border flex items-center justify-center gap-3 border bg-[var(--theme-surface)] px-6 py-4 text-xs font-semibold uppercase tracking-widest text-[var(--theme-text)] shadow-xs transition-all hover:bg-[var(--theme-soft-surface)]"
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    Masuk Dashboard Partner
                  </Link>
                </div>
              </div>

              {/* Value card */}
              <div>
                <div className="landing-rental-panel landing-rental-panel-light group relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logo-mark.png"
                    alt=""
                    aria-hidden="true"
                    className="landing-rental-panel-watermark"
                    style={{ opacity: 0.022 }}
                  />
                  <div className="landing-rental-panel-accent" />
                  <div className="landing-rental-panel-inner">
                    <span className="theme-muted font-mono text-[10px] font-bold uppercase tracking-[0.35em]">
                      Kenapa titip di Farsha
                    </span>
                    <div className="mt-6 flex flex-col divide-y divide-[var(--theme-border)]">
                      {trustPoints.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                          <span className="landing-rental-panel-icon-wrap shrink-0">
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <div>
                            <p className="font-display text-sm font-semibold text-[var(--theme-text)]">
                              {title}
                            </p>
                            <p className="theme-muted mt-1 text-[13px] leading-relaxed">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quote strip */}
        <section className="landing-reminder-strip border-y border-neutral-900/10 py-6 sm:py-7">
          <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-center gap-1.5 px-4 sm:px-6 lg:px-8">
            <span className="landing-reminder-label font-mono text-[9px] font-bold uppercase tracking-widest text-neutral-500">
              <span aria-hidden="true">✨</span>
              <span>Farsha Consign</span>
              <span aria-hidden="true">✨</span>
            </span>
            <p className="landing-reminder-quote text-center font-serif text-base italic leading-relaxed text-neutral-950 sm:text-lg">
              &quot;Let your wardrobe earn its keep.&quot;
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="landing-rental-section theme-surface theme-border border-t py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="landing-rental-intro">
              <span className="landing-rental-eyebrow font-mono text-[10px] font-bold uppercase tracking-[0.45em]">
                cara request titip sewa
              </span>
              <h2 className="landing-rental-title font-display font-semibold leading-[1.02] text-[var(--theme-text)]">
                Empat langkah,
                <br />
                mulai menghasilkan
              </h2>
              <p className="landing-rental-subtitle theme-muted-strong leading-relaxed">
                Prosesnya sederhana dan dipandu tim kami dari chat pertama sampai bajumu siap disewakan.
              </p>
            </div>

            <ol className="consign-step-grid overflow-hidden">
              {steps.map(({ icon: Icon, label, desc }, index) => (
                <li
                  key={label}
                  className="theme-surface group flex flex-col p-6 transition-colors sm:p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-3xl font-bold leading-none text-[var(--theme-border)] transition-colors group-hover:text-[var(--theme-text)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="landing-rental-panel-icon-wrap shrink-0">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-6 font-display text-lg font-semibold text-[var(--theme-text)]">
                    {label}
                  </h3>
                  <p className="theme-muted mt-2 text-sm leading-relaxed">{desc}</p>
                </li>
              ))}
            </ol>

            <div className="landing-rental-panel-note mt-8 max-w-3xl">
              <span className="landing-rental-note-icon" aria-hidden="true">
                !
              </span>
              <p className="landing-rental-note-text">
                Besaran penghasilan mengikuti frekuensi baju tersewa — bukan jaminan tetap per bulan.
                Detail bagi hasil, perawatan, dan durasi titipan diatur lengkap di kontrak dan{' '}
                <Link href="/terms" className="underline underline-offset-2">
                  Syarat &amp; Ketentuan
                </Link>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="theme-surface theme-border border-t py-14 sm:py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 text-center sm:px-6">
            <span className="theme-muted font-mono text-[10px] font-semibold uppercase tracking-widest">
              Siap mulai?
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold text-[var(--theme-text)] sm:text-4xl">
              Ubah lemari jadi sumber penghasilan
            </h2>
            <p className="theme-muted-strong mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
              Chat tim kami di WhatsApp untuk mulai titip sewa, atau masuk ke dashboard partner jika kamu
              sudah terdaftar.
            </p>
            <div className="mt-7 flex w-full flex-col gap-2.5 sm:max-w-[420px]">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-[#25D366] px-6 py-4 text-xs font-semibold uppercase tracking-widest text-white shadow-xs transition-all hover:bg-[#20BA5A]"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                Titip Sewa Sekarang
              </a>
              <Link
                href="/login"
                className="theme-primary-action flex items-center justify-center gap-3 px-6 py-4 text-xs font-semibold uppercase tracking-widest transition-all"
              >
                Masuk Dashboard Partner
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="theme-border theme-surface border-t px-4 py-6 text-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <span className="theme-muted font-mono text-[10px] uppercase tracking-widest">
            Farsha Consign · {siteSettings.locationLabel}
          </span>
          <div className="flex gap-5">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="theme-muted-strong underline underline-offset-2"
            >
              WhatsApp
            </a>
            <Link href="/login" className="theme-muted-strong underline underline-offset-2">
              Login
            </Link>
            <Link href="/terms" className="theme-muted-strong underline underline-offset-2">
              S&amp;K
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
