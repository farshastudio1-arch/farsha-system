'use client';

import { useMemo } from 'react';
import Link from 'next/link';

import { useCatalogData } from '@/components/admin/catalog/CatalogDataProvider';
import {
  computeCatalogPerformance,
  type CatalogPerformanceStatus,
} from '@/lib/catalog-performance';
import { useSavedCatalogItems } from '@/lib/catalog-storage';
import { formatRupiah } from '@/lib/formatters';
import { useSavedPosLedger } from '@/lib/pos-ledger-client';

const statusMeta: Record<
  CatalogPerformanceStatus,
  { label: string; className: string }
> = {
  profit: { label: 'Profit', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  'bep-reached': { label: 'BEP reached', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  'approaching-bep': {
    label: 'Approaching BEP',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  'push-marketing': {
    label: 'Push marketing',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  'no-cost': { label: 'Set cost', className: 'border-neutral-200 bg-neutral-50 text-neutral-500' },
};

export default function CatalogReport() {
  const { isLoadingCatalog, catalogError } = useCatalogData();
  const catalogItems = useSavedCatalogItems();
  const ledger = useSavedPosLedger();

  const { rows, summary } = useMemo(
    () => computeCatalogPerformance(catalogItems, ledger),
    [catalogItems, ledger],
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          Catalog manager
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          Report
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
          Each item&apos;s realized rental income against its recorded cost. &ldquo;Earned
          back&rdquo; compares income to the acquisition cost only — it is not net profit
          (laundry, repairs, and depreciation are not included).
        </p>
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
        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Cost invested
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
            {formatRupiah(summary.totalCost)}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Across {summary.itemsTotal - summary.itemsWithoutCost} costed items
          </p>
        </div>
        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Income collected
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
            {formatRupiah(summary.totalIncome)}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Realized rental cash on costed items</p>
        </div>
        <div
          className={`border p-4 shadow-sm ${
            summary.netAgainstCost >= 0
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-widest ${
              summary.netAgainstCost >= 0 ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            Net vs cost
          </p>
          <p
            className={`mt-3 text-2xl font-semibold tracking-tight ${
              summary.netAgainstCost >= 0 ? 'text-emerald-900' : 'text-amber-900'
            }`}
          >
            {formatRupiah(summary.netAgainstCost)}
          </p>
          <p
            className={`mt-2 text-sm ${
              summary.netAgainstCost >= 0 ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {summary.itemsInProfit} in profit · {summary.itemsBepReached} at/above BEP
          </p>
        </div>
        <div className="border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-700">
            Needs a push
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-rose-900">
            {summary.itemsNeedingPush}
          </p>
          <p className="mt-2 text-sm text-rose-700">
            {summary.itemsWithoutCost} still missing a cost value
          </p>
        </div>
      </div>

      <section className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-neutral-950">Item performance</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Ordered by how far each item is from paying itself back.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Item</th>
                <th className="px-5 py-4 font-semibold">Cost</th>
                <th className="px-5 py-4 font-semibold">Income</th>
                <th className="px-5 py-4 font-semibold">Rentals</th>
                <th className="px-5 py-4 font-semibold">Earned back</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {rows.map(({ item, cost, income, rentalCount, bepProgress, profitSoFar, status }) => {
                const meta = statusMeta[status];
                const progressPct =
                  bepProgress === null ? null : Math.min(Math.round(bepProgress * 100), 999);

                return (
                  <tr key={item.id} className="transition-colors hover:bg-neutral-50/70">
                    <td className="px-5 py-4">
                      <span className="block max-w-[280px] truncate font-semibold text-neutral-950">
                        {item.name}
                      </span>
                      <span className="mt-1 block font-mono text-xs uppercase tracking-wider text-neutral-400">
                        {item.code}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-neutral-700">
                      {cost === null ? (
                        <span className="text-neutral-400">—</span>
                      ) : (
                        formatRupiah(cost)
                      )}
                    </td>
                    <td className="px-5 py-4 font-semibold text-neutral-950">
                      {formatRupiah(income)}
                    </td>
                    <td className="px-5 py-4 text-neutral-500">{rentalCount}</td>
                    <td className="px-5 py-4">
                      {progressPct === null ? (
                        <span className="text-neutral-400">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className={`h-full rounded-full ${
                                progressPct >= 100 ? 'bg-emerald-500' : 'bg-neutral-900'
                              }`}
                              style={{ width: `${Math.min(progressPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-neutral-600">
                            {progressPct}%
                          </span>
                          {profitSoFar !== null && profitSoFar > 0 && (
                            <span className="text-xs text-emerald-600">
                              +{formatRupiah(profitSoFar)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center border px-2.5 py-1 text-xs font-semibold ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="border-t border-neutral-200 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-neutral-900">No catalog items yet.</p>
            <p className="mt-1 text-sm text-neutral-500">
              Add items and their cost on the{' '}
              <Link href="/admin/catalog/products" className="underline">
                Products
              </Link>{' '}
              page to start tracking performance.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
