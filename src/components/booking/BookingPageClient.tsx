'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
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
import { formatRupiah } from '@/lib/formatters';

type BookingStep = 'order' | 'identity' | 'payment';
type PickupMethod = 'store' | 'gosend';

function formatCurrency(amount: number) {
  return formatRupiah(amount);
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
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [showWhatsappFallback, setShowWhatsappFallback] = useState(false);
  const [submittedNumbers, setSubmittedNumbers] = useState<string[]>([]);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [isConfirmBookingOpen, setIsConfirmBookingOpen] = useState(false);
  const [confirmedOrderKey, setConfirmedOrderKey] = useState('');
  const [confirmedIdentityKey, setConfirmedIdentityKey] = useState('');
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
  const currentStepIndex = Math.max(
    stepNavigation.findIndex((entry) => entry.value === step),
    0,
  );
  const progressPercent = `${((currentStepIndex + 1) / stepNavigation.length) * 100}%`;
  const stepIntro: Record<BookingStep, string> = {
    order: 'Cek item dan tanggal sewa.',
    identity: 'Isi data wajib untuk admin.',
    payment: 'Review biaya booking dan kirim request.',
  };

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
    <main className="theme-surface min-h-screen px-4 py-4 pb-32 sm:px-6 md:py-6 md:pb-6 lg:px-8">
      <div ref={pageTopRef} className="mx-auto max-w-6xl scroll-mt-4 space-y-4 md:space-y-6">
        <section className="border theme-border bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/catalog"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke katalog
              </Link>
              <p className="mt-4 hidden font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400 md:block">
                Amankan Tanggal, Acara Aman
              </p>
              <h1 className="mt-3 font-serif text-2xl font-semibold leading-tight text-neutral-950 md:mt-1 md:text-3xl">
                Booking Kebaya
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-neutral-500 md:mt-2 md:max-w-2xl">
                {stepIntro[step]}
                <span className="hidden md:inline">
                  {' '}Lengkapi detail pesanan, data diri, lalu kirim request booking untuk diverifikasi admin.
                </span>
              </p>
            </div>

            <div className="space-y-3 lg:w-[28rem]">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <span>
                  Step {currentStepIndex + 1} dari {stepNavigation.length}
                </span>
                <span>{stepNavigation[currentStepIndex]?.label}</span>
              </div>
              <div className="h-1.5 overflow-hidden bg-neutral-100" aria-hidden="true">
                <div className="h-full bg-neutral-950 transition-all" style={{ width: progressPercent }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider">
                {stepNavigation.map(({ value, label, enabled }, index) => (
                  <button
                    key={value}
                    type="button"
                    disabled={!enabled}
                    onClick={() => setStep(value)}
                    className={`min-h-10 border px-2 py-2 ${
                      step === value
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : enabled
                          ? 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                          : 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300'
                    }`}
                  >
                    <span className="font-mono">{index + 1}.</span> {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <details className="border theme-border bg-white p-4 text-sm shadow-sm md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-neutral-950">
            <span>Ringkasan booking</span>
            <span className="font-mono text-xs">{formatCurrency(payNowTotal)}</span>
          </summary>
          <div className="mt-3 space-y-2 border-t border-neutral-200 pt-3 text-xs text-neutral-600">
            <div className="flex justify-between gap-4">
              <span>Item</span>
              <strong className="text-right text-neutral-950">
                {selectedItem ? `${selectedItem.code} / ${selectedItem.name}` : '-'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Pickup</span>
              <strong className="text-neutral-950">{formatDate(bookingDates?.pickupDate ?? null)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Return</span>
              <strong className="text-neutral-950">{formatDate(normalizedReturnDate)}</strong>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2">
              <span>Estimasi sewa</span>
              <strong className="text-neutral-950">{formatCurrency(estimatedRentalTotal)}</strong>
            </div>
          </div>
        </details>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border theme-border bg-white p-4 shadow-sm md:p-5">
            {step === 'order' && (
              <div className="space-y-4 md:space-y-6">
                <header className="flex items-center gap-3">
                  <CalendarCheck className="h-5 w-5 text-neutral-400" />
                  <div>
                    <h2 className="font-serif text-xl font-semibold leading-tight text-neutral-950 md:text-2xl">
                      Detail Pesanan
                    </h2>
                  </div>
                </header>

                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex gap-3 border border-neutral-200 bg-white p-3">
                      <div className="h-24 w-[4.5rem] shrink-0 overflow-hidden bg-neutral-100 md:h-20 md:w-16">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrls[0]} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                          {item.code}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-neutral-950 md:text-sm">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-neutral-950">
                          {formatCurrency(item.rentalPrice)}
                          <span className="font-normal text-neutral-500"> / 3 hari</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border border-neutral-200 bg-neutral-50 p-4">
                  <div className="space-y-3">
                    <div>
                      <div>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Pickup
                        </span>
                        <strong className="mt-1 block font-mono text-sm text-neutral-950">
                          {formatDate(bookingDates?.pickupDate ?? null)}
                        </strong>
                      </div>
                    </div>
                    <div className="border-t border-neutral-200 pt-3">
                      <div>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Acara
                        </span>
                        <strong className="mt-1 block font-mono text-sm text-neutral-950">
                          {formatDate(eventDate)}
                        </strong>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-3">
                      <div>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                          Return
                        </span>
                        <strong className="mt-1 block font-mono text-sm text-neutral-950">
                          {formatDate(normalizedReturnDate)}
                        </strong>
                      </div>
                      <label className="relative inline-flex min-h-10 shrink-0 cursor-pointer touch-manipulation items-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-900 hover:border-neutral-900 focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900">
                        <span className="pointer-events-none">Ubah</span>
                        <CalendarCheck className="pointer-events-none h-4 w-4" />
                        <input
                          type="date"
                          min={defaultReturnDate}
                          value={normalizedReturnDate}
                          onInput={(event) => setReturnDate(event.currentTarget.value)}
                          onChange={(event) => setReturnDate(event.currentTarget.value)}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          aria-label="Pilih tanggal return"
                        />
                      </label>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                    Tambahan {formatCurrency(previewExtraReturnDayFee)} per hari per item setelah {formatDate(defaultReturnDate)}.
                  </p>
                </div>

                <div className="border border-neutral-200 bg-white p-3">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Metode pickup
                  </span>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPickupMethod('store')}
                      className={`min-h-11 border px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                        pickupMethod === 'store'
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-600'
                      }`}
                    >
                      Store
                    </button>
                    <button
                      type="button"
                      onClick={() => setPickupMethod('gosend')}
                      className={`min-h-11 border px-3 py-2 text-xs font-semibold uppercase tracking-wider ${
                        pickupMethod === 'gosend'
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-600'
                      }`}
                    >
                      GoSend
                    </button>
                  </div>
                </div>

                <div className="hidden border border-neutral-900 bg-neutral-900 p-4 text-white md:block">
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
              <div className="space-y-4 md:space-y-6">
                <header className="flex items-start gap-3">
                  <UserRound className="mt-1 h-5 w-5 text-neutral-400" />
                  <div>
                    <h2 className="font-serif text-xl font-semibold leading-tight text-neutral-950 md:text-2xl">
                      Data Diri
                    </h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Nama dan WhatsApp wajib agar admin bisa verifikasi.
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
                  <label className="block space-y-1.5 md:col-span-2">
                    <span className="text-sm font-semibold text-neutral-700">Nomor WhatsApp</span>
                    <input
                      value={customerWhatsapp}
                      onChange={(event) => setCustomerWhatsapp(event.target.value)}
                      placeholder="08xxxxxxxxxx"
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
                </div>

                <div className="border border-neutral-200 bg-neutral-50">
                  <button
                    type="button"
                    onClick={() => setShowOptionalDetails((value) => !value)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-neutral-950"
                    aria-expanded={showOptionalDetails}
                  >
                    <span>Info opsional</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showOptionalDetails ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showOptionalDetails && (
                    <div className="grid gap-4 border-t border-neutral-200 p-4 md:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold text-neutral-700">Email</span>
                        <input
                          type="email"
                          value={customerEmail}
                          onChange={(event) => setCustomerEmail(event.target.value)}
                          placeholder="Untuk invoice email"
                          className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-semibold text-neutral-700">Instagram</span>
                        <input
                          value={customerInstagram}
                          onChange={(event) => setCustomerInstagram(event.target.value)}
                          placeholder="Diskon biaya booking 10%"
                          className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                      </label>
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
                  )}
                </div>

                <div className="hidden flex-col gap-2 sm:flex-row md:flex">
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
              <div className="space-y-4 md:space-y-6">
                <header className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-neutral-400" />
                  <div>
                    <h2 className="font-serif text-xl font-semibold leading-tight text-neutral-950 md:text-2xl">
                      Review Pembayaran
                    </h2>
                  </div>
                </header>

                <div className="border border-neutral-200 bg-neutral-50 p-4">
                  <h3 className="text-sm font-semibold text-neutral-950">Ringkasan pembayaran</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <span>Biaya Booking ({selectedItems.length} item)</span>
                      <strong>{formatCurrency(dpTotal)}</strong>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Diskon Instagram</span>
                      <strong>-{formatCurrency(instagramDpDiscount)}</strong>
                    </div>
                    <div className="border-t border-neutral-200 pt-2">
                      <div className="flex justify-between gap-4 font-semibold text-neutral-950">
                        <span>Dibayar setelah admin verifikasi</span>
                        <span>{formatCurrency(payNowTotal)}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                        Biaya Booking non-refundable dan tidak memotong biaya sewa.
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
                  <h3 className="font-semibold text-neutral-950">Yang perlu diketahui</h3>
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    <li>Admin akan verifikasi request booking via WhatsApp.</li>
                    <li>Biaya Booking bersifat non-refundable.</li>
                    <li>Pelunasan dilakukan saat pickup atau sebelum barang dikirim.</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => setShowFullTerms((value) => !value)}
                    className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-900"
                    aria-expanded={showFullTerms}
                  >
                    Syarat lengkap
                    <ChevronDown className={`h-4 w-4 transition-transform ${showFullTerms ? 'rotate-180' : ''}`} />
                  </button>
                  {showFullTerms && (
                    <div className="mt-3 border-t border-neutral-200 pt-3 text-sm">
                      <p className="font-semibold">Pemesanan & Pembayaran:</p>
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
                  )}
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

                <div className="hidden flex-col gap-2 sm:flex-row md:flex">
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
                      Kirim Request Booking
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

          <aside className="hidden space-y-4 xl:block">
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] md:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 pb-[env(safe-area-inset-bottom)]">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Biaya Booking</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-neutral-950">{formatCurrency(payNowTotal)}</p>
            <p className="truncate text-[11px] text-neutral-500">
              {selectedItem ? `${selectedItem.code} / ${selectedItem.name}` : 'Booking kebaya'}
            </p>
          </div>

          {step === 'order' && (
            <button
              type="button"
              onClick={goToIdentity}
              className="theme-primary-action min-h-12 shrink-0 px-5 py-3 text-xs font-bold uppercase tracking-wider"
            >
              Lanjut
            </button>
          )}

          {step === 'identity' && (
            <button
              type="button"
              onClick={goToPayment}
              className="theme-primary-action min-h-12 shrink-0 px-5 py-3 text-xs font-bold uppercase tracking-wider"
            >
              Lanjut
            </button>
          )}

          {step === 'payment' && submittedNumbers[0] && (
            <a
              href={getAdminBookingNotificationUrl(submittedNumbers[0])}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 bg-[#25D366] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Kabari
            </a>
          )}

          {step === 'payment' && !submittedNumbers[0] && (
            <button
              type="button"
              onClick={openBookingConfirmation}
              disabled={isSubmittingBooking}
              className="theme-primary-action min-h-12 shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-wider disabled:cursor-wait disabled:opacity-60"
            >
              Kirim Request
            </button>
          )}
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
                  Kirim request booking?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  Setelah dikonfirmasi, request booking masuk ke admin Farsha untuk diverifikasi.
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
                {isSubmittingBooking ? 'Mengirim...' : 'Ya, Kirim Request'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
