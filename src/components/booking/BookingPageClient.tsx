'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Mail,
  Plus,
  ReceiptText,
  ShieldCheck,
  Truck,
  UserRound,
} from 'lucide-react';

import type { KebayaItem } from '@/data/mockData';
import {
  addPreviewDays,
  calculatePreviewBookingDates,
  getPreviewBookingConflict,
  getPreviewDayDifference,
  previewDpAmount,
  previewExtraReturnDayFee,
  saveCheckoutPreviewBooking,
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
  return date.toISOString().slice(0, 10);
}

function getItemById(items: KebayaItem[], itemId: string) {
  return items.find((item) => item.id === itemId) ?? null;
}

export default function BookingPageClient({
  initialItems,
  initialItemId,
  initialEventDate,
}: {
  initialItems: KebayaItem[];
  initialItemId: string;
  initialEventDate: string;
}) {
  const firstItem = getItemById(initialItems, initialItemId) ?? initialItems[0] ?? null;
  const initialDate = calculatePreviewBookingDates(initialEventDate) ? initialEventDate : todayInputValue();
  const initialDates = calculatePreviewBookingDates(initialDate);
  const [step, setStep] = useState<BookingStep>('order');
  const [eventDate] = useState(initialDate);
  const [returnDate, setReturnDate] = useState(initialDates?.returnDate ?? initialDate);
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>('store');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(firstItem ? [firstItem.id] : []);
  const [isAddItemPanelOpen, setIsAddItemPanelOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerInstagram, setCustomerInstagram] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submittedNumbers, setSubmittedNumbers] = useState<string[]>([]);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<'database' | 'preview' | ''>('');
  const [confirmedOrderKey, setConfirmedOrderKey] = useState('');
  const [confirmedIdentityKey, setConfirmedIdentityKey] = useState('');
  const returnDateInputRef = useRef<HTMLInputElement>(null);

  const bookingDates = useMemo(() => calculatePreviewBookingDates(eventDate), [eventDate]);
  const selectedItems = selectedItemIds
    .map((itemId) => getItemById(initialItems, itemId))
    .filter((item): item is KebayaItem => Boolean(item));
  const availableAddItems = initialItems.filter((item) => !selectedItemIds.includes(item.id));
  const defaultReturnDate = bookingDates?.returnDate ?? eventDate;
  const normalizedReturnDate = returnDate < defaultReturnDate ? defaultReturnDate : returnDate;
  const bufferUntilDate = addPreviewDays(normalizedReturnDate, 1);
  const extraReturnDays = getPreviewDayDifference(defaultReturnDate, normalizedReturnDate);
  const extraReturnFee = extraReturnDays * previewExtraReturnDayFee * selectedItems.length;
  const rentalSubtotal = selectedItems.reduce((sum, item) => sum + item.rentalPrice, 0);
  const dpTotal = previewDpAmount * selectedItems.length;
  const instagramDpDiscount = customerInstagram.trim() ? Math.round(dpTotal * 0.1) : 0;
  const estimatedRentalTotal = Math.max(rentalSubtotal + extraReturnFee, 0);
  const payNowTotal = Math.max(dpTotal - instagramDpDiscount, 0);
  const perItemDpPayNow =
    selectedItems.length > 0 ? Math.round(payNowTotal / selectedItems.length) : previewDpAmount;
  const hasConflict = selectedItems.some((item) =>
    getPreviewBookingConflict(item.id, {
      eventDate,
      pickupDate: bookingDates?.pickupDate ?? eventDate,
      returnDate: normalizedReturnDate,
      bufferUntilDate,
    }),
  );
  const orderConfirmationKey = [
    eventDate,
    bookingDates?.pickupDate ?? '',
    normalizedReturnDate,
    pickupMethod,
    selectedItemIds.join('|'),
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

  const addSelectedItem = (itemId: string) => {
    if (!itemId || selectedItemIds.includes(itemId)) {
      return;
    }

    setSelectedItemIds((current) => [...current, itemId]);
    setSubmittedNumbers([]);
    setFormError('');
  };

  const removeItem = (itemId: string) => {
    if (selectedItemIds.length <= 1) {
      return;
    }

    setSelectedItemIds((current) => current.filter((entry) => entry !== itemId));
    setSubmittedNumbers([]);
  };

  const goToIdentity = () => {
    if (!bookingDates || selectedItems.length === 0) {
      setFormError('Pilih tanggal dan minimal satu kebaya.');
      return;
    }

    if (hasConflict) {
      setFormError('Ada item yang sudah ter-booking di tanggal ini. Ganti tanggal atau item.');
      return;
    }

    setFormError('');
    setConfirmedOrderKey(orderConfirmationKey);
    setStep('identity');
  };

  const goToPayment = () => {
    if (!customerName.trim()) {
      setFormError('Nama lengkap sesuai KTP wajib diisi.');
      return;
    }

    if (!customerWhatsapp.trim()) {
      setFormError('Nomor WhatsApp wajib diisi.');
      return;
    }

    if (pickupMethod === 'gosend' && !deliveryAddress.trim()) {
      setFormError('Alamat pengiriman wajib diisi untuk GoSend Instant.');
      return;
    }

    setFormError('');
    setConfirmedIdentityKey(identityConfirmationKey);
    setStep('payment');
  };

  const lockDates = async () => {
    if (!bookingDates || selectedItems.length === 0 || hasConflict) {
      setFormError('Booking belum bisa dikunci. Cek tanggal dan item terlebih dahulu.');
      return;
    }

    setIsSubmittingBooking(true);
    setFormError('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: selectedItems.map((item) => item.id),
          pickupDate: bookingDates.pickupDate,
          eventDate,
          returnDueDate: normalizedReturnDate,
          customerName,
          customerWhatsapp,
          customerEmail,
          customerInstagram,
          pickupMethod,
          deliveryAddress,
          notes,
          dpPerItem: perItemDpPayNow,
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

      setSubmittedNumbers([payload.data.bookingNumber]);
      setSubmissionMode('database');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking belum bisa dikirim.';

      if (message.includes('bentrok') || message.includes('tidak tersedia')) {
        setFormError(message);
        return;
      }

      const savedNumbers = selectedItems.map((item) =>
        saveCheckoutPreviewBooking({
          item,
          customerName,
          customerWhatsapp,
          customerEmail,
          customerInstagram,
          deliveryAddress,
          eventDate,
          pickupDate: bookingDates.pickupDate,
          returnDate: normalizedReturnDate,
          bufferUntilDate,
          pickupMethod,
          notes,
          itemCount: 1,
          dpTotal: perItemDpPayNow,
          extraReturnFee: extraReturnDays * previewExtraReturnDayFee,
        }).bookingNumber,
      );

      setSubmittedNumbers(savedNumbers);
      setSubmissionMode('preview');
      setFormError('Database booking belum aktif, jadi request disimpan sebagai preview lokal.');
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
      <div className="mx-auto max-w-6xl space-y-6">
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
                Booking Farsha Studio
              </p>
              <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-neutral-950">
                Kunci tanggal sewa kebaya
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                Lengkapi detail pesanan, data diri, lalu bayar DP untuk mengamankan slot booking.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
              {stepNavigation.map(({ value, label, enabled }) => (
                <button
                  key={value}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setStep(value)}
                  className={`border px-3 py-2 ${
                    step === value
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : enabled
                        ? 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                        : 'cursor-not-allowed border-neutral-100 bg-neutral-50 text-neutral-300'
                  }`}
                >
                  {label}
                </button>
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

                <div className="border border-neutral-200 bg-neutral-50 p-4">
                  <span className="block text-sm font-semibold text-neutral-700">
                    Konfirmasi tanggal acara
                  </span>
                  <strong className="mt-2 block font-mono text-xl text-neutral-950">
                    {formatDate(eventDate)}
                  </strong>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                    Tanggal ini mengikuti pilihan dari katalog. Kalau ingin ganti tanggal, cek ulang
                    availability kebaya dari katalog.
                  </p>
                  <Link
                    href="/catalog"
                    className="mt-3 inline-flex border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold uppercase text-neutral-900 hover:border-neutral-900"
                  >
                    Cek tanggal lain
                  </Link>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="border border-neutral-200 bg-neutral-50 p-4">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Tanggal pickup
                    </span>
                    <strong className="mt-1 block font-mono text-lg text-neutral-950">
                      {formatDate(bookingDates?.pickupDate ?? null)}
                    </strong>
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

                  <div className="block border border-neutral-200 bg-neutral-50 p-4">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
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
                  {selectedItems.map((item) => {
                    const conflict = getPreviewBookingConflict(item.id, {
                      eventDate,
                      pickupDate: bookingDates?.pickupDate ?? eventDate,
                      returnDate: normalizedReturnDate,
                      bufferUntilDate,
                    });

                    return (
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
                          {conflict && (
                            <p className="mt-2 border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                              Tanggal bentrok dengan {conflict.bookingNumber}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={selectedItems.length <= 1}
                          onClick={() => removeItem(item.id)}
                          className="self-start text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-red-600 disabled:opacity-30"
                        >
                          Hapus
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-950">Tambah item kebaya</h3>
                      <p className="mt-1 text-xs text-neutral-500">
                        Lihat kebaya lain jika ingin booking lebih dari satu item.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={availableAddItems.length === 0}
                      onClick={() => setIsAddItemPanelOpen((isOpen) => !isOpen)}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 border border-neutral-900 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-300"
                    >
                      <Plus className="h-4 w-4" />
                      {availableAddItems.length === 0
                        ? 'Semua dipilih'
                        : isAddItemPanelOpen
                          ? 'Sembunyikan'
                          : 'Lihat kebaya lain'}
                    </button>
                  </div>

                  {availableAddItems.length === 0 && (
                    <p className="border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-500">
                      Semua item preview sudah masuk ke pesanan ini.
                    </p>
                  )}

                  {isAddItemPanelOpen && availableAddItems.length > 0 && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {availableAddItems.map((item) => {
                        const addConflict = getPreviewBookingConflict(item.id, {
                          eventDate,
                          pickupDate: bookingDates?.pickupDate ?? eventDate,
                          returnDate: normalizedReturnDate,
                          bufferUntilDate,
                        });

                        return (
                          <div key={item.id} className="border border-neutral-200 bg-white p-2">
                            <div className="flex gap-3">
                              <div className="h-24 w-20 shrink-0 overflow-hidden bg-neutral-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.imageUrls[0]}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-[10px] font-bold uppercase text-neutral-400">
                                  {item.code}
                                </p>
                                <h4 className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-950">
                                  {item.name}
                                </h4>
                                <p className="mt-1 text-xs text-neutral-500">
                                  {formatCurrency(item.rentalPrice)} / 3 hari
                                </p>
                                {addConflict && (
                                  <p className="mt-2 text-xs font-semibold text-amber-700">
                                    Sudah ter-booking di tanggal ini
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={Boolean(addConflict)}
                              onClick={() => addSelectedItem(item.id)}
                              className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 border border-neutral-900 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-900 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-300"
                            >
                              <Plus className="h-4 w-4" />
                              Tambah
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="border border-neutral-900 bg-neutral-900 p-4 text-white">
                  <div className="flex justify-between text-sm">
                    <span>Total estimasi sewa</span>
                    <strong>{formatCurrency(estimatedRentalTotal)}</strong>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-neutral-300">
                    <span>DP untuk kunci tanggal</span>
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
                      Data ini masuk ke POS preview setelah tanggal dikunci.
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
                      Preview pembayaran DP. Belum ada payment gateway sungguhan.
                    </p>
                  </div>
                </header>

                <div className="border border-neutral-200 bg-neutral-50 p-4">
                  <h3 className="text-sm font-semibold text-neutral-950">Ringkasan pembayaran</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>DP booking ({selectedItems.length} item)</span>
                      <strong>{formatCurrency(dpTotal)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Diskon Instagram 10% untuk DP</span>
                      <strong>-{formatCurrency(instagramDpDiscount)}</strong>
                    </div>
                    <div className="border-t border-neutral-200 pt-2">
                      <div className="flex justify-between font-semibold text-neutral-950">
                        <span>Total DP dibayar sekarang</span>
                        <span>{formatCurrency(payNowTotal)}</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                        DP hanya untuk mengunci tanggal dan bersifat non-refundable. DP tidak
                        memotong biaya sewa.
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
                    <li>Pembayaran DP diperlukan untuk mengunci jadwal.</li>
                    <li>DP bersifat non-refundable.</li>
                    <li>Pelunasan dilakukan saat pengambilan atau sebelum barang dikirim.</li>
                  </ul>
                  <p className="mt-3 font-semibold">Verifikasi:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Booking via website akan diverifikasi admin dalam 24 jam.</li>
                  </ul>
                  <p className="mt-3 font-semibold">Fitting:</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>Link jadwal fitting akan dikirimkan melalui WhatsApp setelah melakukan pembayaran DP.</li>
                  </ul>
                </div>

                {submittedNumbers.length > 0 && (
                  <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">
                          Request booking masuk, menunggu verifikasi DP dari admin.
                        </p>
                        <p className="mt-1">
                          Nomor booking: {submittedNumbers.join(', ')}
                        </p>
                        {submissionMode === 'preview' && (
                          <p className="mt-1 text-xs">
                            Ini masih tersimpan di preview lokal karena database belum aktif.
                          </p>
                        )}
                        <Link href="/pos/bookings" className="mt-3 inline-flex font-semibold underline">
                          Lihat di POS
                        </Link>
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
                  <button
                    type="button"
                    onClick={lockDates}
                    disabled={isSubmittingBooking}
                    className="theme-primary-action flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wider disabled:cursor-wait disabled:opacity-60"
                  >
                    {isSubmittingBooking ? 'Mengirim...' : 'Kunci Tanggal'}
                  </button>
                </div>
              </div>
            )}

            {formError && (
              <p className="mt-5 border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                {formError}
              </p>
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
                  <span className="text-neutral-500">Tanggal acara</span>
                  <strong>{formatDate(eventDate)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Pickup</span>
                  <strong>{formatDate(bookingDates?.pickupDate ?? null)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Return</span>
                  <strong>{formatDate(normalizedReturnDate)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Item</span>
                  <strong>{selectedItems.length}</strong>
                </div>
                <div className="border-t border-neutral-200 pt-3">
                  <div className="flex justify-between text-base font-semibold text-neutral-950">
                    <span>DP sekarang</span>
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
                  <p>Invoice preview akan diarahkan ke {customerEmail.trim()}.</p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
