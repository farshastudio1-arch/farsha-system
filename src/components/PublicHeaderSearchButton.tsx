'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export default function PublicHeaderSearchButton() {
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    const handleActiveFiltersChange = (event: Event) => {
      const count = event instanceof CustomEvent ? Number(event.detail?.count) : 0;
      setActiveFilterCount(Number.isFinite(count) ? count : 0);
    };

    window.addEventListener('farsha-catalog-active-filters-change', handleActiveFiltersChange);
    return () => {
      window.removeEventListener('farsha-catalog-active-filters-change', handleActiveFiltersChange);
    };
  }, []);

  const handleClearFilters = () => {
    window.dispatchEvent(new CustomEvent('farsha-catalog-clear-filters-request'));
  };

  return (
    <div className="flex items-center gap-2">
      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={handleClearFilters}
          className="theme-outline-action inline-flex h-11 items-center justify-center gap-1.5 border px-3 text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 lg:hidden"
          aria-label="Hapus semua filter aktif"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2} />
          <span>Hapus Filter</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('farsha-catalog-search-request'))}
        className="theme-primary-action flex h-11 w-11 items-center justify-center transition-all duration-300 shadow-xs"
        aria-label="Cari koleksi"
      >
        <Search className="h-4.5 w-4.5" aria-hidden="true" strokeWidth={1.9} />
      </button>
    </div>
  );
}
