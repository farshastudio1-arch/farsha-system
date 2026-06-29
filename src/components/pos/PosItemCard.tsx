import React from 'react';
import {
  Edit,
  AlertCircle,
  CheckCircle2,
  Clock,
  Archive,
  User,
  Wallet,
  AlertTriangle,
  MessageCircle,
  Printer,
} from 'lucide-react';
import type { ItemStatus } from './StatusUpdateModal';

interface PosItemCardProps {
  item: {
    id: string;
    name: string;
    code: string;
    status: ItemStatus;
    rental_end_date?: string | null;
    imageUrl: string;
    price: number;
    customerName?: string;
    customerPhone?: string;
    depositAmount?: number;
  };
  onUpdateClick: (item: any) => void;
  onInvoiceClick?: (item: any) => void;
}

export default function PosItemCard({ item, onUpdateClick, onInvoiceClick }: PosItemCardProps) {
  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Available
          </span>
        );
      case 'rented':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Rented
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">
            <AlertCircle className="w-3.5 h-3.5 mr-1" />
            Maintenance
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
            <Archive className="w-3.5 h-3.5 mr-1" />
            Archived
          </span>
        );
    }
  };

  const isOverdue = React.useMemo(() => {
    if (item.status !== 'rented' || !item.rental_end_date) return false;
    const endDate = new Date(item.rental_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  }, [item.status, item.rental_end_date]);

  return (
    <div
      className={`bg-white shadow-sm border overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col sm:flex-row ${isOverdue ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'}`}
    >
      {/* Item Image */}
      <div className="h-48 sm:h-auto sm:w-48 bg-gray-100 relative shrink-0">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        {isOverdue && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 shadow-sm flex items-center">
            <AlertTriangle className="w-3 h-3 mr-1" /> OVERDUE
          </div>
        )}
      </div>

      {/* Item Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p
                className={`text-xs font-mono px-2 py-0.5 inline-block mb-1 ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}
              >
                {item.code}
              </p>
              <h3 className="text-lg font-semibold text-gray-900 leading-tight">{item.name}</h3>
            </div>
            {getStatusBadge(item.status)}
          </div>

          <div className="mt-2 text-sm text-gray-500">
            <p className="font-medium text-gray-900">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                item.price,
              )}
              <span className="text-gray-500 font-normal"> / day</span>
            </p>
          </div>

          {item.status === 'rented' && (
            <div
              className={`mt-3 p-3 border ${isOverdue ? 'bg-red-50/50 border-red-100' : 'bg-blue-50/50 border-blue-100'} space-y-2`}
            >
              {item.rental_end_date && (
                <div className="flex items-start">
                  <Clock
                    className={`w-4 h-4 mt-0.5 mr-2 shrink-0 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}
                  />
                  <div>
                    <p
                      className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}
                    >
                      Return Due Date
                    </p>
                    <p
                      className={`text-sm font-semibold ${isOverdue ? 'text-red-900' : 'text-blue-900'}`}
                    >
                      {new Date(item.rental_end_date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}

              {item.customerName && (
                <div className="flex items-center text-sm pt-2 border-t border-black/5">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="font-medium text-gray-900">{item.customerName}</span>
                </div>
              )}

              {item.depositAmount ? (
                <div className="flex items-center text-sm">
                  <Wallet className="w-4 h-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">Deposit: </span>
                  <span className="font-medium text-gray-900 ml-1">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                      item.depositAmount,
                    )}
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-gray-100 sm:border-0 flex flex-col sm:flex-row gap-2 justify-end">
          {item.status === 'rented' && (
            <button
              onClick={() => onInvoiceClick && onInvoiceClick(item)}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Printer className="w-4 h-4 mr-2 text-gray-400" />
              Invoice
            </button>
          )}
          {isOverdue && item.customerPhone && (
            <a
              href={`https://wa.me/${item.customerPhone.replace(/^0/, '62')}?text=${encodeURIComponent(`Halo ${item.customerName}, pengingat bahwa sewa kebaya ${item.name} (${item.code}) sudah jatuh tempo pada ${item.rental_end_date}. Mohon segera dikembalikan ke Farsha Studio ya.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </a>
          )}
          <button
            onClick={() => onUpdateClick(item)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            <Edit className="w-4 h-4 mr-2" />
            Update Status
          </button>
        </div>
      </div>
    </div>
  );
}
