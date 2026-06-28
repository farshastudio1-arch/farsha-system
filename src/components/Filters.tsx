'use client';

import React, { useState } from 'react';

export interface FilterState {
  search: string;
  colors: string[];
  sizes: ('S' | 'M' | 'L' | 'XL' | 'Custom')[];
  models: ('Modern' | 'Klasik' | 'Kartini' | 'Kutubaru')[];
  statuses: ('available' | 'rented' | 'maintenance' | 'archived')[];
  maxPrice: number;
}

interface FiltersProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  availableColors: string[];
  maxPriceLimit: number;
}

export default function Filters({ filters, onChange, availableColors, maxPriceLimit }: FiltersProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const sizesOptions: ('S' | 'M' | 'L' | 'XL' | 'Custom')[] = ['S', 'M', 'L', 'XL', 'Custom'];
  const modelsOptions: ('Modern' | 'Klasik' | 'Kartini' | 'Kutubaru')[] = ['Modern', 'Klasik', 'Kartini', 'Kutubaru'];
  const statusOptions: { value: 'available' | 'rented' | 'maintenance' | 'archived'; label: string }[] = [
    { value: 'available', label: 'Tersedia' },
    { value: 'rented', label: 'Disewa' },
    { value: 'maintenance', label: 'Perbaikan' },
    { value: 'archived', label: 'Arsip' }
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleColorToggle = (color: string) => {
    const nextColors = filters.colors.includes(color)
      ? filters.colors.filter((c) => c !== color)
      : [...filters.colors, color];
    onChange({ ...filters, colors: nextColors });
  };

  const handleSizeToggle = (size: 'S' | 'M' | 'L' | 'XL' | 'Custom') => {
    const nextSizes = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    onChange({ ...filters, sizes: nextSizes });
  };

  const handleModelToggle = (model: 'Modern' | 'Klasik' | 'Kartini' | 'Kutubaru') => {
    const nextModels = filters.models.includes(model)
      ? filters.models.filter((m) => m !== model)
      : [...filters.models, model];
    onChange({ ...filters, models: nextModels });
  };

  const handleStatusToggle = (status: 'available' | 'rented' | 'maintenance' | 'archived') => {
    const nextStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: nextStatuses });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, maxPrice: Number(e.target.value) });
  };

  const handleReset = () => {
    onChange({
      search: '',
      colors: [],
      sizes: [],
      models: [],
      statuses: [], // Empty means show all
      maxPrice: maxPriceLimit
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const totalActiveFilters = 
    (filters.search ? 1 : 0) + 
    filters.colors.length + 
    filters.sizes.length + 
    filters.models.length + 
    filters.statuses.length + 
    (filters.maxPrice < maxPriceLimit ? 1 : 0);

  // Render the core filter controls inside a reusable component block
  const renderFilterControls = () => (
    <div className="space-y-6">
      {/* Search Input */}
      <div>
        <label htmlFor="search" className="block text-xs font-semibold uppercase tracking-wider text-[#757575] font-mono mb-2.5">
          Cari Kebaya / Kode
        </label>
        <div className="relative">
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Ketik nama atau kode..."
            className="w-full bg-[#FFFFFF] border border-[#E5E5E5] rounded-xl px-4 py-3 text-sm text-[#000000] placeholder-[#757575] focus:outline-hidden focus:border-[#333333] focus:ring-1 focus:ring-[#333333] transition-all font-sans"
          />
          {filters.search && (
            <button 
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757575] hover:text-[#000000]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Model Filter */}
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-[#757575] font-mono mb-2.5">
          Model Kebaya
        </span>
        <div className="flex flex-wrap gap-2">
          {modelsOptions.map((model) => {
            const isSelected = filters.models.includes(model);
            return (
              <button
                key={model}
                onClick={() => handleModelToggle(model)}
                className={`text-xs px-3.5 py-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-[#000000] border-[#000000] text-[#FFFFFF] font-semibold'
                    : 'bg-[#FFFFFF] border-[#E5E5E5] text-[#4A4A4A] hover:border-[#333333] hover:text-[#000000]'
                }`}
              >
                {model}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Filter */}
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-[#757575] font-mono mb-2.5">
          Ukuran (Size)
        </span>
        <div className="grid grid-cols-5 gap-1.5">
          {sizesOptions.map((size) => {
            const isSelected = filters.sizes.includes(size);
            return (
              <button
                key={size}
                onClick={() => handleSizeToggle(size)}
                className={`text-xs text-center py-2.5 rounded-lg border transition-all font-mono font-medium ${
                  isSelected
                    ? 'bg-[#000000] border-[#000000] text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] border-[#E5E5E5] text-[#4A4A4A] hover:border-[#333333]'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <div className="flex justify-between items-center mb-2.5">
          <span className="block text-xs font-semibold uppercase tracking-wider text-[#757575] font-mono">
            Maksimum Sewa
          </span>
          <span className="text-xs font-semibold font-mono text-[#000000]">
            {formatPrice(filters.maxPrice)}
          </span>
        </div>
        <input
          type="range"
          min="150000"
          max={maxPriceLimit}
          step="10000"
          value={filters.maxPrice}
          onChange={handlePriceChange}
          className="w-full h-1 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer accent-[#000000]"
        />
        <div className="flex justify-between items-center text-[10px] text-[#757575] font-mono mt-1">
          <span>{formatPrice(150000)}</span>
          <span>{formatPrice(maxPriceLimit)}</span>
        </div>
      </div>

      {/* Colors Filter */}
      <div>
        <span className="block text-xs font-semibold uppercase tracking-wider text-[#757575] font-mono mb-2.5">
          Warna Kebaya
        </span>
        <div className="flex flex-wrap gap-2">
          {availableColors.map((color) => {
            const isSelected = filters.colors.includes(color);
            return (
              <button
                key={color}
                onClick={() => handleColorToggle(color)}
                className={`text-xs px-3.5 py-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-[#000000] border-[#000000] text-[#FFFFFF] font-semibold'
                    : 'bg-[#FFFFFF] border-[#E5E5E5] text-[#4A4A4A] hover:border-[#333333] hover:text-[#000000]'
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
        <span className="block text-xs font-semibold uppercase tracking-wider text-[#757575] font-mono mb-2.5">
          Ketersediaan Barang
        </span>
        <div className="grid grid-cols-2 gap-2">
          {statusOptions.map((opt) => {
            const isSelected = filters.statuses.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => handleStatusToggle(opt.value)}
                className={`text-xs text-left px-3.5 py-3 rounded-lg border transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#000000] border-[#000000] text-[#FFFFFF] font-semibold'
                    : 'bg-[#FFFFFF] border-[#E5E5E5] text-[#4A4A4A] hover:border-[#333333] hover:text-[#000000]'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected ? (
                  <svg className="w-3.5 h-3.5 text-[#333333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-[#E5E5E5]" />
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
          className="w-full mt-4 text-xs font-semibold tracking-wider uppercase text-[#000000] hover:text-[#333333] border border-[#000000] hover:border-[#333333] bg-transparent py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Hapus Semua Filter ({totalActiveFilters})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR PANEL */}
      <div className="hidden lg:block bg-[#FFFFFF] border border-[#E5E5E5] rounded-2xl p-6 h-fit sticky top-24 max-w-[280px]">
        <div className="flex justify-between items-center pb-4 border-b border-[#E5E5E5] mb-5">
          <h3 className="font-serif text-lg font-semibold text-[#000000]">Filter Koleksi</h3>
          {totalActiveFilters > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#333333] text-[#000000] rounded-full font-mono">
              {totalActiveFilters}
            </span>
          )}
        </div>
        {renderFilterControls()}
      </div>

      {/* MOBILE TRIGGER ACTION BUTTON */}
      <div className="lg:hidden w-full flex gap-3 mb-6">
        <button
          onClick={() => setIsOpenMobile(true)}
          className="flex-1 bg-[#000000] hover:bg-[#333333] text-[#FFFFFF] hover:text-[#000000] px-5 py-3.5 rounded-xl text-sm font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-[#000000]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          Filter Koleksi {totalActiveFilters > 0 ? `(${totalActiveFilters})` : ''}
        </button>

        {totalActiveFilters > 0 && (
          <button
            onClick={handleReset}
            className="p-3.5 bg-transparent hover:bg-[#F5F5F5] text-[#000000] border border-[#E5E5E5] rounded-xl transition-all"
            aria-label="Reset Filter"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
            </svg>
          </button>
        )}
      </div>

      {/* MOBILE FULLSCREEN DRAWER DRAWER */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-[#FFFFFF] animate-in slide-in-from-bottom duration-300">
          {/* Header Mobile Filter Drawer */}
          <div className="flex justify-between items-center px-6 py-4.5 border-b border-[#E5E5E5] sticky top-0 bg-[#FFFFFF] z-10">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-xl font-bold text-[#000000]">Filter Koleksi</h3>
              {totalActiveFilters > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#333333] text-[#000000] rounded-full font-mono">
                  {totalActiveFilters}
                </span>
              )}
            </div>
            
            <button
              onClick={() => setIsOpenMobile(false)}
              className="p-2 text-[#4A4A4A] hover:text-[#000000] bg-[#F5F5F5] rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Controls Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 pb-24">
            {renderFilterControls()}
          </div>

          {/* Footer mobile sticky actions */}
          <div className="border-t border-[#E5E5E5] p-4.5 bg-[#FFFFFF] sticky bottom-0 z-10 flex gap-3">
            <button
              onClick={handleReset}
              disabled={totalActiveFilters === 0}
              className="flex-1 border border-[#E5E5E5] text-[#4A4A4A] font-semibold text-xs tracking-wider uppercase py-4.5 rounded-xl transition-all hover:bg-[#F5F5F5] disabled:opacity-50"
            >
              Hapus Semua
            </button>
            <button
              onClick={() => setIsOpenMobile(false)}
              className="flex-1 bg-[#000000] text-[#FFFFFF] font-semibold text-xs tracking-wider uppercase py-4.5 rounded-xl transition-all hover:bg-[#333333] hover:text-[#000000]"
            >
              Tampilkan Hasil
            </button>
          </div>
        </div>
      )}
    </>
  );
}
