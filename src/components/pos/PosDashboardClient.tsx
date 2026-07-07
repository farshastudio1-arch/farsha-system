'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  Clock3,
  Filter,
  History,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
  Wallet,
  Printer,
  X,
  Store,
  MapPin,
  Phone,
} from 'lucide-react';
import Link from 'next/link';

import {
  getLedgerMetrics,
  type PosLedgerState,
  type PosPaymentMethod,
  type PosTransaction,
} from '@/lib/pos-ledger';
import { useSavedPosLedger } from '@/lib/pos-ledger-client';

type DashboardLogTab = 'receipts' | 'transactions';

const paymentMethods: { value: PosPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function paymentMethodLabel(value: PosPaymentMethod) {
  return paymentMethods.find((method) => method.value === value)?.label ?? 'Cash';
}

interface PosDashboardClientProps {
  initialLedger: PosLedgerState;
}

export default function PosDashboardClient({ initialLedger }: PosDashboardClientProps) {
  const ledger = useSavedPosLedger(initialLedger);

  // Metrics
  const metrics = useMemo(() => getLedgerMetrics(ledger), [ledger]);

  // Tab & Selection States
  const [logTab, setLogTab] = useState<DashboardLogTab>('receipts');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');
  
  // Search and Filter States
  const [receiptFilter, setReceiptFilter] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'open' | 'closed' | 'void'>('all');

  // Invoice Print Modal State
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceTransaction, setInvoiceTransaction] = useState<PosTransaction | null>(null);

  const selectedTransaction = useMemo(
    () => ledger.transactions.find((t) => t.id === selectedTransactionId) ?? null,
    [ledger.transactions, selectedTransactionId]
  );

  // Filtered Financial Receipts
  const visibleReceipts = useMemo(() => {
    const query = receiptFilter.trim().toLowerCase();
    return ledger.receipts
      .filter((receipt) => {
        if (!query) return true;
        return (
          receipt.receiptNumber.toLowerCase().includes(query) ||
          receipt.transactionNumber.toLowerCase().includes(query) ||
          receipt.itemCode.toLowerCase().includes(query) ||
          receipt.itemName.toLowerCase().includes(query) ||
          receipt.customerName.toLowerCase().includes(query)
        );
      })
      .slice()
      .reverse();
  }, [ledger.receipts, receiptFilter]);

  // Filtered Transactions
  const visibleTransactions = useMemo(() => {
    return ledger.transactions
      .filter((t) => {
        const matchesFilter = historyFilter === 'all' || t.status === historyFilter;
        const query = historySearchQuery.trim().toLowerCase();
        return (
          matchesFilter &&
          (!query ||
            t.transactionNumber.toLowerCase().includes(query) ||
            t.customerName.toLowerCase().includes(query) ||
            t.itemName.toLowerCase().includes(query) ||
            t.itemCode.toLowerCase().includes(query))
        );
      })
      .slice()
      .reverse();
  }, [ledger.transactions, historyFilter, historySearchQuery]);

  // Filtered History Audit Logs for Selected Transaction
  const selectedAuditEntries = useMemo(() => {
    if (!selectedTransaction) return [];
    return ledger.history
      .filter((h) => h.transactionId === selectedTransaction.id)
      .slice()
      .reverse();
  }, [ledger.history, selectedTransaction]);

  const triggerInvoiceModal = (trx: PosTransaction) => {
    setInvoiceTransaction(trx);
    setIsInvoiceOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <section className="border border-[var(--theme-border)] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Kasir Farsha Studio
            </p>
            <h1 className="mt-1 text-2xl font-serif font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              Dashboard Ringkasan POS
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Analisis metrik keuangan, aliran dana masuk/keluar, dan riwayat audit operasional.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/pos/bookings"
              className="inline-flex items-center gap-2 border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-neutral-700 transition-all hover:bg-neutral-50"
            >
              <CalendarCheck className="h-4 w-4" /> Bookings
            </Link>
            <Link
              href="/pos"
              className="inline-flex items-center gap-2 bg-neutral-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-white transition-all hover:bg-neutral-800"
            >
              Workspace Kasir
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="border border-[var(--theme-border)] bg-neutral-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  Omset Kotor
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900">
                  {formatCurrency(metrics.grossRevenue)}
                </p>
              </div>
              <Wallet className="h-4 w-4 text-neutral-400" />
            </div>
          </div>

          <div className="border border-[var(--theme-border)] bg-neutral-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  Sewa Aktif
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900">
                  {metrics.activeCount}
                </p>
              </div>
              <Clock3 className="h-4 w-4 text-amber-600" />
            </div>
          </div>

          <div className="border border-[var(--theme-border)] bg-neutral-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  Overdue
                </p>
                <p className="mt-1 text-lg font-semibold text-red-700">
                  {metrics.overdueCount}
                </p>
              </div>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </div>

          <div className="border border-[var(--theme-border)] bg-neutral-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  Dalam Cuci
                </p>
                <p className="mt-1 text-lg font-semibold text-blue-800">
                  {metrics.maintenanceCount}
                </p>
              </div>
              <RotateCcw className="h-4 w-4 text-blue-600" />
            </div>
          </div>

          <div className="border border-[var(--theme-border)] bg-neutral-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  Total Receipt
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-900">
                  {metrics.receiptCount}
                </p>
              </div>
              <Receipt className="h-4 w-4 text-neutral-400" />
            </div>
          </div>

          <div className="border border-[var(--theme-border)] bg-neutral-50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
                  Void Log
                </p>
                <p className="mt-1 text-lg font-semibold text-neutral-500">
                  {metrics.voidCount}
                </p>
              </div>
              <ShieldAlert className="h-4 w-4 text-neutral-400" />
            </div>
          </div>
        </div>

        {/* Detailed Metrics Sub-list */}
        <div className="mt-5 grid gap-4 border-t border-neutral-100 pt-5 sm:grid-cols-3 text-xs">
          <div className="space-y-1">
            <p className="text-neutral-400">Deposit Dipegang Toko:</p>
            <p className="text-sm font-semibold text-neutral-950">{formatCurrency(metrics.depositHeld)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-neutral-400">Kas Masuk Kotor (Gross In):</p>
            <p className="text-sm font-semibold text-emerald-700">{formatCurrency(metrics.paymentIn)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-neutral-400">Kas Keluar / Refund (Out):</p>
            <p className="text-sm font-semibold text-red-600">{formatCurrency(metrics.paymentOut)}</p>
          </div>
        </div>

      </section>

      {/* Main split dashboard view */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        
        {/* Left Column: Logs navigation tabs */}
        <section className="border border-[var(--theme-border)] bg-white shadow-sm flex flex-col">
          <div className="border-b border-[var(--theme-border)] bg-neutral-50 p-2 flex gap-1">
            <button
              onClick={() => {
                setLogTab('receipts');
                setSelectedTransactionId('');
              }}
              className={`flex-1 text-center py-2 px-3 border transition ${
                logTab === 'receipts'
                  ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                  : 'border-transparent text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <span className="block text-xs uppercase tracking-wider font-semibold">Alur Keuangan Kasir</span>
              <span className="block text-[9px] text-neutral-400">Kumpulan struk pembayaran</span>
            </button>
            <button
              onClick={() => {
                setLogTab('transactions');
                setSelectedTransactionId('');
              }}
              className={`flex-1 text-center py-2 px-3 border transition ${
                logTab === 'transactions'
                  ? 'border-neutral-900 bg-neutral-900 text-white font-semibold'
                  : 'border-transparent text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <span className="block text-xs uppercase tracking-wider font-semibold">Riwayat Transaksi</span>
              <span className="block text-[9px] text-neutral-400">Semua persewaan & audit</span>
            </button>
          </div>

          <div className="p-4 flex-grow">
            
            {/* Receipts Log View */}
            {logTab === 'receipts' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={receiptFilter}
                    onChange={(e) => setReceiptFilter(e.target.value)}
                    placeholder="Cari struk berdasarkan nomor, baju, customer..."
                    className="w-full border border-[var(--theme-border)] bg-neutral-50 py-2 pl-9 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {visibleReceipts.map((rcp) => (
                    <div
                      key={rcp.id}
                      className="border border-[var(--theme-border)] bg-white p-3.5 flex justify-between items-start hover:border-neutral-400 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-semibold text-neutral-900">
                            {rcp.receiptNumber}
                          </span>
                          <span className="text-[10px] text-neutral-400">({rcp.transactionNumber})</span>
                        </div>
                        <p className="text-xs font-medium text-neutral-950">{rcp.itemName}</p>
                        <p className="text-xs text-neutral-600">Pelanggan: {rcp.customerName}</p>
                        <p className="text-[10px] text-neutral-400 font-mono">
                          {formatDate(rcp.createdAt)} / {paymentMethodLabel(rcp.paymentMethod)}
                        </p>
                      </div>

                      <div className="text-right shrink-0 flex flex-col justify-between h-full min-h-[64px]">
                        <span className={`text-xs font-semibold ${rcp.eventAmount < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {rcp.eventAmount > 0 ? '+' : ''}
                          {formatCurrency(rcp.eventAmount)}
                        </span>
                        <button
                          onClick={() => {
                            const trx = ledger.transactions.find((t) => t.id === rcp.transactionId);
                            if (trx) triggerInvoiceModal(trx);
                          }}
                          className="mt-4 inline-flex items-center justify-center gap-1 border border-neutral-200 bg-neutral-50 px-2 py-1 text-[9px] font-bold text-neutral-600 hover:bg-neutral-100 uppercase"
                        >
                          <Printer className="h-2.5 w-2.5" /> Invoice
                        </button>
                      </div>
                    </div>
                  ))}

                  {visibleReceipts.length === 0 && (
                    <div className="border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-500 font-mono">
                      Tidak ada struk bayar yang cocok dengan kriteria filter.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transactions Audit View */}
            {logTab === 'transactions' && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                    <input
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="Cari transaksi sewa..."
                      className="w-full border border-[var(--theme-border)] bg-neutral-50 py-1.5 pl-9 pr-4 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>

                  <div className="relative sm:w-36">
                    <Filter className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
                    <select
                      value={historyFilter}
                      onChange={(e) => setHistoryFilter(e.target.value as typeof historyFilter)}
                      className="w-full border border-[var(--theme-border)] bg-neutral-50 py-1.5 pl-8 pr-3 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    >
                      <option value="all">Semua Status</option>
                      <option value="open">RENTED (Open)</option>
                      <option value="closed">Selesai (Closed)</option>
                      <option value="void">Batal (Void)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {visibleTransactions.map((trx) => {
                    const isSelected = selectedTransactionId === trx.id;
                    let tagCls = 'border-amber-200 bg-amber-50 text-amber-700';
                    if (trx.status === 'closed') tagCls = 'border-sky-200 bg-sky-50 text-sky-800';
                    else if (trx.status === 'void') tagCls = 'border-neutral-200 bg-neutral-100 text-neutral-500';

                    return (
                      <button
                        key={trx.id}
                        onClick={() => setSelectedTransactionId(trx.id)}
                        className={`w-full block text-left border p-3.5 transition ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900'
                            : 'border-[var(--theme-border)] bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-mono text-xs font-semibold text-neutral-950">
                              {trx.transactionNumber}
                            </span>
                            <span className={`ml-2 text-[9px] font-mono border px-1.5 py-0.5 uppercase ${tagCls}`}>
                              {trx.status === 'open' ? 'RENTED' : trx.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-mono">{formatDate(trx.createdAt)}</span>
                        </div>
                        
                        <p className="mt-2 text-xs font-semibold text-neutral-900">{trx.itemName}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Penyewa: {trx.customerName}</p>

                        <div className="mt-3 flex justify-between items-center text-[10px] text-neutral-400 border-t border-neutral-100 pt-2 font-mono">
                          <span>Sewa: {formatCurrency(trx.itemPrice)}</span>
                          <span className="font-bold text-neutral-900">Total: {formatCurrency(trx.itemPrice + trx.depositReceived + trx.penaltyAmount + trx.adjustmentAmount - trx.refundedAmount)}</span>
                        </div>
                      </button>
                    );
                  })}

                  {visibleTransactions.length === 0 && (
                    <div className="border border-dashed border-neutral-300 p-8 text-center text-xs text-neutral-500 font-mono">
                      Tidak ada data sewa untuk pencarian dan filter ini.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Transaction Logs Audit Trail Panel */}
        <aside className="border border-[var(--theme-border)] bg-white p-5 shadow-sm flex flex-col justify-between min-h-[500px]">
          <div>
            {!selectedTransaction && (
              <div className="py-20 text-center space-y-3">
                <History className="mx-auto h-10 w-10 text-neutral-300 border border-dashed border-neutral-300 p-2" />
                <div className="space-y-1 max-w-[240px] mx-auto">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">Audit Desk Terkunci</h4>
                  <p className="text-xs text-neutral-500">
                    Buka tab &quot;Riwayat Transaksi&quot; di sebelah kiri dan pilih baris transaksi untuk melihat alur audit detail dan revisinya.
                  </p>
                </div>
              </div>
            )}

            {selectedTransaction && (
              <div className="space-y-5 animate-in fade-in duration-200">
                
                {/* Transaction metadata file */}
                <div className="border border-[var(--theme-border)] bg-neutral-50 p-4 space-y-3">
                  <div className="flex justify-between items-start border-b border-neutral-200 pb-2">
                    <div>
                      <p className="font-mono text-[9px] font-bold text-neutral-400">BERKAS INVOICE</p>
                      <h3 className="font-mono text-sm font-semibold text-neutral-900">
                        {selectedTransaction.transactionNumber}
                      </h3>
                    </div>
                    <button
                      onClick={() => triggerInvoiceModal(selectedTransaction)}
                      className="border border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] font-bold px-2 py-1 flex items-center gap-1 uppercase"
                    >
                      <Printer className="h-3 w-3" /> Cetak
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <span className="text-neutral-500">Baju / Kebaya:</span>
                    <span className="font-medium text-neutral-900 text-right">{selectedTransaction.itemName}</span>

                    <span className="text-neutral-500">Kode Baju:</span>
                    <span className="font-mono text-neutral-900 text-right">{selectedTransaction.itemCode}</span>

                    <span className="text-neutral-500">Pelanggan:</span>
                    <span className="font-medium text-neutral-900 text-right">{selectedTransaction.customerName}</span>

                    <span className="text-neutral-500">WhatsApp:</span>
                    <span className="text-neutral-900 text-right font-mono">{selectedTransaction.customerPhone || '-'}</span>

                    <span className="text-neutral-500">Tanggal Sewa:</span>
                    <span className="text-neutral-900 text-right font-mono">{formatDate(selectedTransaction.startDate)}</span>

                    <span className="text-neutral-500">Jatuh Tempo:</span>
                    <span className="text-neutral-900 text-right font-mono">{formatDate(selectedTransaction.dueDate)}</span>

                    {selectedTransaction.closedAt && (
                      <>
                        <span className="text-neutral-500">Selesai Sewa:</span>
                        <span className="text-neutral-900 text-right font-mono">{formatDate(selectedTransaction.closedAt)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Ledger balances summary */}
                <div className="bg-neutral-50 p-4 border border-[var(--theme-border)] space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Ringkasan Kas Transaksi</p>
                  <div className="space-y-1.5 text-xs text-neutral-700">
                    <div className="flex justify-between">
                      <span>Harga Sewa Pokok:</span>
                      <span className="font-semibold">{formatCurrency(selectedTransaction.itemPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deposit Keamanan (+):</span>
                      <span className="font-semibold">{formatCurrency(selectedTransaction.depositReceived)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Denda Masuk (+):</span>
                      <span className="font-semibold text-red-600">{formatCurrency(selectedTransaction.penaltyAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Koreksi / Penyesuaian:</span>
                      <span className="font-semibold">{selectedTransaction.adjustmentAmount > 0 ? '+' : ''}{formatCurrency(selectedTransaction.adjustmentAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deposit Refunded (-):</span>
                      <span className="font-semibold text-emerald-700">-{formatCurrency(selectedTransaction.refundedAmount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold text-neutral-950 text-sm">
                      <span>Jumlah Net Di Kantong:</span>
                      <span>
                        {formatCurrency(
                          selectedTransaction.itemPrice +
                          selectedTransaction.penaltyAmount +
                          selectedTransaction.adjustmentAmount -
                          selectedTransaction.refundedAmount
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Audit Entries Trail logs */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" /> Log Audit Penuh (Revisi {selectedTransaction.revision})
                  </p>

                  <div className="space-y-3.5 max-h-[220px] overflow-y-auto border border-neutral-100 p-2.5 bg-neutral-50/50">
                    {selectedAuditEntries.map((entry) => (
                      <div key={entry.id} className="text-xs border-b border-neutral-100 pb-2.5 last:border-0 last:pb-0 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-mono font-bold uppercase text-neutral-400 bg-white border px-1">
                            {entry.action}
                          </span>
                          <span className="text-neutral-400 font-mono">{formatDate(entry.createdAt)}</span>
                        </div>
                        <p className="font-semibold text-neutral-900">{entry.summary}</p>
                        {entry.reason && (
                          <p className="text-[11px] text-neutral-500 leading-normal italic">&quot;{entry.reason}&quot;</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          <div className="border-t border-neutral-100 pt-3 text-[10px] text-neutral-400 text-center font-mono leading-relaxed mt-6">
            Farsha Studio Dashboard v2.0
            <br />
            Paccerakkang, Makassar, Sulawesi Selatan
          </div>
        </aside>

      </div>

      {/* Invoice modal clone */}
      {isInvoiceOpen && invoiceTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0">
          <div className="bg-white shadow-2xl w-full max-w-md overflow-hidden flex flex-col print:shadow-none print:w-full print:max-w-none">
            
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50 print:hidden">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
                Pratinjau Bukti Transaksi
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center px-3 py-1.5 border border-neutral-900 bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" /> Cetak (Print)
                </button>
                <button
                  onClick={() => {
                    setIsInvoiceOpen(false);
                    setInvoiceTransaction(null);
                  }}
                  className="text-neutral-500 hover:text-neutral-800 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Block */}
            <div className="p-8 space-y-6 print:p-0 print:m-0" id="farsha-invoice-print-area">
              
              {/* Receipt Header branding */}
              <div className="text-center space-y-1.5 border-b border-dashed border-neutral-300 pb-5">
                <div className="flex items-center justify-center gap-1.5 text-neutral-900">
                  <Store className="h-5 w-5 shrink-0" />
                  <span className="font-serif font-bold text-lg tracking-tight uppercase">
                    Farsha Studio
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500 leading-normal">
                  <p className="flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" /> Paccerakkang, Makassar, Sulawesi Selatan
                  </p>
                  <p className="flex items-center justify-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" /> +62 821-9457-3759
                  </p>
                </div>
              </div>

              {/* Receipt metadata section */}
              <div className="grid grid-cols-2 gap-y-1 text-xs border-b border-dashed border-neutral-200 pb-3">
                <p className="text-neutral-400">Nomor Transaksi:</p>
                <p className="font-semibold text-neutral-900 text-right font-mono">#{invoiceTransaction.transactionNumber}</p>

                <p className="text-neutral-400">Tanggal Cetak:</p>
                <p className="text-neutral-800 text-right">{new Date().toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>

                <p className="text-neutral-400">Kasir:</p>
                <p className="text-neutral-800 text-right">Admin Studio</p>

                <p className="text-neutral-400">Status Transaksi:</p>
                <p className="font-semibold text-neutral-900 text-right uppercase text-[10px]">{invoiceTransaction.status}</p>
              </div>

              {/* Customer details section */}
              <div className="space-y-1 text-xs">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Detail Pelanggan</p>
                <div className="bg-neutral-50 p-2 text-neutral-800">
                  <p className="font-semibold">{invoiceTransaction.customerName}</p>
                  {invoiceTransaction.customerPhone && (
                    <p className="text-[11px] text-neutral-500 mt-0.5">{invoiceTransaction.customerPhone}</p>
                  )}
                </div>
              </div>

              {/* Line items list */}
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Pakaian Disewa</p>
                <table className="w-full text-left text-xs text-neutral-700">
                  <thead className="border-b border-neutral-300 text-[10px] uppercase text-neutral-500">
                    <tr>
                      <th className="pb-1">Baju / Kode</th>
                      <th className="pb-1 text-center">Batas Kembali</th>
                      <th className="pb-1 text-right">Biaya</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-100">
                      <td className="py-2.5">
                        <p className="font-semibold text-neutral-900">{invoiceTransaction.itemName}</p>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{invoiceTransaction.itemCode}</p>
                      </td>
                      <td className="py-2.5 text-center text-neutral-800 font-mono">
                        {formatDate(invoiceTransaction.dueDate)}
                      </td>
                      <td className="py-2.5 text-right font-medium text-neutral-900">
                        {formatCurrency(invoiceTransaction.itemPrice)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total calculations list */}
              <div className="space-y-2 border-t border-neutral-200 pt-3">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>Biaya Persewaan Pokok</span>
                  <span>{formatCurrency(invoiceTransaction.itemPrice)}</span>
                </div>
                
                {invoiceTransaction.depositReceived > 0 && (
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>Uang Jaminan (Security Deposit)</span>
                    <span>{formatCurrency(invoiceTransaction.depositReceived)}</span>
                  </div>
                )}

                {invoiceTransaction.penaltyAmount > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-medium">
                    <span>Denda Terlambat / Kerusakan (+)</span>
                    <span>{formatCurrency(invoiceTransaction.penaltyAmount)}</span>
                  </div>
                )}

                {invoiceTransaction.adjustmentAmount !== 0 && (
                  <div className="flex justify-between text-xs text-neutral-600">
                    <span>Koreksi Penyesuaian Kasir (+/-)</span>
                    <span>{invoiceTransaction.adjustmentAmount > 0 ? '+' : ''}{formatCurrency(invoiceTransaction.adjustmentAmount)}</span>
                  </div>
                )}

                {invoiceTransaction.refundedAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700 font-medium">
                    <span>Pengembalian Security Deposit (-)</span>
                    <span>-{formatCurrency(invoiceTransaction.refundedAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-neutral-900 pt-2 font-bold text-neutral-900 text-sm">
                  <span>TOTAL NET DIBAYAR</span>
                  <span className="text-base text-neutral-950">
                    {formatCurrency(
                      invoiceTransaction.itemPrice +
                      invoiceTransaction.depositReceived +
                      invoiceTransaction.penaltyAmount +
                      invoiceTransaction.adjustmentAmount -
                      invoiceTransaction.refundedAmount
                    )}
                  </span>
                </div>

                <div className="text-[10px] text-neutral-400 font-mono">
                  <span>Metode Bayar: </span>
                  <span className="font-semibold text-neutral-700 uppercase">{invoiceTransaction.paymentMethod}</span>
                </div>
              </div>

              {/* Receipt bottom Terms */}
              <div className="pt-6 border-t border-dashed border-neutral-200 text-center text-[10px] text-neutral-400 space-y-1">
                <p className="font-medium text-neutral-500">
                  Terima kasih atas kunjungan Anda di Farsha Studio!
                </p>
                <p className="leading-relaxed">
                  Harap periksa kelengkapan pakaian sewaan sebelum meninggalkan toko. Keterlambatan pengembalian dikenakan denda sesuai peraturan studio yang berlaku.
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Global CSS Inject to support clean full page printing of receipt */}
      <style jsx global>{`
        @media print {
          /* Hide everything in layout and background */
          body * {
            visibility: hidden;
            background: none !important;
          }
          
          /* Only display the designated print area div */
          #farsha-invoice-print-area,
          #farsha-invoice-print-area * {
            visibility: visible;
          }
          
          /* Position the print block correctly at absolute top left page boundary */
          #farsha-invoice-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          /* Hide scrollbars, dialog controls, and close buttons on printed paper */
          .fixed, 
          .fixed * {
            border: none !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
