'use client';

import React from 'react';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';

// Mock Transaction Data
const MOCK_TRANSACTIONS = [
  {
    id: 'TRX-001',
    date: '2026-06-28',
    customer: 'Siti Aminah',
    item: 'Kebaya Encim Klasik (KB-002)',
    amount: 200000,
    deposit: 100000,
    status: 'Active',
  },
  {
    id: 'TRX-002',
    date: '2026-06-27',
    customer: 'Budi Santoso',
    item: 'Kebaya Bludru Hitam (KB-004)',
    amount: 250000,
    deposit: 150000,
    status: 'Completed',
  },
  {
    id: 'TRX-003',
    date: '2026-06-25',
    customer: 'Rina Melati',
    item: 'Kebaya Pengantin Putih (KB-005)',
    amount: 800000,
    deposit: 500000,
    status: 'Completed',
  },
  {
    id: 'TRX-004',
    date: '2026-06-22',
    customer: 'Ayu Wandira',
    item: 'Kebaya Kutu Baru Modern (KB-001)',
    amount: 150000,
    deposit: 100000,
    status: 'Completed',
  },
];

export default function ReportsPage() {
  const totalRevenue = MOCK_TRANSACTIONS.reduce((sum, trx) => sum + trx.amount, 0);
  const activeDeposits = MOCK_TRANSACTIONS.filter((t) => t.status === 'Active').reduce(
    (sum, trx) => sum + trx.deposit,
    0,
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Laporan Keuangan</h1>
        <p className="text-sm text-gray-500 mt-1">Ringkasan pendapatan dan deposit aktif.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Pendapatan (Bulan Ini)</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                totalRevenue,
              )}
            </h2>
            <p className="text-sm text-green-600 flex items-center mt-2 font-medium">
              <ArrowUpRight className="w-4 h-4 mr-1" />
              +12.5% dari bulan lalu
            </p>
          </div>
          <div className="p-3 bg-indigo-50 ">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 p-6 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Deposit Aktif (Ditahan)</p>
            <h2 className="text-3xl font-bold text-gray-900">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                activeDeposits,
              )}
            </h2>
            <p className="text-sm text-gray-500 flex items-center mt-2 font-medium">
              Dana yang harus dikembalikan
            </p>
          </div>
          <div className="p-3 bg-amber-50 ">
            <Wallet className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Transaksi Terbaru</h3>
          <button className="text-sm text-indigo-600 font-medium hover:text-indigo-700 flex items-center">
            <FileText className="w-4 h-4 mr-1" />
            Export CSV
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
              {MOCK_TRANSACTIONS.map((trx) => (
                <tr key={trx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium text-gray-900 whitespace-nowrap">
                    {trx.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(trx.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{trx.customer}</td>
                  <td className="px-6 py-4">{trx.item}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                      trx.amount,
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                      trx.deposit,
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium ${
                        trx.status === 'Active'
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
