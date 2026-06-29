'use client';

import React, { useState, useRef } from 'react';
import { KebayaItem, SiteSettings } from '@/data/mockData';

interface ProductCardProps {
  product: KebayaItem;
  layoutColumns: number;
  isMobile: boolean;
  displaySettings: SiteSettings;
  onOpenDetail: (product: KebayaItem) => void;
}

export default function ProductCard({
  product,
  layoutColumns,
  isMobile,
  displaySettings,
  onOpenDetail,
}: ProductCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const fallbackProductData = JSON.stringify(product);

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
  const isSquareTile = isMobile && layoutColumns === 3;

  // Layout-specific styling classes
  const isOneColumn = layoutColumns === 1;
  const isMobileTwoColumn = isMobile && layoutColumns === 2;

  if (isSquareTile) {
    return (
      <button
        type="button"
        data-farsha-card
        data-farsha-product={fallbackProductData}
        onClick={() => onOpenDetail(product)}
        className="theme-soft-surface group relative aspect-square w-full overflow-hidden text-left"
        aria-label={`Lihat detail ${product.name}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrls[0]}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
        {displaySettings.showAvailabilityBadges && (
          <span
            className={`mobile-availability-dot absolute right-1.5 top-1.5 h-2.5 w-2.5 border border-[var(--theme-surface)] shadow-sm ${
              product.status === 'available'
                ? 'bg-emerald-500'
                : product.status === 'rented'
                  ? 'bg-amber-500'
                  : product.status === 'maintenance'
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
            }`}
            aria-label={statusInfo.text}
          />
        )}
      </button>
    );
  }

  return (
    <div
      data-farsha-card
      data-farsha-product={fallbackProductData}
      className={`theme-surface theme-border group flex flex-col border overflow-hidden transition-all duration-300 ${
        isOneColumn ? ' shadow-sm hover:shadow-md' : ' hover:shadow-sm'
      }`}
    >
      {/* CARD IMAGE AREA */}
      <div className="theme-soft-surface relative w-full overflow-hidden">
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
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                </div>
              ))}
            </div>

            {/* Carousel Dot Indicators */}
            {product.imageUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[color-mix(in_srgb,var(--theme-text)_72%,transparent)] backdrop-blur-xs px-2.5 py-1.5 z-10">
                {product.imageUrls.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (carouselRef.current) {
                        carouselRef.current.scrollTo({
                          left: index * carouselRef.current.clientWidth,
                          behavior: 'smooth',
                        });
                        setActiveImageIndex(index);
                      }
                    }}
                    className={`w-1.5 h-1.5 transition-all duration-300 ${
                      activeImageIndex === index
                        ? 'bg-[var(--theme-surface)] w-3'
                        : 'bg-[color-mix(in_srgb,var(--theme-surface)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--theme-surface)_72%,transparent)]'
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
            <span className="text-[10px] tracking-wider uppercase bg-[color-mix(in_srgb,var(--theme-text)_82%,transparent)] text-[var(--theme-surface)] px-2 py-0.5 font-mono font-semibold backdrop-blur-xs">
              {product.code}
            </span>
          )}
          {displaySettings.showAvailabilityBadges && (
            <span
              className={`text-[10px] font-semibold tracking-wide border px-2 py-0.5 backdrop-blur-xs shadow-xs ${statusInfo.class}`}
            >
              {statusInfo.text}
            </span>
          )}
        </div>
      </div>

      {/* CARD CONTENT */}
      <div
        className={`flex flex-col flex-grow ${
          isOneColumn ? 'p-5' : isMobileTwoColumn ? 'p-2.5' : 'p-3 sm:p-4'
        }`}
      >
        {/* Kebaya Model Category */}
        {displaySettings.showProductModel && (
          <span className="theme-muted text-[10px] sm:text-xs font-semibold tracking-wider uppercase font-mono mb-1">
            Koleksi {product.model}
          </span>
        )}

        {/* Title */}
        <h3
          onClick={() => onOpenDetail(product)}
          className={`font-serif text-[var(--theme-text)] cursor-pointer hover:text-[var(--theme-accent)] transition-colors leading-tight font-medium ${
            isOneColumn ? 'text-lg sm:text-xl mb-2' : 'text-sm sm:text-base mb-1 line-clamp-2'
          }`}
        >
          {product.name}
        </h3>

        {/* Technical features summary for 1-column layout */}
        {isOneColumn && displaySettings.showProductDescription && (
          <p className="theme-muted-strong text-xs sm:text-sm line-clamp-2 mb-4 leading-relaxed font-sans">
            {product.description}
          </p>
        )}

        {/* Price & Specs row */}
        {(displaySettings.showPrices ||
          displaySettings.showProductSize ||
          displaySettings.showProductColor) && (
          <div
            className={`theme-border mt-auto pt-3 border-t flex justify-between items-center ${
              isOneColumn
                ? 'flex-row'
                : 'flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-0'
            }`}
          >
            {displaySettings.showPrices && (
              <div className="flex flex-col">
                <span className="theme-muted text-[9px] uppercase tracking-wider font-mono">
                  Biaya Sewa
                </span>
                <span
                  className={`text-[var(--theme-text)] font-semibold font-mono ${isOneColumn ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'}`}
                >
                  {formatPrice(product.rentalPrice)}{' '}
                  <span className="theme-muted-strong text-[9px] font-normal">/hari</span>
                </span>
              </div>
            )}

            {(displaySettings.showProductSize || displaySettings.showProductColor) && (
              <div
                className={`flex flex-wrap gap-1.5 ${isOneColumn ? 'items-center' : 'mt-1 sm:mt-0'}`}
              >
                {displaySettings.showProductSize && (
                  <span className="theme-soft-surface theme-muted-strong text-[10px] font-medium px-2 py-0.5 font-mono">
                    Ukuran {product.size}
                  </span>
                )}
                {displaySettings.showProductColor && (
                  <span className="theme-soft-surface theme-muted-strong text-[10px] font-medium px-2 py-0.5 font-mono">
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
            className="theme-primary-action mt-4 w-full text-xs sm:text-sm font-semibold tracking-wider uppercase py-3 transition-all duration-300 flex items-center justify-center gap-2"
          >
            Detail
          </button>
        )}
      </div>
    </div>
  );
}
