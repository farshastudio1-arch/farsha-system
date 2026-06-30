'use client';

import React, { useRef } from 'react';
import { X, Printer, Store, MapPin, Phone } from 'lucide-react';
import type { PosTransaction } from '@/lib/pos-ledger';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PosTransaction | null;
}

export default function InvoiceModal({ isOpen, onClose, item }: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    // In a real application, you might use window.print() and CSS @media print
    // to hide everything except a specific div.
    window.print();
  };

  // Generate a mock invoice number based on the item id and current date
  const invoiceNumber = item.transactionNumber;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:bg-white print:p-0">
      {/* Non-printable overlay controls */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white hover:text-gray-200 transition-colors p-2 hover:bg-white/10 print:hidden"
      >
        <X className="h-8 w-8" />
      </button>

      {/* Invoice Container */}
      <div
        ref={printRef}
        className="bg-white shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all print:shadow-none print:w-full print:max-w-none flex flex-col"
      >
        {/* Invoice Header / Actions */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 print:hidden">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            Pratinjau Invoice
          </h3>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none transition-colors"
          >
            <Printer className="h-4 w-4 mr-2" />
            Cetak Invoice
          </button>
        </div>

        {/* Printable Area */}
        <div className="p-8 sm:p-10 space-y-8 print:p-0">
          {/* Studio Header */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-8">
            <div>
              <div className="flex items-center text-indigo-600 mb-2">
                <Store className="h-8 w-8 mr-2" />
                <span className="font-bold text-2xl tracking-tight text-gray-900">
                  Farsha Studio
                </span>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <p className="flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1" /> Jl. Kebaya Indah No. 12, Jakarta
                </p>
                <p className="flex items-center">
                  <Phone className="h-3.5 w-3.5 mr-1" /> +62 812 3456 7890
                </p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-200 uppercase tracking-widest mb-2">
                INVOICE
              </h1>
              <p className="text-sm font-medium text-gray-900"># {invoiceNumber}</p>
              <p className="text-sm text-gray-500 mt-1">
                Tanggal: {new Date().toLocaleDateString('id-ID')}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Disewakan Kepada:
              </p>
              <p className="text-base font-semibold text-gray-900">
                {item.customerName || 'Pelanggan Umum'}
              </p>
              {item.customerPhone && (
                <p className="text-sm text-gray-500 mt-1">{item.customerPhone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Status:
              </p>
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {item.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Line Items */}
          <div className="mt-8">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="border-b-2 border-gray-900 text-xs uppercase text-gray-700">
                <tr>
                  <th scope="col" className="py-3 font-semibold">
                    Deskripsi Item
                  </th>
                  <th scope="col" className="py-3 text-center font-semibold">
                    Batas Pengembalian
                  </th>
                  <th scope="col" className="py-3 text-right font-semibold">
                    Biaya Sewa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <tr>
                  <td className="py-4">
                    <p className="font-semibold text-gray-900">{item.itemName}</p>
                    <p className="text-gray-500 text-xs font-mono mt-1">{item.itemCode}</p>
                  </td>
                  <td className="py-4 text-center text-gray-900">
                    {item.dueDate
                      ? new Date(item.dueDate).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '-'}
                  </td>
                  <td className="py-4 text-right font-medium text-gray-900">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                      item.itemPrice,
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-4">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Biaya Sewa</span>
                <span className="font-medium text-gray-900">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                    item.itemPrice,
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Deposit Keamanan</span>
                <span className="font-medium text-gray-900">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                    item.depositReceived || 0,
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center border-t-2 border-gray-900 pt-3">
                <span className="font-bold text-gray-900">Total Dibayar</span>
                <span className="text-xl font-bold text-indigo-600">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                    item.itemPrice + (item.depositReceived || 0),
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="pt-16 text-center text-xs text-gray-400">
            <p className="font-medium text-gray-500 mb-1">
              Terima kasih atas kepercayaan Anda menyewa di Farsha Studio!
            </p>
            <p>
              Harap kembalikan barang tepat waktu sebelum atau pada batas pengembalian.
              Keterlambatan dan kerusakan akan dikenakan denda sesuai dengan ketentuan studio yang
              berlaku.
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          /* We target the printRef element using a global class we'll inject via Next.js or just inline it */
          .fixed.inset-0 > div:nth-child(2),
          .fixed.inset-0 > div:nth-child(2) * {
            visibility: visible;
          }
          .fixed.inset-0 > div:nth-child(2) {
            position: absolute;
            left: 0;
            top: 0;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
