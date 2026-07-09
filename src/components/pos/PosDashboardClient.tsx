'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarCheck,
  Clock3,
  FileText,
  History,
  LineChart,
  ReceiptText,
  Search,
  Wallet,
} from 'lucide-react';

import type {
  PosFinanceDocumentEntry,
  PosFinanceReceiptEntry,
  PosFinanceSummary,
} from '@/lib/pos-finance';
import { getLedgerMetrics, type PosLedgerState, type PosTransaction } from '@/lib/pos-ledger';
import { useSavedPosLedger } from '@/lib/pos-ledger-client';

type DashboardHistoryTab = 'receipts' | 'transactions' | 'invoices';

type PosDashboardClientProps = {
  initialLedger: PosLedgerState;
  financeSummary: PosFinanceSummary;
};

const historyTabs: { value: DashboardHistoryTab; label: string; description: string }[] = [
  { value: 'receipts', label: 'Receipt History', description: 'POS and booking paid receipts' },
  { value: 'transactions', label: 'Transaction History', description: 'Rental and sale ledger' },
  { value: 'invoices', label: 'Invoice History', description: 'Booking DP invoices' },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
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

function formatDate(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function matchesReceipt(receipt: PosFinanceReceiptEntry, query: string) {
  if (!query) return true;

  return [
    receipt.receiptNumber,
    receipt.referenceNumber,
    receipt.customerName,
    receipt.itemLabel,
    receipt.paymentMethod,
  ].some((value) => value.toLowerCase().includes(query));
}

function matchesTransaction(transaction: PosTransaction, query: string) {
  if (!query) return true;

  return [
    transaction.transactionNumber,
    transaction.customerName,
    transaction.itemName,
    transaction.itemCode,
    transaction.status,
    transaction.paymentMethod,
  ].some((value) => value.toLowerCase().includes(query));
}

function matchesInvoice(invoice: PosFinanceDocumentEntry, query: string) {
  if (!query) return true;

  return [
    invoice.documentNumber,
    invoice.bookingNumber,
    invoice.customerName,
    invoice.status,
  ].some((value) => value.toLowerCase().includes(query));
}

function statusClass(status: string) {
  if (status === 'open') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'closed' || status === 'paid' || status === 'issued') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (status === 'void') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-neutral-200 bg-neutral-50 text-neutral-600';
}

export default function PosDashboardClient({ initialLedger, financeSummary }: PosDashboardClientProps) {
  const ledger = useSavedPosLedger(initialLedger);
  const metrics = useMemo(() => getLedgerMetrics(ledger), [ledger]);
  const [activeTab, setActiveTab] = useState<DashboardHistoryTab>('receipts');
  const [historyQuery, setHistoryQuery] = useState('');

  const normalizedQuery = historyQuery.trim().toLowerCase();
  const visibleReceipts = useMemo(
    () => financeSummary.receipts.filter((receipt) => matchesReceipt(receipt, normalizedQuery)).slice(0, 50),
    [financeSummary.receipts, normalizedQuery],
  );
  const visibleTransactions = useMemo(
    () =>
      ledger.transactions
        .filter((transaction) => matchesTransaction(transaction, normalizedQuery))
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 50),
    [ledger.transactions, normalizedQuery],
  );
  const visibleInvoices = useMemo(
    () => financeSummary.invoices.filter((invoice) => matchesInvoice(invoice, normalizedQuery)).slice(0, 50),
    [financeSummary.invoices, normalizedQuery],
  );

  const activeAlerts = [
    {
      label: 'Active rentals',
      value: metrics.activeCount,
      tone: metrics.activeCount > 0 ? 'text-amber-700' : 'text-neutral-500',
      icon: Clock3,
    },
    {
      label: 'Overdue',
      value: metrics.overdueCount,
      tone: metrics.overdueCount > 0 ? 'text-red-700' : 'text-neutral-500',
      icon: AlertTriangle,
    },
    {
      label: 'Maintenance',
      value: metrics.maintenanceCount,
      tone: metrics.maintenanceCount > 0 ? 'text-blue-700' : 'text-neutral-500',
      icon: History,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Dashboard POS
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Daily Command Center
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-500">
              Ringkasan uang hari ini, rental aktif, booking DP verified, dan riwayat operasional POS.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/pos/transactions"
              className="inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800"
            >
              <ReceiptText className="h-4 w-4" />
              New Transaction
            </Link>
            <Link
              href="/pos/bookings"
              className="inline-flex min-h-10 items-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-800 hover:border-neutral-900"
            >
              <CalendarCheck className="h-4 w-4" />
              Bookings
            </Link>
            <Link
              href="/pos/finance"
              className="inline-flex min-h-10 items-center gap-2 border border-neutral-300 bg-white px-3 text-xs font-bold uppercase tracking-wider text-neutral-800 hover:border-neutral-900"
            >
              <LineChart className="h-4 w-4" />
              Finance
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="border border-neutral-200 bg-white p-4 shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Recognized Revenue Today
              </p>
              <strong className="mt-2 block text-2xl font-semibold text-neutral-950">
                {formatCurrency(financeSummary.revenueTotal)}
              </strong>
              <p className="mt-1 text-xs text-neutral-500">Default period: {financeSummary.period.fromDate}</p>
            </div>
            <Wallet className="h-5 w-5 text-neutral-400" />
          </div>
        </div>

        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Booking DP Revenue
          </p>
          <strong className="mt-2 block text-xl font-semibold text-emerald-700">
            {formatCurrency(financeSummary.bookingRevenue)}
          </strong>
          <p className="mt-1 text-xs text-neutral-500">Verified payments only</p>
        </div>

        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Payment In / Out
          </p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {formatCurrency(financeSummary.cashIn)}
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-red-600">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              {formatCurrency(financeSummary.cashOut)}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          {activeAlerts.map((alert) => {
            const Icon = alert.icon;

            return (
              <div key={alert.label} className="flex items-center justify-between border border-neutral-200 bg-white px-3 py-2 shadow-sm">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500">
                  <Icon className="h-3.5 w-3.5 text-neutral-400" />
                  {alert.label}
                </span>
                <strong className={`text-sm ${alert.tone}`}>{alert.value}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-neutral-200 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {historyTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`min-h-10 border px-3 text-left text-xs font-bold uppercase tracking-wider ${
                    activeTab === tab.value
                      ? 'border-neutral-900 bg-neutral-950 text-white'
                      : 'border-neutral-200 bg-white text-neutral-500 hover:border-neutral-900 hover:text-neutral-950'
                  }`}
                >
                  <span className="block">{tab.label}</span>
                  <span className={`block text-[10px] normal-case tracking-normal ${activeTab === tab.value ? 'text-neutral-300' : 'text-neutral-400'}`}>
                    {tab.description}
                  </span>
                </button>
              ))}
            </div>

            <label className="flex min-h-10 items-center gap-2 border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500 lg:w-72">
              <Search className="h-4 w-4" />
              <input
                value={historyQuery}
                onChange={(event) => setHistoryQuery(event.target.value)}
                placeholder="Search histories"
                className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
              />
            </label>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'receipts' && (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-3 py-2">Receipt</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {visibleReceipts.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-neutral-900">
                        {receipt.href ? <Link href={receipt.href}>{receipt.receiptNumber}</Link> : receipt.receiptNumber}
                        <p className="mt-0.5 text-[10px] text-neutral-400">{receipt.referenceNumber}</p>
                      </td>
                      <td className="px-3 py-2 text-neutral-700">{receipt.customerName}</td>
                      <td className="px-3 py-2 text-neutral-500">{receipt.itemLabel}</td>
                      <td className="px-3 py-2 uppercase text-neutral-500">{receipt.paymentMethod}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${receipt.direction === 'out' ? 'text-red-600' : 'text-emerald-700'}`}>
                        {receipt.direction === 'out' ? '-' : ''}
                        {formatCurrency(receipt.amount)}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-500">{formatDateTime(receipt.occurredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'transactions' && (
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-3 py-2">Transaction</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Rental</th>
                    <th className="px-3 py-2">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {visibleTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-neutral-900">
                        <Link href={`/pos/transactions?transactionId=${encodeURIComponent(transaction.id)}`}>
                          {transaction.transactionNumber}
                        </Link>
                        <p className="mt-0.5 text-[10px] text-neutral-400">{transaction.kind}</p>
                      </td>
                      <td className="px-3 py-2 text-neutral-700">{transaction.customerName}</td>
                      <td className="px-3 py-2 text-neutral-500">
                        {transaction.itemCode} / {transaction.itemName}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-neutral-900">
                        {formatCurrency(transaction.itemPrice)}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-500">{formatDate(transaction.startDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'invoices' && (
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  <tr>
                    <th className="px-3 py-2">Invoice</th>
                    <th className="px-3 py-2">Booking</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                    <th className="px-3 py-2">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {visibleInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-neutral-50">
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-neutral-900">
                        <Link href={invoice.href}>{invoice.documentNumber}</Link>
                      </td>
                      <td className="px-3 py-2 text-neutral-500">{invoice.bookingNumber}</td>
                      <td className="px-3 py-2 text-neutral-700">{invoice.customerName}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-neutral-900">
                        {formatCurrency(invoice.totalAmount)}
                      </td>
                      <td className="px-3 py-2 text-xs text-neutral-500">{formatDateTime(invoice.issuedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {((activeTab === 'receipts' && visibleReceipts.length === 0) ||
            (activeTab === 'transactions' && visibleTransactions.length === 0) ||
            (activeTab === 'invoices' && visibleInvoices.length === 0)) && (
            <div className="border-t border-neutral-100 px-4 py-10 text-center text-sm text-neutral-500">
              No matching records for this period.
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Payment Method Net
            </p>
            <div className="mt-3 space-y-2">
              {Object.entries(financeSummary.paymentByMethod).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between text-sm">
                  <span className="uppercase text-neutral-500">{method}</span>
                  <strong className={amount < 0 ? 'text-red-600' : 'text-neutral-900'}>{formatCurrency(amount)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-neutral-200 bg-white p-4 shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Finance Snapshot
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-neutral-500">
                  <FileText className="h-4 w-4 text-neutral-400" />
                  Booking invoices
                </span>
                <strong>{financeSummary.invoices.length}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-neutral-500">
                  <ReceiptText className="h-4 w-4 text-neutral-400" />
                  Receipts
                </span>
                <strong>{financeSummary.receipts.length}</strong>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                <span className="text-neutral-500">Net movement</span>
                <strong className={financeSummary.netMovement < 0 ? 'text-red-600' : 'text-emerald-700'}>
                  {formatCurrency(financeSummary.netMovement)}
                </strong>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
