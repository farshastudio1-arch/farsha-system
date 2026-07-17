import Link from 'next/link';

import { CMSContent, SiteSettings } from '@/data/mockData';

interface PublicFooterProps {
  cmsContent: CMSContent;
  siteSettings: SiteSettings;
}

export default function PublicFooter({ cmsContent, siteSettings }: PublicFooterProps) {
  const whatsappNumber = siteSettings.whatsappNumber || cmsContent.studioPhone;
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');
  const whatsappHref = `https://wa.me/${cleanWhatsapp}`;
  const instagramHref = siteSettings.instagramUrl || 'https://instagram.com';
  const tiktokHref = siteSettings.tiktokUrl || 'https://tiktok.com';
  const mapsHref = siteSettings.mapsUrl || cmsContent.mapsCtaUrl || '#';

  const waMuaHref = `https://wa.me/${cleanWhatsapp}?text=Halo%20Admin%20Farsha%20Studio%2C%20saya%20tertarik%20tanya%20kerjasama%20MUA.`;
  const waPhotoHref = `https://wa.me/${cleanWhatsapp}?text=Halo%20Admin%20Farsha%20Studio%2C%20saya%20tertarik%20tanya%20kerjasama%20fotografer.`;

  return (
    <footer
      id="contact-section"
      className="theme-surface relative overflow-hidden border-t border-[var(--theme-border)] pt-16 pb-20 font-sans z-10"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
          {/* Brand Info */}
          <div className="space-y-4 lg:col-span-5">
            <Link href="/" className="flex items-center gap-3 w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={siteSettings.logoUrl || '/logo-mark.png'}
                alt="Farsha Studio Logo"
                className="h-10 w-10 object-contain transition-transform duration-300 hover:scale-105"
              />
              <div className="flex flex-col">
                <span className="font-serif text-xl font-bold tracking-widest text-[var(--theme-text)] uppercase leading-none">
                  FARSHA
                </span>
                <span className="theme-muted text-[10px] tracking-[0.25em] font-mono uppercase pl-[2px] font-bold mt-0.5 leading-none">
                  STUDIO
                </span>
              </div>
            </Link>
            <p className="theme-muted max-w-sm text-xs leading-relaxed sm:text-sm">
              {siteSettings.tagline || 'Premium kebaya rental studio for your special moments.'}
            </p>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-7 grid grid-cols-3 gap-8">
            {/* Catalog */}
            <div className="space-y-3.5">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
                Katalog
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                <li>
                  <Link href="/catalog?view=all" className="text-[var(--theme-text)] hover:text-neutral-500 transition-colors font-medium">
                    Semua Koleksi
                  </Link>
                </li>
                <li>
                  <a
                    href={waMuaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-[var(--theme-text)] hover:text-neutral-500 transition-colors font-medium"
                  >
                    Kerjasama MUA
                    <span className="text-[10px] text-neutral-400 group-hover:text-neutral-500 transition-colors">↗</span>
                  </a>
                </li>
                <li>
                  <a
                    href={waPhotoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-[var(--theme-text)] hover:text-neutral-500 transition-colors font-medium"
                  >
                    Kerjasama Fotografer
                    <span className="text-[10px] text-neutral-400 group-hover:text-neutral-500 transition-colors">↗</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Studio Info */}
            <div className="space-y-3.5">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
                Studio
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                <li>
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-[var(--theme-text)] hover:text-neutral-500 transition-colors font-medium"
                  >
                    Lokasi Studio
                    <span className="text-[10px] text-neutral-400 group-hover:text-neutral-500 transition-colors">↗</span>
                  </a>
                </li>
                <li>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-[var(--theme-text)] hover:text-neutral-500 transition-colors font-medium"
                  >
                    Hubungi Kami
                    <span className="text-[10px] text-neutral-400 group-hover:text-neutral-500 transition-colors">↗</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Socials */}
            <div className="space-y-3.5">
              <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)]">
                Media Sosial
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm">
                <li>
                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-[var(--theme-text)] hover:text-neutral-500 transition-colors font-medium"
                  >
                    Instagram
                    <span className="text-[10px] text-neutral-400 group-hover:text-neutral-500 transition-colors">↗</span>
                  </a>
                </li>
                <li>
                  <a
                    href={tiktokHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1 text-[var(--theme-text)] hover:text-neutral-500 transition-colors font-medium"
                  >
                    TikTok
                    <span className="text-[10px] text-neutral-400 group-hover:text-neutral-500 transition-colors">↗</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--theme-border)] mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[color-mix(in_srgb,var(--theme-text)_60%,transparent)] font-medium">
          {/* Bottom Links */}
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-[var(--theme-text)] transition-colors">
              Syarat & Ketentuan
            </Link>
            <Link href="/privacy-policy" className="hover:text-[var(--theme-text)] transition-colors">
              Kebijakan Privasi
            </Link>
          </div>
          
          {/* Copyright */}
          <div>
            © {new Date().getFullYear()} {siteSettings.studioName || 'Farsha Studio'}. All rights reserved.
          </div>
        </div>
      </div>

      {/* Decorative Huge Watermark Background */}
      <div 
        className="select-none pointer-events-none absolute bottom-[-5%] sm:bottom-[-10%] md:bottom-[-20%] left-1/2 -translate-x-1/2 font-serif text-[18vw] font-bold text-[var(--theme-text)] leading-none tracking-tight whitespace-nowrap z-0"
        style={{ opacity: 0.025 }}
      >
        farsha
      </div>
    </footer>
  );
}
