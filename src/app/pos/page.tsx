'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, Package, AlertTriangle } from 'lucide-react';
import PosItemCard from '@/components/pos/PosItemCard';
import StatusUpdateModal, { ItemStatus } from '@/components/pos/StatusUpdateModal';

// Mock Data
export interface PosItem {
  id: string;
  code: string;
  name: string;
  status: ItemStatus;
  price: number;
  imageUrl: string;
  rental_end_date?: string | null;
  customerName?: string;
  customerPhone?: string;
  depositAmount?: number;
}

const INITIAL_ITEMS: PosItem[] = [
  {
    id: '1',
    code: 'KB-001',
    name: 'Kebaya Kutu Baru Modern',
    status: 'available',
    price: 150000,
    imageUrl:
      'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '2',
    code: 'KB-002',
    name: 'Kebaya Encim Klasik',
    status: 'rented',
    rental_end_date: '2026-06-25', // Intentional past date for testing overdue
    customerName: 'Siti Aminah',
    customerPhone: '081234567890',
    depositAmount: 100000,
    price: 200000,
    imageUrl:
      'https://images.unsplash.com/photo-1616035079860-2eb311df93c5?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '3',
    code: 'KB-003',
    name: 'Kebaya Brokat Payet',
    status: 'maintenance',
    price: 350000,
    imageUrl:
      'https://images.unsplash.com/photo-1598032729987-a2f026938a14?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '4',
    code: 'KB-004',
    name: 'Kebaya Bludru Hitam',
    status: 'available',
    price: 250000,
    imageUrl:
      'https://images.unsplash.com/photo-1578330756775-53c822e11801?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: '5',
    code: 'KB-005',
    name: 'Kebaya Pengantin Putih',
    status: 'archived',
    price: 800000,
    imageUrl:
      'https://images.unsplash.com/photo-1555529733-0e670560f7e1?auto=format&fit=crop&q=80&w=400',
  },
];

import InvoiceModal from '@/components/pos/InvoiceModal';

export default function PosDashboard() {
  const [items, setItems] = useState<PosItem[]>(INITIAL_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PosItem | null>(null);

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceItem, setInvoiceItem] = useState<PosItem | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  const overdueItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison

    return items.filter((item) => {
      if (item.status === 'rented' && item.rental_end_date) {
        const endDate = new Date(item.rental_end_date);
        return endDate < today;
      }
      return false;
    });
  }, [items]);

  const handleUpdateStatus = (
    id: string,
    newStatus: ItemStatus,
    endDate?: string | null,
    customerName?: string,
    customerPhone?: string,
    depositAmount?: number,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
              rental_end_date: endDate,
              customerName: customerName,
              customerPhone: customerPhone,
              depositAmount: depositAmount,
            }
          : item,
      ),
    );
  };

  const handleOpenUpdateModal = (item: PosItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleOpenInvoiceModal = (item: PosItem) => {
    setInvoiceItem(item);
    setIsInvoiceOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Katalog & Status</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola status penyewaan dan ketersediaan koleksi.
          </p>
        </div>
      </div>

      {/* Overdue Alerts */}
      {overdueItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-red-800">
                Terdapat {overdueItems.length} item terlambat dikembalikan!
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {overdueItems.map((item) => (
                    <li key={item.id}>
                      <span className="font-medium">
                        {item.code} - {item.name}
                      </span>
                      {item.customerName && ` disewa oleh ${item.customerName}`}
                      (Batas: {item.rental_end_date})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            placeholder="Cari nama kebaya atau kode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 sm:w-auto w-full">
          <Filter className="h-5 w-5 text-gray-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="block w-full sm:w-48 pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
          >
            <option value="all">Semua Status</option>
            <option value="available">Available (Tersedia)</option>
            <option value="rented">Rented (Disewa)</option>
            <option value="maintenance">Maintenance (Perbaikan)</option>
            <option value="archived">Archived (Diarsipkan)</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-500 font-medium px-1">
        Menampilkan {filteredItems.length} item
      </div>

      {/* Item List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
        {filteredItems.map((item) => (
          <PosItemCard
            key={item.id}
            item={item}
            onUpdateClick={handleOpenUpdateModal}
            onInvoiceClick={handleOpenInvoiceModal}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white border border-dashed border-gray-300">
            <Package className="h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Tidak ada item ditemukan</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              Coba gunakan kata kunci pencarian atau filter status yang berbeda.
            </p>
          </div>
        )}
      </div>

      {/* Update Modal */}
      <StatusUpdateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={selectedItem}
        onUpdate={handleUpdateStatus}
      />

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        item={invoiceItem}
      />
    </div>
  );
}
