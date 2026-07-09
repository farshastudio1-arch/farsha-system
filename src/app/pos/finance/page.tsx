import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  LineChart,
  ReceiptText,
  Wallet,
} from 'lucide-react';

import { getPosFinanceSummary, makeFinancePeriod } from '@/lib/pos-finance';

type PosFinancePageProps = {
  searchParams: Promise<{
    from?: string | string[];
    to?: string | string[];
  }>;
};

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function sourceLabel(value: string) {
  switch (value) {
    case 'pos_receipt':
      return 'POS receipt';
    case 'booking_payment':
      return 'Booking payment';
    case 'booking_invoice':
      return 'Booking invoice';
    case 'booking_receipt':
      return 'Booking receipt';
    default:
      return value;
  }
}

export default async function PosFinancePage({ searchParams }: PosFinancePageProps) {
  const params = await searchParams;
  const period = makeFinancePeriod({
    fromDate: getParamValue(params.from),
    toDate: getParamValue(params.to),
  });
  const finance = await getPosFinanceSummary(period);

  return (
    <div className="space-y-4">
      <section className="border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Finance V1
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Read-only Revenue & Cash Report
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              Derived from existing POS receipts and verified booking payments. No journal posting yet.
            </p>
          </div>

          <form className="flex flex-wrap items-end gap-2" action="/pos/finance">
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              From
              <input
                type="date"
                name="from"
                defaultValue={finance.period.fromDate}
                className="h-10 border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              To
              <input
                type="date"
                name="to"
                defaultValue={finance.period.toDate}
                className="h-10 border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 bg-neutral-950 px-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800"
            >
              <CalendarDays className="h-4 w-4" />
              Apply
            </button>
            <Link
              href="/pos/finance"
              className="inline-flex h-10 items-center border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900"
            >
              Today
            </Link>
          </form>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="border border-neutral-200 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Recognized Revenue
              </p>
              <strong className="mt-2 block text-2xl font-semibold text-neutral-950">
                {formatCurrency(finance.revenueTotal)}
              </strong>
              <p className="mt-1 text-xs text-neutral-500">
                {finance.period.fromDate} to {finance.period.toDate} ({finance.period.timeZone})
              </p>
            </div>
            <LineChart className="h-5 w-5 text-neutral-400" />
          </div>
        </div>

        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            POS Revenue
          </p>
          <strong className="mt-2 block text-xl font-semibold text-neutral-950">
            {formatCurrency(finance.posRevenue)}
          </strong>
          <p className="mt-1 text-xs text-neutral-500">Positive POS receipt events</p>
        </div>

        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Booking DP Revenue
          </p>
          <strong className="mt-2 block text-xl font-semibold text-emerald-700">
            {formatCurrency(finance.bookingRevenue)}
          </strong>
          <p className="mt-1 text-xs text-neutral-500">Verified payments only</p>
        </div>

        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Net Movement
          </p>
          <strong className={`mt-2 block text-xl font-semibold ${finance.netMovement < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {formatCurrency(finance.netMovement)}
          </strong>
          <p className="mt-1 text-xs text-neutral-500">
            In {formatCurrency(finance.cashIn)} / Out {formatCurrency(finance.cashOut)}
          </p>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Payment Method Net
            </p>
            <div className="mt-3 space-y-2">
              {Object.entries(finance.paymentByMethod).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between text-sm">
                  <span className="uppercase text-neutral-500">{method}</span>
                  <strong className={amount < 0 ? 'text-red-600' : 'text-neutral-900'}>{formatCurrency(amount)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            <div className="border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                Cash In
              </p>
              <strong className="mt-2 block text-lg text-emerald-700">{formatCurrency(finance.cashIn)}</strong>
            </div>
            <div className="border border-neutral-200 bg-white p-4 shadow-sm">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <ArrowDownLeft className="h-4 w-4 text-red-600" />
                Cash Out
              </p>
              <strong className="mt-2 block text-lg text-red-600">{formatCurrency(finance.cashOut)}</strong>
            </div>
          </div>
        </aside>

        <div className="border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 p-3">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Finance Activity
              </p>
              <p className="mt-1 text-sm text-neutral-500">Cash-impact rows drive totals. Documents are shown for traceability.</p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <Wallet className="h-4 w-4 text-neutral-400" />
              {finance.activity.length} rows
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                <tr>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Method</th>
                  <th className="px-3 py-2">Impact</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {finance.activity.map((entry) => (
                  <tr key={entry.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2">
                      <p className="font-mono text-xs font-semibold text-neutral-900">
                        {entry.href ? <Link href={entry.href}>{entry.sourceNumber}</Link> : entry.sourceNumber}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-neutral-400">
                        {sourceLabel(entry.sourceType)}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-neutral-700">{entry.customerName}</td>
                    <td className="px-3 py-2 text-neutral-500">{entry.description}</td>
                    <td className="px-3 py-2 uppercase text-neutral-500">{entry.paymentMethod}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        entry.recognizedRevenue
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : entry.cashImpact
                            ? 'border-sky-200 bg-sky-50 text-sky-800'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-500'
                      }`}>
                        {entry.recognizedRevenue ? 'Revenue' : entry.cashImpact ? 'Cash' : 'Document'}
                      </span>
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold ${entry.direction === 'out' ? 'text-red-600' : 'text-neutral-900'}`}>
                      {entry.direction === 'out' ? '-' : ''}
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-500">{formatDateTime(entry.occurredAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {finance.activity.length === 0 && (
            <div className="border-t border-neutral-100 px-4 py-10 text-center text-sm text-neutral-500">
              No finance activity for this period.
            </div>
          )}
        </div>
      </section>

      <section className="border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          <ReceiptText className="h-4 w-4" />
          Recognition Rule
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          Biaya Booking is recognized as revenue only after admin verification. Issued invoices and generated receipts are shown for document traceability, but they do not create additional revenue in Finance v1.
        </p>
      </section>
    </div>
  );
}
