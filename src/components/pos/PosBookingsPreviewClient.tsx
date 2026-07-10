'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Plus,
  Receipt,
  Search,
  Send,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';

import type { KebayaItem } from '@/data/mockData';
import {
  calculatePreviewBookingDates,
  doPreviewBookingDatesOverlap,
  getPreviewBookingStatusClass,
  getPreviewBookingStatusLabel,
  getPreviewBookingChangeEventName,
  mergePreviewBookings,
  previewBookings,
  previewDpAmount,
  readStoredPreviewBookings,
  writeStoredPreviewBookings,
  type PreviewBooking,
  type PreviewBookingStatus,
} from '@/lib/booking-preview';
import { useSavedCatalogItems } from '@/lib/catalog-storage';

type QueueFilter = PreviewBookingStatus | 'all' | 'conflict' | 'upcoming';
type ManualBookingForm = {
  itemId: string;
  eventDate: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
  customerInstagram: string;
  dpAmount: string;
  paymentReference: string;
  notes: string;
};

const queueOptions: Array<{ value: QueueFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'payment_submitted', label: 'Payment submitted' },
  { value: 'dp_confirmed', label: 'DP confirmed' },
  { value: 'upcoming', label: 'Upcoming pickup' },
  { value: 'conflict', label: 'Conflict' },
];

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createEmptyManualBookingForm(itemId = ''): ManualBookingForm {
  return {
    itemId,
    eventDate: '',
    customerName: '',
    customerWhatsapp: '',
    customerEmail: '',
    customerInstagram: '',
    dpAmount: String(previewDpAmount),
    paymentReference: '',
    notes: '',
  };
}

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
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getNoteField(notes: string, label: string) {
  const prefix = `${label}:`;
  const part = notes
    .split('/')
    .map((entry) => entry.trim())
    .find((entry) => entry.toLowerCase().startsWith(prefix.toLowerCase()));

  return part ? part.slice(prefix.length).trim() : '';
}

function getCustomerEmail(booking: PreviewBooking) {
  return booking.customerEmail || getNoteField(booking.notes, 'Email invoice');
}

function getCustomerInstagram(booking: PreviewBooking) {
  return booking.customerInstagram || getNoteField(booking.notes, 'Instagram');
}

function isBlockingStatus(status: PreviewBookingStatus) {
  return status === 'dp_confirmed' || status === 'pickup_ready' || status === 'converted_to_rental';
}

function hasBlockingConflict(booking: PreviewBooking, bookings: PreviewBooking[]) {
  return bookings.some(
    (entry) =>
      entry.id !== booking.id &&
      entry.itemId === booking.itemId &&
      isBlockingStatus(entry.status) &&
      doPreviewBookingDatesOverlap(booking, entry),
  );
}

function getItemLabel(itemId: string, items: KebayaItem[]) {
  const item = items.find((entry) => entry.id === itemId);
  return item ? `${item.code} / ${item.name}` : itemId;
}

export default function PosBookingsPreviewClient({
  initialItems,
  initialItemId,
  initialDatabaseBookings = [],
}: {
  initialItems: KebayaItem[];
  initialItemId: string;
  initialDatabaseBookings?: PreviewBooking[];
}) {
  const catalogItems = useSavedCatalogItems(initialItems);
  const seedBookings = useMemo(
    () => mergePreviewBookings(initialDatabaseBookings, previewBookings),
    [initialDatabaseBookings],
  );
  const [bookings, setBookings] = useState<PreviewBooking[]>(seedBookings);
  const [selectedBookingId, setSelectedBookingId] = useState<string>(seedBookings[0]?.id ?? '');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [itemFilter, setItemFilter] = useState(initialItemId);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isManualFormOpen, setIsManualFormOpen] = useState(false);
  const [manualBookingForm, setManualBookingForm] = useState<ManualBookingForm>(() =>
    createEmptyManualBookingForm(initialItemId || initialItems[0]?.id || ''),
  );
  const [uploadingProofBookingId, setUploadingProofBookingId] = useState('');
  const [invoiceBookingId, setInvoiceBookingId] = useState('');

  useEffect(() => {
    const syncStoredBookings = () => {
      setBookings(mergePreviewBookings(readStoredPreviewBookings(), seedBookings));
    };

    syncStoredBookings();
    window.addEventListener('storage', syncStoredBookings);
    window.addEventListener(getPreviewBookingChangeEventName(), syncStoredBookings);

    return () => {
      window.removeEventListener('storage', syncStoredBookings);
      window.removeEventListener(getPreviewBookingChangeEventName(), syncStoredBookings);
    };
  }, [seedBookings]);

  const selectedBooking = useMemo(
    () => bookings.find((booking) => booking.id === selectedBookingId) ?? null,
    [bookings, selectedBookingId],
  );
  const invoiceBooking = useMemo(
    () => bookings.find((booking) => booking.id === invoiceBookingId) ?? null,
    [bookings, invoiceBookingId],
  );
  const manualBookingItem = useMemo(
    () => catalogItems.find((item) => item.id === manualBookingForm.itemId) ?? null,
    [catalogItems, manualBookingForm.itemId],
  );
  const manualBookingDates = useMemo(
    () => calculatePreviewBookingDates(manualBookingForm.eventDate),
    [manualBookingForm.eventDate],
  );

  const metrics = useMemo(() => {
    const requested = bookings.filter((booking) => booking.status === 'requested').length;
    const paymentSubmitted = bookings.filter(
      (booking) => booking.status === 'payment_submitted',
    ).length;
    const confirmed = bookings.filter((booking) => booking.status === 'dp_confirmed').length;
    const upcoming = bookings.filter((booking) => booking.status === 'pickup_ready').length;
    const conflicts = bookings.filter((booking) => hasBlockingConflict(booking, bookings)).length;

    return { requested, paymentSubmitted, confirmed, upcoming, conflicts };
  }, [bookings]);

  const visibleBookings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesQueue =
        queueFilter === 'all' ||
        booking.status === queueFilter ||
        (queueFilter === 'conflict' && hasBlockingConflict(booking, bookings)) ||
        (queueFilter === 'upcoming' && booking.status === 'pickup_ready');
      const matchesItem = !itemFilter || booking.itemId === itemFilter;
      const matchesQuery =
        !query ||
        booking.bookingNumber.toLowerCase().includes(query) ||
        booking.customerName.toLowerCase().includes(query) ||
        booking.itemName.toLowerCase().includes(query) ||
        booking.itemCode.toLowerCase().includes(query);

      return matchesQueue && matchesItem && matchesQuery;
    });
  }, [bookings, itemFilter, queueFilter, searchQuery]);

  const updatePreviewBookings = (updater: (current: PreviewBooking[]) => PreviewBooking[]) => {
    setBookings((current) => {
      const next = updater(current);
      writeStoredPreviewBookings(next);
      return next;
    });
  };

  const updateBookingStatus = (bookingId: string, status: PreviewBookingStatus, message: string) => {
    updatePreviewBookings((current) =>
      current.map((booking) => (booking.id === bookingId ? { ...booking, status } : booking)),
    );
    setActionMessage(message);
  };

  const confirmDp = (booking: PreviewBooking) => {
    if (!booking.paymentProofUrl) {
      setActionMessage('Upload bukti transfer sebelum confirm DP.');
      return;
    }

    const confirmedBooking = {
      ...booking,
      status: 'dp_confirmed' as const,
      bufferUntilDate: addDays(booking.returnDate, 2),
    };

    if (hasBlockingConflict(confirmedBooking, bookings)) {
      setActionMessage(
        `${booking.bookingNumber} cannot be DP confirmed in preview because the date overlaps a blocking booking.`,
      );
      return;
    }

    updatePreviewBookings((current) =>
      current.map((entry) => (entry.id === booking.id ? confirmedBooking : entry)),
    );
    setInvoiceBookingId(booking.id);
    setActionMessage(
      `${booking.bookingNumber} DP confirmed. Kalender terblokir sampai ${formatDate(confirmedBooking.bufferUntilDate)}.`,
    );
  };

  const createManualBooking = () => {
    if (!manualBookingItem || !manualBookingDates) {
      setActionMessage('Pilih item dan tanggal acara yang valid untuk booking manual.');
      return;
    }

    const customerName = manualBookingForm.customerName.trim();
    const customerWhatsapp = manualBookingForm.customerWhatsapp.trim();

    if (!customerName || !customerWhatsapp) {
      setActionMessage('Nama dan WhatsApp wajib diisi untuk booking manual.');
      return;
    }

    const ordinal = Date.now();
    const month = manualBookingDates.eventDate.slice(0, 7).replace('-', '');
    const dpAmount = Number(manualBookingForm.dpAmount.replace(/[^\d]/g, '')) || previewDpAmount;
    const manualBooking: PreviewBooking = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? `booking-${crypto.randomUUID()}`
          : `booking-${ordinal}`,
      bookingNumber: `BK-${month}-${String(ordinal).slice(-4)}`,
      itemId: manualBookingItem.id,
      itemCode: manualBookingItem.code,
      itemName: manualBookingItem.name,
      customerName,
      customerWhatsapp,
      customerEmail: manualBookingForm.customerEmail.trim(),
      customerInstagram: manualBookingForm.customerInstagram.trim(),
      eventDate: manualBookingDates.eventDate,
      pickupDate: manualBookingDates.pickupDate,
      returnDate: manualBookingDates.returnDate,
      bufferUntilDate: addDays(manualBookingDates.returnDate, 2),
      status: 'requested',
      dpAmount,
      securityDeposit: 0,
      paymentMethod: 'transfer',
      paymentReference: manualBookingForm.paymentReference.trim(),
      notes: [
        'Manual booking dari chat WhatsApp',
        manualBookingForm.notes.trim(),
        manualBookingForm.customerEmail.trim()
          ? `Email invoice: ${manualBookingForm.customerEmail.trim()}`
          : '',
        manualBookingForm.customerInstagram.trim()
          ? `Instagram: ${manualBookingForm.customerInstagram.trim()}`
          : '',
      ]
        .filter(Boolean)
        .join(' / '),
      source: 'whatsapp',
      createdAt: new Date().toISOString(),
    };

    updatePreviewBookings((current) => [manualBooking, ...current]);
    setSelectedBookingId(manualBooking.id);
    setQueueFilter('all');
    setManualBookingForm(createEmptyManualBookingForm(manualBookingItem.id));
    setIsManualFormOpen(false);
    setActionMessage(`${manualBooking.bookingNumber} dibuat dari booking manual.`);
  };

  const uploadPaymentProof = async (booking: PreviewBooking, file: File | null) => {
    if (!file) {
      return;
    }

    setUploadingProofBookingId(booking.id);
    setActionMessage('Uploading bukti transfer...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('filenameHint', `${booking.bookingNumber}-dp-proof`);
      formData.append('sourceArea', 'booking-payments');
      formData.append('originalFilename', file.name);
      formData.append('originalSize', String(file.size));

      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        data?: { key?: string; url?: string };
      };

      if (!response.ok || !payload.ok || !payload.data?.url) {
        throw new Error(payload.error ?? 'Upload bukti transfer gagal.');
      }

      updatePreviewBookings((current) =>
        current.map((entry) =>
          entry.id === booking.id
            ? {
                ...entry,
                paymentReference: entry.paymentReference || `BUKTI-${entry.bookingNumber}`,
                paymentProofUrl: payload.data?.url,
                paymentProofKey: payload.data?.key,
                paymentProofFilename: file.name,
              }
            : entry,
        ),
      );
      setActionMessage(`Bukti transfer untuk ${booking.bookingNumber} berhasil diupload.`);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Upload bukti transfer gagal.');
    } finally {
      setUploadingProofBookingId('');
    }
  };

  const chooseBooking = (booking: PreviewBooking) => {
    setSelectedBookingId(booking.id);
    setActionMessage('');
  };

  const createFittingScheduleLink = (booking: PreviewBooking) => {
    const cleanPhone = booking.customerWhatsapp.replace(/[^0-9]/g, '').replace(/^0/, '62');
    const message = [
      `Halo Kak ${booking.customerName}, DP booking ${booking.bookingNumber} sudah kami konfirmasi.`,
      'Silakan pilih jadwal fitting melalui link berikut:',
      '[ISI LINK JADWAL FITTING]',
      'Terima kasih.',
    ].join('\n');

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-6">
      <section className="border border-[var(--theme-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              POS Booking Preview
            </p>
            <h1 className="mt-1 text-2xl font-serif font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              Booking Control Desk
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Mock workflow for requests, DP review, conflicts, pickup, and rental conversion.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOverviewOpen((isOpen) => !isOpen)}
            className="inline-flex min-h-11 items-center justify-center border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-950"
          >
            {isOverviewOpen ? 'Sembunyikan ringkasan' : 'Tampilkan ringkasan'}
          </button>
        </div>

        {isOverviewOpen && (
          <div className="mt-6 space-y-4">
            <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Booking records are still preview only. Payment proof uploads can create R2 media files.
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                { label: 'Requested', value: metrics.requested, icon: Clock3 },
                { label: 'Payment submitted', value: metrics.paymentSubmitted, icon: Receipt },
                { label: 'DP confirmed', value: metrics.confirmed, icon: CheckCircle2 },
                { label: 'Pickup ready', value: metrics.upcoming, icon: CalendarCheck },
                { label: 'Conflict warning', value: metrics.conflicts, icon: ShieldAlert },
              ].map((metric) => (
                <div key={metric.label} className="border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                        {metric.label}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-neutral-950">{metric.value}</p>
                    </div>
                    <metric.icon className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="border border-[var(--theme-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Manual booking
            </p>
            <h2 className="mt-1 text-lg font-semibold text-neutral-950">Booking dari WhatsApp</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Buat request booking manual setelah admin chat dengan customer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsManualFormOpen((isOpen) => !isOpen)}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-900 bg-neutral-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" />
            {isManualFormOpen ? 'Tutup form' : 'Add booking manual'}
          </button>
        </div>

        {isManualFormOpen && (
          <div className="mt-5 grid gap-4 border-t border-neutral-100 pt-5">
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-neutral-600">Item kebaya</span>
                <select
                  value={manualBookingForm.itemId}
                  onChange={(event) =>
                    setManualBookingForm((form) => ({ ...form, itemId: event.target.value }))
                  }
                  className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  {catalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} / {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-neutral-600">Tanggal acara</span>
                <input
                  type="date"
                  min={todayInputValue()}
                  value={manualBookingForm.eventDate}
                  onChange={(event) =>
                    setManualBookingForm((form) => ({ ...form, eventDate: event.target.value }))
                  }
                  className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>
            </div>

            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="border border-neutral-200 bg-neutral-50 p-3">
                <span className="block text-neutral-400">Pickup otomatis</span>
                <strong>{formatDate(manualBookingDates?.pickupDate ?? null)}</strong>
              </div>
              <div className="border border-neutral-200 bg-neutral-50 p-3">
                <span className="block text-neutral-400">Return default</span>
                <strong>{formatDate(manualBookingDates?.returnDate ?? null)}</strong>
              </div>
              <div className="border border-neutral-200 bg-neutral-50 p-3">
                <span className="block text-neutral-400">Blokir sampai</span>
                <strong>
                  {manualBookingDates ? formatDate(addDays(manualBookingDates.returnDate, 3)) : '-'}
                </strong>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-neutral-600">Nama customer</span>
                <input
                  value={manualBookingForm.customerName}
                  onChange={(event) =>
                    setManualBookingForm((form) => ({ ...form, customerName: event.target.value }))
                  }
                  className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-neutral-600">WhatsApp</span>
                <input
                  value={manualBookingForm.customerWhatsapp}
                  onChange={(event) =>
                    setManualBookingForm((form) => ({
                      ...form,
                      customerWhatsapp: event.target.value,
                    }))
                  }
                  className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-neutral-600">Email opsional</span>
                <input
                  value={manualBookingForm.customerEmail}
                  onChange={(event) =>
                    setManualBookingForm((form) => ({ ...form, customerEmail: event.target.value }))
                  }
                  className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-neutral-600">Instagram opsional</span>
                <input
                  value={manualBookingForm.customerInstagram}
                  onChange={(event) =>
                    setManualBookingForm((form) => ({
                      ...form,
                      customerInstagram: event.target.value,
                    }))
                  }
                  className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-neutral-600">DP booking</span>
                <input
                  value={manualBookingForm.dpAmount}
                  onChange={(event) =>
                    setManualBookingForm((form) => ({ ...form, dpAmount: event.target.value }))
                  }
                  className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-neutral-600">Payment ref opsional</span>
                <input
                  value={manualBookingForm.paymentReference}
                  onChange={(event) =>
                    setManualBookingForm((form) => ({
                      ...form,
                      paymentReference: event.target.value,
                    }))
                  }
                  className="h-11 w-full border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>
            </div>

            <label className="block text-xs">
              <span className="mb-1 block font-semibold text-neutral-600">Catatan</span>
              <textarea
                rows={3}
                value={manualBookingForm.notes}
                onChange={(event) =>
                  setManualBookingForm((form) => ({ ...form, notes: event.target.value }))
                }
                className="w-full border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </label>

            <button
              type="button"
              onClick={createManualBooking}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-emerald-700 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Buat booking manual
            </button>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="border border-[var(--theme-border)] bg-white shadow-sm">
          <div className="border-b border-[var(--theme-border)] bg-neutral-50 p-4">
            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_190px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari booking, customer, kode item..."
                  className="w-full border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <select
                  value={queueFilter}
                  onChange={(event) => setQueueFilter(event.target.value as QueueFilter)}
                  className="w-full border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  {queueOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={itemFilter}
                onChange={(event) => setItemFilter(event.target.value)}
                className="w-full border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="">All items</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="divide-y divide-neutral-200">
            {visibleBookings.map((booking) => {
              const isSelected = selectedBookingId === booking.id;
              const hasConflict = hasBlockingConflict(booking, bookings);

              return (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => chooseBooking(booking)}
                  className={`block w-full p-4 text-left transition-colors ${
                    isSelected ? 'bg-neutral-50 ring-1 ring-inset ring-neutral-900' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-neutral-950">
                          {booking.bookingNumber}
                        </span>
                        <span
                          className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getPreviewBookingStatusClass(
                            booking.status,
                          )}`}
                        >
                          {getPreviewBookingStatusLabel(booking.status)}
                        </span>
                        {hasConflict && (
                          <span className="border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-700">
                            Conflict
                          </span>
                        )}
                      </div>
                      <h2 className="mt-2 text-sm font-semibold text-neutral-950">{booking.itemName}</h2>
                      <p className="mt-1 text-xs text-neutral-500">
                        {booking.customerName} / {booking.customerWhatsapp}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] text-neutral-500 lg:w-[300px]">
                      <span>
                        <strong className="block text-neutral-900">Pickup</strong>
                        {formatDate(booking.pickupDate)}
                      </span>
                      <span>
                        <strong className="block text-neutral-900">Event</strong>
                        {formatDate(booking.eventDate)}
                      </span>
                      <span>
                        <strong className="block text-neutral-900">Return</strong>
                        {formatDate(booking.returnDate)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            {visibleBookings.length === 0 && (
              <div className="p-10 text-center text-sm text-neutral-500">
                No preview bookings match this filter.
              </div>
            )}
          </div>
        </section>

        <aside className="border border-[var(--theme-border)] bg-white p-5 shadow-sm">
          {!selectedBooking ? (
            <div className="py-20 text-center">
              <CalendarCheck className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="mt-3 text-sm font-semibold text-neutral-900">Select a booking</p>
              <p className="mt-1 text-xs text-neutral-500">Pick a row to preview POS controls.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border-b border-neutral-200 pb-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Booking file
                </p>
                <h2 className="mt-1 font-mono text-base font-semibold text-neutral-950">
                  {selectedBooking.bookingNumber}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {getItemLabel(selectedBooking.itemId, catalogItems)}
                </p>
              </div>

              {actionMessage && (
                <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="flex-1">{actionMessage}</p>
                  <button type="button" onClick={() => setActionMessage('')} aria-label="Clear message">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="border border-neutral-200 bg-neutral-50 p-3 text-xs">
                <p className="font-semibold text-neutral-800">Data pemesan</p>
                <div className="mt-3 grid gap-2">
                  <div className="flex justify-between gap-3">
                    <span className="text-neutral-400">Nama</span>
                    <strong className="text-right text-neutral-950">{selectedBooking.customerName}</strong>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-neutral-400">WhatsApp</span>
                    <strong className="text-right font-mono text-neutral-950">
                      {selectedBooking.customerWhatsapp}
                    </strong>
                  </div>
                  {getCustomerEmail(selectedBooking) && (
                    <div className="flex justify-between gap-3">
                      <span className="text-neutral-400">Email</span>
                      <strong className="break-all text-right text-neutral-950">
                        {getCustomerEmail(selectedBooking)}
                      </strong>
                    </div>
                  )}
                  {getCustomerInstagram(selectedBooking) && (
                    <div className="flex justify-between gap-3">
                      <span className="text-neutral-400">Instagram</span>
                      <strong className="text-right text-neutral-950">
                        {getCustomerInstagram(selectedBooking)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-2 text-xs">
                <div className="border border-neutral-200 bg-neutral-50 p-3">
                  <span className="block text-neutral-400">DP</span>
                  <strong>{formatCurrency(selectedBooking.dpAmount)}</strong>
                </div>
                <div className="border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <span className="block text-neutral-400">Payment ref</span>
                      <strong className="break-words">
                        {selectedBooking.paymentReference || 'Belum ada referensi pembayaran'}
                      </strong>
                      {selectedBooking.paymentProofUrl && (
                        <a
                          href={selectedBooking.paymentProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block text-[11px] font-semibold uppercase tracking-wider text-emerald-700 underline"
                        >
                          Lihat bukti transfer
                        </a>
                      )}
                      {selectedBooking.paymentProofFilename && (
                        <p className="mt-1 text-[11px] text-neutral-500">
                          {selectedBooking.paymentProofFilename}
                        </p>
                      )}
                    </div>
                    <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-neutral-300 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-700 hover:border-neutral-900 hover:text-neutral-950">
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingProofBookingId === selectedBooking.id ? 'Uploading...' : 'Upload bukti'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploadingProofBookingId === selectedBooking.id}
                        onChange={(event) => {
                          void uploadPaymentProof(selectedBooking, event.target.files?.[0] ?? null);
                          event.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => confirmDp(selectedBooking)}
                  disabled={!selectedBooking.paymentProofUrl || selectedBooking.status === 'dp_confirmed'}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
                    selectedBooking.paymentProofUrl && selectedBooking.status !== 'dp_confirmed'
                      ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'cursor-not-allowed bg-neutral-200 text-neutral-500'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {selectedBooking.status === 'dp_confirmed' ? 'DP Confirmed' : 'Confirm DP'}
                </button>
                {!selectedBooking.paymentProofUrl && selectedBooking.status !== 'dp_confirmed' && (
                  <p className="text-[11px] leading-relaxed text-neutral-500">
                    Upload bukti transfer dulu sebelum admin bisa confirm DP.
                  </p>
                )}
                {selectedBooking.status === 'dp_confirmed' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setInvoiceBookingId(selectedBooking.id)}
                      className="inline-flex items-center justify-center gap-2 border border-neutral-900 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-950 hover:bg-neutral-50"
                    >
                      <FileText className="h-4 w-4" />
                      Lihat Invoice
                    </button>
                    <a
                      href={createFittingScheduleLink(selectedBooking)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 border border-neutral-900 bg-neutral-900 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-neutral-800"
                    >
                      <Send className="h-4 w-4" />
                      Kirim link jadwal fitting
                    </a>
                  </>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateBookingStatus(
                        selectedBooking.id,
                        'rejected',
                        `${selectedBooking.bookingNumber} rejected in preview.`,
                      )
                    }
                    className="border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-red-700 hover:bg-red-100"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateBookingStatus(
                        selectedBooking.id,
                        'cancelled',
                        `${selectedBooking.bookingNumber} cancelled in preview.`,
                      )
                    }
                    className="border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-neutral-500">
                  Reject dipakai saat admin menolak request atau bukti DP tidak valid. Cancel dipakai saat booking
                  yang sudah masuk dibatalkan oleh customer/admin.
                </p>
              </div>

              <div className="border-t border-neutral-100 pt-4 text-xs text-neutral-500">
                <p className="font-semibold text-neutral-800">Notes</p>
                <p className="mt-1 leading-relaxed">{selectedBooking.notes}</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {invoiceBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-neutral-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-5">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Invoice booking DP
                </p>
                <h2 className="mt-1 font-mono text-lg font-semibold text-neutral-950">
                  {invoiceBooking.bookingNumber}
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Invoice ini hanya untuk DP penguncian tanggal, bukan pelunasan sewa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceBookingId('')}
                className="border border-neutral-200 p-2 text-neutral-500 hover:text-neutral-950"
                aria-label="Close invoice"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Customer
                  </p>
                  <p className="mt-1 font-semibold text-neutral-950">{invoiceBooking.customerName}</p>
                  <p className="text-neutral-600">{invoiceBooking.customerWhatsapp}</p>
                  {getCustomerEmail(invoiceBooking) && (
                    <p className="text-neutral-600">{getCustomerEmail(invoiceBooking)}</p>
                  )}
                  {getCustomerInstagram(invoiceBooking) && (
                    <p className="text-neutral-600">{getCustomerInstagram(invoiceBooking)}</p>
                  )}
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Payment
                  </p>
                  <p className="mt-1 font-semibold text-neutral-950">
                    {formatCurrency(invoiceBooking.dpAmount)}
                  </p>
                  <p className="text-neutral-600">
                    Ref: {invoiceBooking.paymentReference || 'Bukti transfer manual'}
                  </p>
                </div>
              </div>

              <div className="border border-neutral-200">
                <div className="grid grid-cols-[1fr_auto] border-b border-neutral-200 bg-neutral-50 p-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  <span>Deskripsi</span>
                  <span>Jumlah</span>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3 p-3">
                  <div>
                    <p className="font-semibold text-neutral-950">DP booking tanggal</p>
                    <p className="text-xs text-neutral-500">
                      {invoiceBooking.itemCode} / {invoiceBooking.itemName}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Event {formatDate(invoiceBooking.eventDate)} · Pickup {formatDate(invoiceBooking.pickupDate)} · Return {formatDate(invoiceBooking.returnDate)}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      Slot terblokir sampai {formatDate(invoiceBooking.bufferUntilDate)}.
                    </p>
                  </div>
                  <p className="font-semibold text-neutral-950">
                    {formatCurrency(invoiceBooking.dpAmount)}
                  </p>
                </div>
                <div className="grid grid-cols-[1fr_auto] border-t border-neutral-200 p-3 font-semibold">
                  <span>Total DP dibayar</span>
                  <span>{formatCurrency(invoiceBooking.dpAmount)}</span>
                </div>
              </div>

              <div className="border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                DP bersifat non-refundable dan hanya untuk mengunci jadwal. DP tidak memotong sisa biaya sewa.
                Pelunasan sewa tetap dilakukan saat pickup atau sebelum pengiriman.
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 border border-neutral-900 bg-neutral-900 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white hover:bg-neutral-800"
                >
                  <Receipt className="h-4 w-4" />
                  Print invoice
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceBookingId('')}
                  className="inline-flex min-h-11 flex-1 items-center justify-center border border-neutral-300 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-700 hover:border-neutral-900 hover:text-neutral-950"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
