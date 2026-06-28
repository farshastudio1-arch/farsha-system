'use client';

import React, { useState, useEffect } from 'react';
import { KebayaItem, mockCMS } from '@/data/mockData';

interface ProductDetailModalProps {
  product: KebayaItem | null;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Reset active image index when product changes
  useEffect(() => {
    setActiveImgIndex(0);
  }, [product]);

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
      year: 'numeric'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs transition-opacity duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-[#FFFFFF] rounded-2xl shadow-2xl border border-[#E5E5E5] flex flex-col md:flex-row overflow-hidden max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button - Mobile Floating */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:hidden z-30 p-2.5 bg-[#FFFFFF]/80 backdrop-blur-xs text-[#000000] rounded-full border border-[#E5E5E5] shadow-sm hover:bg-[#FFFFFF]"
          aria-label="Tutup"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* LEFT PANEL: Media Gallery */}
        <div className="w-full md:w-1/2 flex flex-col bg-[#E5E5E5] p-4 md:p-6 relative justify-center border-r border-[#E5E5E5]">
          {/* Main Visual */}
          <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={product.imageUrls[activeImgIndex]} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thumbnails Row */}
          {product.imageUrls.length > 1 && (
            <div className="flex gap-2.5 mt-4 overflow-x-auto py-1 no-scrollbar justify-center">
              {product.imageUrls.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImgIndex(index)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                    activeImgIndex === index 
                      ? 'border-[#000000] scale-105 shadow-sm' 
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
        <div className="w-full md:w-1/2 flex flex-col p-6 md:p-8 overflow-y-auto max-h-[50vh] md:max-h-[90vh]">
          {/* Close Button - Desktop Inline */}
          <button
            onClick={onClose}
            className="hidden md:flex absolute top-6 right-6 p-2 text-[#4A4A4A] hover:text-[#000000] hover:bg-[#F5F5F5] rounded-lg transition-all"
            aria-label="Tutup"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Product Header */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 items-center mb-2.5">
              <span className="text-xs uppercase tracking-widest bg-[#000000] text-[#FFFFFF] px-2.5 py-0.5 rounded font-mono font-medium">
                {product.code}
              </span>
              <span className={`text-xs font-semibold tracking-wide border px-2.5 py-0.5 rounded ${statusBadge.class}`}>
                {statusBadge.text}
              </span>
            </div>
            
            <h2 className="font-serif text-2xl sm:text-3xl text-[#000000] font-semibold leading-tight">
              {product.name}
            </h2>
          </div>

          {/* Technical Specs List */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#E5E5E5] mb-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#757575] font-mono block">Model Kebaya</span>
              <span className="text-[#000000] text-sm font-semibold">{product.model}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#757575] font-mono block">Warna Utama</span>
              <span className="text-[#000000] text-sm font-semibold">{product.color}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#757575] font-mono block">Ukuran (Size)</span>
              <span className="text-[#000000] text-sm font-semibold font-mono">{product.size}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#757575] font-mono block">Kategori Sewa</span>
              <span className="text-[#000000] text-sm font-semibold">Offline Studio</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6 flex-grow">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#757575] font-mono mb-2">
              Deskripsi Koleksi
            </h4>
            <p className="text-[#4A4A4A] text-sm leading-relaxed font-sans">
              {product.description}
            </p>
          </div>

          {/* Rented State Info Box */}
          {product.status === 'rented' && product.rentalEndDate && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h5 className="text-xs font-semibold text-amber-800 uppercase tracking-wider font-mono">
                  Sedang Disewa Pengunjung Lain
                </h5>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Kebaya ini sedang dalam masa sewa. Estimasi kembali ke studio dan siap disewa lagi tanggal <strong>{formatDate(product.rentalEndDate)}</strong>. Anda tetap dapat menanyakan ketersediaan/booking tanggal sewa berikutnya via WhatsApp.
                </p>
              </div>
            </div>
          )}

          {/* Maintenance State Info Box */}
          {product.status === 'maintenance' && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h5 className="text-xs font-semibold text-rose-800 uppercase tracking-wider font-mono">
                  Sedang Dalam Perawatan (Maintenance)
                </h5>
                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                  Item ini sedang dicuci premium, diperbaiki payetnya, atau disesuaikan di studio agar kualitasnya tetap terjaga sempurna. Silakan hubungi admin untuk menanyakan kapan item ini kembali tersedia.
                </p>
              </div>
            </div>
          )}

          {/* Rental Price & CTA Area */}
          <div className="mt-auto pt-5 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-[#757575] font-mono">Tarif Sewa Studio</span>
              <span className="text-2xl font-semibold font-mono text-[#000000]">
                {formatPrice(product.rentalPrice)} <span className="text-xs font-normal text-[#4A4A4A]">/hari</span>
              </span>
            </div>

            {/* WA Deep Link Action */}
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#128C7E] text-white text-sm font-semibold tracking-wider uppercase px-6 py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer"
            >
              {/* WhatsApp Simple SVG Icon */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.115-2.908-6.993-1.879-1.88-4.359-2.912-7-2.912-5.439 0-9.873 4.432-9.877 9.877-.001 1.769.479 3.498 1.39 5.031l-.963 3.518 3.6-.944z" />
              </svg>
              <span>Cek Ketersediaan</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}
