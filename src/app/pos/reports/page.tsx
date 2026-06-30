'use client';

import React, { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, FileText, TrendingUp, Wallet } from 'lucide-react';

import { getLedgerMetrics, useSavedPosLedger } from '@/lib/pos-ledger';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function ReportsPage() {
  const ledger = useSavedPosLedger();
  const metrics = useMemo(() => getLedgerMetrics(ledger), [ledger]);
  const latestTransactions = useMemo(
    () => ledger.transactions.slice().reverse().slice(0, 6),
    [ledger.transactions],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Laporan Keuangan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ringkasan ledger dari transaksi, deposit, refund, dan penalti.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Gross revenue</p>
            <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.grossRevenue)}</h2>
            <p className="text-sm text-green-600 flex items-center mt-2 font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              From ledger entries
            </p>
          </div>
          <div className="p-3 bg-indigo-50 ">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Deposit held</p>
            <h2 className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.depositHeld)}</h2>
            <p className="text-sm text-gray-500 flex items-center mt-2 font-medium">
              Dana yang harus dikembalikan
            </p>
          </div>
          <div className="p-3 bg-amber-50 ">
            <Wallet className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Transaksi Terbaru</h3>
          <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center">
            <FileText className="w-4 h-4 mr-1" />
            Ledger view
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3">
                  ID Transaksi
                </th>
                <th scope="col" className="px-6 py-3">
                  Tanggal
                </th>
                <th scope="col" className="px-6 py-3">
                  Pelanggan
                </th>
                <th scope="col" className="px-6 py-3">
                  Item
                </th>
                <th scope="col" className="px-6 py-3">
                  Biaya Sewa
                </th>
                <th scope="col" className="px-6 py-3">
                  Deposit
                </th>
                <th scope="col" className="px-6 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {latestTransactions.map((trx) => (
                <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                    {trx.transactionNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(trx.createdAt)}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{trx.customerName}</td>
                  <td className="px-6 py-4">{trx.itemCode} - {trx.itemName}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {formatCurrency(trx.itemPrice)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {formatCurrency(trx.depositReceived)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${
                        trx.status === 'open'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {trx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
