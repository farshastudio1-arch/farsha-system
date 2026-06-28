'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, CheckCircle2, User, Phone, Wallet } from 'lucide-react';

export type ItemStatus = 'available' | 'rented' | 'maintenance' | 'archived';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    code: string;
    status: ItemStatus;
    rental_end_date?: string | null;
    customerName?: string;
    customerPhone?: string;
    depositAmount?: number;
  } | null;
  onUpdate: (
    id: string, 
    newStatus: ItemStatus, 
    endDate?: string | null,
    customerName?: string,
    customerPhone?: string,
    depositAmount?: number
  ) => void;
}

export default function StatusUpdateModal({ isOpen, onClose, item, onUpdate }: StatusUpdateModalProps) {
  const [status, setStatus] = useState<ItemStatus>('available');
  const [endDate, setEndDate] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(0);

  useEffect(() => {
    if (item) {
      setStatus(item.status);
      setEndDate(item.rental_end_date || '');
      setCustomerName(item.customerName || '');
      setCustomerPhone(item.customerPhone || '');
      setDepositAmount(item.depositAmount || 0);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'rented') {
      onUpdate(item.id, status, endDate, customerName, customerPhone, depositAmount);
    } else {
      onUpdate(item.id, status, null, undefined, undefined, undefined);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors rounded-full p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Item Details</p>
            <p className="text-base text-gray-900 font-semibold">{item.name}</p>
            <p className="text-sm text-indigo-600 font-mono bg-indigo-50 inline-block px-2 py-0.5 rounded mt-1">
              {item.code}
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">New Status</label>
            <div className="grid grid-cols-2 gap-3">
              {(['available', 'rented', 'maintenance', 'archived'] as ItemStatus[]).map((s) => (
                <label 
                  key={s} 
                  className={`
                    relative flex cursor-pointer rounded-lg border p-3 shadow-sm focus:outline-none
                    ${status === s 
                      ? 'border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/50' 
                      : 'border-gray-300 bg-white hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={status === s}
                    onChange={() => setStatus(s)}
                    className="sr-only"
                  />
                  <div className="flex w-full items-center justify-between">
                    <span className={`text-sm font-medium capitalize ${status === s ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {s}
                    </span>
                    {status === s && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {status === 'rented' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="space-y-2">
                <label htmlFor="endDate" className="text-sm font-medium text-gray-700 flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1.5 text-gray-500" />
                  Rental Return Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="customerName" className="text-sm font-medium text-gray-700 flex items-center">
                  <User className="h-4 w-4 mr-1.5 text-gray-500" />
                  Customer Name
                </label>
                <input
                  type="text"
                  id="customerName"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Budi Santoso"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="customerPhone" className="text-sm font-medium text-gray-700 flex items-center">
                  <Phone className="h-4 w-4 mr-1.5 text-gray-500" />
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  id="customerPhone"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 08123456789"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="depositAmount" className="text-sm font-medium text-gray-700 flex items-center">
                  <Wallet className="h-4 w-4 mr-1.5 text-gray-500" />
                  Security Deposit (Rp)
                </label>
                <input
                  type="number"
                  id="depositAmount"
                  required
                  min="0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
