import Link from 'next/link';
import PublicHeaderSearchButton from './PublicHeaderSearchButton';

interface PublicHeaderProps {
  variant?: 'default' | 'catalog';
}

export default function PublicHeader({ variant = 'default' }: PublicHeaderProps) {
  const isCatalog = variant === 'catalog';

  return (
    <header className="theme-surface theme-border sticky top-0 z-40 border-b bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] backdrop-blur-md transition-all duration-300">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex flex-col items-center text-center" aria-label="Farsha Studio beranda">
          <span className="font-serif text-lg font-bold uppercase tracking-widest text-[var(--theme-text)] sm:text-xl">
            FARSHA
          </span>
          <span className="theme-muted text-[9px] tracking-[0.25em] font-mono uppercase -mt-1 pl-[2px] font-bold">
            STUDIO
          </span>
        </Link>

        {isCatalog && (
          <div className="absolute right-4 sm:right-6 lg:right-8">
            <PublicHeaderSearchButton />
          </div>
        )}
      </div>
    </header>
  );
}
