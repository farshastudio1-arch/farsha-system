'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Package,
  Plus,
  Search,
  Truck,
  User,
  Wallet,
} from 'lucide-react';

import type { KebayaItem } from '@/data/mockData';

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  code?: string;
};

type CreateBookingResponse = {
  id: string;
  bookingNumber: string;
};

type ManualBookingForm = {
  itemId: string;
  pickupDate: string;
  returnDueDate: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
  customerInstagram: string;
  pickupMethod: 'store' | 'gosend';
  deliveryAddress: string;
  paymentReference: string;
  notes: string;
  isPartner: boolean;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
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

function parseDatePart(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = parseDatePart(value);
  date.setDate(date.getDate() + days);

  return formatDatePart(date);
}

function getDayDifference(startDate: string, endDate: string) {
  const start = parseDatePart(startDate).getTime();
  const end = parseDatePart(endDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / 86400000));
}

function todayPlusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return formatDatePart(date);
}

function createEmptyManualBookingForm(itemId: string): ManualBookingForm {
  const pickupDate = todayPlusDays(14);

  return {
    itemId,
    pickupDate,
    returnDueDate: addDays(pickupDate, 2),
    customerName: '',
    customerWhatsapp: '',
    customerEmail: '',
    customerInstagram: '',
    pickupMethod: 'store',
    deliveryAddress: '',
    paymentReference: '',
    notes: '',
    isPartner: false,
  };
}

const inputClass =
  'min-h-12 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900';

function SectionHeader({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: string;
  icon: typeof Package;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-neutral-200 pb-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-neutral-900 bg-neutral-950 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          {step}
        </p>
        <h2 className="mt-0.5 font-display text-lg font-semibold text-neutral-950">{title}</h2>
        <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

export default function PosBookingCreateClient({
  initialItems,
  initialItemId,
}: {
  initialItems: KebayaItem[];
  initialItemId: string;
}) {
  const router = useRouter();

  const [actionError, setActionError] = useState('');
  const [isCreatingManualBooking, setIsCreatingManualBooking] = useState(false);
  const [manualBookingForm, setManualBookingForm] = useState<ManualBookingForm>(() =>
    createEmptyManualBookingForm(initialItemId || initialItems[0]?.id || ''),
  );
  const [manualItemSearch, setManualItemSearch] = useState('');

  const manualBookingItem = useMemo(
    () => initialItems.find((item) => item.id === manualBookingForm.itemId) ?? null,
    [initialItems, manualBookingForm.itemId],
  );
  const filteredManualItems = useMemo(() => {
    const query = manualItemSearch.trim().toLowerCase();

    if (!query) {
      return initialItems;
    }

    return initialItems.filter((item) =>
      [
        item.code,
        item.name,
        item.color,
        item.model,
        item.size,
        ...(item.categories ?? []),
        ...(item.hijabFriendly ? ['Hijab Friendly'] : []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [initialItems, manualItemSearch]);
  const visibleManualItems = useMemo(() => {
    if (!manualBookingItem || filteredManualItems.some((item) => item.id === manualBookingItem.id)) {
      return filteredManualItems;
    }

    return [manualBookingItem, ...filteredManualItems];
  }, [filteredManualItems, manualBookingItem]);

  const manualPickupDate = manualBookingForm.pickupDate;
  const manualEventDate = manualPickupDate ? addDays(manualPickupDate, 1) : '';
  const manualDefaultReturnDueDate = manualPickupDate ? addDays(manualPickupDate, 2) : '';
  const manualReturnDueDate =
    manualDefaultReturnDueDate && manualBookingForm.returnDueDate < manualDefaultReturnDueDate
      ? manualDefaultReturnDueDate
      : manualBookingForm.returnDueDate;
  const manualExtraReturnDays = manualDefaultReturnDueDate
    ? getDayDifference(manualDefaultReturnDueDate, manualReturnDueDate)
    : 0;
  const manualExtraReturnFee = manualExtraReturnDays * 100000;
  // Partner bookings carry no booking fee; the server enforces DP = 0 as well.
  const manualDpTotal = manualBookingForm.isPartner ? 0 : 100000;
  const manualPayNowTotal = Math.max(manualDpTotal, 0);
  const manualRentalEstimateTotal = (manualBookingItem?.rentalPrice ?? 0) + manualExtraReturnFee;

  const updateManualBookingForm = <K extends keyof ManualBookingForm>(
    key: K,
    value: ManualBookingForm[K],
  ) => {
    setManualBookingForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateManualPickupDate = (pickupDate: string) => {
    if (!pickupDate) {
      updateManualBookingForm('pickupDate', pickupDate);
      return;
    }

    setManualBookingForm((current) => ({
      ...current,
      pickupDate,
      returnDueDate: addDays(pickupDate, 2),
    }));
  };

  const createManualBooking = async () => {
    if (!manualBookingItem) {
      setActionError('Pilih item kebaya untuk booking.');
      return;
    }

    if (!manualBookingForm.customerName.trim() || !manualBookingForm.customerWhatsapp.trim()) {
      setActionError('Nama dan WhatsApp customer wajib diisi.');
      return;
    }

    if (manualBookingForm.pickupMethod === 'gosend' && !manualBookingForm.deliveryAddress.trim()) {
      setActionError('Alamat pengiriman wajib diisi untuk GoSend Instant.');
      return;
    }

    setIsCreatingManualBooking(true);
    setActionError('');

    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: [manualBookingItem.id],
          pickupDate: manualPickupDate,
          eventDate: manualEventDate,
          returnDueDate: manualReturnDueDate,
          customerName: manualBookingForm.customerName,
          customerWhatsapp: manualBookingForm.customerWhatsapp,
          customerEmail: manualBookingForm.customerEmail,
          customerInstagram: manualBookingForm.customerInstagram,
          pickupMethod: manualBookingForm.pickupMethod,
          deliveryAddress: manualBookingForm.deliveryAddress,
          notes: manualBookingForm.notes,
          source: 'whatsapp',
          status: 'requested',
          isPartner: manualBookingForm.isPartner,
          dpPerItem: manualDpTotal,
          extraReturnFeeTotal: manualExtraReturnFee,
          rentalEstimateTotal: manualRentalEstimateTotal,
          paymentReference: manualBookingForm.paymentReference,
        }),
      });
      const payload = (await response.json()) as ApiResponse<CreateBookingResponse>;

      if (!response.ok || !payload.ok || !payload.data?.id) {
        throw new Error(payload.error ?? 'Booking belum bisa dibuat.');
      }

      const { id, bookingNumber } = payload.data;
      const query = new URLSearchParams({
        bookingId: id,
        created: bookingNumber,
      });
      router.push(`/pos/bookings?${query.toString()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Booking belum bisa dibuat.';
      setActionError(message);
      setIsCreatingManualBooking(false);
    }
  };

  return (
    <main className="theme-surface min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push('/pos/bookings')}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-950"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Booking Control Desk
            </button>
            <h1 className="mt-2 font-display text-4xl font-semibold text-neutral-950">New Booking</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-500">
              Input booking manual sebagai request. Kalender baru terkunci setelah bukti transfer
              diupload dan Biaya Booking dikonfirmasi di Booking Control Desk.
            </p>
          </div>
        </div>

        {actionError && (
          <p className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {actionError}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {/* Step 1 — Item */}
            <section className="border theme-border bg-white p-5 shadow-sm">
              <SectionHeader
                step="Langkah 1"
                icon={Package}
                title="Item kebaya"
                description="Pilih koleksi yang dipesan customer."
              />
              <div className="mt-4 space-y-3">
                <div className="flex min-h-12 items-center gap-3 border border-neutral-200 bg-white px-3">
                  <Search className="h-4 w-4 text-neutral-400" />
                  <input
                    value={manualItemSearch}
                    onChange={(event) => setManualItemSearch(event.target.value)}
                    placeholder="Cari kode, nama, warna, model..."
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <select
                  value={manualBookingForm.itemId}
                  onChange={(event) => updateManualBookingForm('itemId', event.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih item</option>
                  {visibleManualItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} / {item.name}
                    </option>
                  ))}
                </select>
                <span className="block text-xs text-neutral-500">
                  {filteredManualItems.length} item cocok dari {initialItems.length} item katalog.
                </span>
              </div>
            </section>

            {/* Step 2 — Schedule */}
            <section className="border theme-border bg-white p-5 shadow-sm">
              <SectionHeader
                step="Langkah 2"
                icon={CalendarDays}
                title="Jadwal"
                description="Tanggal pickup dan return. Acara otomatis H+1 dari pickup."
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Tanggal pickup</span>
                  <input
                    type="date"
                    min={todayPlusDays(0)}
                    value={manualBookingForm.pickupDate}
                    onChange={(event) => updateManualPickupDate(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Tanggal return</span>
                  <input
                    type="date"
                    min={manualDefaultReturnDueDate}
                    value={manualReturnDueDate}
                    onChange={(event) => updateManualBookingForm('returnDueDate', event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
            </section>

            {/* Step 3 — Customer */}
            <section className="border theme-border bg-white p-5 shadow-sm">
              <SectionHeader
                step="Langkah 3"
                icon={User}
                title="Data customer"
                description="Nama dan WhatsApp wajib. Sisanya opsional."
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Nama customer</span>
                  <input
                    value={manualBookingForm.customerName}
                    onChange={(event) => updateManualBookingForm('customerName', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Nomor WhatsApp</span>
                  <input
                    value={manualBookingForm.customerWhatsapp}
                    onChange={(event) =>
                      updateManualBookingForm('customerWhatsapp', event.target.value)
                    }
                    placeholder="08xxxxxxxxxx"
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Email</span>
                  <input
                    type="email"
                    value={manualBookingForm.customerEmail}
                    onChange={(event) =>
                      updateManualBookingForm('customerEmail', event.target.value)
                    }
                    placeholder="Opsional"
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Instagram</span>
                  <input
                    value={manualBookingForm.customerInstagram}
                    onChange={(event) =>
                      updateManualBookingForm('customerInstagram', event.target.value)
                    }
                    placeholder="@username (opsional)"
                    className={inputClass}
                  />
                </label>
                <label className="flex items-start gap-3 border border-neutral-200 bg-neutral-50 p-3 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={manualBookingForm.isPartner}
                    onChange={(event) =>
                      updateManualBookingForm('isPartner', event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="space-y-0.5 text-sm">
                    <span className="block font-semibold text-neutral-900">
                      Booking partner (tanpa biaya booking)
                    </span>
                    <span className="block text-xs text-neutral-500">
                      Biaya booking Rp0 dan kalender langsung terkunci. Sewa &amp; deposit
                      di-nol-kan manual saat transaksi POS, dan ambil foto ID &amp; wajah partner
                      saat pickup.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            {/* Step 4 — Pickup */}
            <section className="border theme-border bg-white p-5 shadow-sm">
              <SectionHeader
                step="Langkah 4"
                icon={Truck}
                title="Metode pickup"
                description="Ambil di store atau kirim via GoSend."
              />
              <div className="mt-4 grid gap-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateManualBookingForm('pickupMethod', 'store')}
                    className={`min-h-12 border px-3 text-xs font-bold uppercase tracking-wider ${
                      manualBookingForm.pickupMethod === 'store'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                  >
                    Ambil store
                  </button>
                  <button
                    type="button"
                    onClick={() => updateManualBookingForm('pickupMethod', 'gosend')}
                    className={`min-h-12 border px-3 text-xs font-bold uppercase tracking-wider ${
                      manualBookingForm.pickupMethod === 'gosend'
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-600'
                    }`}
                  >
                    GoSend
                  </button>
                </div>

                {manualBookingForm.pickupMethod === 'gosend' && (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-semibold text-neutral-700">
                      Alamat pengiriman
                    </span>
                    <textarea
                      rows={3}
                      value={manualBookingForm.deliveryAddress}
                      onChange={(event) =>
                        updateManualBookingForm('deliveryAddress', event.target.value)
                      }
                      className="w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                    />
                    <span className="text-xs text-neutral-500">
                      Ongkir GoSend dibayar oleh customer.
                    </span>
                  </label>
                )}

                <label className="block space-y-1.5">
                  <span className="text-sm font-semibold text-neutral-700">Payment ref</span>
                  <input
                    value={manualBookingForm.paymentReference}
                    onChange={(event) =>
                      updateManualBookingForm('paymentReference', event.target.value)
                    }
                    placeholder="Opsional"
                    className={inputClass}
                  />
                </label>
              </div>
            </section>

            {/* Step 5 — Notes */}
            <section className="border theme-border bg-white p-5 shadow-sm">
              <SectionHeader
                step="Langkah 5"
                icon={CheckCircle2}
                title="Catatan"
                description="Detail tambahan dari chat customer."
              />
              <label className="mt-4 block space-y-1.5">
                <span className="text-sm font-semibold text-neutral-700">Catatan dari chat</span>
                <textarea
                  rows={3}
                  value={manualBookingForm.notes}
                  onChange={(event) => updateManualBookingForm('notes', event.target.value)}
                  placeholder="Contoh: request fitting, acara lamaran, warna tema"
                  className="w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
              </label>
            </section>
          </div>

          {/* Sticky summary */}
          <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
            {manualBookingItem ? (
              <div className="border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex gap-3">
                  <div className="h-24 w-20 shrink-0 overflow-hidden bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={manualBookingItem.imageUrls[0]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      {manualBookingItem.code}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-950">
                      {manualBookingItem.name}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatCurrency(manualBookingItem.rentalPrice)} / 3 hari
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-neutral-300 bg-white p-4 text-center text-xs text-neutral-400">
                Belum ada item dipilih.
              </div>
            )}

            <div className="border border-neutral-200 bg-white p-3 text-sm">
              <h3 className="font-semibold text-neutral-950">Ringkasan tanggal</h3>
              <div className="mt-3 space-y-2 text-neutral-600">
                <div className="flex justify-between gap-3">
                  <span>Pickup</span>
                  <strong className="text-right text-neutral-950">
                    {formatDate(manualPickupDate)}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Acara</span>
                  <strong className="text-right text-neutral-950">
                    {formatDate(manualEventDate)}
                  </strong>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Return</span>
                  <strong className="text-right text-neutral-950">
                    {formatDate(manualReturnDueDate)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <h3 className="flex items-center gap-2 font-semibold text-neutral-950">
                <Wallet className="h-4 w-4 text-neutral-400" />
                Ringkasan biaya
              </h3>
              <div className="mt-3 space-y-2 text-neutral-600">
                <div className="flex justify-between gap-3">
                  <span>Biaya Booking</span>
                  <strong className="text-neutral-950">{formatCurrency(manualDpTotal)}</strong>
                </div>
                <div className="flex justify-between gap-3 border-t border-neutral-200 pt-2">
                  <span>Biaya Booking dibayar</span>
                  <strong className="text-neutral-950">{formatCurrency(manualPayNowTotal)}</strong>
                </div>
                {manualBookingForm.isPartner && (
                  <p className="text-xs font-medium text-emerald-700">
                    Booking partner: biaya booking Rp0, kalender langsung terkunci. Ambil foto ID
                    &amp; wajah saat pickup di POS.
                  </p>
                )}
                <div className="flex justify-between gap-3 text-xs">
                  <span>Estimasi sewa</span>
                  <strong className="text-neutral-950">
                    {formatCurrency(manualRentalEstimateTotal)}
                  </strong>
                </div>
                {manualExtraReturnDays > 0 && (
                  <p className="text-xs text-neutral-500">
                    Termasuk tambahan return {manualExtraReturnDays} hari.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void createManualBooking()}
              disabled={isCreatingManualBooking || !manualBookingItem}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-emerald-700 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
            >
              <Plus className="h-4 w-4" />
              {isCreatingManualBooking ? 'Membuat...' : 'Buat booking'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/pos/bookings')}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-neutral-900 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-950 hover:bg-neutral-50"
            >
              Batal
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
