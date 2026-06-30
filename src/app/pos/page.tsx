'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  Clock3,
  FileText,
  Filter,
  History,
  PenLine,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

import { useSavedCatalogItems } from '@/lib/catalog-storage';
import {
  addTransactionAdjustment,
  addTransactionDeposit,
  addTransactionPenalty,
  addTransactionRefund,
  closeRentalTransaction,
  createRentalTransaction,
  deriveAvailabilityProjection,
  getLedgerMetrics,
  getOverdueTransactions,
  printTransactionReceipt,
  updateTransactionDetails,
  useSavedPosLedger,
} from '@/lib/pos-ledger';

import type { KebayaItem } from '@/data/mockData';

type TransactionTab = 'open' | 'history' | 'receipts';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function statusTone(status: KebayaItem['status'] | 'open' | 'closed' | 'void') {
  switch (status) {
    case 'available':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'rented':
    case 'open':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'maintenance':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'archived':
      return 'border-neutral-200 bg-neutral-100 text-neutral-600';
    case 'closed':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    default:
      return 'border-neutral-200 bg-neutral-50 text-neutral-700';
  }
}

function badgeLabel(status: KebayaItem['status'] | 'open' | 'closed' | 'void') {
  switch (status) {
    case 'available':
      return 'Available';
    case 'rented':
      return 'Rented';
    case 'maintenance':
      return 'Maintenance';
    case 'archived':
      return 'Archived';
    case 'open':
      return 'Open';
    case 'closed':
      return 'Closed';
    default:
      return 'Void';
  }
}

export default function PosDashboard() {
  const catalogItems = useSavedCatalogItems();
  const ledger = useSavedPosLedger();
  const projections = useMemo(
    () => deriveAvailabilityProjection(catalogItems, ledger),
    [catalogItems, ledger],
  );
  const metrics = useMemo(() => getLedgerMetrics(ledger), [ledger]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'rented' | 'maintenance'>(
    'all',
  );
  const [tab, setTab] = useState<TransactionTab>('open');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [depositReceived, setDepositReceived] = useState('0');
  const [notes, setNotes] = useState('');
  const [eventAmount, setEventAmount] = useState('0');
  const [eventNote, setEventNote] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  const [receiptFilter, setReceiptFilter] = useState('');

  const filteredCatalog = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return catalogItems.filter((item) => {
      const projection = projections[item.id];
      const effectiveStatus = projection?.effectiveStatus ?? item.status;
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.color.toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  }, [catalogItems, projections, searchQuery, statusFilter]);

  const activeTransactions = useMemo(
    () => ledger.transactions.filter((transaction) => transaction.status === 'open'),
    [ledger.transactions],
  );

  const visibleReceipts = useMemo(() => {
    const query = receiptFilter.trim().toLowerCase();

    return ledger.receipts.filter((receipt) => {
      if (!query) {
        return true;
      }

      return (
        receipt.receiptNumber.toLowerCase().includes(query) ||
        receipt.transactionNumber.toLowerCase().includes(query) ||
        receipt.itemCode.toLowerCase().includes(query) ||
        receipt.itemName.toLowerCase().includes(query) ||
        receipt.customerName.toLowerCase().includes(query)
      );
    });
  }, [ledger.receipts, receiptFilter]);

  const visibleHistory = useMemo(() => ledger.history.slice().reverse(), [ledger.history]);

  const overdueTransactions = useMemo(
    () => getOverdueTransactions(ledger),
    [ledger],
  );

  const selectedItem = catalogItems.find((item) => item.id === selectedItemId) ?? null;
  const selectedProjection = selectedItem ? projections[selectedItem.id] : null;
  const selectedTransaction =
    ledger.transactions.find((transaction) => transaction.id === selectedTransactionId) ?? null;

  const canCreateRental = selectedItem && selectedProjection?.effectiveStatus === 'available';

  const handleCreateRental = () => {
    if (!selectedItem || !canCreateRental) {
      return;
    }

    createRentalTransaction({
      item: selectedItem,
      customerName,
      customerPhone,
      startDate,
      dueDate,
      depositReceived: Number(depositReceived) || 0,
      notes,
    });

    setCustomerName('');
    setCustomerPhone('');
    setDueDate('');
    setDepositReceived('0');
    setNotes('');
    setSelectedItemId('');
  };

  const handleSelectedTransaction = (transactionId: string) => {
    const transaction = ledger.transactions.find((entry) => entry.id === transactionId);
    if (!transaction) return;

    setSelectedTransactionId(transactionId);
    setCustomerName(transaction.customerName);
    setCustomerPhone(transaction.customerPhone);
    setDueDate(transaction.dueDate ?? '');
    setStartDate(transaction.startDate);
    setDepositReceived(String(transaction.depositReceived));
    setNotes(transaction.notes);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            POS ledger
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Rent, deposit, refund, and penalty ledger
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500">
            Transaction history is the source of truth for availability and receipts. Catalog item
            data still comes from admin.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard title="Open" value={metrics.activeCount} icon={Clock3} tone="amber" />
          <MetricCard title="Overdue" value={metrics.overdueCount} icon={ShieldAlert} tone="red" />
          <MetricCard title="Receipts" value={ledger.receipts.length} icon={Receipt} tone="slate" />
          <MetricCard title="History" value={ledger.history.length} icon={History} tone="slate" />
        </div>
      </div>

      {overdueTransactions.length > 0 && (
        <div className="border-l-4 border-red-500 bg-red-50 p-4 shadow-sm">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {overdueTransactions.length} open rental is overdue
              </p>
              <p className="mt-1 text-sm text-red-700">
                Use the open transaction list to close, refund, or add penalty adjustments.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <section className="border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-950">Item lookup</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Master catalog data is read-only here. Availability comes from open rentals.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search item, code, or color..."
                    className="w-full border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 sm:w-72"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                    className="w-full border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 sm:w-44"
                  >
                    <option value="all">All statuses</option>
                    <option value="available">Available</option>
                    <option value="rented">Rented</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Deposit</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {filteredCatalog.map((item) => {
                  const projection = projections[item.id];
                  const effectiveStatus = projection?.effectiveStatus ?? item.status;
                  const isOpen = effectiveStatus === 'rented';
                  const isOverdue = Boolean(projection?.isOverdue);

                  return (
                    <tr key={item.id} className={isOverdue ? 'bg-red-50/40' : ''}>
                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-950">{item.name}</p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                            {item.code}
                          </p>
                          <p className="mt-1 text-xs text-neutral-500">
                            {formatCurrency(item.rentalPrice)} / day
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center border px-2.5 py-1 text-xs font-semibold ${statusTone(effectiveStatus)}`}
                        >
                          {badgeLabel(effectiveStatus)}
                        </span>
                        {isOverdue && (
                          <p className="mt-2 text-xs font-semibold text-red-600">Overdue</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-700">
                        {projection?.customerName ?? '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-700">
                        {formatDate(projection?.dueDate ?? null)}
                      </td>
                      <td className="px-4 py-4 text-sm text-neutral-700">
                        {formatCurrency(projection?.activeDeposit ?? 0)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedItemId(item.id)}
                          className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          <PenLine className="h-4 w-4" />
                          New rental
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-4">
              <h2 className="text-base font-semibold text-neutral-950">Create rental</h2>
              <p className="mt-1 text-sm text-neutral-500">
                This creates the transaction snapshot and the first receipt.
              </p>
            </div>
            <div className="space-y-4 p-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-neutral-700">Item</span>
                <select
                  value={selectedItemId}
                  onChange={(event) => setSelectedItemId(event.target.value)}
                  className="w-full border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="">Select an item</option>
                  {catalogItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Customer</span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Customer name"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Phone</span>
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="WhatsApp number"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Start date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Deposit</span>
                  <input
                    type="number"
                    min="0"
                    value={depositReceived}
                    onChange={(event) => setDepositReceived(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Notes</span>
                  <input
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    placeholder="Optional note"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={handleCreateRental}
                disabled={!canCreateRental || !selectedItemId}
                className="inline-flex w-full items-center justify-center gap-2 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                <Receipt className="h-4 w-4" />
                Create receipt
              </button>
              {selectedItem && selectedProjection && (
                <div className="border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                  <p className="font-semibold text-neutral-950">{selectedItem.name}</p>
                  <p className="mt-1">
                    Availability source: {selectedProjection.source} / {badgeLabel(selectedProjection.effectiveStatus)}
                  </p>
                  <p className="mt-1">
                    Open transaction: {selectedProjection.openTransactionNumber ?? 'none'}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-neutral-950">Transactions</h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Open items, receipt history, and edit history.
                  </p>
                </div>
                <div className="inline-flex border border-neutral-200 bg-neutral-50 p-1 text-xs font-semibold">
                  {(['open', 'receipts', 'history'] as TransactionTab[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTab(value)}
                      className={`px-3 py-1.5 capitalize ${
                        tab === value ? 'bg-white text-neutral-950 shadow-sm' : 'text-neutral-500'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-h-[560px] overflow-y-auto">
              {tab === 'receipts' ? (
                <div className="space-y-3 p-4">
                  <input
                    value={receiptFilter}
                    onChange={(event) => setReceiptFilter(event.target.value)}
                    placeholder="Search receipt, item, customer..."
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  {visibleReceipts.slice().reverse().map((receipt) => (
                    <button
                      type="button"
                      key={receipt.id}
                      onClick={() => handleSelectedTransaction(receipt.transactionId)}
                      className="block w-full border border-neutral-200 bg-white p-3 text-left hover:bg-neutral-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-950">{receipt.receiptNumber}</p>
                          <p className="mt-1 text-sm text-neutral-600">{receipt.title}</p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                            {receipt.itemCode}
                          </p>
                        </div>
                        <span className={`border px-2 py-0.5 text-[10px] font-semibold ${statusTone(receipt.status)}`}>
                          {badgeLabel(receipt.status)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-500">
                        <span>{formatDate(receipt.createdAt)}</span>
                        <span className="text-right">{formatCurrency(receipt.totalCollected)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : tab === 'history' ? (
                <div className="space-y-3 p-4">
                  {visibleHistory.map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      onClick={() => handleSelectedTransaction(entry.transactionId)}
                      className="block w-full border border-neutral-200 bg-white p-3 text-left hover:bg-neutral-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-950">{entry.summary}</p>
                          <p className="mt-1 text-sm text-neutral-600">{entry.transactionNumber}</p>
                          <p className="mt-1 text-xs text-neutral-500">{formatDate(entry.createdAt)}</p>
                        </div>
                        <span className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
                          {entry.action}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 p-4">
                  {activeTransactions.map((transaction) => (
                    <button
                      type="button"
                      key={transaction.id}
                      onClick={() => handleSelectedTransaction(transaction.id)}
                      className="block w-full border border-neutral-200 bg-white p-3 text-left hover:bg-neutral-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-neutral-950">{transaction.transactionNumber}</p>
                          <p className="mt-1 text-sm text-neutral-600">{transaction.itemName}</p>
                          <p className="mt-1 text-xs text-neutral-500">{transaction.customerName}</p>
                        </div>
                        <span className={`border px-2 py-0.5 text-[10px] font-semibold ${statusTone(transaction.status)}`}>
                          {badgeLabel(transaction.status)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-neutral-500">
                        <span>Due {formatDate(transaction.dueDate)}</span>
                        <span>{formatCurrency(transaction.depositReceived)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {selectedTransaction && (
        <section className="border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-200 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-neutral-950">Selected transaction</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Update ledger details, then add deposit, refund, penalty, or close the rental.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => printTransactionReceipt(selectedTransaction.id)}
                  className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <FileText className="h-4 w-4" />
                  Print receipt
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addTransactionDeposit(selectedTransaction.id, {
                      amount: Number(eventAmount) || 0,
                      note: eventNote,
                    })
                  }
                  className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <Wallet className="h-4 w-4" />
                  Add deposit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addTransactionRefund(selectedTransaction.id, {
                      amount: Number(eventAmount) || 0,
                      note: eventNote,
                    })
                  }
                  className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Add refund
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addTransactionPenalty(selectedTransaction.id, {
                      amount: Number(eventAmount) || 0,
                      note: eventNote,
                    })
                  }
                  className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <BadgeDollarSign className="h-4 w-4" />
                  Add penalty
                </button>
                <button
                  type="button"
                  onClick={() =>
                    addTransactionAdjustment(selectedTransaction.id, {
                      amount: Number(eventAmount) || 0,
                      note: eventNote,
                    })
                  }
                  className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <PenLine className="h-4 w-4" />
                  Add adjustment
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InfoTile label="Transaction" value={selectedTransaction.transactionNumber} />
                <InfoTile label="Item" value={selectedTransaction.itemCode} />
                <InfoTile label="Start" value={formatDate(selectedTransaction.startDate)} />
                <InfoTile label="Due" value={formatDate(selectedTransaction.dueDate)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Customer</span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Phone</span>
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-neutral-700">Event amount</span>
                  <input
                    type="number"
                    value={eventAmount}
                    onChange={(event) => setEventAmount(event.target.value)}
                    className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-neutral-700">Notes / event note</span>
                <input
                  value={eventNote}
                  onChange={(event) => setEventNote(event.target.value)}
                  className="w-full border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateTransactionDetails(selectedTransaction.id, {
                      customerName,
                      customerPhone,
                      dueDate: dueDate || null,
                      notes,
                    })
                  }
                  className="inline-flex items-center gap-2 bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Save edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    closeRentalTransaction(selectedTransaction.id, {
                      returnDate: new Date().toISOString().slice(0, 10),
                      note: eventNote,
                    })
                  }
                  className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Close rental
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Ledger summary
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Base amount</span>
                    <span className="font-medium text-neutral-950">
                      {formatCurrency(selectedTransaction.itemPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Deposit</span>
                    <span className="font-medium text-neutral-950">
                      {formatCurrency(selectedTransaction.depositReceived)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Refund</span>
                    <span className="font-medium text-neutral-950">
                      {formatCurrency(selectedTransaction.refundedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Penalty</span>
                    <span className="font-medium text-neutral-950">
                      {formatCurrency(selectedTransaction.penaltyAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Adjustment</span>
                    <span className="font-medium text-neutral-950">
                      {formatCurrency(selectedTransaction.adjustmentAmount)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  Audit state
                </p>
                <p className="mt-2 text-sm text-neutral-600">
                  Revision {selectedTransaction.revision}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Last updated {formatDate(selectedTransaction.updatedAt.slice(0, 10))}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Status {badgeLabel(selectedTransaction.status)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'amber' | 'red' | 'slate';
}) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : tone === 'red'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-neutral-200 bg-neutral-50 text-neutral-700';

  return (
    <div className="border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
        </div>
        <div className={`border p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
