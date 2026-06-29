'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Edit, Plus, Search, Trash2, X } from 'lucide-react';

import { KebayaItem } from '@/data/mockData';
import { useSavedCatalogItems, writeSavedCatalogItems } from '@/lib/catalog-storage';

type CatalogFormState = {
  name: string;
  code: string;
  rentalPrice: string;
  status: KebayaItem['status'];
  model: KebayaItem['model'];
  size: KebayaItem['size'];
  color: string;
  imageUrl: string;
  description: string;
};

const defaultImageUrl =
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80';

const emptyForm: CatalogFormState = {
  name: '',
  code: '',
  rentalPrice: '',
  status: 'available',
  model: 'Modern',
  size: 'M',
  color: '',
  imageUrl: '',
  description: '',
};

const statusOptions: { value: KebayaItem['status'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'archived', label: 'Archived' },
];

const itemStatusOptions: { value: KebayaItem['status']; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'archived', label: 'Archived' },
];

const modelOptions: KebayaItem['model'][] = ['Modern', 'Klasik', 'Kartini', 'Kutubaru'];
const sizeOptions: KebayaItem['size'][] = ['S', 'M', 'L', 'XL', 'Custom'];

const statusStyles: Record<KebayaItem['status'], string> = {
  available: 'bg-green-100 text-green-700',
  rented: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  archived: 'bg-neutral-100 text-neutral-700',
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

function parsePrice(value: string) {
  return Number(value.replace(/[^\d]/g, ''));
}

function itemToForm(item: KebayaItem): CatalogFormState {
  return {
    name: item.name,
    code: item.code,
    rentalPrice: String(item.rentalPrice),
    status: item.status,
    model: item.model,
    size: item.size,
    color: item.color,
    imageUrl: item.imageUrls[0] ?? '',
    description: item.description,
  };
}

function createItemFromForm(form: CatalogFormState, id: string): KebayaItem {
  return {
    id,
    code: form.code.trim(),
    name: form.name.trim(),
    color: form.color.trim() || 'Neutral',
    size: form.size,
    model: form.model,
    rentalPrice: parsePrice(form.rentalPrice),
    status: form.status,
    rentalEndDate: null,
    imageUrls: [form.imageUrl.trim() || defaultImageUrl],
    description: form.description.trim(),
  };
}

export default function CatalogManagement() {
  const catalogItems = useSavedCatalogItems();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<KebayaItem['status'] | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KebayaItem | null>(null);
  const [form, setForm] = useState<CatalogFormState>(emptyForm);
  const [formError, setFormError] = useState('');

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return catalogItems.filter((item) => {
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [catalogItems, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: KebayaItem) => {
    setEditingItem(item);
    setForm(itemToForm(item));
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
    setFormError('');
  };

  const updateFormField = <Key extends keyof CatalogFormState>(
    key: Key,
    value: CatalogFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const price = parsePrice(form.rentalPrice);
    const code = form.code.trim();
    const name = form.name.trim();
    const duplicateCode = catalogItems.some(
      (item) =>
        item.code.toLowerCase() === code.toLowerCase() && item.id !== editingItem?.id,
    );

    if (!name || !code || !form.color.trim()) {
      setFormError('Name, code, and color are required.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setFormError('Rental price must be greater than 0.');
      return;
    }

    if (duplicateCode) {
      setFormError('Code already exists. Use a unique inventory code.');
      return;
    }

    const nextItem = createItemFromForm(form, editingItem?.id ?? `catalog-${Date.now()}`);
    const nextItems = editingItem
      ? catalogItems.map((item) => (item.id === editingItem.id ? nextItem : item))
      : [nextItem, ...catalogItems];

    writeSavedCatalogItems(nextItems);
    closeModal();
  };

  const deleteItem = (itemId: string) => {
    writeSavedCatalogItems(catalogItems.filter((item) => item.id !== itemId));
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Catalog</h1>
          <p className="mt-1 text-neutral-500">Manage your kebaya inventory and pricing.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
          Add New Item
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 p-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name or code..."
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as KebayaItem['status'] | 'all')
            }
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50/50 text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-medium">Item</th>
                <th className="px-6 py-4 font-medium">Code</th>
                <th className="px-6 py-4 font-medium">Rental Price</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-neutral-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrls[0]} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <span className="block font-medium text-neutral-900">{item.name}</span>
                        <span className="mt-0.5 block text-xs text-neutral-500">
                          {item.model} / {item.size} / {item.color}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-500">{item.code}</td>
                  <td className="px-6 py-4 font-medium text-neutral-900">
                    {formatPrice(item.rentalPrice)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        aria-label={`Edit ${item.name}`}
                        className="rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        aria-label={`Delete ${item.name}`}
                        className="rounded-md p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="border-t border-neutral-200 px-6 py-10 text-center">
            <p className="text-sm font-medium text-neutral-900">No catalog items found.</p>
            <p className="mt-1 text-sm text-neutral-500">Try a different search or add a new item.</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-neutral-200 p-4 text-sm text-neutral-500">
          <span>
            Showing {filteredItems.length === 0 ? 0 : 1} to {filteredItems.length} of{' '}
            {catalogItems.length} results
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled
              className="rounded-md border border-neutral-200 px-3 py-1 opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              disabled
              className="rounded-md border border-neutral-200 px-3 py-1 opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  {editingItem ? 'Edit Catalog Item' : 'Add New Catalog Item'}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Product name and image always stay visible on public catalog cards.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close catalog item form"
                className="rounded-md p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveItem} className="overflow-y-auto px-6 py-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">Name</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) => updateFormField('name', event.target.value)}
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">Code</span>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) => updateFormField('code', event.target.value)}
                    placeholder="KB-NEW-11"
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm uppercase transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Rental Price
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.rentalPrice}
                    onChange={(event) => updateFormField('rentalPrice', event.target.value)}
                    placeholder="350000"
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateFormField('status', event.target.value as KebayaItem['status'])
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    {itemStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">Model</span>
                  <select
                    value={form.model}
                    onChange={(event) =>
                      updateFormField('model', event.target.value as KebayaItem['model'])
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    {modelOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">Size</span>
                  <select
                    value={form.size}
                    onChange={(event) =>
                      updateFormField('size', event.target.value as KebayaItem['size'])
                    }
                    className="w-full rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
                  >
                    {sizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">Color</span>
                  <input
                    type="text"
                    value={form.color}
                    onChange={(event) => updateFormField('color', event.target.value)}
                    placeholder="Sage Green"
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">Image URL</span>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) => updateFormField('imageUrl', event.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Short Description
                  </span>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(event) => updateFormField('description', event.target.value)}
                    className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </label>
              </div>

              {formError && <p className="mt-4 text-sm font-medium text-red-600">{formError}</p>}

              <div className="mt-6 flex justify-end gap-3 border-t border-neutral-200 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  {editingItem ? 'Save Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
