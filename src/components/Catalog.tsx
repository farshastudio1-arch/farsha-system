'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { CMSContent, KebayaItem, SiteSettings } from '@/data/mockData';
import Filters, { FilterState } from './Filters';
import ProductCard from './ProductCard';
import ProductDetailModal from './ProductDetailModal';
import { useSavedCatalogItems } from '@/lib/catalog-storage';
import { useSavedSiteSettings } from '@/lib/site-settings';
import { useSavedPosLedger, projectCatalogItems } from '@/lib/pos-ledger';
import { readLocalStorageItem, writeLocalStorageItem } from '@/lib/browser-storage';
import {
  getLandingCategory,
  getOccasionLabel,
  LandingCategorySlug,
  matchesLandingCategory,
} from '@/lib/landing-categories';

type MobileGridColumns = 1 | 2 | 3;
type DesktopGridColumns = 2 | 3 | 4;
type SortOption = 'default' | 'price-low' | 'price-high' | 'available-first';

const mobileGridStorageKey = 'farsha-mobile-grid-view-v1';
const statusSortOrder: Record<KebayaItem['status'], number> = {
  available: 0,
  rented: 1,
  maintenance: 2,
};
const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'price-low', label: 'Harga terendah' },
  { value: 'price-high', label: 'Harga tertinggi' },
  { value: 'available-first', label: 'Tersedia dulu' },
];

interface CatalogProps {
  cmsContent: CMSContent;
  initialItems: KebayaItem[];
  siteSettings: SiteSettings;
  initialCategory?: LandingCategorySlug | null;
}

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

export default function Catalog({
  cmsContent,
  initialItems,
  siteSettings: initialSiteSettings,
  initialCategory = null,
}: CatalogProps) {
  const router = useRouter();
  const catalogItems = useSavedCatalogItems(initialItems);
  const ledger = useSavedPosLedger();
  const siteSettings = useSavedSiteSettings(initialSiteSettings);
  const landingCategory = getLandingCategory(initialCategory);
  const activeCategoryLabel = initialCategory
    ? (landingCategory?.title ?? getOccasionLabel(initialCategory))
    : null;
  const projectedCatalogItems = useMemo(
    () => projectCatalogItems(catalogItems, ledger),
    [catalogItems, ledger],
  );

  // Device detection state
  const [isMobile, setIsMobile] = useState(true);

  const [layoutColumns, setLayoutColumns] = useState<MobileGridColumns | DesktopGridColumns>(
    siteSettings.defaultMobileGrid,
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');

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
    wearStyles: [],
    statuses: [],
    maxPrice: maxPriceLimit,
    categories: initialCategory ? [initialCategory] : [],
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
    return projectedCatalogItems.filter((item) => {
      // Category filter
      if (filters.categories && filters.categories.length > 0) {
        const matchesAnyCategory = filters.categories.some((cat) =>
          matchesLandingCategory(item, cat)
        );
        if (!matchesAnyCategory) return false;
      }

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

      // 5. Wear style filter
      if (
        filters.wearStyles.length > 0 &&
        !filters.wearStyles.some((style) => item.wearStyles.includes(style))
      ) {
        return false;
      }

      // 6. Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(item.status)) {
        return false;
      }

      // 7. Max Price filter
      if (item.rentalPrice > filters.maxPrice) {
        return false;
      }

      return true;
    });
  }, [filters, projectedCatalogItems]);

  const sortedProducts = useMemo(() => {
    const items = filteredProducts.map((item, index) => ({ item, index }));

    if (sortBy === 'price-low') {
      items.sort((a, b) => a.item.rentalPrice - b.item.rentalPrice || a.index - b.index);
    }

    if (sortBy === 'price-high') {
      items.sort((a, b) => b.item.rentalPrice - a.item.rentalPrice || a.index - b.index);
    }

    if (sortBy === 'available-first') {
      items.sort(
        (a, b) =>
          statusSortOrder[a.item.status] - statusSortOrder[b.item.status] || a.index - b.index,
      );
    }

    return items.map(({ item }) => item);
  }, [filteredProducts, sortBy]);

  const resetFilterState = () => {
    setFilters({
      search: '',
      colors: [],
      sizes: [],
      models: [],
      wearStyles: [],
      statuses: [],
      maxPrice: maxPriceLimit,
      categories: [],
    });
  };

  const handleResetFilters = () => {
    resetFilterState();

    if (initialCategory) {
      router.replace('/catalog');
    }
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
    filters.wearStyles.length +
    filters.statuses.length +
    (filters.maxPrice < maxPriceLimit ? 1 : 0) +
    (initialCategory ? 1 : 0);

  const mobileViewOptions: MobileGridColumns[] = [1, 2, 3];
  const desktopViewOptions: DesktopGridColumns[] = [2, 3, 4];
  const sortControlId = 'catalog-sort';

  const renderSortControl = (id: string, compact = false) => (
    <label
      className={`theme-outline-action inline-flex items-center border font-semibold uppercase transition-colors ${
        compact
          ? 'h-10 min-w-0 gap-1.5 px-2 text-[10px] tracking-wider'
          : 'h-11 gap-2 px-3 text-xs tracking-wider'
      }`}
    >
      <ArrowUpDown
        className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0`}
        aria-hidden="true"
        strokeWidth={1.8}
      />
      <select
        id={id}
        value={sortBy}
        onChange={(event) => setSortBy(event.target.value as SortOption)}
        className={`min-w-0 appearance-none bg-transparent font-semibold uppercase tracking-wider text-[var(--theme-text)] outline-none ${
          compact ? 'max-w-[4.9rem] text-[10px]' : 'max-w-[8.5rem] pr-1 text-xs'
        }`}
        aria-label="Urutkan katalog"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

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
      ? 'grid-cols-3 gap-1 sm:gap-1.5'
      : isMobile && layoutColumns === 2
        ? 'grid-cols-2 gap-2'
      : layoutColumns === 1
        ? 'grid-cols-1 max-w-xl sm:max-w-3xl mx-auto gap-5 sm:gap-6'
        : layoutColumns === 2
          ? 'grid-cols-2 gap-5 sm:gap-6'
          : layoutColumns === 3
            ? 'grid-cols-3 gap-3 sm:gap-4'
            : 'grid-cols-4 gap-5 sm:gap-6';

  return (
    <div
      id="catalog-section"
      data-farsha-catalog
      data-farsha-phone={cmsContent.studioPhone}
      className="theme-surface theme-border w-full border-t pt-5 pb-16 sm:pt-8 sm:pb-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* CATALOG CONTENT CONTAINER HEADER */}
        <div className="theme-border flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-5 sm:mb-8 pb-4 border-b">
          <div>
            <span className="block theme-muted-strong text-xs font-bold tracking-widest uppercase font-mono">
              KATALOG KAMI
            </span>
            {activeCategoryLabel && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="theme-selected px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-widest">
                  {activeCategoryLabel}
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="theme-outline-action border px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-widest transition-colors"
                >
                  Hapus kategori
                </button>
              </div>
            )}
            <div className="mt-2 inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Availability synced and up to date</span>
            </div>
          </div>

          <div className="flex flex-nowrap lg:hidden items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-farsha-filter-open
                onClick={() => setMobileFiltersOpen(true)}
                className="theme-outline-action inline-flex h-10 shrink-0 items-center justify-center gap-1.5 border px-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                <span>Filter</span>
                {totalActiveFilters > 0 && (
                  <span className="theme-primary-action flex h-4.5 min-w-4.5 items-center justify-center px-1 text-[9px]">
                    {totalActiveFilters}
                  </span>
                )}
              </button>

              {renderSortControl(`${sortControlId}-mobile`, true)}
            </div>

            <div className="theme-soft-surface theme-border flex shrink-0 border p-0.5">
              {mobileViewOptions.map((columns) => (
                <button
                  key={columns}
                  type="button"
                  data-farsha-grid-option={columns}
                  onClick={() => selectColumns(columns)}
                  className={`flex h-8 w-8 items-center justify-center text-[10px] font-semibold transition-all ${
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
          <div className="hidden lg:flex flex-wrap items-center gap-4 self-start md:self-end">
            {renderSortControl(sortControlId)}

            <div className="flex items-center gap-4">
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
        </div>

        {/* TWO-COLUMN GRID LAYOUT: FILTER (Left/Mobile) & CARDS (Right) */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Filters component (collapsible on mobile, fixed sidebar on desktop) */}
          <Filters
            filters={filters}
            onChange={setFilters}
            availableColors={availableColors}
            maxPriceLimit={maxPriceLimit}
            totalActiveFilters={totalActiveFilters}
            hideMobileTrigger
            mobileOpen={mobileFiltersOpen}
            onMobileOpenChange={setMobileFiltersOpen}
            onReset={handleResetFilters}
          />

          {/* Cards catalog list */}
          <div className="flex-1 w-full">
            {sortedProducts.length === 0 ? (
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
                  Tidak ada koleksi yang sesuai dengan pilihan Anda. Silakan ubah pencarian atau
                  bersihkan filter kategori.
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
                {sortedProducts.map((product) => (
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
            {sortedProducts.length > 0 && (
              <p className="theme-muted text-right text-[11px] font-mono mt-5 uppercase tracking-wider">
                Menampilkan {sortedProducts.length} dari {projectedCatalogItems.length} Koleksi
              </p>
            )}
          </div>
        </div>
      </div>

      {/* DETAILED MODAL OVERLAY */}
      <ProductDetailModal
        product={selectedProduct}
        studioPhone={cmsContent.studioPhone}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
