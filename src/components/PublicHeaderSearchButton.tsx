'use client';

import { Search } from 'lucide-react';

export default function PublicHeaderSearchButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('farsha-catalog-search-request'))}
      className="theme-primary-action flex h-11 w-11 items-center justify-center transition-all duration-300 shadow-xs"
      aria-label="Cari koleksi"
    >
      <Search className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={1.9} />
    </button>
  );
}
