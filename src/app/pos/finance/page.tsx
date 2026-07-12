import Link from 'next/link';
import { ArrowDownLeft, CalendarDays, Download, FileText, LineChart, ReceiptText, Wallet } from 'lucide-react';

import { createPosExpenseAction } from '@/lib/pos-finance-actions';
import { getPosFinanceSummary, makeFinancePeriod, type PosFinanceActivityEntry } from '@/lib/pos-finance';

type PosFinancePageProps = {
  searchParams: Promise<{
    preset?: string | string[];
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
    case 'expense':
      return 'Expense';
    default:
      return value;
  }
}

function accountingLabel(entry: PosFinanceActivityEntry) {
  switch (entry.accountingType) {
    case 'rental_revenue':
      return 'Rental Revenue';
    case 'booking_dp_revenue':
      return 'Booking DP Revenue';
    case 'penalty_revenue':
      return 'Penalty Revenue';
    case 'adjustment_revenue':
      return 'Adjustment Revenue';
    case 'deposit_in':
      return 'Security Deposit';
    case 'deposit_refund':
      return 'Deposit Refund';
    case 'expense':
      return 'Expense';
    case 'document':
      return 'Document';
    default:
      return entry.accountingType;
  }
}

function accountingClass(entry: PosFinanceActivityEntry) {
  if (entry.accountingType === 'expense' || entry.accountingType === 'deposit_refund') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (entry.accountingType === 'deposit_in') {
    return 'border-sky-200 bg-sky-50 text-sky-800';
  }

  if (entry.revenueAmount > 0) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  return 'border-neutral-200 bg-neutral-50 text-neutral-500';
}

function periodHref(preset: 'today' | 'week' | 'month') {
  return `/pos/finance?preset=${preset}`;
}

function exportHref(period: { preset: string; fromDate: string; toDate: string }) {
  const params = new URLSearchParams({
    preset: period.preset,
    from: period.fromDate,
    to: period.toDate,
  });

  return `/api/admin/pos/finance/export?${params.toString()}`;
}

export default async function PosFinancePage({ searchParams }: PosFinancePageProps) {
  const params = await searchParams;
  const period = makeFinancePeriod({
    preset: getParamValue(params.preset),
    fromDate: getParamValue(params.from),
    toDate: getParamValue(params.to),
  });
  const finance = await getPosFinanceSummary(period);
  const returnTo = `/pos/finance?${new URLSearchParams({
    preset: finance.period.preset,
    from: finance.period.fromDate,
    to: finance.period.toDate,
  }).toString()}`;

  return (
    <div className="space-y-4">
      <section className="border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Simple Cash Accounting
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Finance Ledger
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              Cash-basis report for revenue, refundable deposits, expenses, and accountant export.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Link
              href={periodHref('today')}
              className="inline-flex h-10 items-center border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900"
            >
              Today
            </Link>
            <Link
              href={periodHref('week')}
              className="inline-flex h-10 items-center border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900"
            >
              Week
            </Link>
            <Link
              href={periodHref('month')}
              className="inline-flex h-10 items-center border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-700 hover:border-neutral-900"
            >
              Month
            </Link>
            <Link
              href={exportHref(finance.period)}
              className="inline-flex h-10 items-center gap-2 bg-neutral-950 px-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Link>
          </div>
        </div>

        <form className="mt-4 flex flex-wrap items-end gap-2" action="/pos/finance">
          <input type="hidden" name="preset" value="custom" />
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
            className="inline-flex h-10 items-center gap-2 border border-neutral-950 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-950 hover:bg-neutral-50"
          >
            <CalendarDays className="h-4 w-4" />
            Apply
          </button>
        </form>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="border border-neutral-200 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Net Income
              </p>
              <strong className={`mt-2 block text-2xl font-semibold ${finance.netIncome < 0 ? 'text-red-600' : 'text-neutral-950'}`}>
                {formatCurrency(finance.netIncome)}
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
            Revenue
          </p>
          <strong className="mt-2 block text-xl font-semibold text-emerald-700">
            {formatCurrency(finance.revenueTotal)}
          </strong>
          <p className="mt-1 text-xs text-neutral-500">
            POS {formatCurrency(finance.posRevenue)} / DP {formatCurrency(finance.bookingRevenue)}
          </p>
        </div>

        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Expenses
          </p>
          <strong className="mt-2 block text-xl font-semibold text-red-600">
            {formatCurrency(finance.expensesTotal)}
          </strong>
          <p className="mt-1 text-xs text-neutral-500">Laundry, ads, bills, salary, and other costs</p>
        </div>

        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Deposit Held
          </p>
          <strong className="mt-2 block text-xl font-semibold text-sky-800">
            {formatCurrency(finance.depositHeld)}
          </strong>
          <p className="mt-1 text-xs text-neutral-500">
            In {formatCurrency(finance.depositIn)} / Refund {formatCurrency(finance.depositOut)}
          </p>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-3 md:grid-cols-2">
          <form action={createPosExpenseAction} className="min-w-0 border border-neutral-200 bg-white p-4 shadow-sm">
            <input type="hidden" name="returnTo" value={returnTo} />
            <p className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              <FileText className="h-4 w-4" />
              Add Expense
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Date
                <input
                  required
                  type="date"
                  name="expenseDate"
                  defaultValue={finance.period.fromDate}
                  className="h-10 border border-neutral-300 bg-white px-3 text-sm text-neutral-900"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Method
                <select name="paymentMethod" className="h-10 border border-neutral-300 bg-white px-3 text-sm text-neutral-900">
                  <option value="cash">Cash</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris">QRIS</option>
                </select>
              </label>
              <div className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 sm:col-span-2">
                <span>Category</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select name="categoryId" className="h-10 border border-neutral-300 bg-white px-3 text-sm text-neutral-900">
                    {finance.expenseCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <input
                    name="categoryName"
                    placeholder="Add new category"
                    className="h-10 border border-neutral-300 bg-white px-3 text-sm text-neutral-900"
                  />
                </div>
              </div>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Amount
                <input
                  required
                  inputMode="numeric"
                  name="amount"
                  placeholder="250000"
                  className="h-10 border border-neutral-300 bg-white px-3 text-sm text-neutral-900"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Vendor
                <input
                  name="vendor"
                  placeholder="Optional"
                  className="h-10 border border-neutral-300 bg-white px-3 text-sm text-neutral-900"
                />
              </label>
            </div>
            <label className="mt-3 grid gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Note
              <textarea
                name="note"
                rows={3}
                className="border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900"
              />
            </label>
            <button
              type="submit"
              className="mt-3 inline-flex h-10 items-center gap-2 bg-neutral-950 px-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Save Expense
            </button>
          </form>

          <div className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Cash Movement
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-500">Cash In</p>
                <strong className="mt-1 block text-lg text-emerald-700">{formatCurrency(finance.cashIn)}</strong>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-500">Cash Out</p>
                <strong className="mt-1 block text-lg text-red-600">{formatCurrency(finance.cashOut)}</strong>
              </div>
            </div>
            <div className="mt-3 border-t border-neutral-100 pt-3">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Net Movement</p>
              <strong className={finance.netMovement < 0 ? 'text-red-600' : 'text-neutral-950'}>
                {formatCurrency(finance.netMovement)}
              </strong>
            </div>
          </div>
        </div>

        <aside className="space-y-3">
          <div className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Payment Method Net
            </p>
            <div className="mt-3 space-y-2">
              {(['cash', 'transfer', 'qris'] as const).map((method) => (
                <div key={method} className="flex items-center justify-between text-sm">
                  <span className="uppercase text-neutral-500">{method}</span>
                  <strong className={finance.paymentByMethod[method] < 0 ? 'text-red-600' : 'text-neutral-900'}>
                    {formatCurrency(finance.paymentByMethod[method])}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-200 p-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Accounting Activity
            </p>
            <p className="mt-1 text-sm text-neutral-500">Classified rows drive revenue, deposit, expense, and cash totals.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            <Wallet className="h-4 w-4 text-neutral-400" />
            {finance.activity.length} rows
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2 text-right">Cash</th>
                <th className="px-3 py-2 text-right">Revenue</th>
                <th className="px-3 py-2 text-right">Expense</th>
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
                  <td className="px-3 py-2">
                    <span className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${accountingClass(entry)}`}>
                      {accountingLabel(entry)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-700">{entry.customerName}</td>
                  <td className="px-3 py-2 text-neutral-500">{entry.description}</td>
                  <td className="px-3 py-2 uppercase text-neutral-500">{entry.paymentMethod}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${entry.cashAmount < 0 ? 'text-red-600' : 'text-neutral-900'}`}>
                    {entry.cashAmount < 0 ? '-' : ''}
                    {formatCurrency(Math.abs(entry.cashAmount))}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                    {entry.revenueAmount > 0 ? formatCurrency(entry.revenueAmount) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-red-600">
                    {entry.expenseAmount > 0 ? formatCurrency(entry.expenseAmount) : '-'}
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-500">{formatDateTime(entry.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {finance.activity.length === 0 && (
          <div className="border-t border-neutral-100 px-4 py-10 text-center text-sm text-neutral-500">
            No accounting activity for this period.
          </div>
        )}
      </section>

      <section className="border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
          <ReceiptText className="h-4 w-4" />
          Recent Expenses
        </p>
        <div className="mt-3 divide-y divide-neutral-100">
          {finance.expenses.slice(0, 8).map((expense) => (
            <div key={expense.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-neutral-900">{expense.categoryName}</p>
                <p className="text-xs text-neutral-500">{expense.expenseDate} / {expense.paymentMethod.toUpperCase()}</p>
              </div>
              <strong className="text-red-600">{formatCurrency(expense.amount)}</strong>
            </div>
          ))}
          {finance.expenses.length === 0 && <p className="py-4 text-sm text-neutral-500">No expenses recorded.</p>}
        </div>
      </section>
    </div>
  );
}
