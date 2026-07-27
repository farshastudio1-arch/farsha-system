'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { useCatalogData } from '@/components/admin/catalog/CatalogDataProvider';
import { computeCatalogSummary } from '@/components/admin/catalog/catalog-shared';
import { useSavedCatalogItems } from '@/lib/catalog-storage';
import { projectCatalogItems } from '@/lib/pos-ledger';
import { useSavedPosLedger } from '@/lib/pos-ledger-client';

export default function CatalogOverview() {
  const { bookingPressure, isLoadingCatalog, catalogError } = useCatalogData();
  const catalogItems = useSavedCatalogItems();
  const ledger = useSavedPosLedger();
  const projectedItems = useMemo(
    () => projectCatalogItems(catalogItems, ledger),
    [catalogItems, ledger],
  );
  const summary = useMemo(
    () => computeCatalogSummary(projectedItems, catalogItems, bookingPressure),
    [projectedItems, catalogItems, bookingPressure],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Catalog manager
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Overview
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            A snapshot of inventory health and booking pressure. Manage individual items on the
            Products page.
          </p>
        </div>

        <Link
          href="/admin/catalog/products"
          className="inline-flex items-center justify-center gap-2 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 sm:self-start lg:self-auto"
        >
          Go to products
        </Link>
      </div>

      {(isLoadingCatalog || catalogError) && (
        <div
          className={`border px-4 py-3 text-sm font-semibold ${
            catalogError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600'
          }`}
        >
          {catalogError || 'Loading catalog from database...'}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/admin/catalog/products"
          className="border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:bg-neutral-50"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Catalog items
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {summary.total}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Customer-facing item records</p>
        </Link>
        <div className="border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Available
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-900">
            {summary.available}
          </p>
          <p className="mt-2 text-sm text-emerald-700">Ready to offer now</p>
        </div>
        <div className="border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Rented</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-900">
            {summary.rented}
          </p>
          <p className="mt-2 text-sm text-amber-700">Needs return-date discipline</p>
        </div>
        <div className="border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-700">
            Maintenance
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-red-900">
            {summary.maintenance}
          </p>
          <p className="mt-2 text-sm text-red-700">Cleaning or repair queue</p>
        </div>
        <Link
          href="/admin/catalog/products"
          className="border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:bg-neutral-50"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Data issues
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {summary.issues}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Photos, copy, dates, or prices</p>
        </Link>
        {summary.hasBookingSnapshot && (
          <>
            <Link
              href="/pos/bookings?status=active"
              className="border border-sky-200 bg-sky-50 p-4 shadow-sm transition-colors hover:bg-sky-100"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-700">
                Active bookings
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-sky-950">
                {summary.activeBookings}
              </p>
              <p className="mt-2 text-sm text-sky-800">
                {summary.bookedItems} item locks from booking desk
              </p>
            </Link>
            <Link
              href="/pos/bookings?status=payment_submitted"
              className="border border-violet-200 bg-violet-50 p-4 shadow-sm transition-colors hover:bg-violet-100"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-violet-700">
                Proof waiting
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-violet-950">
                {summary.paymentSubmittedBookings}
              </p>
              <p className="mt-2 text-sm text-violet-800">Need DP verification before dates lock</p>
            </Link>
            <Link
              href="/pos/bookings?status=requested"
              className="border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:bg-neutral-50"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Booking requests
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
                {summary.requestedBookings}
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                {summary.bookingConflicts} request conflicts flagged
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
