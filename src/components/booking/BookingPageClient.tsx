'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Mail,
  MessageCircle,
  ReceiptText,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';

import type { KebayaItem } from '@/data/mockData';
import {
  getPreviewDayDifference,
  previewDpAmount,
  previewExtraReturnDayFee,
} from '@/lib/booking-preview';

type BookingStep = 'order' | 'identity' | 'payment';
type PickupMethod = 'store' | 'gosend';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function todayInputValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return formatDatePart(date);
}

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDatePart(date);
}

function calculateBookingDatesFromPickup(pickupDate: string) {
  if (!pickupDate || Number.isNaN(new Date(`${pickupDate}T00:00:00`).getTime())) {
    return null;
  }

  return {
    pickupDate,
    eventDate: addDays(pickupDate, 1),
    returnDate: addDays(pickupDate, 2),
    bufferUntilDate: addDays(pickupDate, 5),
  };
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

function getItemById(items: KebayaItem[], itemId: string) {
  return items.find((item) => item.id === itemId) ?? null;
}

export default function BookingPageClient({
  initialItems,
  initialItemId,
  initialEventDate,
  whatsappNumber,
}: {
  initialItems: KebayaItem[];
  initialItemId: string;
  initialEventDate: string;
  whatsappNumber: string;
}) {
  const firstItem = getItemById(initialItems, initialItemId) ?? initialItems[0] ?? null;
  const initialDate = calculateBookingDatesFromPickup(initialEventDate) ? initialEventDate : todayInputValue();
  const initialDates = calculateBookingDatesFromPickup(initialDate);
  const [step, setStep] = useState<BookingStep>('order');
  const [pickupDate] = useState(initialDate);
  const [returnDate, setReturnDate] = useState(initialDates?.returnDate ?? initialDate);
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>('store');
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerInstagram, setCustomerInstagram] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [showWhatsappFallback, setShowWhatsappFallback] = useState(false);
  const [submittedNumbers, setSubmittedNumbers] = useState<string[]>([]);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isConfirmBookingOpen, setIsConfirmBookingOpen] = useState(false);
  const [confirmedOrderKey, setConfirmedOrderKey] = useState('');
  const [confirmedIdentityKey, setConfirmedIdentityKey] = useState('');
  const returnDateInputRef = useRef<HTMLInputElement>(null);
  const pageTopRef = useRef<HTMLDivElement>(null);

  const bookingDates = useMemo(() => calculateBookingDatesFromPickup(pickupDate), [pickupDate]);
  const eventDate = bookingDates?.eventDate ?? pickupDate;
  const selectedItems = firstItem ? [firstItem] : [];
  const selectedItem = selectedItems[0] ?? null;
  const defaultReturnDate = bookingDates?.returnDate ?? pickupDate;
  const normalizedReturnDate = returnDate < defaultReturnDate ? defaultReturnDate : returnDate;
  const extraReturnDays = getPreviewDayDifference(defaultReturnDate, normalizedReturnDate);
  const extraReturnFee = extraReturnDays * previewExtraReturnDayFee * selectedItems.length;
  const rentalSubtotal = selectedItems.reduce((sum, item) => sum + item.rentalPrice, 0);
  const dpTotal = previewDpAmount * selectedItems.length;
  const instagramDpDiscount = customerInstagram.trim() ? Math.round(dpTotal * 0.1) : 0;
  const estimatedRentalTotal = Math.max(rentalSubtotal + extraReturnFee, 0);
  const payNowTotal = Math.max(dpTotal - instagramDpDiscount, 0);
  const orderConfirmationKey = [
    bookingDates?.pickupDate ?? '',
    bookingDates?.eventDate ?? '',
    normalizedReturnDate,
    pickupMethod,
    selectedItem?.id ?? '',
  ].join('::');
  const identityConfirmationKey = [
    customerName.trim(),
    customerWhatsapp.trim(),
    customerEmail.trim(),
    customerInstagram.trim(),
    deliveryAddress.trim(),
    notes.trim(),
  ].join('::');
  const isOrderConfirmed = confirmedOrderKey === orderConfirmationKey;
  const isIdentityConfirmed = confirmedIdentityKey === identityConfirmationKey;
  const whatsappFallbackPhone = normalizeWhatsAppNumber(whatsappNumber);
  const whatsappFallbackItemList = selectedItems.map((item) => `${item.code} - ${item.name}`).join(', ');
  const whatsappFallbackMessage = [
    'Halo admin Farsha, saya mau request booking kebaya.',
    whatsappFallbackItemList ? `Item: ${whatsappFallbackItemList}` : '',
    `Pickup: ${formatDate(bookingDates?.pickupDate ?? null)}`,
    `Tanggal acara: ${formatDate(eventDate)}`,
    `Return: ${formatDate(normalizedReturnDate)}`,
    customerName.trim() ? `Nama: ${customerName.trim()}` : '',
    customerWhatsapp.trim() ? `WhatsApp: ${customerWhatsapp.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const whatsappFallbackUrl = `https://wa.me/${whatsappFallbackPhone}?text=${encodeURIComponent(
    whatsappFallbackMessage,
  )}`;

  const getAdminBookingNotificationUrl = (bookingNumber: string) => {
    const message = `Hi admin, saya sudah booking kebaya dengan nomor booking : ${bookingNumber}. Tolong segera diproses ya`;

    return `https://wa.me/${whatsappFallbackPhone}?text=${encodeURIComponent(message)}`;
  };

  const openReturnDatePicker = () => {
    const input = returnDateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  const scrollToPageTop = () => {
    window.setTimeout(() => {
      pageTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 0);
  };

  const goToIdentity = () => {
    if (!bookingDates || selectedItems.length === 0) {
      setFormError('Pilih tanggal dan minimal satu kebaya.');
      setShowWhatsappFallback(false);
      return;
    }

    setFormError('');
    setShowWhatsappFallback(false);
    setConfirmedOrderKey(orderConfirmationKey);
    setStep('identity');
    scrollToPageTop();
  };

  const goToPayment = () => {
    if (!customerName.trim()) {
      setFormError('Nama lengkap sesuai KTP wajib diisi.');
      setShowWhatsappFallback(false);
      return;
    }

    if (!customerWhatsapp.trim()) {
      setFormError('Nomor WhatsApp wajib diisi.');
      setShowWhatsappFallback(false);
      return;
    }

    if (pickupMethod === 'gosend' && !deliveryAddress.trim()) {
      setFormError('Alamat pengiriman wajib diisi untuk GoSend Instant.');
      setShowWhatsappFallback(false);
      return;
    }

    setFormError('');
    setShowWhatsappFallback(false);
    setConfirmedIdentityKey(identityConfirmationKey);
    setStep('payment');
    scrollToPageTop();
  };

  const openBookingConfirmation = () => {
    if (!bookingDates || selectedItems.length === 0) {
      setFormError('Booking belum bisa dikunci. Cek tanggal dan item terlebih dahulu.');
      setShowWhatsappFallback(false);
      return;
    }

    setFormError('');
    setShowWhatsappFallback(false);
    setIsConfirmBookingOpen(true);
  };

  const lockDates = async () => {
    if (!bookingDates || selectedItems.length === 0) {
      setFormError('Booking belum bisa dikunci. Cek tanggal dan item terlebih dahulu.');
      setShowWhatsappFallback(false);
      setIsConfirmBookingOpen(false);
      return;
    }

    setIsSubmittingBooking(true);
    setFormError('');
    setShowWhatsappFallback(false);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: selectedItems.map((item) => item.id),
          pickupDate: bookingDates.pickupDate,
          eventDate: bookingDates.eventDate,
          returnDueDate: normalizedReturnDate,
          customerName,
          customerWhatsapp,
          customerEmail,
          customerInstagram,
          pickupMethod,
          deliveryAddress,
          notes,
          dpPerItem: previewDpAmount,
          instagramDiscountAmount: instagramDpDiscount,
          extraReturnFeeTotal: extraReturnFee,
          rentalEstimateTotal: estimatedRentalTotal,
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
        data?: { bookingNumber?: string };
      };

      if (!response.ok || !payload.ok || !payload.data?.bookingNumber) {
        if (payload.code === 'BOOKING_DATE_CONFLICT') {
          throw new Error(payload.error ?? 'Tanggal bentrok dengan booking lain.');
        }

        throw new Error(payload.error ?? 'Database booking belum siap.');
      }

      const bookingNumber = payload.data.bookingNumber;

      setSubmittedNumbers([bookingNumber]);
      setIsConfirmBookingOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking belum bisa dikirim.';

      setFormError(`${message} Tidak ada booking yang dibuat. Silakan coba lagi atau hubungi admin via WhatsApp.`);
      setShowWhatsappFallback(true);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const stepNavigation: Array<{ value: BookingStep; label: string; enabled: boolean }> = [
    { value: 'order', label: 'Pesanan', enabled: true },
    { value: 'identity', label: 'Data diri', enabled: isOrderConfirmed },
    { value: 'payment', label: 'Pembayaran', enabled: isOrderConfirmed && isIdentityConfirmed },
  ];

  if (!firstItem) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm font-semibold text-neutral-900">Catalog item belum tersedia.</p>
        <Link href="/catalog" className="mt-4 inline-flex text-sm font-semibold underline">
          Kembali ke katalog
        </Link>
      </section>
    );
  }

  return (
    <main className="theme-surface min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div ref={pageTopRef} className="mx-auto max-w-6xl scroll-mt-4 space-y-6">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke katalog
        </Link>

        <section className="border theme-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Amankan Tanggal, Acara Aman
              </p>
              <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-neutral-950">
                Kunci tanggal sewa kebaya
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                Lengkapi detail pesanan, data diri, lalu bayar biaya booking untuk mengamankan slot hari agar kamu bisa dapatin kebaya pilihan kamu
              </p>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center text-center text-[10px] font-bold uppercase tracking-wider">
              {stepNavigation.map(({ value, label, enabled }, index) => (
                <div key={value} className="contents">
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => setStep(value)}
                    className={`relative border px-3 py-2 ${
                      step === value
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : enabled
                          ? 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                          : 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300'
                    }`}
                  >
                    <span className="mr-1 font-mono">{index + 1}.</span>
                    {label}
                  </button>
                  {index < stepNavigation.length - 1 && (
                    <span className="mx-2 h-px min-w-5 bg-neutral-200" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border theme-border bg-white p-5 shadow-sm">
            {step === 'order' && (
              <div className="space-y-6">
                <header className="flex items-start gap-3">
                  <CalendarCheck className="mt-1 h-5 w-5 text-neutral-400" />
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-neutral-950">
                      Detail Pesanan
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Pickup otomatis satu hari sebelum acara. Return default satu hari setelah acara.
                    </p>
                  </div>
                </header>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="border border-neutral-200 bg-neutral-50 p-4">
                    <span className="block text-sm font-semibold text-neutral-700">
                      Tanggal pickup
                    </span>
                    <strong className="mt-2 block font-mono text-lg text-neutral-950">
                      {formatDate(bookingDates?.pickupDate ?? null)}
                    </strong>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                      Tanggal ini mengikuti pilihan dari katalog.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setPickupMethod('store')}
                        className={`border px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                          pickupMethod === 'store'
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-600'
                        }`}
                      >
                        Ambil di store
                      </button>
                      <button
                        type="button"
                        onClick={() => setPickupMethod('gosend')}
                        className={`border px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                          pickupMethod === 'gosend'
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-white text-neutral-600'
                        }`}
                      >
                        GoSend Instant
                      </button>
                    </div>
                  </div>

                  <div className="border border-neutral-200 bg-neutral-50 p-4">
                    <span className="block text-sm font-semibold text-neutral-700">
                      Konfirmasi tanggal acara
                    </span>
                    <strong className="mt-2 block font-mono text-lg text-neutral-950">
                      {formatDate(eventDate)}
                    </strong>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                      Satu hari setelah pickup.
                    </p>
                  </div>

                  <div className="block border border-neutral-200 bg-neutral-50 p-4">
                    <span className="block text-sm font-semibold text-neutral-700">
                      Tanggal return
                    </span>
                    <button
                      type="button"
                      onClick={openReturnDatePicker}
                      className="mt-2 flex min-h-12 w-full items-center justify-between gap-3 border border-neutral-200 bg-white px-3 py-2 text-left text-sm font-semibold text-neutral-950 transition-colors hover:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    >
                      <span>{formatDate(normalizedReturnDate)}</span>
                      <CalendarCheck className="h-4 w-4 shrink-0 text-neutral-900" />
                    </button>
                    <input
                      ref={returnDateInputRef}
                      type="date"
                      min={defaultReturnDate}
                      value={normalizedReturnDate}
                      onChange={(event) => setReturnDate(event.target.value)}
                      className="sr-only"
                      aria-label="Pilih tanggal return"
                    />
                    <span className="mt-2 block text-xs text-neutral-500">
                      Tambahan {formatCurrency(previewExtraReturnDayFee)} per hari per item setelah {formatDate(defaultReturnDate)}.
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedItems.map((item) => (
                      <div key={item.id} className="flex gap-3 border border-neutral-200 bg-white p-3">
                        <div className="h-20 w-16 shrink-0 overflow-hidden bg-neutral-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                            {item.code}
                          </p>
                          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-950">
                            {item.name}
                          </h3>
                          <p className="mt-1 text-xs text-neutral-500">
                            {formatCurrency(item.rentalPrice)} / 3 hari
                          </p>
                        </div>
                      </div>
                  ))}
                </div>

                <div className="border border-neutral-900 bg-neutral-900 p-4 text-white">
                  <div className="flex justify-between text-sm">
                    <span>Total estimasi sewa</span>
                    <strong>{formatCurrency(estimatedRentalTotal)}</strong>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-neutral-300">
                    <span>Biaya Booking</span>
                    <strong className="text-white">{formatCurrency(dpTotal)}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={goToIdentity}
                    className="mt-4 w-full bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-neutral-950 hover:bg-neutral-100"
                  >
                    Lanjut
                  </button>
                </div>
              </div>
            )}

            {step === 'identity' && (
              <div className="space-y-6">
                <header className="flex items-start gap-3">
                  <UserRound className="mt-1 h-5 w-5 text-neutral-400" />
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-neutral-950">
                      Detail Data Diri
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Data ini masuk ke antrean POS setelah tanggal dikunci.
                    </p>
                  </div>
                </header>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1.5 md:col-span-2">
                    <span className="text-sm font-semibold text-neutral-700">Nama lengkap sesuai KTP</span>
                    <input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-neutral-700">Nomor WhatsApp</span>
                    <input
                      value={customerWhatsapp}
                      onChange={(event) => setCustomerWhatsapp(event.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-neutral-700">Email</span>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                      placeholder="Opsional, untuk invoice email"
                      className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>
                  <label className="block space-y-1.5 md:col-span-2">
                    <span className="text-sm font-semibold text-neutral-700">Instagram</span>
                    <input
                      value={customerInstagram}
                      onChange={(event) => setCustomerInstagram(event.target.value)}
                      placeholder="Opsional, diskon 10% jika diisi"
                      className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>
                  {pickupMethod === 'gosend' && (
                    <label className="block space-y-1.5 md:col-span-2">
                      <span className="text-sm font-semibold text-neutral-700">Alamat pengiriman</span>
                      <textarea
                        rows={3}
                        value={deliveryAddress}
                        onChange={(event) => setDeliveryAddress(event.target.value)}
                        className="w-full resize-none border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      />
                      <span className="text-xs text-neutral-500">Ongkir GoSend dibayar oleh user.</span>
                    </label>
                  )}
                  <label className="block space-y-1.5 md:col-span-2">
                    <span className="text-sm font-semibold text-neutral-700">Catatan</span>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Contoh: request fitting, acara lamaran, warna tema"
                      className="w-full resize-none border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep('order')}
                    className="border border-neutral-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    onClick={goToPayment}
                    className="theme-primary-action flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                  >
                    Lanjut ke Pembayaran
                  </button>
                </div>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-6">
                <header className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-neutral-400" />
                  <div>
                    <h2 className="font-serif text-2xl font-semibold text-neutral-950">
                      Detail Pembayaran
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Preview biaya booking. Belum ada payment gateway sungguhan.
                    </p>
                  </div>
                </header>

                <div className="border border-neutral-200 bg-neutral-50 p-4">
                  <h3 className="text-sm font-semibold text-neutral-950">Ringkasan pembayaran</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Biaya Booking ({selectedItems.length} item)</span>
                      <strong>{formatCurrency(dpTotal)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Diskon Instagram 10% untuk biaya booking</span>
                      <strong>-{formatCurrency(instagramDpDiscount)}</strong>
                    </div>
                    <div className="border-t border-neutral-200 pt-2">
                      <div className="flex justify-between font-semibold text-neutral-950">
                        <span>Total biaya booking dibayar sekarang</span>
                        <span>{formatCurrency(payNowTotal)}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                        Biaya Booking hanya untuk mengunci tanggal dan bersifat non-refundable.
                        Biaya Booking tidak memotong biaya sewa.
                      </p>
                    </div>
                    <div className="border-t border-neutral-200 pt-2 text-xs text-neutral-500">
                      <div className="flex justify-between">
                        <span>Biaya sewa item</span>
                        <span>{formatCurrency(rentalSubtotal)}</span>
                      </div>
                      <div className="mt-1 flex justify-between">
                        <span>Tambahan return</span>
                        <span>{formatCurrency(extraReturnFee)}</span>
                      </div>
                      <div className="mt-1 flex justify-between font-semibold text-neutral-950">
                        <span>Estimasi biaya sewa saat pickup</span>
                        <span>{formatCurrency(estimatedRentalTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-neutral-200 bg-white p-4 text-sm leading-relaxed text-neutral-700">
                  <h3 className="font-semibold text-neutral-950">Syarat dan Ketentuan</h3>
                  <p className="mt-3 font-semibold">Pemesanan & Pembayaran:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Pembayaran Biaya Booking diperlukan untuk mengunci jadwal.</li>
                    <li>Biaya Booking bersifat non-refundable.</li>
                    <li>Pelunasan dilakukan saat pengambilan atau sebelum barang dikirim.</li>
                  </ul>
                  <p className="mt-3 font-semibold">Verifikasi:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Booking via website akan diverifikasi admin dalam 24 jam.</li>
                  </ul>
                  <p className="mt-3 font-semibold">Fitting:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Link jadwal fitting akan dikirimkan melalui WhatsApp setelah melakukan pembayaran Biaya Booking.</li>
                  </ul>
                </div>

                {submittedNumbers.length > 0 && (
                  <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">
                          Request booking masuk, menunggu verifikasi Biaya Booking dari admin.
                        </p>
                        <p className="mt-1">
                          Nomor booking: {submittedNumbers.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep('identity')}
                    className="border border-neutral-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
                  >
                    Kembali
                  </button>
                  {submittedNumbers[0] ? (
                    <a
                      href={getAdminBookingNotificationUrl(submittedNumbers[0])}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-14 flex-1 items-center justify-center gap-3 bg-[#25D366] px-5 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-[#20BA5A]"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Kabari Admin
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={openBookingConfirmation}
                      disabled={isSubmittingBooking}
                      className="theme-primary-action flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider disabled:cursor-wait disabled:opacity-60"
                    >
                      Kunci Tanggal
                    </button>
                  )}
                </div>
              </div>
            )}

            {formError && (
              <div className="mt-5 border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                <p>{formError}</p>
                {showWhatsappFallback && (
                  <a
                    href={whatsappFallbackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 border border-amber-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-900 hover:border-amber-500"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Hubungi admin via WhatsApp
                  </a>
                )}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="border theme-border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-neutral-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-950">
                  Ringkasan
                </h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Pickup</span>
                  <strong>{formatDate(bookingDates?.pickupDate ?? null)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tanggal acara</span>
                  <strong>{formatDate(eventDate)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Return</span>
                  <strong>{formatDate(normalizedReturnDate)}</strong>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-neutral-500">Item</span>
                  <strong className="max-w-[14rem] text-right leading-snug">
                    {selectedItem ? `${selectedItem.name} / ${selectedItem.code}` : '-'}
                  </strong>
                </div>
                <div className="border-t border-neutral-200 pt-3">
                  <div className="flex justify-between text-base font-semibold text-neutral-950">
                    <span>Biaya Booking</span>
                    <span>{formatCurrency(payNowTotal)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-neutral-500">
                    <span>Estimasi biaya sewa</span>
                    <span>{formatCurrency(estimatedRentalTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {pickupMethod === 'gosend' && (
              <div className="border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>GoSend Instant dipilih. Ongkir dibayar oleh user saat pengiriman.</p>
                </div>
              </div>
            )}

            {customerEmail.trim() && (
              <div className="border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <p>Invoice dapat diarahkan ke {customerEmail.trim()}.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {isConfirmBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 px-4 py-4 sm:items-center sm:justify-center">
          <section className="w-full max-w-lg border border-neutral-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-neutral-400" />
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Konfirmasi Booking
                </p>
                <h2 className="mt-1 font-serif text-2xl font-semibold text-neutral-950">
                  Kunci tanggal ini?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  Setelah dikonfirmasi, request booking akan masuk ke admin Farsha dan WhatsApp admin akan terbuka otomatis.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 border border-neutral-200 bg-neutral-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Item</span>
                <strong className="max-w-[14rem] text-right text-neutral-950">
                  {selectedItem ? `${selectedItem.name} / ${selectedItem.code}` : '-'}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Pickup</span>
                <strong className="text-right text-neutral-950">{formatDate(bookingDates?.pickupDate ?? null)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Acara</span>
                <strong className="text-right text-neutral-950">{formatDate(eventDate)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Return</span>
                <strong className="text-right text-neutral-950">{formatDate(normalizedReturnDate)}</strong>
              </div>
              <div className="flex justify-between gap-4 border-t border-neutral-200 pt-3">
                <span className="font-semibold text-neutral-950">Biaya Booking</span>
                <strong className="text-right text-neutral-950">{formatCurrency(payNowTotal)}</strong>
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsConfirmBookingOpen(false)}
                disabled={isSubmittingBooking}
                className="min-h-12 border border-neutral-300 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900 disabled:cursor-wait disabled:opacity-60"
              >
                Cek lagi
              </button>
              <button
                type="button"
                onClick={lockDates}
                disabled={isSubmittingBooking}
                className="min-h-12 bg-neutral-950 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmittingBooking ? 'Mengirim...' : 'Ya, Kunci Tanggal'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
