import Link from 'next/link';

export default function PublicHeader() {
  return (
    <header className="theme-surface theme-border sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex flex-col" aria-label="Farsha Studio beranda">
          <span className="font-serif text-xl sm:text-2xl font-bold tracking-widest text-[var(--theme-text)] uppercase">
            FARSHA
          </span>
          <span className="theme-muted text-[9px] tracking-[0.25em] font-mono uppercase -mt-1 pl-[2px] font-bold">
            STUDIO
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-8 font-sans text-xs font-semibold tracking-widest uppercase">
          <Link
            href="/catalog"
            className="theme-muted-strong hover:text-[var(--theme-text)] transition-colors"
          >
            KOLEKSI KEBAYA
          </Link>
          <Link
            href="/#about-section"
            className="theme-muted-strong hover:text-[var(--theme-text)] transition-colors"
          >
            TENTANG KAMI
          </Link>
          <Link
            href="/#contact-section"
            className="theme-muted-strong hover:text-[var(--theme-text)] transition-colors"
          >
            KONTAK STUDIO
          </Link>
        </nav>

        <Link
          href="/catalog"
          className="theme-primary-action text-[10px] sm:text-xs font-sans font-semibold tracking-widest uppercase px-4.5 py-3 transition-all duration-300 flex items-center gap-1.5 shadow-xs"
        >
          LIHAT KOLEKSI
        </Link>
      </div>
    </header>
  );
}
