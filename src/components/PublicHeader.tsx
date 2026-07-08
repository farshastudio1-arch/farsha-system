import Link from 'next/link';
import PublicHeaderSearchButton from './PublicHeaderSearchButton';

interface PublicHeaderProps {
  variant?: 'default' | 'catalog';
  showSearchButton?: boolean;
  centerLogoOnMobile?: boolean;
}

export default function PublicHeader({
  variant = 'default',
  showSearchButton = true,
  centerLogoOnMobile = false,
}: PublicHeaderProps) {
  const isCatalog = variant === 'catalog';
  const shouldShowSearchButton = isCatalog && showSearchButton;
  const containerAlignmentClass = isCatalog && !centerLogoOnMobile
    ? 'justify-between'
    : centerLogoOnMobile
      ? 'justify-center md:justify-between'
      : 'justify-center';
  const logoAlignmentClass = isCatalog && !centerLogoOnMobile
    ? 'items-start text-left'
    : centerLogoOnMobile
      ? 'items-center text-center md:items-start md:text-left'
      : 'items-center text-center';

  return (
    <header className="theme-surface theme-border sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] backdrop-blur-md transition-all duration-300">
      <div className={`relative mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8 ${containerAlignmentClass}`}>
        <Link
          href="/"
          className={`flex flex-col ${logoAlignmentClass}`}
          aria-label="Farsha Studio beranda"
        >
          <span className="font-serif text-lg font-bold uppercase tracking-widest text-[var(--theme-text)] sm:text-xl">
            FARSHA
          </span>
          <span className="theme-muted text-[9px] tracking-[0.25em] font-mono uppercase -mt-1 pl-[2px] font-bold">
            STUDIO
          </span>
        </Link>

        {shouldShowSearchButton && (
          <PublicHeaderSearchButton />
        )}
      </div>
    </header>
  );
}
