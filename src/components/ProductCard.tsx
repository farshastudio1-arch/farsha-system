'use client';

import React, { useState, useRef } from 'react';
import { KebayaItem, SiteSettings } from '@/data/mockData';

interface ProductCardProps {
  product: KebayaItem;
  layoutColumns: number;
  displaySettings: SiteSettings;
  onOpenDetail: (product: KebayaItem) => void;
}

export default function ProductCard({
  product,
  layoutColumns,
  displaySettings,
  onOpenDetail,
}: ProductCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    setActiveImageIndex(index);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Status Badge configurations
  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'available':
        return { text: 'Tersedia', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'rented':
        return { text: 'Disewa', class: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'maintenance':
        return { text: 'Perbaikan', class: 'bg-rose-50 text-rose-800 border-rose-200' };
      default:
        return { text: 'Arsip', class: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  const statusInfo = getStatusDetails(product.status);

  // Layout-specific styling classes
  const isOneColumn = layoutColumns === 1;

  return (
    <div 
      className={`group flex flex-col bg-[#FFFFFF] border border-[#E5E5E5] overflow-hidden transition-all duration-300 ${
        isOneColumn 
          ? 'rounded-2xl shadow-sm hover:shadow-md' 
          : 'rounded-xl hover:shadow-sm'
      }`}
    >
      {/* CARD IMAGE AREA */}
      <div className="relative w-full overflow-hidden bg-[#E5E5E5]">
        {isOneColumn ? (
          /* 1 COLUMN MOBILE VIEW: Swipable Carousel */
          <div className="relative">
            <div 
              ref={carouselRef}
              onScroll={handleScroll}
              className="flex w-full overflow-x-auto scroll-snap-x snap-mandatory no-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {product.imageUrls.map((url, index) => (
                <div 
                  key={index}
                  onClick={() => onOpenDetail(product)}
                  className="w-full shrink-0 aspect-[3/4] scroll-snap-align-center cursor-pointer relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={url} 
                    alt={`${product.name} - Foto ${index + 1}`}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>

            {/* Carousel Dot Indicators */}
            {product.imageUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#000000]/60 backdrop-blur-xs px-2.5 py-1.5 rounded-full z-10">
                {product.imageUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (carouselRef.current) {
                        carouselRef.current.scrollTo({
                          left: index * carouselRef.current.clientWidth,
                          behavior: 'smooth'
                        });
                        setActiveImageIndex(index);
                      }
                    }}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      activeImageIndex === index 
                        ? 'bg-[#FFFFFF] w-3' 
                        : 'bg-[#FFFFFF]/40 hover:bg-[#FFFFFF]/70'
                    }`}
                    aria-label={`Lihat foto ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* MULTI-COLUMN VIEW: Single Static Image */
          <div 
            onClick={() => onOpenDetail(product)}
            className="w-full aspect-[3/4] cursor-pointer relative overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={product.imageUrls[0]} 
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        )}

        {/* Floating Code & Status Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10 pointer-events-none">
          {displaySettings.showProductCode && (
            <span className="text-[10px] tracking-wider uppercase bg-[#000000]/80 text-[#FFFFFF] px-2 py-0.5 rounded font-mono font-semibold backdrop-blur-xs">
              {product.code}
            </span>
          )}
          {displaySettings.showAvailabilityBadges && (
            <span className={`text-[10px] font-semibold tracking-wide border px-2 py-0.5 rounded backdrop-blur-xs shadow-xs ${statusInfo.class}`}>
              {statusInfo.text}
            </span>
          )}
        </div>
      </div>

      {/* CARD CONTENT */}
      <div className={`flex flex-col flex-grow ${isOneColumn ? 'p-5' : 'p-3 sm:p-4'}`}>
        {/* Kebaya Model Category */}
        {displaySettings.showProductModel && (
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-[#757575] uppercase font-mono mb-1">
            Koleksi {product.model}
          </span>
        )}

        {/* Title */}
        <h3 
          onClick={() => onOpenDetail(product)}
          className={`font-serif text-[#000000] cursor-pointer hover:text-[#333333] transition-colors leading-tight font-medium ${
            isOneColumn ? 'text-lg sm:text-xl mb-2' : 'text-sm sm:text-base mb-1 line-clamp-2'
          }`}
        >
          {product.name}
        </h3>

        {/* Technical features summary for 1-column layout */}
        {isOneColumn && displaySettings.showProductDescription && (
          <p className="text-[#4A4A4A] text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed font-sans">
            {product.description}
          </p>
        )}

        {/* Price & Specs row */}
        {(displaySettings.showPrices ||
          displaySettings.showProductSize ||
          displaySettings.showProductColor) && (
          <div className={`mt-auto pt-3 border-t border-[#E5E5E5] flex justify-between items-center ${
            isOneColumn ? 'flex-row' : 'flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-0'
          }`}>
            {displaySettings.showPrices && (
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-[#757575] font-mono">Biaya Sewa</span>
                <span className={`text-[#000000] font-semibold font-mono ${isOneColumn ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}>
                  {formatPrice(product.rentalPrice)} <span className="text-[9px] font-normal text-[#4A4A4A]">/hari</span>
                </span>
              </div>
            )}

            {(displaySettings.showProductSize || displaySettings.showProductColor) && (
              <div className={`flex flex-wrap gap-1.5 ${isOneColumn ? 'items-center' : 'mt-1 sm:mt-0'}`}>
                {displaySettings.showProductSize && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-[#F5F5F5] text-[#4A4A4A] rounded font-mono">
                    Ukuran {product.size}
                  </span>
                )}
                {displaySettings.showProductColor && (
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-[#F5F5F5] text-[#4A4A4A] rounded font-mono">
                    {product.color}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Quick Link in 1-column layout */}
        {displaySettings.showCardCta && (
          <button
            onClick={() => onOpenDetail(product)}
            className="mt-4 w-full bg-[#000000] hover:bg-[#333333] text-[#FFFFFF] hover:text-[#000000] text-xs sm:text-sm font-semibold tracking-wider uppercase py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            Detail & Cek Ketersediaan
          </button>
        )}
      </div>
    </div>
  );
}
