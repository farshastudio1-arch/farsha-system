'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  kebayaModelOptions,
  kebayaSizeOptions,
  kebayaWearStyleOptions,
  KebayaCategory,
  KebayaItem,
} from '@/data/mockData';
import { occasionCategories } from '@/lib/landing-categories';

export interface FilterState {
  search: string;
  colors: string[];
  sizes: KebayaItem['size'][];
  models: KebayaItem['model'][];
  wearStyles: KebayaItem['wearStyles'];
  statuses: ('available' | 'rented' | 'maintenance')[];
  maxPrice: number;
  categories: KebayaCategory[];
}

interface FiltersProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  availableColors: string[];
  maxPriceLimit: number;
  totalActiveFilters?: number;
  hideMobileTrigger?: boolean;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  onReset?: () => void;
}

export default function Filters({
  filters,
  onChange,
  availableColors,
  maxPriceLimit,
  totalActiveFilters: controlledTotalActiveFilters,
  hideMobileTrigger = false,
  mobileOpen,
  onMobileOpenChange,
  onReset,
}: FiltersProps) {
  const [uncontrolledMobileOpen, setUncontrolledMobileOpen] = useState(false);
  const isOpenMobile = mobileOpen ?? uncontrolledMobileOpen;
  const setIsOpenMobile = onMobileOpenChange ?? setUncontrolledMobileOpen;
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const sizesOptions = kebayaSizeOptions;
  const modelsOptions = kebayaModelOptions;
  const wearStyleOptions = kebayaWearStyleOptions;
  const categoryOptions = occasionCategories;
  const statusOptions: {
    value: 'available' | 'rented' | 'maintenance';
    label: string;
  }[] = [
    { value: 'available', label: 'AVAILABLE' },
    { value: 'rented', label: 'RENTED' },
    { value: 'maintenance', label: 'DICUCI' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  useEffect(() => {
    const handleSearchRequest = () => {
      const isMobileViewport = window.innerWidth < 1024;
      setIsOpenMobile(isMobileViewport);
      window.setTimeout(() => {
        const searchInput = isMobileViewport
          ? mobileSearchInputRef.current
          : desktopSearchInputRef.current;

        searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchInput?.focus();
      }, 80);
    };

    window.addEventListener('farsha-catalog-search-request', handleSearchRequest);
    return () => {
      window.removeEventListener('farsha-catalog-search-request', handleSearchRequest);
    };
  }, [setIsOpenMobile]);

  const handleColorToggle = (color: string) => {
    const nextColors = filters.colors.includes(color)
      ? filters.colors.filter((c) => c !== color)
      : [...filters.colors, color];
    onChange({ ...filters, colors: nextColors });
  };

  const handleSizeToggle = (size: KebayaItem['size']) => {
    const nextSizes = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    onChange({ ...filters, sizes: nextSizes });
  };

  const handleModelToggle = (model: KebayaItem['model']) => {
    const nextModels = filters.models.includes(model)
      ? filters.models.filter((m) => m !== model)
      : [...filters.models, model];
    onChange({ ...filters, models: nextModels });
  };

  const handleWearStyleToggle = (style: KebayaItem['wearStyles'][number]) => {
    const nextWearStyles = filters.wearStyles.includes(style)
      ? filters.wearStyles.filter((item) => item !== style)
      : [...filters.wearStyles, style];
    onChange({ ...filters, wearStyles: nextWearStyles });
  };

  const handleCategoryToggle = (category: KebayaCategory) => {
    const nextCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onChange({ ...filters, categories: nextCategories });
  };

  const handleStatusToggle = (status: 'available' | 'rented' | 'maintenance') => {
    const nextStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: nextStatuses });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, maxPrice: Number(e.target.value) });
  };

  const resetBaseFilters = () => {
    onChange({
      search: '',
      colors: [],
      sizes: [],
      models: [],
      wearStyles: [],
      statuses: [], // Empty means show all
      maxPrice: maxPriceLimit,
      categories: [],
    });
  };

  const handleReset = onReset ?? resetBaseFilters;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const baseTotalActiveFilters =
    (filters.search ? 1 : 0) +
    filters.colors.length +
    filters.sizes.length +
    filters.models.length +
    filters.wearStyles.length +
    filters.statuses.length +
    (filters.categories?.length ?? 0) +
    (filters.maxPrice < maxPriceLimit ? 1 : 0);
  const totalActiveFilters = controlledTotalActiveFilters ?? baseTotalActiveFilters;
  const minPriceLimit = 150000;
  const priceSliderProgress =
    maxPriceLimit > minPriceLimit
      ? ((filters.maxPrice - minPriceLimit) / (maxPriceLimit - minPriceLimit)) * 100
      : 100;

  // Render the core filter controls inside a reusable component block
  const renderFilterControls = (surface: 'desktop' | 'mobile') => (
    <div className="space-y-6">
      {/* Search Input */}
      <div>
        <label
          htmlFor={`search-${surface}`}
          className="theme-muted block text-xs font-semibold uppercase tracking-wider font-mono mb-2.5"
        >
          Cari Kebaya / Kode
        </label>
        <div className="relative">
          <input
            ref={surface === 'desktop' ? desktopSearchInputRef : mobileSearchInputRef}
            type="text"
            id={`search-${surface}`}
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Ketik nama atau kode..."
            className="theme-surface theme-border w-full border px-4 py-3 text-sm placeholder-[#757575] focus:outline-hidden focus:border-[var(--theme-accent)] focus:ring-1 focus:ring-[var(--theme-accent)] transition-all font-sans"
          />
          {filters.search && (
            <button
              onClick={() => onChange({ ...filters, search: '' })}
              className="theme-muted absolute right-3 top-1/2 -translate-y-1/2 hover:text-[var(--theme-text)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Model Filter */}
      <div>
        <span className="theme-muted block text-xs font-semibold uppercase tracking-wider font-mono mb-2.5">
          Model Kebaya
        </span>
        <div className="flex flex-wrap gap-2">
          {modelsOptions.map((model) => {
            const isSelected = filters.models.includes(model);
            return (
              <button
                key={model}
                onClick={() => handleModelToggle(model)}
                className={`text-xs px-3.5 py-2.5 border transition-all ${
                  isSelected
                    ? 'theme-selected font-semibold'
                    : 'theme-surface theme-border theme-muted-strong hover:border-[var(--theme-accent)] hover:text-[var(--theme-text)]'
                }`}
              >
                {model}
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <span className="theme-muted block text-xs font-semibold uppercase tracking-wider font-mono mb-2.5">
          Kategori Acara
        </span>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((opt) => {
            const isSelected = filters.categories?.includes(opt.value) ?? false;
            return (
              <button
                key={opt.value}
                onClick={() => handleCategoryToggle(opt.value)}
                className={`text-xs px-3.5 py-2.5 border transition-all ${
                  isSelected
                    ? 'theme-selected font-semibold'
                    : 'theme-surface theme-border theme-muted-strong hover:border-[var(--theme-accent)] hover:text-[var(--theme-text)]'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Filter */}
      <div>
        <span className="theme-muted block text-xs font-semibold uppercase tracking-wider font-mono mb-2.5">
          Ukuran (Size)
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {sizesOptions.map((size) => {
            const isSelected = filters.sizes.includes(size);
            return (
              <button
                key={size}
                onClick={() => handleSizeToggle(size)}
                className={`text-xs text-center py-2.5 border transition-all font-mono font-medium ${
                  isSelected
                    ? 'theme-selected'
                    : 'theme-surface theme-border theme-muted-strong hover:border-[var(--theme-accent)]'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Wear Style Filter */}
      <div>
        <span className="theme-muted block text-xs font-semibold uppercase tracking-wider font-mono mb-2.5">
          Gaya Pakai
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {wearStyleOptions.map((style) => {
            const isSelected = filters.wearStyles.includes(style);
            return (
              <button
                key={style}
                onClick={() => handleWearStyleToggle(style)}
                className={`text-xs text-center py-2.5 border transition-all font-mono font-medium ${
                  isSelected
                    ? 'theme-selected'
                    : 'theme-surface theme-border theme-muted-strong hover:border-[var(--theme-accent)]'
                }`}
              >
                {style}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <span className="theme-muted block text-xs font-semibold uppercase tracking-wider font-mono">
            Maksimum Sewa
          </span>
          <span className="text-xs font-semibold font-mono text-[var(--theme-text)]">
            {formatPrice(filters.maxPrice)}
          </span>
        </div>
        <input
          type="range"
          min={minPriceLimit}
          max={maxPriceLimit}
          step="10000"
          value={filters.maxPrice}
          onChange={handlePriceChange}
          className="theme-price-range w-full cursor-pointer"
          style={{ '--range-progress': `${priceSliderProgress}%` } as React.CSSProperties}
        />
        <div className="theme-muted flex justify-between items-center text-[10px] font-mono mt-1">
          <span>{formatPrice(minPriceLimit)}</span>
          <span>{formatPrice(maxPriceLimit)}</span>
        </div>
      </div>

      {/* Colors Filter */}
      <div>
        <span className="theme-muted block text-xs font-semibold uppercase tracking-wider font-mono mb-2.5">
          Warna Kebaya
        </span>
        <div className="flex flex-wrap gap-2">
          {availableColors.map((color) => {
            const isSelected = filters.colors.includes(color);
            return (
              <button
                key={color}
                onClick={() => handleColorToggle(color)}
                className={`text-xs px-3.5 py-2.5 border transition-all ${
                  isSelected
                    ? 'theme-selected font-semibold'
                    : 'theme-surface theme-border theme-muted-strong hover:border-[var(--theme-accent)] hover:text-[var(--theme-text)]'
                }`}
              >
                {color}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <span className="theme-muted block text-xs font-semibold uppercase tracking-wider font-mono mb-2.5">
          Ketersediaan Barang
        </span>
        <div className="grid grid-cols-2 gap-2">
          {statusOptions.map((opt) => {
            const isSelected = filters.statuses.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => handleStatusToggle(opt.value)}
                className={`text-xs text-left px-3.5 py-3 border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'theme-selected font-semibold'
                    : 'theme-surface theme-border theme-muted-strong hover:border-[var(--theme-accent)] hover:text-[var(--theme-text)]'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected ? (
                  <svg
                    className="w-3.5 h-3.5 text-[var(--theme-text)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.5"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="theme-border w-3.5 h-3.5 border" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset Button */}
      {totalActiveFilters > 0 && (
        <button
          onClick={handleReset}
          className="theme-outline-action w-full mt-4 text-xs font-semibold tracking-wider uppercase border py-3 transition-all duration-300 flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Hapus Semua Filter ({totalActiveFilters})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR PANEL */}
      <div className="theme-surface theme-border hidden lg:block border p-6 h-fit sticky top-24 max-w-[280px]">
        <div className="theme-border flex justify-between items-center pb-4 border-b mb-5">
          <h3 className="font-serif text-lg font-semibold text-[var(--theme-text)]">
            Filter Koleksi
          </h3>
          {totalActiveFilters > 0 && (
            <span className="theme-primary-action text-[10px] font-bold px-2 py-0.5 font-mono">
              {totalActiveFilters}
            </span>
          )}
        </div>
        {renderFilterControls('desktop')}
      </div>

      {/* MOBILE TRIGGER ACTION BUTTON */}
      {!hideMobileTrigger && (
        <div className="lg:hidden w-full flex gap-3 mb-6">
          <button
            data-farsha-filter-open
            onClick={() => setIsOpenMobile(true)}
            className="theme-primary-action flex-1 px-5 py-3.5 text-sm font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 border"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
            Filter Koleksi {totalActiveFilters > 0 ? `(${totalActiveFilters})` : ''}
          </button>

          {totalActiveFilters > 0 && (
            <button
              onClick={handleReset}
              className="theme-outline-action p-3.5 border transition-all"
              aria-label="Reset Filter"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* MOBILE FULLSCREEN DRAWER DRAWER */}
      <div
        data-farsha-filter-drawer
        aria-hidden={!isOpenMobile}
        className={`theme-surface fixed inset-0 z-50 lg:hidden flex-col animate-in slide-in-from-bottom duration-300 ${
          isOpenMobile ? 'flex' : 'hidden'
        }`}
      >
          {/* Header Mobile Filter Drawer */}
          <div className="theme-surface theme-border flex justify-between items-center px-6 py-4.5 border-b sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl font-bold text-[var(--theme-text)]">
                Filter Koleksi
              </h3>
              {totalActiveFilters > 0 && (
                <span className="theme-primary-action text-[10px] font-bold px-2 py-0.5 font-mono">
                  {totalActiveFilters}
                </span>
              )}
            </div>

            <button
              data-farsha-filter-close
              onClick={() => setIsOpenMobile(false)}
              className="theme-soft-surface theme-muted-strong p-2 hover:text-[var(--theme-text)] transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Controls Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 pb-24">{renderFilterControls('mobile')}</div>

          {/* Footer mobile sticky actions */}
          <div className="theme-surface theme-border border-t p-4.5 sticky bottom-0 z-10 flex gap-3">
            <button
              onClick={handleReset}
              disabled={totalActiveFilters === 0}
              className="theme-outline-action flex-1 border font-semibold text-xs tracking-wider uppercase py-4.5 transition-all disabled:opacity-50"
            >
              Hapus Semua
            </button>
            <button
              data-farsha-filter-close
              onClick={() => setIsOpenMobile(false)}
              className="theme-primary-action flex-1 font-semibold text-xs tracking-wider uppercase py-4.5 transition-all"
            >
              Tampilkan Hasil
            </button>
          </div>
        </div>
    </>
  );
}
