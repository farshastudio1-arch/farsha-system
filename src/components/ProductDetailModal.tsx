'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CalendarDays, RotateCcw } from 'lucide-react';
import { KebayaItem } from '@/data/mockData';
import {
  addPreviewDays,
  getPreviewBookingChangeEventName,
  getPreviewBookingConflict,
  getPosAvailabilityBlockForBooking,
  mergePreviewBookings,
  previewBookings,
  previewDpAmount,
  readStoredPreviewBookings,
} from '@/lib/booking-preview';
import { matchesLandingCategory, occasionCategories } from '@/lib/landing-categories';
import { useSavedPosLedger } from '@/lib/pos-ledger-client';

interface ProductDetailModalProps {
  product: KebayaItem | null;
  studioPhone: string;
  onClose: () => void;
}

type ServerAvailabilityBlock = {
  source: string;
  reason: string;
  label: string;
  reference: string | null;
  itemId: string;
  startDate: string;
  endDate: string;
};

const weekdayLabels = ['MIN', 'SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB'];

const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long' });

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function calculatePickupAvailabilityDates(pickupDate: string) {
  if (!pickupDate) {
    return null;
  }

  return {
    pickupDate,
    eventDate: addPreviewDays(pickupDate, 1),
    returnDate: addPreviewDays(pickupDate, 3),
    bufferUntilDate: addPreviewDays(pickupDate, 5),
  };
}

function doDateRangesOverlap(
  firstStartDate: string,
  firstEndDate: string,
  secondStartDate: string,
  secondEndDate: string,
) {
  return firstStartDate <= secondEndDate && secondStartDate <= firstEndDate;
}

export default function ProductDetailModal({
  product,
  studioPhone,
  onClose,
}: ProductDetailModalProps) {
  const [activeImageSelection, setActiveImageSelection] = useState<{
    productId: string;
    index: number;
  } | null>(null);
  const [hasScrolledDetails, setHasScrolledDetails] = useState(false);
  const [bookingEventDate, setBookingEventDate] = useState('');
  const [isBookingCalendarOpen, setIsBookingCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [bookingQueue, setBookingQueue] = useState(previewBookings);
  const [serverAvailabilityBlocks, setServerAvailabilityBlocks] = useState<ServerAvailabilityBlock[]>([]);
  const ledger = useSavedPosLedger();

  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);
  const productId = product?.id;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [product]);

  useEffect(() => {
    if (!productId) return;

    const resetFrame = window.requestAnimationFrame(() => {
      setHasScrolledDetails(false);
      setBookingEventDate('');
      setIsBookingCalendarOpen(false);
      detailScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(resetFrame);
  }, [productId]);

  useEffect(() => {
    const syncPreviewBookings = () => {
      setBookingQueue(mergePreviewBookings(readStoredPreviewBookings()));
    };

    syncPreviewBookings();
    window.addEventListener('storage', syncPreviewBookings);
    window.addEventListener(getPreviewBookingChangeEventName(), syncPreviewBookings);

    return () => {
      window.removeEventListener('storage', syncPreviewBookings);
      window.removeEventListener(getPreviewBookingChangeEventName(), syncPreviewBookings);
    };
  }, []);

  useEffect(() => {
    if (!productId) {
      return;
    }

    const currentProductId = productId;
    const controller = new AbortController();

    async function syncServerAvailability() {
      try {
        const response = await fetch(
          `/api/catalog/availability?itemId=${encodeURIComponent(currentProductId)}&month=${calendarMonth + 1}&year=${calendarYear}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: { blocks?: ServerAvailabilityBlock[] };
        };

        if (response.ok && payload.ok && Array.isArray(payload.data?.blocks)) {
          setServerAvailabilityBlocks(payload.data.blocks);
          return;
        }

        setServerAvailabilityBlocks([]);
      } catch {
        if (!controller.signal.aborted) {
          setServerAvailabilityBlocks([]);
        }
      }
    }

    syncServerAvailability();

    return () => controller.abort();
  }, [calendarMonth, calendarYear, productId]);

  const selectedImageIndex =
    activeImageSelection && activeImageSelection.productId === product?.id
      ? activeImageSelection.index
      : 0;
  const activeImgIndex = product ? Math.min(selectedImageIndex, product.imageUrls.length - 1) : 0;
  const selectedPickupDate = bookingEventDate;
  const selectedEventDate = useMemo(
    () => (selectedPickupDate ? addPreviewDays(selectedPickupDate, 1) : ''),
    [selectedPickupDate],
  );
  const selectedReturnStartDate = useMemo(
    () => (selectedPickupDate ? addPreviewDays(selectedPickupDate, 2) : ''),
    [selectedPickupDate],
  );
  const selectedReturnEndDate = useMemo(
    () => (selectedPickupDate ? addPreviewDays(selectedPickupDate, 3) : ''),
    [selectedPickupDate],
  );
  const selectedCleaningStartDate = useMemo(
    () => (selectedPickupDate ? addPreviewDays(selectedPickupDate, 4) : ''),
    [selectedPickupDate],
  );
  const selectedCleaningEndDate = useMemo(
    () => (selectedPickupDate ? addPreviewDays(selectedPickupDate, 5) : ''),
    [selectedPickupDate],
  );
  const bookingDates = useMemo(
    () => calculatePickupAvailabilityDates(selectedPickupDate),
    [selectedPickupDate],
  );
  const bookingConflict = useMemo(
    () => (product ? getPreviewBookingConflict(product.id, bookingDates, bookingQueue) : null),
    [bookingDates, bookingQueue, product],
  );
  const posAvailabilityBlock = useMemo(
    () => (product ? getPosAvailabilityBlockForBooking(product, bookingDates, ledger) : null),
    [bookingDates, ledger, product],
  );
  const serverAvailabilityBlock = useMemo(() => {
    if (!product || !bookingDates) {
      return null;
    }

    return (
      serverAvailabilityBlocks.find(
        (block) =>
          block.itemId === product.id &&
          doDateRangesOverlap(
            bookingDates.pickupDate,
            bookingDates.bufferUntilDate,
            block.startDate,
            block.endDate,
          ),
      ) ?? null
    );
  }, [bookingDates, product, serverAvailabilityBlocks]);
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) => ({
        value: month,
        label: monthFormatter.format(new Date(calendarYear, month, 1)),
      })),
    [calendarYear],
  );
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear + index);
  }, []);
  const calendarDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstMonthDate = new Date(calendarYear, calendarMonth, 1);
    const firstVisibleDate = new Date(firstMonthDate);
    firstVisibleDate.setDate(firstMonthDate.getDate() - firstMonthDate.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(firstVisibleDate);
      date.setDate(firstVisibleDate.getDate() + index);
      date.setHours(0, 0, 0, 0);
      const value = formatDateInputValue(date);
      const dates = calculatePickupAvailabilityDates(value);
      const conflict = product ? getPreviewBookingConflict(product.id, dates, bookingQueue) : null;
      const posBlock = product ? getPosAvailabilityBlockForBooking(product, dates, ledger) : null;
      const serverBlock =
        product && dates
          ? serverAvailabilityBlocks.find(
              (block) =>
                block.itemId === product.id &&
                doDateRangesOverlap(
                  dates.pickupDate,
                  dates.bufferUntilDate,
                  block.startDate,
                  block.endDate,
                ),
            )
          : null;
      const isCurrentMonth = date.getMonth() === calendarMonth && date.getFullYear() === calendarYear;
      const isPastOrToday = date <= today;
      const isBooked = Boolean(conflict || posBlock || serverBlock);

      return {
        value,
        date,
        isCurrentMonth,
        isBooked,
        blockLabel: serverBlock?.label ?? posBlock?.label ?? null,
        disabled: !isCurrentMonth || isPastOrToday || isBooked,
      };
    });
  }, [bookingQueue, calendarMonth, calendarYear, ledger, product, serverAvailabilityBlocks]);

  // Sync mobile carousel scroll when activeImgIndex changes
  useEffect(() => {
    if (mobileCarouselRef.current && product) {
      const container = mobileCarouselRef.current;
      const targetScrollLeft = activeImgIndex * container.clientWidth;
      if (Math.abs(container.scrollLeft - targetScrollLeft) > 5) {
        container.scrollTo({
          left: targetScrollLeft,
          behavior: 'smooth',
        });
      }
    }
  }, [activeImgIndex, product]);

  if (!product) return null;

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    if (index !== activeImgIndex && product) {
      setActiveImageSelection({ productId: product.id, index });
    }
  };

  const handleDetailScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasScrolledDetails && e.currentTarget.scrollTop > 12) {
      setHasScrolledDetails(true);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  // WhatsApp Deep-Link generator
  const getWhatsAppLink = () => {
    const cleanPhone = studioPhone.replace(/[^0-9]/g, ''); // strip spaces, +, dashes
    const dateText = bookingDates
      ? ` untuk pickup tanggal ${formatDate(bookingDates.pickupDate)} dan acara tanggal ${formatDate(bookingDates.eventDate)}`
      : '';
    const message = `Halo, saya tertarik dengan ${product.name} (kode: ${product.code})${dateText}. Apakah masih tersedia?`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return { text: 'AVAILABLE', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'rented':
        return { text: 'RENTED', class: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'maintenance':
        return { text: 'DICUCI', class: 'bg-rose-50 text-rose-800 border-rose-200' };
      default:
        return { text: 'ARSIP', class: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  const statusBadge = getStatusBadge(product.status);
  const visibleCompareAtRentalPrice =
    product.compareAtRentalPrice && product.compareAtRentalPrice > product.rentalPrice
      ? product.compareAtRentalPrice
      : null;

  const getDefaultMeasurements = (size: string) => {
    switch (size) {
      case 'S-M':
        return {
          bust: '88-94 cm',
          waist: '70-76 cm',
          length: '60-62 cm',
          sleeveLength: '52-54 cm',
          armhole: '42-44 cm',
          otherDetails: '',
          rentalCategory: 'Makassar Only',
        };
      case 'L-XL':
        return {
          bust: '100-106 cm',
          waist: '82-88 cm',
          length: '64-66 cm',
          sleeveLength: '56-58 cm',
          armhole: '46-48 cm',
          otherDetails: '',
          rentalCategory: 'Makassar Only',
        };
      default:
        return {
          bust: '90-102 cm (Adjustable)',
          waist: '72-84 cm',
          length: '63 cm',
          sleeveLength: '55 cm',
          armhole: '45 cm',
          otherDetails: '',
          rentalCategory: 'Makassar Only',
        };
    }
  };

  const defaultMeasurements = getDefaultMeasurements(product.size);
  const measurements = {
    bust: product.measurements?.bust || defaultMeasurements.bust,
    waist: product.measurements?.waist || defaultMeasurements.waist,
    length: product.measurements?.length || defaultMeasurements.length,
    sleeveLength: product.measurements?.sleeveLength || defaultMeasurements.sleeveLength,
    armhole: product.measurements?.armhole || defaultMeasurements.armhole,
    otherDetails: product.measurements?.otherDetails || defaultMeasurements.otherDetails,
    rentalCategory: product.measurements?.rentalCategory || defaultMeasurements.rentalCategory,
  };

  // Get matched occasion categories
  const matchedCategories = occasionCategories.filter((category) =>
    matchesLandingCategory(product, category.value),
  );
  const rentalIncludes = product.rentalIncludes ?? ['Skirt', 'Kebaya', 'Hijab', 'Manset', 'Bustier'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="theme-surface theme-border relative w-full max-w-4xl shadow-2xl border flex flex-col md:flex-row overflow-hidden max-h-[92dvh] md:max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Unified Static Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2.5 bg-[color-mix(in_srgb,var(--theme-surface)_88%,transparent)] backdrop-blur-md text-[var(--theme-text)] border theme-border transition-all hover:scale-105 duration-200 shadow-sm hover:bg-[var(--theme-surface)]"
          aria-label="Tutup"
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

        {/* Scrollable container wrapping both panels together */}
        <div
          ref={detailScrollRef}
          onScroll={handleDetailScroll}
          className="flex-1 overflow-y-auto flex flex-col md:flex-row min-h-0 no-scrollbar"
        >
          {/* LEFT PANEL: Media Gallery */}
          <div className="theme-soft-surface theme-border w-full md:w-1/2 shrink-0 flex flex-col p-3 sm:p-4 md:p-6 relative justify-center border-b md:border-b-0 md:border-r">
            {/* Desktop Visual */}
            <div className="hidden md:block theme-soft-surface relative aspect-[4/5] w-full overflow-hidden shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrls[activeImgIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Mobile Swipable Visual */}
            <div className="block md:hidden relative w-full aspect-[4/5] overflow-hidden shadow-xs">
              {/* Mobile Photo Count Badge */}
              {product.imageUrls.length > 1 && (
                <div className="absolute top-3 left-3 bg-[color-mix(in_srgb,var(--theme-text)_75%,transparent)] text-[var(--theme-surface)] text-[10px] font-mono font-bold px-2.5 py-1 z-10 pointer-events-none shadow-sm rounded-sm">
                  {activeImgIndex + 1}/{product.imageUrls.length}
                </div>
              )}
              <div
                ref={mobileCarouselRef}
                onScroll={handleMobileScroll}
                className="flex w-full h-full overflow-x-auto scroll-snap-x snap-mandatory no-scrollbar"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {product.imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="w-full h-full shrink-0 scroll-snap-align-center relative"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${product.name} - Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>

              {/* Mobile Carousel Dot Indicators */}
              {product.imageUrls.length > 1 && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-[color-mix(in_srgb,var(--theme-text)_60%,transparent)] backdrop-blur-xs px-2.5 py-1 rounded-full z-10">
                  {product.imageUrls.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (mobileCarouselRef.current) {
                          mobileCarouselRef.current.scrollTo({
                            left: index * mobileCarouselRef.current.clientWidth,
                            behavior: 'smooth',
                          });
                          setActiveImageSelection({ productId: product.id, index });
                        }
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        activeImgIndex === index
                          ? 'bg-[var(--theme-surface)] w-3'
                          : 'bg-[color-mix(in_srgb,var(--theme-surface)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--theme-surface)_70%,transparent)]'
                      }`}
                      aria-label={`Lihat foto ${index + 1}`}
                    />
                  ))}
                </div>
              )}

              {!hasScrolledDetails && (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-[9] h-24 bg-gradient-to-t from-black/38 via-black/12 to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="product-detail-scroll-cue pointer-events-none absolute bottom-12 right-4 z-[11] flex flex-col items-end gap-1 rounded-full bg-[color-mix(in_srgb,var(--theme-text)_72%,transparent)] px-3 py-2 text-[var(--theme-surface)] shadow-sm backdrop-blur-xs"
                  >
                    <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em]">
                      Geser bawah untuk detail
                    </span>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.4"
                        d="M6 9l6 6 6-6"
                      />
                    </svg>
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails Row */}
            {product.imageUrls.length > 1 && (
              <div className="hidden md:flex gap-2 sm:gap-2.5 mt-3 md:mt-4 overflow-x-auto py-0.5 md:py-1 no-scrollbar justify-center">
                {product.imageUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageSelection({ productId: product.id, index })}
                    className={`w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 overflow-hidden border-2 shrink-0 transition-all ${
                      activeImgIndex === index
                        ? 'border-[var(--theme-primary)] scale-105 shadow-sm'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Details & CTA */}
          <div className="w-full md:w-1/2 flex flex-col min-h-0 relative">
            {/* Details Content Area */}
            <div className="flex-1 p-5 sm:p-6 md:p-8 pb-4">
              {/* Product Header */}
              <div className="mb-3">
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <span className="text-[10px] uppercase tracking-widest bg-[var(--theme-text)] text-[var(--theme-surface)] px-2 py-0.5 font-mono font-semibold">
                    {product.code}
                  </span>
                  <span
                    className={`text-[10px] font-semibold tracking-wide border px-2 py-0.5 ${statusBadge.class}`}
                  >
                    {statusBadge.text}
                  </span>
                </div>

                <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-[var(--theme-text)] font-semibold leading-tight">
                  {product.name}
                </h2>
              </div>

              {/* Sizing & Kategori Badges (Competitor Layout element) */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="theme-soft-surface theme-border border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono text-[var(--theme-text)]">
                  {product.model}
                </span>
                <span className="theme-soft-surface theme-border border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono text-[var(--theme-text)]">
                  {product.color}
                </span>
                <span className="theme-soft-surface theme-border border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono text-[var(--theme-text)]">
                  Fit {product.size}
                </span>
                {product.canResize && (
                  <span className="border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono text-emerald-700">
                    Bisa Resize
                  </span>
                )}
                {product.wearStyles.map((style) => (
                  <span
                    key={style}
                    className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono text-neutral-900 ${
                      style === 'Hijab' ? 'bg-[#f8edeb]' : 'bg-[#f5ebe0]'
                    }`}
                  >
                    {style}
                  </span>
                ))}
                {matchedCategories.map((cat, idx) => (
                  <span
                    key={idx}
                    className="bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)] border border-[color-mix(in_srgb,var(--theme-accent)_20%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono text-[var(--theme-text)] flex items-center gap-1"
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </span>
                ))}
              </div>

              {/* Description */}
              <div className="mb-5">
                <p className="theme-muted-strong text-sm leading-relaxed font-sans">
                  {product.description || "Tidak ada deskripsi untuk produk ini."}
                </p>
              </div>

              {/* Technical Size Specs (Competitor Layout element) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y theme-border py-4 mb-6">
                <div>
                  <h4 className="theme-muted text-[10px] font-bold uppercase tracking-wider font-mono mb-2">
                    Detail Ukuran
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[var(--theme-text)] font-mono">
                    <li className="flex justify-between border-b border-dashed theme-border pb-1">
                      <span className="theme-muted">Lingkar Dada:</span>
                      <span className="font-semibold">{measurements.bust}</span>
                    </li>
                    <li className="flex justify-between border-b border-dashed theme-border pb-1">
                      <span className="theme-muted">Lingkar Pinggang:</span>
                      <span className="font-semibold">{measurements.waist}</span>
                    </li>
                    <li className="flex justify-between border-b border-dashed theme-border pb-1">
                      <span className="theme-muted">Panjang Baju:</span>
                      <span className="font-semibold">{measurements.length}</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="theme-muted text-[10px] font-bold uppercase tracking-wider font-mono mb-2">
                    Detail Lainnya
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[var(--theme-text)] font-mono">
                    <li className="flex justify-between border-b border-dashed theme-border pb-1">
                      <span className="theme-muted">Panjang Lengan:</span>
                      <span className="font-semibold">{measurements.sleeveLength}</span>
                    </li>
                    <li className="flex justify-between border-b border-dashed theme-border pb-1">
                      <span className="theme-muted">Kerung Ketiak:</span>
                      <span className="font-semibold">{measurements.armhole}</span>
                    </li>
                    <li className="flex justify-between border-b border-dashed theme-border pb-1">
                      <span className="theme-muted">Kategori Sewa:</span>
                      <span className="font-semibold">{measurements.rentalCategory}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {measurements.otherDetails && (
                <div className="mb-6 border theme-border theme-soft-surface p-4">
                  <h4 className="theme-muted text-[10px] font-bold uppercase tracking-wider font-mono mb-2">
                    Catatan Detail
                  </h4>
                  <p className="theme-muted-strong text-xs leading-relaxed">
                    {measurements.otherDetails}
                  </p>
                </div>
              )}

              {rentalIncludes.length > 0 && (
                <div className="mb-6 border theme-border theme-soft-surface p-4">
                  <h4 className="theme-muted text-[10px] font-bold uppercase tracking-wider font-mono mb-3">
                    Yang Termasuk Sewa
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {rentalIncludes.map((item) => (
                      <span
                        key={item}
                        className="border theme-border bg-[var(--theme-surface)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono text-[var(--theme-text)]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ketentuan Sewa (Competitor Layout element) */}
              <div className="mb-6">
                <h4 className="theme-muted text-xs font-semibold uppercase tracking-wider font-mono mb-3">
                  Ketentuan Sewa
                </h4>
                <ul className="space-y-2.5 text-xs theme-muted-strong leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span><strong>Datang langsung:</strong> Kamu bisa datang langsung ke store kami tanpa appointment.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span><strong>Uang Jaminan:</strong> Rp 100.000 (titipan aman saat pelunasan, dikembalikan 100% setelah kebaya kembali).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span><strong>Biaya Booking:</strong> Rp 100.000 per kebaya untuk keep tanggal sewa.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span><strong>Laundry Premium:</strong> Gratis laundry (cuci & setrika steril dari studio, tidak perlu dicuci setelah disewa).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span><strong>Durasi Sewa:</strong> Standar 3 hari (dihitung sejak pengambilan di studio).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span><strong>Fitting Gratis:</strong> Fitting langsung di studio Paccerakkang, Makassar (bisa disesuaikan gratis).</span>
                  </li>
                </ul>
              </div>

              <div className="mb-6 border theme-border theme-soft-surface p-4 lg:p-5">
                <div className="border-b theme-border pb-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div>
                      <h4 className="max-w-[34rem] text-base font-semibold leading-snug text-[var(--theme-text)]">
                        Acara kamu masih nanti? Amankan tanggal dulu biar bajunya nda diambil orang
                      </h4>
                      <p className="mt-1 text-xs theme-muted-strong leading-relaxed">
                        Pilih bulan, tahun, lalu tanggal acara yang masih tersedia.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBookingCalendarOpen((isOpen) => !isOpen)}
                      aria-expanded={isBookingCalendarOpen}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-900 transition-colors hover:border-emerald-500 hover:bg-emerald-100 sm:min-w-44"
                    >
                      <CalendarDays className="h-4 w-4" aria-hidden="true" />
                      Cek tanggal
                    </button>
                  </div>
                </div>

                {isBookingCalendarOpen && (
                  <div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">
                          Bulan
                        </span>
                        <select
                          value={calendarMonth}
                          onChange={(event) => {
                            setCalendarMonth(Number(event.target.value));
                            setBookingEventDate('');
                          }}
                          className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-950 outline-none transition-colors focus:border-neutral-900"
                        >
                          {monthOptions.map((month) => (
                            <option key={month.value} value={month.value}>
                              {month.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">
                          Tahun
                        </span>
                        <select
                          value={calendarYear}
                          onChange={(event) => {
                            setCalendarYear(Number(event.target.value));
                            setBookingEventDate('');
                          }}
                          className="h-11 w-full border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-950 outline-none transition-colors focus:border-neutral-900"
                        >
                          {yearOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-7 gap-1 border-b border-neutral-200 pb-2">
                      {weekdayLabels.map((label) => (
                        <span
                          key={label}
                          className="text-center text-[10px] font-semibold uppercase text-neutral-500"
                        >
                          {label}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {calendarDates.map((day) => {
                        const isPickup = selectedPickupDate === day.value;
                        const isEvent = selectedEventDate === day.value;
                        const isReturnEstimate =
                          selectedReturnStartDate === day.value || selectedReturnEndDate === day.value;
                        const isCleaningBuffer =
                          selectedCleaningStartDate === day.value || selectedCleaningEndDate === day.value;
                        const dayRoleLabel = isPickup
                          ? 'Pickup'
                          : isEvent
                            ? 'Acara'
                            : isReturnEstimate
                              ? 'Return'
                              : '';

                        return (
                          <button
                            key={day.value}
                            type="button"
                            disabled={day.disabled}
                            onClick={() => setBookingEventDate(day.value)}
                            className={`flex aspect-square min-h-10 flex-col items-center justify-center border px-1 text-sm font-semibold leading-none transition-colors sm:min-h-11 ${
                              isPickup
                                ? 'border-emerald-800 bg-emerald-800 text-white'
                                : isEvent
                                  ? 'border-sky-300 bg-sky-50 text-sky-900'
                                  : isReturnEstimate
                                    ? 'border-teal-300 bg-teal-50 text-teal-900'
                                    : isCleaningBuffer
                                      ? 'border-violet-200 bg-violet-50 text-violet-900'
                                      : day.isBooked
                                        ? 'cursor-not-allowed border-orange-200 bg-orange-50 text-orange-700'
                                        : day.disabled
                                          ? 'cursor-not-allowed border-neutral-100 bg-neutral-100 text-neutral-300'
                                          : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-500 hover:bg-emerald-100'
                            }`}
                            aria-label={`${day.disabled ? day.blockLabel ?? 'Tidak tersedia' : 'Pilih pickup'} ${formatDate(day.value)}`}
                          >
                            <span>{day.date.getDate()}</span>
                            {dayRoleLabel && (
                              <span className="mt-1 text-[8px] font-bold uppercase tracking-wider">
                                {dayRoleLabel}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold uppercase text-neutral-500">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 border border-emerald-200 bg-emerald-50" />
                        Tanggal tersedia
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 border border-orange-200 bg-orange-50" />
                        Tidak tersedia / ter-booking
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 border border-sky-300 bg-sky-50" />
                        Hari acara
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 border border-teal-300 bg-teal-50" />
                        Estimasi return
                      </span>
                    </div>

                    {bookingDates && !bookingConflict && !posAvailabilityBlock && !serverAvailabilityBlock && (
                      <div className="mt-4 flex flex-col gap-3 border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          Pickup <strong>{formatDate(bookingDates.pickupDate)}</strong>, acara{' '}
                          <strong>{formatDate(bookingDates.eventDate)}</strong>. Estimasi return{' '}
                          <strong>{formatDate(selectedReturnStartDate)}</strong> -{' '}
                          <strong>{formatDate(selectedReturnEndDate)}</strong>.
                        </span>
                        <button
                          type="button"
                          onClick={() => setBookingEventDate('')}
                          className="inline-flex min-h-9 shrink-0 items-center justify-center gap-2 border border-emerald-300 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-900 transition-colors hover:border-emerald-600 hover:bg-emerald-100"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          Reset tanggal
                        </button>
                      </div>
                    )}

                    {bookingDates && bookingConflict && (
                      <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
                        Tanggal ini sudah ter-booking oleh {bookingConflict.bookingNumber}. Pilih tanggal lain untuk lanjut.
                      </div>
                    )}

                    {bookingDates && posAvailabilityBlock && (
                      <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
                        {posAvailabilityBlock.label} sampai <strong>{formatDate(posAvailabilityBlock.endDate)}</strong>.
                        Pilih tanggal lain untuk lanjut.
                      </div>
                    )}

                    {bookingDates && serverAvailabilityBlock && (
                      <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
                        {serverAvailabilityBlock.label} sampai <strong>{formatDate(serverAvailabilityBlock.endDate)}</strong>.
                        Pilih tanggal lain untuk lanjut.
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Rented State Info Box */}
              {product.status === 'rented' && product.rentalEndDate && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-amber-700 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h5 className="text-xs font-semibold text-amber-800 uppercase tracking-wider font-mono">
                      Sedang Disewa Pihak Lain
                    </h5>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Kebaya ini sedang disewa. Estimasi kembali dan siap disewa lagi tanggal <strong>{formatDate(product.rentalEndDate)}</strong>. Hubungi admin untuk sewa tanggal berikutnya.
                    </p>
                  </div>
                </div>
              )}

              {/* Maintenance State Info Box */}
              {product.status === 'maintenance' && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-rose-700 shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <h5 className="text-xs font-semibold text-rose-800 uppercase tracking-wider font-mono">
                      Dalam Perawatan (Maintenance)
                    </h5>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      Item ini sedang dalam perawatan/pembersihan. Silakan hubungi admin untuk menanyakan kapan tersedia kembali.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Info Grid Trust Badges (Competitor Layout element) */}
              <div className="grid grid-cols-2 gap-2 border-t theme-border pt-4 mb-2 text-center">
                <div className="flex flex-col items-center justify-center p-3 theme-soft-surface border theme-border">
                  <span className="text-base" aria-hidden="true">✨</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider font-mono mt-1 text-[var(--theme-text)]">Laundry Bersih</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 theme-soft-surface border theme-border">
                  <span className="text-base" aria-hidden="true">📏</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider font-mono mt-1 text-[var(--theme-text)]">Fitting Studio</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 theme-soft-surface border theme-border">
                  <span className="text-base" aria-hidden="true">💰</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider font-mono mt-1 text-[var(--theme-text)]">Harga Bersahabat</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 theme-soft-surface border theme-border">
                  <span className="text-base" aria-hidden="true">📍</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider font-mono mt-1 text-[var(--theme-text)]">Makassar Area</span>
                </div>
              </div>
            </div>

            {/* Pinned Bottom Rental Price & CTA Bar */}
            <div
              className={`sticky bottom-0 z-10 theme-border bg-[var(--theme-surface)] py-4 px-5 sm:px-6 md:px-8 border-t shrink-0 ${
                bookingDates
                  ? 'grid gap-3 md:grid-cols-2 md:items-stretch'
                  : 'flex flex-row items-center justify-between gap-4'
              }`}
            >
              <div className="flex flex-col md:self-center">
                <span className="theme-muted text-[10px] uppercase tracking-wider font-mono">
                  Harga Sewa
                </span>
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  {visibleCompareAtRentalPrice && (
                    <span className="theme-muted-strong text-sm font-mono line-through">
                      {formatPrice(visibleCompareAtRentalPrice)}
                    </span>
                  )}
                  <span className="text-2xl font-semibold font-mono text-[var(--theme-text)]">
                    {formatPrice(product.rentalPrice)}
                  </span>
                  <span className="theme-muted-strong text-xs font-mono font-normal">
                    /3 hari
                  </span>
                </div>
              </div>

              {bookingDates ? (
                <>
                  <div className="flex min-h-[4.25rem] flex-col justify-center border theme-border bg-white px-3 py-2.5">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Biaya Booking
                    </span>
                    <strong className="mt-1 block font-mono text-lg text-neutral-950">
                      {formatPrice(previewDpAmount)}
                    </strong>
                  </div>
                  {!bookingConflict && !posAvailabilityBlock && !serverAvailabilityBlock ? (
                    <Link
                      href={{
                        pathname: '/booking',
                        query: {
                          itemId: product.id,
                          eventDate: bookingDates.pickupDate,
                        },
                      }}
                      className="inline-flex min-h-[4.25rem] w-full items-center justify-center bg-[#25D366] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:bg-[#20BA5A] hover:shadow-md md:col-span-2"
                    >
                      Booking Sekarang
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-[4.25rem] w-full cursor-not-allowed items-center justify-center bg-neutral-200 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 md:col-span-2"
                    >
                      Booking Sekarang
                    </button>
                  )}
                </>
              ) : (
                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white hover:bg-[#20BA5A] text-sm font-semibold tracking-wider uppercase px-6 py-3.5 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-[1px] md:justify-self-end md:min-w-52"
                >
                  {/* WhatsApp Simple SVG Icon */}
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.908-6.993-1.879-1.88-4.359-2.912-7-2.912-5.439 0-9.873 4.432-9.877 9.877-.001 1.769.479 3.498 1.39 5.031l-.963 3.518 3.6-.944z" />
                  </svg>
                  <span>WA Admin</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
