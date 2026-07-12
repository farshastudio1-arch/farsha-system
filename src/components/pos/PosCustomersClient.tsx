'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Archive,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Shirt,
  Edit3,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Search,
  UserRound,
} from 'lucide-react';

import {
  archiveCustomerAction,
  fetchCustomerProfileAction,
  fetchCustomersAction,
  saveCustomerAction,
} from '@/lib/farsha-actions';
import type {
  CustomerActivityEntry,
  CustomerDateBasis,
  CustomerProfile,
  CustomerRecord,
  CustomerStatus,
} from '@/lib/customer-db';

type CustomerFormState = {
  id: string;
  displayName: string;
  primaryPhone: string;
  email: string;
  instagram: string;
  notes: string;
  status: CustomerStatus;
};

const emptyForm: CustomerFormState = {
  id: '',
  displayName: '',
  primaryPhone: '',
  email: '',
  instagram: '',
  notes: '',
  status: 'active',
};

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatCurrency(amount: number | null) {
  if (amount === null) return '-';

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getActivityIcon(type: CustomerActivityEntry['type']) {
  if (type === 'booking') return CalendarCheck;
  if (type === 'fitting') return CalendarDays;
  return ReceiptText;
}

function getActivityLabel(type: CustomerActivityEntry['type']) {
  if (type === 'pos_transaction') return 'POS';
  if (type === 'pos_receipt') return 'Receipt';
  if (type === 'booking') return 'Booking';
  return 'Fitting';
}

function formFromCustomer(customer: CustomerRecord): CustomerFormState {
  return {
    id: customer.id,
    displayName: customer.displayName,
    primaryPhone: customer.primaryPhone,
    email: customer.email ?? '',
    instagram: customer.instagram ?? '',
    notes: customer.notes,
    status: customer.status,
  };
}

interface PosCustomersClientProps {
  initialCustomers: CustomerRecord[];
}

export default function PosCustomersClient({ initialCustomers }: PosCustomersClientProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomers[0]?.id ?? '');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<CustomerFormState>(
    initialCustomers[0] ? formFromCustomer(initialCustomers[0]) : emptyForm,
  );
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateBasis, setDateBasis] = useState<CustomerDateBasis>('activity');
  const [monthFilter, setMonthFilter] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const visibleCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          customer.displayName,
          customer.primaryPhone,
          customer.normalizedPhone,
          customer.email ?? '',
          customer.instagram ?? '',
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [customers, query, statusFilter]);

  function getMonthRange(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value)) {
      return null;
    }

    const [yearPart, monthPart] = value.split('-');
    const year = Number(yearPart);
    const month = Number(monthPart);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return null;
    }

    const lastDay = new Date(year, month, 0).getDate();

    return {
      from: `${value}-01`,
      to: `${value}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  function getCustomerSearchInput(overrides: Partial<{
    query: string;
    status: CustomerStatus | 'all';
    dateFrom: string;
    dateTo: string;
    dateBasis: CustomerDateBasis;
    monthFilter: string;
  }> = {}) {
    const nextMonth = overrides.monthFilter ?? monthFilter;
    const monthRange = getMonthRange(nextMonth);
    const effectiveDateFrom = overrides.dateFrom ?? monthRange?.from ?? dateFrom;
    const effectiveDateTo = overrides.dateTo ?? monthRange?.to ?? dateTo;

    return {
      query: overrides.query ?? query,
      status: overrides.status ?? statusFilter,
      dateFrom: effectiveDateFrom,
      dateTo: effectiveDateTo,
      dateBasis: overrides.dateBasis ?? dateBasis,
      limit: 300,
    };
  }

  function getProfileActivityDateRange() {
    const monthRange = getMonthRange(monthFilter);

    return {
      dateFrom: dateBasis === 'profile' ? '' : monthRange?.from ?? dateFrom,
      dateTo: dateBasis === 'profile' ? '' : monthRange?.to ?? dateTo,
    };
  }

  async function refreshCustomers(
    nextSelectedId = selectedCustomerId,
    overrides: Partial<{
      query: string;
      status: CustomerStatus | 'all';
      dateFrom: string;
      dateTo: string;
      dateBasis: CustomerDateBasis;
      monthFilter: string;
    }> = {},
  ) {
    setIsLoading(true);
    setError('');
    const result = await fetchCustomersAction(getCustomerSearchInput(overrides));

    if (result.ok) {
      setCustomers(result.data);
      const selected =
        result.data.find((customer) => customer.id === nextSelectedId) ??
        result.data[0] ??
        null;
      setSelectedCustomerId(selected?.id ?? '');
      setForm(selected ? formFromCustomer(selected) : emptyForm);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }

  async function loadProfile(customer: CustomerRecord) {
    setSelectedCustomerId(customer.id);
    setForm(formFromCustomer(customer));
    setProfile(null);
    setError('');

    const result = await fetchCustomerProfileAction(customer.id, getProfileActivityDateRange());

    if (result.ok) {
      setProfile(result.data);
    } else {
      setError(result.error);
    }
  }

  function updateForm(key: keyof CustomerFormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: key === 'status' ? (value as CustomerStatus) : value,
    }));
  }

  function startNewCustomer() {
    setSelectedCustomerId('');
    setProfile(null);
    setForm(emptyForm);
    setMessage('');
    setError('');
  }

  function clearDateFilters() {
    setDateFrom('');
    setDateTo('');
    setMonthFilter('');
    setDateBasis('activity');
  }

  async function submitCustomer() {
    setIsSaving(true);
    setMessage('');
    setError('');

    const payload = {
      id: form.id,
      displayName: form.displayName,
      primaryPhone: form.primaryPhone,
      email: form.email,
      instagram: form.instagram,
      notes: form.notes,
      status: form.status,
      source: 'manual' as const,
    };
    const result = await saveCustomerAction(form.id ? payload : {
      displayName: payload.displayName,
      primaryPhone: payload.primaryPhone,
      email: payload.email,
      instagram: payload.instagram,
      notes: payload.notes,
      source: payload.source,
    });

    if (result.ok) {
      setMessage(form.id ? 'Customer updated.' : 'Customer created.');
      setSelectedCustomerId(result.data.id);
      setForm(formFromCustomer(result.data));
      await refreshCustomers(result.data.id);
      const profileResult = await fetchCustomerProfileAction(result.data.id, getProfileActivityDateRange());
      setProfile(profileResult.ok ? profileResult.data : null);
    } else {
      setError(result.error);
    }

    setIsSaving(false);
  }

  async function archiveSelectedCustomer() {
    if (!form.id) return;

    setIsSaving(true);
    setMessage('');
    setError('');

    const result = await archiveCustomerAction(form.id);

    if (result.ok) {
      setMessage('Customer archived. History is still preserved.');
      setSelectedCustomerId(result.data.id);
      setForm(formFromCustomer(result.data));
      await refreshCustomers(result.data.id);
      const profileResult = await fetchCustomerProfileAction(result.data.id, getProfileActivityDateRange());
      setProfile(profileResult.ok ? profileResult.data : null);
    } else {
      setError(result.error);
    }

    setIsSaving(false);
  }

  const activeCount = customers.filter((customer) => customer.status === 'active').length;
  const archivedCount = customers.filter((customer) => customer.status === 'archived').length;
  const activity = profile?.customer.id === selectedCustomerId ? profile.activity : [];
  const orderedItems = profile?.customer.id === selectedCustomerId ? profile.orderedItems : [];

  return (
    <div className="space-y-4">
      <section className="border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Customer Control
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Customer Database
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              Satu data customer untuk POS, booking, dan fitting. Receipt lama tetap memakai snapshot saat transaksi.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startNewCustomer}
              className="inline-flex min-h-10 items-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900"
            >
              <Plus className="h-4 w-4" />
              New Customer
            </button>
            <button
              type="button"
              onClick={() => void refreshCustomers()}
              disabled={isLoading}
              className="inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 border-t border-neutral-100 pt-3 sm:grid-cols-3">
          <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs font-semibold text-neutral-500">Active</span>
            <strong className="text-sm text-neutral-950">{activeCount}</strong>
          </div>
          <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs font-semibold text-neutral-500">Archived</span>
            <strong className="text-sm text-neutral-950">{archivedCount}</strong>
          </div>
          <div className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs font-semibold text-neutral-500">Visible</span>
            <strong className="text-sm text-neutral-950">{visibleCustomers.length}</strong>
          </div>
        </div>
      </section>

      {(message || error) && (
        <div className={`border px-4 py-3 text-xs ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {error || message}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <section className="border border-neutral-200 bg-white shadow-sm">
          <div className="space-y-3 border-b border-neutral-200 bg-neutral-50 p-3">
            <div className="flex flex-col gap-2 lg:flex-row">
              <label className="flex min-h-11 flex-1 items-center gap-2 border border-neutral-200 bg-white px-3 text-sm text-neutral-500">
                <Search className="h-4 w-4" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Cari nama, WhatsApp, email, Instagram..."
                  className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void refreshCustomers()}
                  disabled={isLoading}
                  className="inline-flex min-h-11 flex-1 items-center justify-center bg-neutral-950 px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:opacity-60 lg:flex-none"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearDateFilters();
                    setQuery('');
                    setStatusFilter('all');
                    void refreshCustomers(selectedCustomerId, {
                      query: '',
                      status: 'all',
                      dateFrom: '',
                      dateTo: '',
                      dateBasis: 'activity',
                      monthFilter: '',
                    });
                  }}
                  className="inline-flex min-h-11 flex-1 items-center justify-center border border-neutral-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:border-neutral-900 lg:flex-none"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[150px_170px_170px_150px_150px]">
              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as CustomerStatus | 'all')}
                  className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Date basis</span>
                <select
                  value={dateBasis}
                  onChange={(event) => setDateBasis(event.target.value as CustomerDateBasis)}
                  className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="activity">Activity date</option>
                  <option value="profile">Profile date</option>
                  <option value="all">All dates</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  <CalendarRange className="h-3 w-3" />
                  Month
                </span>
                <input
                  type="month"
                  value={monthFilter}
                  onChange={(event) => {
                    setMonthFilter(event.target.value);
                    if (event.target.value) {
                      setDateFrom('');
                      setDateTo('');
                    }
                  }}
                  className="h-10 w-full border border-neutral-200 bg-white px-3 font-mono text-sm text-neutral-700 outline-none focus:ring-1 focus:ring-neutral-900"
                  aria-label="Month filter"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">From</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    if (event.target.value) {
                      setMonthFilter('');
                    }
                  }}
                  className="h-10 w-full border border-neutral-200 bg-white px-3 font-mono text-sm text-neutral-700 outline-none focus:ring-1 focus:ring-neutral-900"
                  aria-label="Date from"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">To</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    if (event.target.value) {
                      setMonthFilter('');
                    }
                  }}
                  className="h-10 w-full border border-neutral-200 bg-white px-3 font-mono text-sm text-neutral-700 outline-none focus:ring-1 focus:ring-neutral-900"
                  aria-label="Date to"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
              <span className="font-semibold uppercase tracking-wider text-neutral-400">Month sort</span>
              <span>
                {monthFilter
                  ? `Showing records in ${monthFilter}`
                  : 'Pick a month for fast monthly customer lookup, or use custom dates.'}
              </span>
            </div>
          </div>

          <div className="max-h-[720px] divide-y divide-neutral-100 overflow-y-auto">
            {visibleCustomers.map((customer) => {
              const isSelected = customer.id === selectedCustomerId;
              const totalActivity = customer.posTransactionCount + customer.bookingCount + customer.fittingCount;

              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => void loadProfile(customer)}
                  className={`grid w-full gap-3 px-3 py-3 text-left transition-colors md:grid-cols-[minmax(0,1fr)_160px] ${
                    isSelected ? 'bg-neutral-950 text-white' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <UserRound className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-400'}`} />
                      <span className="truncate text-sm font-semibold">{customer.displayName}</span>
                      <span className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        customer.status === 'active'
                          ? isSelected
                            ? 'border-white/30 text-neutral-200'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : isSelected
                            ? 'border-white/30 text-neutral-300'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                      }`}>
                        {customer.status}
                      </span>
                    </span>
                    <span className={`mt-1 block truncate text-xs ${isSelected ? 'text-neutral-300' : 'text-neutral-500'}`}>
                      {customer.primaryPhone}
                      {customer.instagram ? ` / @${customer.instagram.replace(/^@/, '')}` : ''}
                    </span>
                    <span className={`mt-2 grid gap-1 text-[10px] uppercase tracking-wider sm:grid-cols-2 ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                      <span>Last activity: {formatDateTime(customer.lastActivityAt)}</span>
                      <span>Profile created: {formatDateTime(customer.createdAt)}</span>
                    </span>
                  </span>
                  <span className="grid grid-cols-3 gap-1 text-center text-[10px] uppercase tracking-wider">
                    <span className={isSelected ? 'text-neutral-300' : 'text-neutral-400'}>
                      POS
                      <strong className={`block text-xs ${isSelected ? 'text-white' : 'text-neutral-950'}`}>{customer.posTransactionCount}</strong>
                    </span>
                    <span className={isSelected ? 'text-neutral-300' : 'text-neutral-400'}>
                      Book
                      <strong className={`block text-xs ${isSelected ? 'text-white' : 'text-neutral-950'}`}>{customer.bookingCount}</strong>
                    </span>
                    <span className={isSelected ? 'text-neutral-300' : 'text-neutral-400'}>
                      Fit
                      <strong className={`block text-xs ${isSelected ? 'text-white' : 'text-neutral-950'}`}>{customer.fittingCount}</strong>
                    </span>
                    <span className={`col-span-3 mt-1 ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}>
                      {totalActivity} total records
                    </span>
                  </span>
                </button>
              );
            })}

            {visibleCustomers.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-neutral-500">
                No customer matched this filter.
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Profile Control
                </p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-950">
                  {form.id ? 'Edit Customer' : 'New Customer'}
                </h2>
              </div>
              {form.id && (
                <button
                  type="button"
                  onClick={() => {
                    const customer = selectedCustomer ?? customers.find((entry) => entry.id === form.id);

                    if (customer) {
                      void loadProfile(customer);
                    }
                  }}
                  className="inline-flex min-h-9 items-center gap-2 border border-neutral-200 bg-white px-2 text-xs font-bold uppercase tracking-wider text-neutral-600 hover:border-neutral-900"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Profile
                </button>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-neutral-600">Nama Customer</span>
                <input
                  value={form.displayName}
                  onChange={(event) => updateForm('displayName', event.target.value)}
                  className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-neutral-600">WhatsApp Utama</span>
                <input
                  value={form.primaryPhone}
                  onChange={(event) => updateForm('primaryPhone', event.target.value)}
                  className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-neutral-600">Email</span>
                  <input
                    value={form.email}
                    onChange={(event) => updateForm('email', event.target.value)}
                    className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-neutral-600">Instagram</span>
                  <input
                    value={form.instagram}
                    onChange={(event) => updateForm('instagram', event.target.value)}
                    className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-neutral-600">Status</span>
                <select
                  value={form.status}
                  onChange={(event) => updateForm('status', event.target.value)}
                  className="h-10 w-full border border-neutral-200 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-neutral-600">Internal Notes</span>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => updateForm('notes', event.target.value)}
                  className="min-h-24 w-full resize-none border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </label>

              <div className="flex gap-2 pt-1">
                {form.id && form.status !== 'archived' && (
                  <button
                    type="button"
                    onClick={() => void archiveSelectedCustomer()}
                    disabled={isSaving}
                    className="inline-flex min-h-10 items-center justify-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void submitCustomer()}
                  disabled={isSaving}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 bg-neutral-950 px-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </div>
          </section>

          <section className="border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Ordered Items
              </p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-950">
                Kebaya / Dress Ordered
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                Item dari transaksi POS dan booking yang terhubung ke customer ini.
              </p>
            </div>

            <div className="max-h-[360px] divide-y divide-neutral-100 overflow-y-auto">
              {orderedItems.map((item) => (
                <Link
                  key={`${item.source}-${item.id}`}
                  href={item.href}
                  className="grid gap-2 px-4 py-3 text-sm hover:bg-neutral-50"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="inline-flex min-w-0 items-start gap-2">
                      <Shirt className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-neutral-950">{item.itemName}</span>
                        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                          {item.itemCode} / {item.reference}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                      {item.source}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-3 text-[11px] text-neutral-500">
                    <span>Status: {item.status}</span>
                    <span>{formatCurrency(item.amount)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-neutral-400">
                    <span>Order: {formatDateTime(item.orderedAt)}</span>
                    <span>Due: {formatDateTime(item.dueDate)}</span>
                  </span>
                </Link>
              ))}

              {orderedItems.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-neutral-500">
                  {form.id ? 'Belum ada kebaya atau dress terhubung ke customer ini.' : 'Create or select a customer first.'}
                </div>
              )}
            </div>
          </section>

          <section className="border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                History
              </p>
              <h2 className="mt-1 text-lg font-semibold text-neutral-950">
                Customer Timeline
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                POS, receipt, booking, and fitting records linked by customer ID.
              </p>
            </div>

            <div className="max-h-[520px] divide-y divide-neutral-100 overflow-y-auto">
              {activity.map((entry) => {
                const Icon = getActivityIcon(entry.type);

                return (
                  <Link
                    key={`${entry.type}-${entry.id}`}
                    href={entry.href}
                    className="grid gap-2 px-4 py-3 text-sm hover:bg-neutral-50"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
                        <span className="truncate font-semibold text-neutral-950">{entry.reference}</span>
                      </span>
                      <span className="shrink-0 border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                        {getActivityLabel(entry.type)}
                      </span>
                    </span>
                    <span className="text-xs text-neutral-600">
                      {entry.title}
                    </span>
                    <span className="flex items-center justify-between gap-3 text-[11px] text-neutral-400">
                      <span className="truncate">{entry.detail}</span>
                      <span className="shrink-0">{formatCurrency(entry.amount)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-neutral-400">
                      <span>{entry.status}</span>
                      <span>{formatDateTime(entry.occurredAt)}</span>
                    </span>
                  </Link>
                );
              })}

              {activity.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-neutral-500">
                  {form.id ? 'Select Profile to load linked history.' : 'Create or select a customer first.'}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
