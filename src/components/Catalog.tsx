'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { KebayaItem, mockCMS } from '@/data/mockData';
import Filters, { FilterState } from './Filters';
import ProductCard from './ProductCard';
import ProductDetailModal from './ProductDetailModal';
import { useSavedCatalogItems } from '@/lib/catalog-storage';
import { useSavedSiteSettings } from '@/lib/site-settings';
import { readLocalStorageItem, writeLocalStorageItem } from '@/lib/browser-storage';

type MobileGridColumns = 1 | 2 | 3;
type DesktopGridColumns = 2 | 3 | 4;

const mobileGridStorageKey = 'farsha-mobile-grid-view-v1';

function isMobileGridColumns(value: number): value is MobileGridColumns {
  return value === 1 || value === 2 || value === 3;
}

function readSavedMobileGrid(): MobileGridColumns | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const savedValue = Number(readLocalStorageItem(mobileGridStorageKey));
  return isMobileGridColumns(savedValue) ? savedValue : null;
}

export default function Catalog() {
  const catalogItems = useSavedCatalogItems();
  const siteSettings = useSavedSiteSettings();

  // Device detection state
  const [isMobile, setIsMobile] = useState(true);

  const [layoutColumns, setLayoutColumns] = useState<MobileGridColumns | DesktopGridColumns>(
    siteSettings.defaultMobileGrid,
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<KebayaItem | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-farsha-hydrated', 'true');

    const grid = document.querySelector<HTMLElement>('[data-farsha-grid]');
    if (grid) {
      grid.removeAttribute('data-farsha-fallback-columns');
      grid.style.removeProperty('grid-template-columns');
      grid.style.removeProperty('max-width');
      grid.style.removeProperty('margin-left');
      grid.style.removeProperty('margin-right');
      grid.style.removeProperty('gap');
    }

    return () => {
      document.documentElement.removeAttribute('data-farsha-hydrated');
    };
  }, []);

  // Maximum price calculation from mock data
  const maxPriceLimit = useMemo(() => {
    return Math.max(...catalogItems.map((k) => k.rentalPrice), 400000);
  }, [catalogItems]);

  // Extracted unique colors from mock data
  const availableColors = useMemo(() => {
    const colors = catalogItems.map((k) => k.color);
    return Array.from(new Set(colors)).sort();
  }, [catalogItems]);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    colors: [],
    sizes: [],
    models: [],
    statuses: [],
    maxPrice: maxPriceLimit,
  });

  // Track responsive screen size changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024; // Tailwind lg breakpoint
      setIsMobile(mobile);

      if (mobile) {
        setLayoutColumns(readSavedMobileGrid() ?? siteSettings.defaultMobileGrid);
      } else {
        setLayoutColumns(siteSettings.defaultDesktopGrid);
      }
    };

    handleResize(); // trigger immediately on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [siteSettings.defaultDesktopGrid, siteSettings.defaultMobileGrid]);

  // Filter logic
  const filteredProducts = useMemo(() => {
    return catalogItems.filter((item) => {
      // 1. Search text filter (case-insensitive on name & code)
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesCode = item.code.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      // 2. Color filter
      if (filters.colors.length > 0 && !filters.colors.includes(item.color)) {
        return false;
      }

      // 3. Size filter
      if (filters.sizes.length > 0 && !filters.sizes.includes(item.size)) {
        return false;
      }

      // 4. Model filter
      if (filters.models.length > 0 && !filters.models.includes(item.model)) {
        return false;
      }

      // 5. Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) {
        return false;
      }

      // 6. Max Price filter
      if (item.rentalPrice > filters.maxPrice) {
        return false;
      }

      return true;
    });
  }, [catalogItems, filters]);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      colors: [],
      sizes: [],
      models: [],
      statuses: [],
      maxPrice: maxPriceLimit,
    });
  };

  // Switch column size handler
  const selectColumns = (cols: MobileGridColumns | DesktopGridColumns) => {
    setLayoutColumns(cols);
    if (isMobile && isMobileGridColumns(cols)) {
      writeLocalStorageItem(mobileGridStorageKey, String(cols));
    }
  };

  const totalActiveFilters =
    (filters.search ? 1 : 0) +
    filters.colors.length +
    filters.sizes.length +
    filters.models.length +
    filters.statuses.length +
    (filters.maxPrice < maxPriceLimit ? 1 : 0);

  const mobileViewOptions: MobileGridColumns[] = [1, 2, 3];
  const desktopViewOptions: DesktopGridColumns[] = [2, 3, 4];

  const renderGridIcon = (columns: MobileGridColumns | DesktopGridColumns) => (
    <span
      className={`grid h-4 w-4 gap-0.5 ${
        columns === 1
          ? 'grid-cols-1'
          : columns === 2
            ? 'grid-cols-2'
            : columns === 3
              ? 'grid-cols-3'
              : 'grid-cols-4'
      }`}
      aria-hidden="true"
    >
      {Array.from({ length: columns }).map((_, index) => (
        <span key={index} className="border border-current" />
      ))}
    </span>
  );

  const catalogGridClass =
    isMobile && layoutColumns === 3
      ? 'grid-cols-3 gap-1.5 sm:gap-2'
      : isMobile && layoutColumns === 2
        ? 'grid-cols-2 gap-3'
      : layoutColumns === 1
        ? 'grid-cols-1 max-w-md sm:max-w-xl mx-auto gap-5 sm:gap-6'
        : layoutColumns === 2
          ? 'grid-cols-2 gap-5 sm:gap-6'
          : layoutColumns === 3
            ? 'grid-cols-3 gap-5 sm:gap-6'
            : 'grid-cols-4 gap-5 sm:gap-6';

  return (
    <div
      id="catalog-section"
      data-farsha-catalog
      data-farsha-phone={mockCMS.studioPhone}
      className="theme-surface theme-border w-full py-16 sm:py-24 border-t"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* CATALOG CONTENT CONTAINER HEADER */}
        <div className="theme-border flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-10 pb-6 border-b">
          <div>
            <span className="theme-muted-strong text-xs font-bold tracking-widest uppercase font-mono">
              Galeri Etalase
            </span>
            <h2 className="font-serif text-[2rem] leading-none sm:text-4xl font-bold text-[var(--theme-text)] mt-1.5">
              Telusuri Koleksi Kebaya
            </h2>
          </div>

          <div className="flex lg:hidden items-center justify-between gap-3">
            <button
              type="button"
              data-farsha-filter-open
              onClick={() => setMobileFiltersOpen(true)}
              className="theme-outline-action inline-flex h-11 items-center justify-center gap-2 border px-4 text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
              <span>Filter</span>
              {totalActiveFilters > 0 && (
                <span className="theme-primary-action flex h-5 min-w-5 items-center justify-center px-1.5 text-[10px]">
                  {totalActiveFilters}
                </span>
              )}
            </button>

            <div className="theme-soft-surface theme-border flex border p-1">
              {mobileViewOptions.map((columns) => (
                <button
                  key={columns}
                  type="button"
                  data-farsha-grid-option={columns}
                  onClick={() => selectColumns(columns)}
                  className={`flex h-9 w-10 items-center justify-center text-xs font-semibold transition-all ${
                    layoutColumns === columns
                      ? 'theme-selected shadow-xs'
                      : 'theme-muted-strong hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text)]'
                  }`}
                  aria-label={`Tampilan ${columns} Kolom`}
                  aria-pressed={layoutColumns === columns}
                >
                  {renderGridIcon(columns)}
                </button>
              ))}
            </div>
          </div>

          {/* GRID VIEW SWITCHER */}
          <div className="hidden lg:flex items-center gap-4.5 self-start md:self-end">
            <span className="theme-muted text-xs uppercase tracking-wider font-mono font-semibold">
              Tampilan Grid
            </span>
            <div className="theme-soft-surface theme-border flex p-1 border">
              {/* Desktop column selection (2, 3, or 4) */}
              {desktopViewOptions.map((columns) => (
                <button
                  key={columns}
                  onClick={() => selectColumns(columns)}
                  className={`flex items-center justify-center w-10 h-9 text-xs font-bold transition-all ${
                    layoutColumns === columns
                      ? 'theme-selected shadow-xs'
                      : 'theme-muted-strong hover:bg-[var(--theme-surface)]'
                  }`}
                  aria-label={`Tampilan ${columns} Kolom`}
                  aria-pressed={layoutColumns === columns}
                >
                  {renderGridIcon(columns)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TWO-COLUMN GRID LAYOUT: FILTER (Left/Mobile) & CARDS (Right) */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Filters component (collapsible on mobile, fixed sidebar on desktop) */}
          <Filters
            filters={filters}
            onChange={setFilters}
            availableColors={availableColors}
            maxPriceLimit={maxPriceLimit}
            hideMobileTrigger
            mobileOpen={mobileFiltersOpen}
            onMobileOpenChange={setMobileFiltersOpen}
          />

          {/* Cards catalog list */}
          <div className="flex-1 w-full">
            {filteredProducts.length === 0 ? (
              /* EMPTY FILTER RESULT STATE */
              <div className="theme-surface theme-border flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed">
                <svg
                  className="theme-muted w-12 h-12 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h4 className="font-serif text-lg font-semibold text-[var(--theme-text)] mb-1">
                  Koleksi Tidak Ditemukan
                </h4>
                <p className="theme-muted-strong text-xs max-w-sm mb-6 leading-relaxed">
                  Tidak ada kebaya yang sesuai dengan filter Anda. Silakan ubah pencarian atau
                  bersihkan filter.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="theme-primary-action px-5 py-3 text-xs font-semibold tracking-wider uppercase transition-all"
                >
                  Bersihkan Filter
                </button>
              </div>
            ) : (
              /* DYNAMIC GRID CONTAINER */
              <div className={`grid ${catalogGridClass}`} data-farsha-grid>
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    layoutColumns={layoutColumns}
                    isMobile={isMobile}
                    displaySettings={siteSettings}
                    onOpenDetail={setSelectedProduct}
                  />
                ))}
              </div>
            )}

            {/* Catalog Info Count */}
            {filteredProducts.length > 0 && (
              <p className="theme-muted text-right text-[11px] font-mono mt-5 uppercase tracking-wider">
                Menampilkan {filteredProducts.length} dari {catalogItems.length} Koleksi
              </p>
            )}
          </div>
        </div>
      </div>

      {/* DETAILED MODAL OVERLAY */}
      <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
