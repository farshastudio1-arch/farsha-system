'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  MessageCircle,
  RefreshCw,
  Send,
  UserRound,
} from 'lucide-react';

import type { FittingBookingContext, FittingSlot } from '@/lib/fitting-db';

type FittingSubmitResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  data?: {
    id: string;
    fittingCode: string;
    status: string;
    appointmentDate: string;
    startTime: string;
    endTime: string;
  };
};

type AvailabilityResponse = {
  ok?: boolean;
  error?: string;
  data?: {
    appointmentDate: string;
    slots: FittingSlot[];
  };
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function slotLabel(slot: Pick<FittingSlot, 'startTime' | 'endTime'>) {
  return `${slot.startTime}-${slot.endTime}`;
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

function getJakartaDateTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getPart('hour')}:${getPart('minute')}`,
  };
}

export default function FittingPageClient({
  initialDate,
  initialSlots,
  initialBookingContext,
  bookingContextError,
  bookingNumber,
  bookingToken,
}: {
  initialDate: string;
  initialSlots: FittingSlot[];
  initialBookingContext: FittingBookingContext | null;
  bookingContextError: string;
  bookingNumber: string;
  bookingToken: string;
}) {
  const [appointmentDate, setAppointmentDate] = useState(initialDate);
  const [slots, setSlots] = useState(initialSlots);
  const [selectedStartTime, setSelectedStartTime] = useState(
    initialSlots.find((slot) => slot.available)?.startTime ?? '',
  );
  const [customerName, setCustomerName] = useState(initialBookingContext?.customerName ?? '');
  const [customerWhatsapp, setCustomerWhatsapp] = useState(initialBookingContext?.customerWhatsapp ?? '');
  const [customerEmail, setCustomerEmail] = useState(initialBookingContext?.customerEmail ?? '');
  const [notes, setNotes] = useState(
    initialBookingContext ? `Fitting untuk ${initialBookingContext.bookingNumber}` : '',
  );
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successData, setSuccessData] = useState<FittingSubmitResponse['data'] | null>(null);
  const jakartaNow = getJakartaDateTimeParts();

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.startTime === selectedStartTime) ?? null,
    [slots, selectedStartTime],
  );
  const availableCount = slots.filter((slot) => slot.available).length;
  const normalizedCustomerWhatsapp = normalizeWhatsAppNumber(customerWhatsapp);

  const loadSlots = async (date: string, preserveSelection = false) => {
    setIsLoadingSlots(true);
    setFormError('');

    try {
      const response = await fetch(`/api/fitting/availability?date=${encodeURIComponent(date)}`, {
        cache: 'no-store',
      });
      const payload = (await response.json()) as AvailabilityResponse;

      if (!response.ok || !payload.ok || !payload.data?.slots) {
        throw new Error(payload.error ?? 'Availability fitting belum bisa dimuat.');
      }

      setSlots(payload.data.slots);
      setSelectedStartTime((current) => {
        if (preserveSelection && payload.data?.slots.some((slot) => slot.startTime === current && slot.available)) {
          return current;
        }

        return payload.data?.slots.find((slot) => slot.available)?.startTime ?? '';
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Availability fitting belum bisa dimuat.';
      setFormError(message);
      setSlots([]);
      setSelectedStartTime('');
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const isCurrentDay = appointmentDate === jakartaNow.date;

  const updateAppointmentDate = (date: string) => {
    setAppointmentDate(date);
    void loadSlots(date);
  };

  const submitFitting = async () => {
    if (!customerName.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }

    if (!customerWhatsapp.trim()) {
      setFormError('Nomor WhatsApp wajib diisi.');
      return;
    }

    if (!selectedSlot?.available) {
      setFormError('Pilih slot fitting yang masih tersedia.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setSuccessData(null);

    try {
      const response = await fetch('/api/fitting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentDate,
          startTime: selectedSlot.startTime,
          customerName,
          customerWhatsapp,
          customerEmail,
          notes,
          bookingNumber,
          bookingToken,
        }),
      });
      const payload = (await response.json()) as FittingSubmitResponse;

      if (!response.ok || !payload.ok || !payload.data?.fittingCode) {
        throw new Error(payload.error ?? 'Jadwal fitting belum bisa dikirim.');
      }

      setSuccessData(payload.data);
      await loadSlots(appointmentDate, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Jadwal fitting belum bisa dikirim.';
      setFormError(message);
      await loadSlots(appointmentDate, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-4 pb-28 sm:px-6 md:py-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="border theme-border bg-white p-4 shadow-sm md:p-6">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke katalog
          </Link>

          <div className="mt-5 border-b border-neutral-200 pb-5">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Fitting Appointment
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-neutral-950 md:text-4xl">
                Jadwal Fitting
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
                {initialBookingContext
                  ? 'Data customer dan item sudah diambil dari booking yang valid. Pilih slot fitting yang tersedia.'
                  : 'Pilih tanggal dan jam yang tersedia. Slot pending langsung ditahan agar tidak double booking.'}
              </p>
            </div>
          </div>

          {bookingContextError && (
            <div className="mt-5 flex gap-2 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{bookingContextError}</p>
            </div>
          )}

          {initialBookingContext && (
            <div className="mt-5 border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Linked Booking
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-neutral-950">
                    {initialBookingContext.bookingNumber}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Pickup {initialBookingContext.firstPickupDate ? formatDate(initialBookingContext.firstPickupDate) : '-'} /
                    Acara {initialBookingContext.firstEventDate ? ` ${formatDate(initialBookingContext.firstEventDate)}` : ' -'}
                  </p>
                </div>
                <span className="inline-flex self-start border border-neutral-300 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                  {initialBookingContext.itemCount} item
                </span>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {initialBookingContext.items.map((item) => (
                  <div key={`${item.itemId}:${item.itemCode}`} className="flex gap-3 border border-neutral-200 bg-white p-2">
                    <div className="h-16 w-12 shrink-0 overflow-hidden bg-neutral-100">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {item.itemCode}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-950">
                        {item.itemName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4">
              <header className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-neutral-400" />
                <h2 className="font-serif text-xl font-semibold text-neutral-950">Data Customer</h2>
              </header>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-neutral-700">Nama lengkap</span>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Nama customer"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-neutral-700">Nomor WhatsApp</span>
                <input
                  value={customerWhatsapp}
                  onChange={(event) => setCustomerWhatsapp(event.target.value)}
                  className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="08xxxxxxxxxx"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-neutral-700">Email opsional</span>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="nama@email.com"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-neutral-700">Catatan opsional</span>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="w-full resize-none border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  placeholder="Contoh: mau coba kebaya wisuda warna soft"
                />
              </label>
            </div>

            <div className="space-y-4">
              <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="h-5 w-5 text-neutral-400" />
                  <h2 className="font-serif text-xl font-semibold text-neutral-950">Tanggal & Jam</h2>
                </div>
                <button
                  type="button"
                  onClick={() => loadSlots(appointmentDate, true)}
                  disabled={isLoadingSlots}
                  className="inline-flex min-h-9 items-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900 disabled:cursor-wait disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingSlots ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </header>

              <label className="block space-y-1.5">
                <span className="text-sm font-semibold text-neutral-700">Tanggal fitting</span>
                <input
                  type="date"
                  min={initialDate}
                  value={appointmentDate}
                  onChange={(event) => updateAppointmentDate(event.target.value)}
                  className="w-full border theme-border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>

              <div className="border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                      {formatDate(appointmentDate)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-neutral-950">
                      {availableCount} slot tersedia
                    </p>
                  </div>
                  <Clock3 className="h-5 w-5 text-neutral-400" />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const isSelected = selectedStartTime === slot.startTime;

                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.available || isLoadingSlots || (isCurrentDay && slot.startTime <= jakartaNow.time)}
                        onClick={() => setSelectedStartTime(slot.startTime)}
                        className={`min-h-14 border px-2 py-2 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                          isSelected
                            ? 'border-neutral-950 bg-neutral-950 text-white'
                            : slot.available
                              ? 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-900'
                              : 'cursor-not-allowed border-neutral-100 bg-neutral-100 text-neutral-300'
                        }`}
                      >
                        <span className="block font-mono">{slotLabel(slot)}</span>
                        {!slot.available || (isCurrentDay && slot.startTime <= jakartaNow.time) ? (
                          <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal">
                            {slot.blockedBy === 'past' || (isCurrentDay && slot.startTime <= jakartaNow.time)
                              ? 'Lewat'
                              : 'Penuh'}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {formError && (
                <div className="flex gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              {successData && (
                <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">Jadwal fitting terkirim.</p>
                      <p className="mt-1">
                        Kode {successData.fittingCode} untuk {formatDate(successData.appointmentDate)} jam{' '}
                        {successData.startTime}-{successData.endTime}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={submitFitting}
                disabled={isSubmitting || isLoadingSlots}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-neutral-950 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Mengirim...' : 'Kirim Jadwal Fitting'}
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Ringkasan
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Tanggal</span>
                <strong className="text-right text-neutral-950">{formatDate(appointmentDate)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Jam</span>
                <strong className="text-neutral-950">{selectedSlot ? slotLabel(selectedSlot) : '-'}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">Customer</span>
                <strong className="text-right text-neutral-950">{customerName.trim() || '-'}</strong>
              </div>
              {initialBookingContext && (
                <div className="flex justify-between gap-4">
                  <span className="text-neutral-500">Booking</span>
                  <strong className="text-right text-neutral-950">{initialBookingContext.bookingNumber}</strong>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-neutral-500">WhatsApp</span>
                <strong className="text-right text-neutral-950">
                  {normalizedCustomerWhatsapp || '-'}
                </strong>
              </div>
            </div>
          </section>

          <section className="border border-neutral-200 bg-neutral-950 p-4 text-white shadow-sm">
            <MessageCircle className="h-5 w-5 text-neutral-300" />
            <p className="mt-3 text-sm font-semibold">Setelah submit</p>
            <p className="mt-1 text-sm leading-relaxed text-neutral-300">
              Admin akan melihat request di POS fitting. Slot ini ditahan saat status masih pending.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
