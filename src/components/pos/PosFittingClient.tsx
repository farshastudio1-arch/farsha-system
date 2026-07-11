'use client';

import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  MessageCircle,
  RefreshCw,
  Search,
  UserRound,
  XCircle,
} from 'lucide-react';

import type { FittingAppointment, FittingAppointmentStatus } from '@/lib/fitting-db';

type ApiResponse<T> = {
  ok?: boolean;
  error?: string;
  data?: T;
};

type QueueFilter = 'active' | 'past' | 'closed' | 'all';

const statusLabels: Record<FittingAppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No-show',
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function slotLabel(appointment: Pick<FittingAppointment, 'startTime' | 'endTime'>) {
  return `${appointment.startTime}-${appointment.endTime}`;
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

function getMakassarDateTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
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

function createCustomerWhatsAppUrl(appointment: FittingAppointment) {
  const phone = normalizeWhatsAppNumber(appointment.customerWhatsapp);
  const message = [
    `Halo ${appointment.customerName}, jadwal fitting Farsha Studio kamu:`,
    `Kode: ${appointment.fittingCode}`,
    `Tanggal: ${formatDate(appointment.appointmentDate)}`,
    `Jam: ${slotLabel(appointment)}`,
    'Mohon datang sesuai jadwal ya.',
  ].join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function statusClass(status: FittingAppointmentStatus) {
  if (status === 'pending') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'confirmed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'completed') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (status === 'no_show') return 'border-orange-200 bg-orange-50 text-orange-800';
  return 'border-neutral-200 bg-neutral-50 text-neutral-500';
}

function isAppointmentPast(appointment: FittingAppointment) {
  const { date: today, time: now } = getMakassarDateTimeParts();

  return appointment.appointmentDate < today || (
    appointment.appointmentDate === today && appointment.endTime <= now
  );
}

function matchesAppointment(appointment: FittingAppointment, query: string) {
  if (!query) return true;

  return [
    appointment.fittingCode,
    appointment.customerName,
    appointment.customerWhatsapp,
    appointment.customerEmail ?? '',
    appointment.bookingNumber ?? '',
    appointment.notes,
    appointment.status,
    appointment.appointmentDate,
    appointment.startTime,
  ].some((value) => value.toLowerCase().includes(query));
}

function getStatusActions(appointment: FittingAppointment): FittingAppointmentStatus[] {
  if (appointment.status === 'pending') {
    return ['confirmed', 'cancelled'];
  }

  if (appointment.status === 'confirmed') {
    return ['completed', 'no_show', 'cancelled'];
  }

  if (appointment.status === 'cancelled') {
    return ['pending'];
  }

  return [];
}

export default function PosFittingClient({
  initialAppointments,
}: {
  initialAppointments: FittingAppointment[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [filter, setFilter] = useState<QueueFilter>('active');
  const [query, setQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const fittingLink = '/fitting';
  const shareMessage = `Halo, silakan isi jadwal fitting Farsha Studio melalui link ini: ${fittingLink}`;
  const shareWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const normalizedQuery = query.trim().toLowerCase();

  const metrics = useMemo(() => {
    const { date: today } = getMakassarDateTimeParts();

    return {
      pending: appointments.filter((appointment) => appointment.status === 'pending').length,
      confirmedToday: appointments.filter(
        (appointment) => appointment.status === 'confirmed' && appointment.appointmentDate === today,
      ).length,
      upcoming: appointments.filter(
        (appointment) =>
          ['pending', 'confirmed'].includes(appointment.status) && !isAppointmentPast(appointment),
      ).length,
      closed: appointments.filter((appointment) =>
        ['cancelled', 'completed', 'no_show'].includes(appointment.status),
      ).length,
    };
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const past = isAppointmentPast(appointment);
        const closed = ['cancelled', 'completed', 'no_show'].includes(appointment.status);

        if (filter === 'active') return !closed && !past;
        if (filter === 'past') return !closed && past;
        if (filter === 'closed') return closed;

        return true;
      })
      .filter((appointment) => matchesAppointment(appointment, normalizedQuery))
      .slice()
      .sort((first, second) => {
        const firstKey = `${first.appointmentDate} ${first.startTime}`;
        const secondKey = `${second.appointmentDate} ${second.startTime}`;

        return firstKey.localeCompare(secondKey) || first.createdAt.localeCompare(second.createdAt);
      });
  }, [appointments, filter, normalizedQuery]);

  const refreshAppointments = async () => {
    setIsRefreshing(true);
    setActionError('');

    try {
      const response = await fetch('/api/admin/fitting', { cache: 'no-store' });
      const payload = (await response.json()) as ApiResponse<FittingAppointment[]>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? 'Appointment fitting belum bisa dimuat.');
      }

      setAppointments(payload.data);
      setActionMessage('Appointment fitting diperbarui dari database.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Appointment fitting belum bisa dimuat.';
      setActionError(message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const updateStatus = async (appointment: FittingAppointment, status: FittingAppointmentStatus) => {
    setUpdatingId(`${appointment.id}:${status}`);
    setActionError('');
    setActionMessage('');

    try {
      const response = await fetch(`/api/admin/fitting/${appointment.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as ApiResponse<FittingAppointment>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? 'Status fitting belum bisa diubah.');
      }

      setAppointments((current) =>
        current.map((entry) => (entry.id === payload.data?.id ? payload.data : entry)),
      );
      setActionMessage(`${appointment.fittingCode} diubah ke ${statusLabels[status]}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Status fitting belum bisa diubah.';
      setActionError(message);
    } finally {
      setUpdatingId('');
    }
  };

  const copyFittingLink = async () => {
    try {
      await navigator.clipboard.writeText(fittingLink);
      setActionMessage('Link fitting disalin.');
      setActionError('');
    } catch {
      setActionError('Browser belum mengizinkan copy link. Salin link manual dari panel.');
    }
  };

  const filters: Array<{ value: QueueFilter; label: string }> = [
    { value: 'active', label: 'Upcoming' },
    { value: 'past', label: 'Past due' },
    { value: 'closed', label: 'Closed' },
    { value: 'all', label: 'All' },
  ];

  return (
    <div className="space-y-4">
      <section className="border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Fitting Desk
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Fitting Schedule
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              Control customer fitting slots from the public /fitting form. Pending slots already block availability.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyFittingLink}
              className="inline-flex min-h-10 items-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-800 hover:border-neutral-900"
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </button>
            <a
              href={shareWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp Link
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Pending', value: metrics.pending, icon: Clock3 },
          { label: 'Confirmed today', value: metrics.confirmedToday, icon: CalendarCheck },
          { label: 'Upcoming active', value: metrics.upcoming, icon: UserRound },
          { label: 'Closed history', value: metrics.closed, icon: Clipboard },
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <div key={metric.label} className="border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    {metric.label}
                  </p>
                  <strong className="mt-2 block text-2xl font-semibold text-neutral-950">
                    {metric.value}
                  </strong>
                </div>
                <Icon className="h-5 w-5 text-neutral-400" />
              </div>
            </div>
          );
        })}
      </section>

      {(actionError || actionMessage) && (
        <section
          className={`flex gap-2 border p-3 text-sm ${
            actionError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {actionError ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <p>{actionError || actionMessage}</p>
        </section>
      )}

      <section className="border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setFilter(entry.value)}
                className={`min-h-9 border px-3 text-xs font-bold uppercase tracking-wider ${
                  filter === entry.value
                    ? 'border-neutral-950 bg-neutral-950 text-white'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-900 hover:text-neutral-950'
                }`}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-10 w-full border border-neutral-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Search code, name, phone"
              />
            </label>
            <button
              type="button"
              onClick={refreshAppointments}
              disabled={isRefreshing}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-800 hover:border-neutral-900 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-3">
        {visibleAppointments.length === 0 ? (
          <div className="border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
            Tidak ada appointment fitting untuk filter ini.
          </div>
        ) : (
          visibleAppointments.map((appointment) => {
            const actions = getStatusActions(appointment);

            return (
              <article key={appointment.id} className="border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-500">
                        {appointment.fittingCode}
                      </span>
                      <span className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(appointment.status)}`}>
                        {statusLabels[appointment.status]}
                      </span>
                      {appointment.bookingNumber && (
                        <span className="border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          {appointment.bookingNumber}
                        </span>
                      )}
                    </div>

                    <h2 className="mt-2 text-lg font-semibold text-neutral-950">
                      {appointment.customerName}
                    </h2>
                    <div className="mt-2 grid gap-2 text-sm text-neutral-600 md:grid-cols-2 xl:grid-cols-4">
                      <p>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Date
                        </span>
                        <strong className="text-neutral-950">{formatDate(appointment.appointmentDate)}</strong>
                      </p>
                      <p>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Time
                        </span>
                        <strong className="text-neutral-950">{slotLabel(appointment)}</strong>
                      </p>
                      <p>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          WhatsApp
                        </span>
                        <strong className="text-neutral-950">{appointment.customerWhatsapp}</strong>
                      </p>
                      <p>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                          Submitted
                        </span>
                        <strong className="text-neutral-950">{formatDateTime(appointment.createdAt)}</strong>
                      </p>
                    </div>
                    {appointment.notes && (
                      <p className="mt-3 max-w-3xl border-l-2 border-neutral-200 pl-3 text-sm text-neutral-600">
                        {appointment.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-sm xl:justify-end">
                    <a
                      href={createCustomerWhatsAppUrl(appointment)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-9 items-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Message
                    </a>
                    {actions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={updatingId === `${appointment.id}:${status}`}
                        onClick={() => updateStatus(appointment, status)}
                        className={`inline-flex min-h-9 items-center gap-2 border px-3 text-xs font-bold uppercase tracking-wider disabled:cursor-wait disabled:opacity-60 ${
                          status === 'cancelled'
                            ? 'border-red-200 bg-red-50 text-red-700 hover:border-red-300'
                            : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900'
                        }`}
                      >
                        {status === 'cancelled' ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {statusLabels[status]}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
