'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { mockKebayas, KebayaItem } from '@/data/mockData';
import Filters, { FilterState } from './Filters';
import ProductCard from './ProductCard';
import ProductDetailModal from './ProductDetailModal';

export default function Catalog() {
  // Device detection state
  const [isMobile, setIsMobile] = useState(true);
  
  // Default columns: 1 for mobile, 3 for desktop
  const [layoutColumns, setLayoutColumns] = useState(1);

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<KebayaItem | null>(null);

  // Maximum price calculation from mock data
  const maxPriceLimit = useMemo(() => {
    return Math.max(...mockKebayas.map((k) => k.rentalPrice), 400000);
  }, []);

  // Extracted unique colors from mock data
  const availableColors = useMemo(() => {
    const colors = mockKebayas.map((k) => k.color);
    return Array.from(new Set(colors)).sort();
  }, []);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    colors: [],
    sizes: [],
    models: [],
    statuses: [],
    maxPrice: maxPriceLimit
  });

  // Track responsive screen size changes
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024; // Tailwind lg breakpoint
      setIsMobile(mobile);
      
      // Auto adjust columns depending on breakpoint boundary
      if (mobile) {
        if (layoutColumns > 2) {
          setLayoutColumns(2);
        }
      } else {
        if (layoutColumns === 1) {
          setLayoutColumns(3); // Default to 3 cols on desktop
        }
      }
    };

    handleResize(); // trigger immediately on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layoutColumns]);

  // Filter logic
  const filteredProducts = useMemo(() => {
    return mockKebayas.filter((item) => {
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
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      colors: [],
      sizes: [],
      models: [],
      statuses: [],
      maxPrice: maxPriceLimit
    });
  };

  // Switch column size handler
  const selectColumns = (cols: number) => {
    setLayoutColumns(cols);
  };

  return (
    <div id="catalog-section" className="w-full bg-[#FFFFFF] py-16 sm:py-24 border-t border-[#E5E5E5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* CATALOG CONTENT CONTAINER HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-[#E5E5E5]">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#333333] uppercase font-mono">
              Galeri Etalase
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#000000] mt-1.5">
              Telusuri Koleksi Kebaya
            </h2>
          </div>

          {/* GRID VIEW SWITCHER */}
          <div className="flex items-center gap-4.5 self-start md:self-end">
            <span className="text-xs uppercase tracking-wider text-[#757575] font-mono font-semibold">
              Tampilan Grid
            </span>
            <div className="flex bg-[#F5F5F5] p-1 rounded-xl border border-[#E5E5E5]">
              {isMobile ? (
                <>
                  {/* Mobile column selection (1 or 2) */}
                  <button
                    onClick={() => selectColumns(1)}
                    className={`flex items-center justify-center w-11 h-9 rounded-lg transition-all ${
                      layoutColumns === 1 
                        ? 'bg-[#000000] text-[#FFFFFF] shadow-xs' 
                        : 'text-[#4A4A4A] hover:bg-[#E5E5E5]'
                    }`}
                    aria-label="Tampilan 1 Kolom"
                  >
                    {/* SVG 1 Column Icon */}
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="5" y="4" width="14" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                      <line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="2" />
                      <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                  <button
                    onClick={() => selectColumns(2)}
                    className={`flex items-center justify-center w-11 h-9 rounded-lg transition-all ${
                      layoutColumns === 2 
                        ? 'bg-[#000000] text-[#FFFFFF] shadow-xs' 
                        : 'text-[#4A4A4A] hover:bg-[#E5E5E5]'
                    }`}
                    aria-label="Tampilan 2 Kolom"
                  >
                    {/* SVG 2 Columns Icon */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <rect x="4" y="4" width="7" height="16" rx="1.5" />
                      <rect x="13" y="4" width="7" height="16" rx="1.5" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  {/* Desktop column selection (2, 3, or 4) */}
                  <button
                    onClick={() => selectColumns(2)}
                    className={`flex items-center justify-center w-11 h-9 rounded-lg text-xs font-bold transition-all ${
                      layoutColumns === 2 
                        ? 'bg-[#000000] text-[#FFFFFF] shadow-xs' 
                        : 'text-[#4A4A4A] hover:bg-[#E5E5E5]'
                    }`}
                    aria-label="Tampilan 2 Kolom"
                  >
                    2 Kolom
                  </button>
                  <button
                    onClick={() => selectColumns(3)}
                    className={`flex items-center justify-center w-11 h-9 rounded-lg text-xs font-bold transition-all ${
                      layoutColumns === 3 
                        ? 'bg-[#000000] text-[#FFFFFF] shadow-xs' 
                        : 'text-[#4A4A4A] hover:bg-[#E5E5E5]'
                    }`}
                    aria-label="Tampilan 3 Kolom"
                  >
                    3 Kolom
                  </button>
                  <button
                    onClick={() => selectColumns(4)}
                    className={`flex items-center justify-center w-11 h-9 rounded-lg text-xs font-bold transition-all ${
                      layoutColumns === 4 
                        ? 'bg-[#000000] text-[#FFFFFF] shadow-xs' 
                        : 'text-[#4A4A4A] hover:bg-[#E5E5E5]'
                    }`}
                    aria-label="Tampilan 4 Kolom"
                  >
                    4 Kolom
                  </button>
                </>
              )}
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
          />

          {/* Cards catalog list */}
          <div className="flex-1 w-full">
            {filteredProducts.length === 0 ? (
              /* EMPTY FILTER RESULT STATE */
              <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-[#FFFFFF] border border-dashed border-[#E5E5E5] rounded-2xl">
                <svg className="w-12 h-12 text-[#757575] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h4 className="font-serif text-lg font-semibold text-[#000000] mb-1">
                  Koleksi Tidak Ditemukan
                </h4>
                <p className="text-[#4A4A4A] text-xs max-w-sm mb-6 leading-relaxed">
                  Tidak ada kebaya yang sesuai dengan filter Anda. Silakan ubah pencarian atau bersihkan filter.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="bg-[#000000] hover:bg-[#333333] text-[#FFFFFF] hover:text-[#000000] px-5 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all"
                >
                  Bersihkan Filter
                </button>
              </div>
            ) : (
              /* DYNAMIC GRID CONTAINER */
              <div 
                className={`grid gap-5 sm:gap-6 ${layoutColumns === 1 ? 'grid-cols-1 max-w-md sm:max-w-xl mx-auto' : layoutColumns === 2 ? 'grid-cols-2' : layoutColumns === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}
              >
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    layoutColumns={layoutColumns}
                    onOpenDetail={setSelectedProduct}
                  />
                ))}
              </div>
            )}
            
            {/* Catalog Info Count */}
            {filteredProducts.length > 0 && (
              <p className="text-right text-[11px] text-[#757575] font-mono mt-5 uppercase tracking-wider">
                Menampilkan {filteredProducts.length} dari {mockKebayas.length} Koleksi
              </p>
            )}
          </div>

        </div>

      </div>

      {/* DETAILED MODAL OVERLAY */}
      <ProductDetailModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
    </div>
  );
}
