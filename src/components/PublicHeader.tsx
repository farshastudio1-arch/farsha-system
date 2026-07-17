import Link from 'next/link';
import PublicHeaderSearchButton from './PublicHeaderSearchButton';

interface PublicHeaderProps {
  variant?: 'default' | 'catalog';
  showSearchButton?: boolean;
  centerLogoOnMobile?: boolean;
  logoUrl?: string;
}

export default function PublicHeader({
  variant = 'default',
  showSearchButton = true,
  centerLogoOnMobile = false,
  logoUrl,
}: PublicHeaderProps) {
  const isCatalog = variant === 'catalog';
  const shouldShowSearchButton = isCatalog && showSearchButton;
  const containerAlignmentClass = isCatalog && !centerLogoOnMobile
    ? 'justify-between'
    : centerLogoOnMobile
      ? 'justify-center md:justify-between'
      : 'justify-center';
  const logoAlignmentClass = isCatalog && !centerLogoOnMobile
    ? 'items-center text-left'
    : centerLogoOnMobile
      ? 'items-center text-center md:items-center md:text-left'
      : 'items-center text-center';

  const logoSrc = logoUrl || '/logo-mark.png';

  return (
    <header className="theme-surface theme-border sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] backdrop-blur-md transition-all duration-300">
      <div className={`relative mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8 ${containerAlignmentClass}`}>
        <Link
          href="/"
          className={`flex items-center gap-3 ${logoAlignmentClass}`}
          aria-label="Farsha Studio beranda"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt="Farsha Studio Logo"
            className="h-9 w-9 object-contain transition-transform duration-300 hover:scale-105 hover:rotate-6"
          />
          <div className="flex flex-col items-start text-left">
            <span className="font-serif text-lg font-bold uppercase tracking-widest text-[var(--theme-text)] sm:text-xl leading-none">
              FARSHA
            </span>
            <span className="theme-muted text-[9px] tracking-[0.25em] font-mono uppercase pl-[2px] font-bold mt-0.5 leading-none">
              STUDIO
            </span>
          </div>
        </Link>

        {shouldShowSearchButton && (
          <PublicHeaderSearchButton />
        )}
      </div>
    </header>
  );
}
