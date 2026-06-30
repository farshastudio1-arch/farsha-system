'use client';

import React, { useState, useEffect } from 'react';
import { KebayaItem, mockCMS } from '@/data/mockData';
import { matchesLandingCategory } from '@/lib/landing-categories';

interface ProductDetailModalProps {
  product: KebayaItem | null;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const [activeImageSelection, setActiveImageSelection] = useState<{
    productId: string;
    index: number;
  } | null>(null);

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

  if (!product) return null;

  const selectedImageIndex =
    activeImageSelection?.productId === product.id ? activeImageSelection.index : 0;
  const activeImgIndex = Math.min(selectedImageIndex, product.imageUrls.length - 1);

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
    const cleanPhone = mockCMS.studioPhone.replace(/[^0-9]/g, ''); // strip spaces, +, dashes
    const message = `Halo, saya tertarik dengan ${product.name} (kode: ${product.code}). Apakah masih tersedia?`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const getStatusBadge = (status: string) => {
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

  const statusBadge = getStatusBadge(product.status);

  const getDefaultMeasurements = (size: string) => {
    switch (size) {
      case 'S':
        return {
          bust: '88 cm',
          waist: '70 cm',
          length: '60 cm',
          sleeveLength: '52 cm',
          armhole: '42 cm',
          otherDetails: '',
          rentalCategory: 'Offline Studio',
        };
      case 'M':
        return {
          bust: '94 cm',
          waist: '76 cm',
          length: '62 cm',
          sleeveLength: '54 cm',
          armhole: '44 cm',
          otherDetails: '',
          rentalCategory: 'Offline Studio',
        };
      case 'L':
        return {
          bust: '100 cm',
          waist: '82 cm',
          length: '64 cm',
          sleeveLength: '56 cm',
          armhole: '46 cm',
          otherDetails: '',
          rentalCategory: 'Offline Studio',
        };
      case 'XL':
        return {
          bust: '106 cm',
          waist: '88 cm',
          length: '66 cm',
          sleeveLength: '58 cm',
          armhole: '48 cm',
          otherDetails: '',
          rentalCategory: 'Offline Studio',
        };
      default:
        return {
          bust: '90-102 cm (Adjustable)',
          waist: '72-84 cm',
          length: '63 cm',
          sleeveLength: '55 cm',
          armhole: '45 cm',
          otherDetails: '',
          rentalCategory: 'Offline Studio',
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

  // Get matched event categories
  const matchedCategories = (['wisuda', 'lamaran', 'kondangan', 'bridesmaid'] as const)
    .filter((slug) => matchesLandingCategory(product, slug))
    .map((slug) => {
      const labels = {
        wisuda: { label: 'Wisuda', emoji: '🎓' },
        lamaran: { label: 'Lamaran', emoji: '💍' },
        kondangan: { label: 'Kondangan', emoji: '✨' },
        bridesmaid: { label: 'Bridesmaid', emoji: '🌸' },
      };
      return labels[slug];
    });

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
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row min-h-0 no-scrollbar">
          {/* LEFT PANEL: Media Gallery */}
          <div className="theme-soft-surface theme-border w-full md:w-1/2 shrink-0 flex flex-col p-3 sm:p-4 md:p-6 relative justify-center border-b md:border-b-0 md:border-r">
            {/* Main Visual */}
            <div className="theme-soft-surface relative h-[clamp(190px,34dvh,360px)] md:h-auto md:aspect-[3/4] w-full overflow-hidden shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrls[activeImgIndex]}
                alt={product.name}
                className="w-full h-full object-contain md:object-cover"
              />
            </div>

            {/* Thumbnails Row */}
            {product.imageUrls.length > 1 && (
              <div className="flex gap-2 sm:gap-2.5 mt-3 md:mt-4 overflow-x-auto py-0.5 md:py-1 no-scrollbar justify-center">
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

                <h2 className="font-serif text-2xl sm:text-3xl text-[var(--theme-text)] font-semibold leading-tight">
                  {product.name}
                </h2>
              </div>

              {/* Sizing & Kategori Badges (Competitor Layout element) */}
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="theme-soft-surface theme-border border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono text-[var(--theme-text)]">
                  Kategori: {product.model}
                </span>
                <span className="theme-soft-surface theme-border border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono text-[var(--theme-text)]">
                  Ukuran: Size {product.size}
                </span>
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

              {/* Ketentuan Sewa (Competitor Layout element) */}
              <div className="mb-6">
                <h4 className="theme-muted text-xs font-semibold uppercase tracking-wider font-mono mb-3">
                  Ketentuan Sewa
                </h4>
                <ul className="space-y-2.5 text-xs theme-muted-strong leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span><strong>Uang Jaminan:</strong> Rp 100.000 (titipan aman saat pelunasan, dikembalikan 100% setelah kebaya kembali).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span><strong>Down Payment (DP):</strong> Rp 50.000 per kebaya untuk keep tanggal sewa.</span>
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
            <div className="sticky bottom-0 z-10 theme-border bg-[var(--theme-surface)] py-4 px-5 sm:px-6 md:px-8 border-t flex flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex flex-col">
                <span className="theme-muted text-[10px] uppercase tracking-wider font-mono">
                  Tarif Sewa Studio
                </span>
                <span className="text-2xl font-semibold font-mono text-[var(--theme-text)]">
                  {formatPrice(product.rentalPrice)}{' '}
                  <span className="theme-muted-strong text-xs font-normal">/hari</span>
                </span>
              </div>

              {/* WA Deep Link Action */}
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] text-white hover:bg-[#20BA5A] text-sm font-semibold tracking-wider uppercase px-6 py-3.5 transition-all duration-300 flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-[1px]"
              >
                {/* WhatsApp Simple SVG Icon */}
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.908-6.993-1.879-1.88-4.359-2.912-7-2.912-5.439 0-9.873 4.432-9.877 9.877-.001 1.769.479 3.498 1.39 5.031l-.963 3.518 3.6-.944z" />
                </svg>
                <span>WA Admin</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
