'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronDown, RotateCcw } from 'lucide-react';
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
import { formatRupiah } from '@/lib/formatters';
import { matchesLandingCategory, occasionCategories } from '@/lib/landing-categories';
import { useSavedPosLedger } from '@/lib/pos-ledger-client';
import {
  getFutureBookingBlockWindow,
  getPresentTransactionBlockWindow,
  normalizeAvailabilityDatePart,
} from '@/lib/availability-windows';

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

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function calculatePickupAvailabilityDates(pickupDate: string) {
  if (!pickupDate) {
    return null;
  }

  const returnDate = addPreviewDays(pickupDate, 2);
  const blockWindow = getFutureBookingBlockWindow(pickupDate, returnDate);

  if (!blockWindow) {
    return null;
  }

  return {
    pickupDate,
    eventDate: addPreviewDays(pickupDate, 1),
    returnDate,
    blockStartDate: blockWindow.startDate,
    bufferUntilDate: blockWindow.endDate,
  };
}

function getTodayDatePart() {
  return formatDateInputValue(new Date());
}

function getNextAvailableDate(blockedUntilDate: string) {
  return addPreviewDays(blockedUntilDate, 1);
}

function doDateRangesOverlap(
  firstStartDate: string,
  firstEndDate: string,
  secondStartDate: string,
  secondEndDate: string,
) {
  return firstStartDate <= secondEndDate && secondStartDate <= firstEndDate;
}

function doesCandidateDateOverlapBlock(
  dates: NonNullable<ReturnType<typeof calculatePickupAvailabilityDates>>,
  block: ServerAvailabilityBlock,
) {
  if (block.source === 'booking') {
    return doDateRangesOverlap(
      dates.blockStartDate,
      dates.bufferUntilDate,
      block.startDate,
      block.endDate,
    );
  }

  return doDateRangesOverlap(dates.pickupDate, dates.pickupDate, block.startDate, block.endDate);
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
  const availabilitySectionRef = useRef<HTMLDivElement>(null);
  const productId = product?.id;

  // Lightbox State & Refs for fullscreen viewer
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen || !product) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % product.imageUrls.length);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + product.imageUrls.length) % product.imageUrls.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen, product]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !product) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;

    if (diff > 50) {
      // Swipe Right -> Go to previous photo
      setLightboxIndex((prev) => (prev - 1 + product.imageUrls.length) % product.imageUrls.length);
    } else if (diff < -50) {
      // Swipe Left -> Go to next photo
      setLightboxIndex((prev) => (prev + 1) % product.imageUrls.length);
    }

    touchStartX.current = null;
  };

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
  const selectedBufferStartDate = useMemo(
    () => (selectedPickupDate ? addPreviewDays(selectedPickupDate, 3) : ''),
    [selectedPickupDate],
  );
  const selectedCleaningStartDate = useMemo(
    () => (selectedPickupDate ? addPreviewDays(selectedPickupDate, 4) : ''),
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
          doesCandidateDateOverlapBlock(bookingDates, block),
      ) ?? null
    );
  }, [bookingDates, product, serverAvailabilityBlocks]);
  const currentRentalAvailability = useMemo(() => {
    if (!product || product.status !== 'rented') {
      return null;
    }

    const openTransaction = ledger.transactions.find(
      (transaction) =>
        transaction.itemId === product.id &&
        transaction.kind === 'rental' &&
        transaction.status === 'open',
    );

    if (openTransaction) {
      const blockWindow = getPresentTransactionBlockWindow(openTransaction.startDate);

      if (blockWindow) {
        return {
          blockedUntilDate: blockWindow.endDate,
          readyDate: getNextAvailableDate(blockWindow.endDate),
        };
      }
    }

    const today = getTodayDatePart();
    const activeServerBlock = serverAvailabilityBlocks.find(
      (block) =>
        block.itemId === product.id &&
        block.reason === 'rented' &&
        block.startDate <= today &&
        today <= block.endDate,
    );

    if (activeServerBlock) {
      return {
        blockedUntilDate: activeServerBlock.endDate,
        readyDate: getNextAvailableDate(activeServerBlock.endDate),
      };
    }

    const legacyBlockedUntilDate = normalizeAvailabilityDatePart(product.rentalEndDate);

    return legacyBlockedUntilDate
      ? {
          blockedUntilDate: legacyBlockedUntilDate,
          readyDate: getNextAvailableDate(legacyBlockedUntilDate),
        }
      : null;
  }, [ledger.transactions, product, serverAvailabilityBlocks]);
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
                doesCandidateDateOverlapBlock(dates, block),
            )
          : null;
      const isCurrentMonth = date.getMonth() === calendarMonth && date.getFullYear() === calendarYear;
      const isPastDate = date < today;
      const isBooked = Boolean(conflict || posBlock || serverBlock);

      return {
        value,
        date,
        isCurrentMonth,
        isBooked,
        blockLabel: serverBlock?.label ?? posBlock?.label ?? null,
        isPastDate,
        disabled: !isCurrentMonth || isPastDate || isBooked,
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

  const openAvailabilityCheck = () => {
    setIsBookingCalendarOpen(true);
    window.setTimeout(() => {
      availabilitySectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  };

  const getWhatsAppLink = () => {
    const cleanPhone = studioPhone.replace(/[^0-9]/g, ''); // strip spaces, +, dashes
    const message = `Halo, saya tertarik dengan ${product.name} (kode: ${product.code}). Tanya-tanya dulu dong :D`;
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
  const isBookingBlocked = Boolean(bookingConflict || posAvailabilityBlock || serverAvailabilityBlock);
  const bookingBlockedLabel =
    bookingConflict?.bookingNumber ??
    posAvailabilityBlock?.label ??
    serverAvailabilityBlock?.label ??
    'Tanggal tidak tersedia';

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
  const primaryBadges = [
    product.model,
    product.color,
    `Fit ${product.size}`,
    product.canResize ? 'Bisa Resize' : '',
  ].filter(Boolean);
  const secondaryBadges = [
    ...product.wearStyles,
    ...matchedCategories.map((category) => `${category.emoji} ${category.label}`),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[var(--theme-surface)] transition-opacity duration-300 md:flex md:items-center md:justify-center md:bg-black/60 md:p-6 md:backdrop-blur-xs">
      {/* Click outside to close */}
      <div className="absolute inset-0 hidden md:block" onClick={onClose} />

      {/* Modal Container */}
      <div className="theme-surface relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden md:h-auto md:max-h-[90vh] md:max-w-4xl md:flex-row md:border md:theme-border md:shadow-2xl md:animate-in md:fade-in md:zoom-in-95 md:duration-200">
        {/* Unified Static Close Button */}
        <button
          onClick={onClose}
          className="absolute left-3 top-3 z-40 inline-flex min-h-10 items-center gap-2 border theme-border bg-[color-mix(in_srgb,var(--theme-surface)_90%,transparent)] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[var(--theme-text)] shadow-sm backdrop-blur-md transition-all duration-200 hover:bg-[var(--theme-surface)] md:left-auto md:right-4 md:top-4 md:min-h-0 md:p-2.5"
          aria-label="Kembali ke katalog"
        >
          <svg className="h-4 w-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="md:hidden">Katalog</span>
          <svg className="hidden h-5 w-5 md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row no-scrollbar"
        >
          {/* LEFT PANEL: Media Gallery */}
          <div className="relative flex w-full shrink-0 flex-col justify-center border-b theme-border bg-white md:w-1/2 md:border-b-0 md:border-r md:p-6 md:theme-soft-surface">
            {/* Desktop Visual */}
            <div 
              onClick={() => {
                setLightboxIndex(activeImgIndex);
                setIsLightboxOpen(true);
              }}
              className="hidden md:block theme-soft-surface relative aspect-[4/5] w-full overflow-hidden shadow-xs cursor-zoom-in group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrls[activeImgIndex]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              />
            </div>

            {/* Mobile Swipable Visual */}
            <div className="relative block h-[58svh] min-h-[25rem] w-full overflow-hidden md:hidden">
              {/* Mobile Photo Count Badge */}
              {product.imageUrls.length > 1 && (
                <div className="pointer-events-none absolute right-3 top-3 z-10 bg-[color-mix(in_srgb,var(--theme-text)_75%,transparent)] px-2.5 py-1 font-mono text-[10px] font-bold text-[var(--theme-surface)] shadow-sm">
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
                    onClick={() => {
                      setLightboxIndex(index);
                      setIsLightboxOpen(true);
                    }}
                    className="w-full h-full shrink-0 scroll-snap-align-center relative cursor-zoom-in"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${product.name} - Foto ${index + 1}`}
                      className="h-full w-full object-cover"
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
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-[9] h-24 bg-gradient-to-t from-black/30 via-black/10 to-transparent"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-4 right-4 z-10 inline-flex max-w-[72%] items-center gap-2 bg-black/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm backdrop-blur-sm"
                  >
                    <span>Geser bawah untuk detail</span>
                    <ChevronDown className="h-4 w-4 shrink-0" strokeWidth={2.4} />
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
          <div className="relative flex min-h-0 w-full flex-col md:w-1/2">
            {/* Details Content Area */}
            <div className="flex-1 p-5 pb-6 sm:p-6 md:p-8">
              {/* Product Header */}
              <div className="mb-4">
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
                <div className="mt-3 flex items-baseline gap-1.5 flex-wrap md:hidden">
                  {visibleCompareAtRentalPrice && (
                    <span className="theme-muted-strong text-sm font-mono line-through">
                      {formatRupiah(visibleCompareAtRentalPrice)}
                    </span>
                  )}
                  <span className="font-mono text-2xl font-semibold text-[var(--theme-text)]">
                    {formatRupiah(product.rentalPrice)}
                  </span>
                  <span className="theme-muted-strong font-mono text-xs font-normal">
                    /3 hari
                  </span>
                </div>
              </div>

              <div className="mb-5 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {primaryBadges.map((badge) => (
                    <span
                      key={badge}
                      className={`border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                        badge === 'Bisa Resize'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'theme-soft-surface theme-border text-[var(--theme-text)]'
                      }`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                {secondaryBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {secondaryBadges.map((badge) => (
                      <span
                        key={badge}
                        className="bg-[color-mix(in_srgb,var(--theme-border)_22%,var(--theme-surface))] px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-700"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
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

              <div className="mb-6 space-y-5">
                <h4 className="theme-muted text-xs font-semibold uppercase tracking-wider font-mono">
                  Cara Sewa di Farsha Studio
                </h4>

                <div className="space-y-4 text-xs leading-relaxed theme-muted-strong">
                  <section className="space-y-2">
                    <h5 className="text-sm font-semibold text-[var(--theme-text)]">1. Datang Langsung</h5>
                    <ul className="space-y-1.5">
                      <li>
                        <strong>Cocok untuk:</strong> Acara mendadak/mepet.
                      </li>
                      <li>
                        <strong>Benefit:</strong> Tanpa appointment, tanpa biaya booking. Cukup datang di jam
                        operasional, pilih, fitting, dan langsung bawa pulang.
                      </li>
                      <li>
                        <strong>Catatan:</strong> Pilihan baju terbatas pada ketersediaan di hari tersebut.
                      </li>
                    </ul>
                  </section>

                  <section className="space-y-2">
                    <h5 className="text-sm font-semibold text-[var(--theme-text)]">2. Booking Dulu</h5>
                    <ul className="space-y-1.5">
                      <li>
                        <strong>Cocok untuk:</strong> Acara jauh-jauh hari.
                      </li>
                      <li>
                        <strong>Benefit:</strong> Bebas pilih style favorit tanpa takut kehabisan slot.
                      </li>
                      <li>
                        <strong>Catatan:</strong> Mengisi tanggal di tombol &quot;Cek Tanggal&quot; bawah &
                        membayar biaya booking Rp100.000/kebaya untuk kunci tanggal.
                      </li>
                    </ul>
                  </section>
                </div>

                <div>
                  <h4 className="theme-muted text-xs font-semibold uppercase tracking-wider font-mono mb-3">
                    Ketentuan Sewa
                  </h4>
                  <ul className="space-y-2 text-xs theme-muted-strong leading-relaxed">
                    <li>
                      <strong>Uang Jaminan:</strong> Rp100.000 (dikembalikan 100% setelah kebaya kembali aman).
                    </li>
                    <li>
                      <strong>Premium Laundry:</strong> Gratis! Kebaya sudah steril & tidak perlu dicuci setelah
                      dipakai.
                    </li>
                    <li>
                      <strong>Durasi Sewa:</strong> Standar 3 hari (sejak pengambilan). Keterlambatan dikenakan
                      biaya tambahan.
                    </li>
                  </ul>
                  <p className="mt-3 text-xs leading-relaxed theme-muted-strong">
                    Masih bingung? Klik tombol &quot;WA ADMIN&quot; untuk tanya-tanya langsung!
                  </p>
                </div>
              </div>

              <div ref={availabilitySectionRef} className="mb-6 border theme-border theme-soft-surface p-4 lg:p-5">
                <div className="border-b theme-border pb-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div>
                      <h4 className="max-w-[34rem] text-base font-semibold leading-snug text-[var(--theme-text)]">
                        Cek ketersediaan tanggal
                      </h4>
                      <p className="mt-1 text-xs theme-muted-strong leading-relaxed">
                        Pilih tanggal pickup. Sistem akan menandai hari acara, estimasi return, dan konflik booking.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openAvailabilityCheck}
                      aria-expanded={isBookingCalendarOpen}
                      className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-neutral-900 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-neutral-950 transition-colors hover:bg-neutral-50 sm:min-w-44"
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
                        const isReturnEstimate = selectedReturnStartDate === day.value;
                        const isCleaningBuffer =
                          selectedBufferStartDate === day.value ||
                          selectedCleaningStartDate === day.value;
                        const dayRoleLabel = isPickup
                          ? 'Pickup'
                          : isEvent
                            ? 'Acara'
                            : isReturnEstimate
                              ? 'Return'
                              : '';
                        const disabledLabel =
                          !day.isCurrentMonth || day.isPastDate
                            ? 'Tidak tersedia'
                            : day.blockLabel ?? 'Tidak tersedia';

                        return (
                          <button
                            key={day.value}
                            type="button"
                            disabled={day.disabled}
                            onClick={() => setBookingEventDate(day.value)}
                            className={`flex aspect-square min-h-10 flex-col items-center justify-center border px-1 text-sm font-semibold leading-none transition-colors sm:min-h-11 ${
                              isPickup
                                ? 'border-black bg-black text-white'
                                : isEvent
                                  ? 'border-black/80 bg-black/80 text-white'
                                  : isReturnEstimate
                                    ? 'border-black/60 bg-black/60 text-white'
                                    : isCleaningBuffer
                                      ? 'border-black/55 bg-black/55 text-white'
                                      : !day.isCurrentMonth || day.isPastDate
                                          ? 'cursor-not-allowed border-neutral-100 bg-neutral-100 text-neutral-300'
                                          : day.isBooked
                                            ? 'cursor-not-allowed border-orange-200 bg-orange-50 text-orange-700'
                                            : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-500 hover:bg-emerald-100'
                            }`}
                            aria-label={`${day.disabled ? disabledLabel : 'Pilih pickup'} ${formatDate(day.value)}`}
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
                    </div>

                    {bookingDates && !bookingConflict && !posAvailabilityBlock && !serverAvailabilityBlock && (
                      <div className="mt-4 border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-800">
                        <span>
                          Pickup <strong>{formatDate(bookingDates.pickupDate)}</strong>, acara{' '}
                          <strong>{formatDate(bookingDates.eventDate)}</strong>. Estimasi return{' '}
                          <strong>{formatDate(selectedReturnStartDate)}</strong>.
                        </span>
                      </div>
                    )}

                    {bookingDates && isBookingBlocked && (
                      <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs font-semibold uppercase tracking-wider text-amber-800">
                        {bookingBlockedLabel}
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
              {product.status === 'rented' && currentRentalAvailability && (
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
                      Kebaya ini sedang disewa. Kalender tidak tersedia sampai <strong>{formatDate(currentRentalAvailability.blockedUntilDate)}</strong>. Siap disewa lagi mulai <strong>{formatDate(currentRentalAvailability.readyDate)}</strong>. Hubungi admin untuk sewa tanggal berikutnya.
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
                      Dalam Perawatan (Pembersihan)
                    </h5>
                    <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                      Item ini hari ini sedang dalam perawatan/pembersihan. Silakan lihat tanggal yang warna hijau di kalender di atas untuk melihat tanggal yang tersedia, atau kamu bisa menghubungi admin untuk tanya-tanya.
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
              className={`sticky bottom-0 z-10 theme-border bg-[var(--theme-surface)] px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] sm:px-6 md:px-8 md:py-4 md:shadow-none border-t shrink-0 ${
                bookingDates
                  ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-stretch md:gap-3'
                  : 'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 md:flex md:flex-row md:justify-between md:gap-4'
              }`}
            >
              <div className="flex min-w-0 flex-col md:self-center">
                <span className="theme-muted text-[10px] uppercase tracking-wider font-mono">
                  {bookingDates ? 'Biaya Booking' : 'Harga Sewa'}
                </span>
                {bookingDates ? (
                  <>
                    <span className="font-mono text-lg font-semibold text-[var(--theme-text)] md:text-2xl">
                      {formatRupiah(previewDpAmount)}
                    </span>
                    <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-neutral-500 md:hidden">
                      {isBookingBlocked ? bookingBlockedLabel : formatDate(bookingDates.pickupDate)}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-wrap items-baseline gap-1.5">
                    {visibleCompareAtRentalPrice && (
                      <span className="theme-muted-strong hidden font-mono text-sm line-through sm:inline">
                        {formatRupiah(visibleCompareAtRentalPrice)}
                      </span>
                    )}
                    <span className="font-mono text-lg font-semibold text-[var(--theme-text)] md:text-2xl">
                      {formatRupiah(product.rentalPrice)}
                    </span>
                    <span className="theme-muted-strong font-mono text-xs font-normal">
                      /3 hari
                    </span>
                  </div>
                )}
              </div>

              {bookingDates ? (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBookingEventDate('')}
                      className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1.5 border border-neutral-300 bg-white px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-800 transition-colors hover:border-neutral-900 hover:bg-neutral-50 md:min-h-[4.25rem] md:px-4"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Reset
                    </button>
                    {!bookingConflict && !posAvailabilityBlock && !serverAvailabilityBlock ? (
                      <Link
                        href={{
                          pathname: '/booking',
                          query: {
                            itemId: product.id,
                            eventDate: bookingDates.pickupDate,
                          },
                        }}
                        className="inline-flex min-h-12 items-center justify-center bg-[#25D366] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition-all duration-300 hover:bg-[#20BA5A] md:min-h-[4.25rem] md:flex-1 md:px-5"
                      >
                        Booking Sekarang
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex min-h-12 cursor-not-allowed items-center justify-center bg-neutral-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 md:min-h-[4.25rem] md:flex-1 md:px-5"
                      >
                        Tidak Tersedia
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={openAvailabilityCheck}
                    className="inline-flex min-h-12 items-center justify-center border border-neutral-900 bg-white px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-neutral-950 transition-colors hover:bg-neutral-50 md:hidden"
                  >
                    Cek Tanggal
                  </button>
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-12 cursor-pointer items-center justify-center gap-2 bg-[#25D366] px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm transition-all duration-300 hover:bg-[#20BA5A] md:min-w-52 md:px-6 md:py-3.5 md:text-sm md:hover:-translate-y-[1px] md:hover:shadow-md"
                  >
                    {/* WhatsApp Simple SVG Icon */}
                    <svg className="h-4 w-4 fill-current md:h-5 md:w-5" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.908-6.993-1.879-1.88-4.359-2.912-7-2.912-5.439 0-9.873 4.432-9.877 9.877-.001 1.769.479 3.498 1.39 5.031l-.963 3.518 3.6-.944z" />
                    </svg>
                    <span>WA Admin</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Lightbox Overlay */}
      {isLightboxOpen && product && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950/95 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar with counter and close button */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 z-50 pointer-events-none md:p-6">
            <div className="text-white/70 font-mono text-xs md:text-sm bg-neutral-900/60 backdrop-blur-xs px-3 py-1.5 rounded-full pointer-events-auto shadow-xs border border-white/10 select-none">
              {lightboxIndex + 1} / {product.imageUrls.length}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(false);
              }}
              className="pointer-events-auto flex items-center justify-center w-9 h-9 md:w-11 md:h-11 rounded-full bg-neutral-900/60 text-white hover:bg-neutral-800/80 transition-all focus:outline-none border border-white/10 shadow-xs cursor-pointer"
              aria-label="Tutup foto full screen"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Lightbox Main Content */}
          <div
            className="relative flex items-center justify-center w-full h-full max-w-5xl max-h-[80vh] px-4 md:px-16"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev button */}
            {product.imageUrls.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev - 1 + product.imageUrls.length) % product.imageUrls.length);
                }}
                className="absolute left-2 md:left-4 z-10 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-900/60 text-white hover:bg-neutral-800/80 transition-all focus:outline-none border border-white/10 shadow-xs cursor-pointer"
                aria-label="Foto sebelumnya"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Main Image */}
            <div className="w-full h-full flex items-center justify-center select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrls[lightboxIndex]}
                alt={`${product.name} - Fullscreen View`}
                className="max-w-full max-h-full object-contain transition-transform duration-300 scale-98 md:scale-95 animate-in zoom-in-95"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              />
            </div>

            {/* Next button */}
            {product.imageUrls.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((prev) => (prev + 1) % product.imageUrls.length);
                }}
                className="absolute right-2 md:right-4 z-10 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-neutral-900/60 text-white hover:bg-neutral-800/80 transition-all focus:outline-none border border-white/10 shadow-xs cursor-pointer"
                aria-label="Foto berikutnya"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Dots indicators at bottom */}
          {product.imageUrls.length > 1 && (
            <div className="absolute bottom-6 flex gap-2 z-50">
              {product.imageUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    lightboxIndex === index ? 'bg-white w-4' : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Pilih foto ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
