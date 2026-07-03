'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  GripVertical,
  ImagePlus,
  Images,
  PackageSearch,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';

import MediaLibraryPicker from '@/components/admin/MediaLibraryPicker';
import { KebayaCategory, KebayaItem, KebayaMeasurements } from '@/data/mockData';
import { optimizeImageBeforeUpload } from '@/lib/client-image-optimizer';
import {
  deleteCatalogItemAction,
  fetchAdminCatalogItemsAction,
  saveCatalogItemAction,
} from '@/lib/farsha-actions';
import { useSavedCatalogItems, writeSavedCatalogItems } from '@/lib/catalog-storage';
import { landingCategories, matchesLandingCategory } from '@/lib/landing-categories';
import { projectCatalogItems, useSavedPosLedger } from '@/lib/pos-ledger';

type CatalogFormState = {
  name: string;
  code: string;
  rentalPrice: string;
  model: KebayaItem['model'];
  size: KebayaItem['size'];
  color: string;
  imageUrls: string[];
  description: string;
  categories: KebayaCategory[];
  measurements: KebayaMeasurements;
};

type CoverageFilter = 'all' | KebayaCategory;

const defaultImageUrl =
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80';
const maxImageSlots = 8;
const maxUploadBytes = 5 * 1024 * 1024;
const acceptedUploadTypes = ['image/jpeg', 'image/png', 'image/webp'];
const acceptedUploadInput = acceptedUploadTypes.join(',');

type CatalogImageUploadResponse =
  | {
      ok: true;
      data: {
        key: string;
        url: string;
        contentType: string;
        size: number;
      };
    }
  | {
      ok: false;
      error: string;
    };

const emptyForm: CatalogFormState = {
  name: '',
  code: '',
  rentalPrice: '',
  model: 'Modern',
  size: 'M',
  color: '',
  imageUrls: [''],
  description: '',
  categories: [],
  measurements: {
    bust: '',
    waist: '',
    length: '',
    sleeveLength: '',
    armhole: '',
    otherDetails: '',
    rentalCategory: 'Offline Studio',
  },
};

const categoryOptions: { value: KebayaCategory; label: string; emoji: string }[] = [
  { value: 'wisuda', label: 'Wisuda', emoji: '🎓' },
  { value: 'lamaran', label: 'Lamaran', emoji: '💍' },
  { value: 'kondangan', label: 'Kondangan', emoji: '✨' },
  { value: 'bridesmaid', label: 'Bridesmaid', emoji: '🌸' },
];

const statusOptions: { value: KebayaItem['status'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'AVAILABLE' },
  { value: 'rented', label: 'RENTED' },
  { value: 'maintenance', label: 'DICUCI' },
];

const modelOptions: KebayaItem['model'][] = ['Modern', 'Klasik', 'Kartini', 'Kutubaru'];
const sizeOptions: KebayaItem['size'][] = ['S', 'M', 'L', 'XL', 'Custom'];
const rentalCategoryOptions = [
  'Offline Studio',
  'Studio Fitting',
  'Event Rental',
  'Bridesmaid Package',
  'Custom Booking',
];

const statusStyles: Record<KebayaItem['status'], string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rented: 'border-amber-200 bg-amber-50 text-amber-700',
  maintenance: 'border-rose-200 bg-rose-50 text-rose-700',
};

const statusIcons: Record<KebayaItem['status'], typeof CheckCircle> = {
  available: CheckCircle,
  rented: Clock,
  maintenance: Wrench,
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

function formatDate(value: string | null) {
  if (!value) {
    return 'Tanggal belum diisi';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Tanggal tidak valid';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function statusLabel(status: KebayaItem['status']) {
  const labels: Record<KebayaItem['status'], string> = {
    available: 'AVAILABLE',
    rented: 'RENTED',
    maintenance: 'DICUCI',
  };

  return labels[status];
}

function categoryLabel(value: KebayaCategory) {
  return categoryOptions.find((category) => category.value === value)?.label ?? value;
}

function itemToForm(item: KebayaItem): CatalogFormState {
  return {
    name: item.name,
    code: item.code,
    rentalPrice: String(item.rentalPrice),
    model: item.model,
    size: item.size,
    color: item.color,
    imageUrls: item.imageUrls.length > 0 ? [...item.imageUrls] : [''],
    description: item.description,
    categories: item.categories ?? [],
    measurements: {
      bust: item.measurements?.bust ?? '',
      waist: item.measurements?.waist ?? '',
      length: item.measurements?.length ?? '',
      sleeveLength: item.measurements?.sleeveLength ?? '',
      armhole: item.measurements?.armhole ?? '',
      otherDetails: item.measurements?.otherDetails ?? '',
      rentalCategory: item.measurements?.rentalCategory ?? 'Offline Studio',
    },
  };
}

function createItemFromForm(form: CatalogFormState, id: string): KebayaItem {
  const validUrls = form.imageUrls.map((url) => url.trim()).filter(Boolean);
  const measurements = {
    bust: form.measurements.bust.trim(),
    waist: form.measurements.waist.trim(),
    length: form.measurements.length.trim(),
    sleeveLength: form.measurements.sleeveLength.trim(),
    armhole: form.measurements.armhole.trim(),
    otherDetails: form.measurements.otherDetails.trim(),
    rentalCategory: form.measurements.rentalCategory.trim(),
  };

  return {
    id,
    code: form.code.trim(),
    name: form.name.trim(),
    color: form.color.trim() || 'Neutral',
    size: form.size,
    model: form.model,
    rentalPrice: parsePrice(form.rentalPrice),
    status: 'available',
    rentalEndDate: null,
    imageUrls: validUrls.length > 0 ? validUrls : [defaultImageUrl],
    description: form.description.trim(),
    categories: form.categories.length > 0 ? form.categories : undefined,
    measurements: Object.values(measurements).some(Boolean) ? measurements : undefined,
  };
}

function getItemCategories(item: KebayaItem) {
  if (item.categories && item.categories.length > 0) {
    return item.categories;
  }

  return landingCategories
    .filter((category) => matchesLandingCategory(item, category.slug))
    .map((category) => category.slug);
}

function getItemQualityIssues(item: KebayaItem) {
  const issues: string[] = [];
  const measurements = item.measurements;

  if (item.imageUrls.length < 2) {
    issues.push('Needs more photos');
  }

  if (!item.description.trim()) {
    issues.push('Missing description');
  }

  if (item.rentalPrice <= 0) {
    issues.push('Missing price');
  }

  if (
    !measurements?.bust ||
    !measurements?.waist ||
    !measurements?.length ||
    !measurements?.sleeveLength ||
    !measurements?.armhole
  ) {
    issues.push('Missing measurements');
  }

  if (!measurements?.rentalCategory) {
    issues.push('Missing rental category');
  }

  return issues;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
      {children}
    </p>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: KebayaItem['status'] }) {
  const Icon = statusIcons[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {statusLabel(status)}
    </span>
  );
}

function ProductImages({ item }: { item: KebayaItem }) {
  return (
    <div className="flex shrink-0 gap-0.5">
      {item.imageUrls.slice(0, 3).map((url, index) => (
        <div
          key={`${url}-${index}`}
          className={`relative overflow-hidden bg-neutral-100 ${
            index === 0 ? 'h-14 w-12' : 'h-14 w-7'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
      {item.imageUrls.length > 3 && (
        <div className="flex h-14 w-7 items-center justify-center bg-neutral-100 text-[9px] font-semibold text-neutral-500">
          +{item.imageUrls.length - 3}
        </div>
      )}
    </div>
  );
}

const inputCls =
  'w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900';
const selectCls =
  'w-full border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900';

export default function CatalogManagement() {
  const catalogItems = useSavedCatalogItems();
  const ledger = useSavedPosLedger();
  const projectedItems = useMemo(() => projectCatalogItems(catalogItems, ledger), [catalogItems, ledger]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<KebayaItem['status'] | 'all'>('all');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'issues'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<KebayaItem | null>(null);
  const [form, setForm] = useState<CatalogFormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pickerTarget, setPickerTarget] = useState<number | 'append' | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCatalogItems() {
      setIsLoadingCatalog(true);
      const result = await fetchAdminCatalogItemsAction();

      if (!active) {
        return;
      }

      if (result.ok) {
        writeSavedCatalogItems(result.data);
        setCatalogError('');
      } else {
        setCatalogError(result.error);
      }

      setIsLoadingCatalog(false);
    }

    loadCatalogItems();

    return () => {
      active = false;
    };
  }, []);

  const catalogSummary = useMemo(() => {
    const availableItems = projectedItems.filter((item) => item.status === 'available');
    const rentedItems = projectedItems.filter((item) => item.status === 'rented');
    const maintenanceItems = projectedItems.filter((item) => item.status === 'maintenance');
    const issueItems = catalogItems.filter((item) => getItemQualityIssues(item).length > 0);

    return {
      total: projectedItems.length,
      available: availableItems.length,
      rented: rentedItems.length,
      maintenance: maintenanceItems.length,
      issues: issueItems.length,
    };
  }, [catalogItems, projectedItems]);

  const categoryCoverage = useMemo(
    () =>
      landingCategories.map((category) => {
        const matches = projectedItems.filter(
          (item) => matchesLandingCategory(item, category.slug),
        );
        const ready = matches.filter((item) => item.status === 'available');

        return {
          ...category,
          count: matches.length,
          readyCount: ready.length,
        };
      }),
    [projectedItems],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projectedItems.filter((item) => {
      const itemCategories = getItemCategories(item);
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.color.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCoverage = coverageFilter === 'all' || itemCategories.includes(coverageFilter);
      const matchesQuality =
        qualityFilter === 'all' || getItemQualityIssues(item).length > 0;

      return matchesQuery && matchesStatus && matchesCoverage && matchesQuality;
    });
  }, [projectedItems, coverageFilter, qualityFilter, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFormError('');
    setImgErrors({});
    setUploadError('');
    setIsUploadingImage(false);
    setPickerTarget(null);
    setIsModalOpen(true);
  };

  const openEditModal = (itemId: string) => {
    const item = catalogItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    setEditingItem(item);
    setForm(itemToForm(item));
    setFormError('');
    setImgErrors({});
    setUploadError('');
    setIsUploadingImage(false);
    setPickerTarget(null);
    setIsModalOpen(true);
  };

  const closeCatalogModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
    setFormError('');
    setImgErrors({});
    setUploadError('');
    setIsUploadingImage(false);
    setPickerTarget(null);
  };

  const closeModal = () => {
    closeCatalogModal();
  };

  const updateFormField = <Key extends keyof CatalogFormState>(
    key: Key,
    value: CatalogFormState[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateMeasurementField = <Key extends keyof KebayaMeasurements>(
    key: Key,
    value: KebayaMeasurements[Key],
  ) => {
    setForm((current) => ({
      ...current,
      measurements: {
        ...current.measurements,
        [key]: value,
      },
    }));
  };

  const setImageUrl = (index: number, value: string) => {
    const next = [...form.imageUrls];
    next[index] = value;
    updateFormField('imageUrls', next);
    setImgErrors((prev) => ({ ...prev, [index]: false }));
  };

  const addImageSlot = () => {
    if (form.imageUrls.length >= maxImageSlots) return;
    updateFormField('imageUrls', [...form.imageUrls, '']);
  };

  const removeImageSlot = (index: number) => {
    if (form.imageUrls.length <= 1) {
      updateFormField('imageUrls', ['']);
      return;
    }

    const next = form.imageUrls.filter((_, i) => i !== index);
    updateFormField('imageUrls', next);
    setImgErrors((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= form.imageUrls.length) return;
    const next = [...form.imageUrls];
    [next[from], next[to]] = [next[to], next[from]];
    updateFormField('imageUrls', next);
  };

  const addUploadedImageUrl = (url: string) => {
    setForm((current) => {
      const nextUrls = [...current.imageUrls];
      const emptyIndex = nextUrls.findIndex((entry) => !entry.trim());

      if (emptyIndex >= 0) {
        nextUrls[emptyIndex] = url;
      } else if (nextUrls.length < maxImageSlots) {
        nextUrls.push(url);
      } else {
        return current;
      }

      return { ...current, imageUrls: nextUrls };
    });
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!file || isUploadingImage) {
      return;
    }

    const filledSlots = form.imageUrls.filter((url) => url.trim()).length;

    if (filledSlots >= maxImageSlots) {
      setUploadError(`Maximum ${maxImageSlots} photos per item.`);
      return;
    }

    if (!acceptedUploadTypes.includes(file.type)) {
      setUploadError('Use JPG, PNG, or WebP image files.');
      return;
    }

    setIsUploadingImage(true);
    setUploadError('Optimizing image before upload...');

    try {
      const optimization = await optimizeImageBeforeUpload(file);

      if (optimization.file.size > maxUploadBytes) {
        setUploadError('Image must be 5 MB or smaller after optimization.');
        return;
      }

      const formData = new FormData();
      formData.append('file', optimization.file);
      formData.append('code', form.code.trim() || editingItem?.code || 'draft');
      formData.append('sourceArea', 'catalog');
      formData.append('originalFilename', optimization.originalFile.name);
      formData.append('originalSize', String(optimization.originalSize));
      formData.append('optimized', String(optimization.optimized));
      if (optimization.width) {
        formData.append('width', String(optimization.width));
      }
      if (optimization.height) {
        formData.append('height', String(optimization.height));
      }

      const response = await fetch('/api/admin/catalog-images', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => ({
        ok: false,
        error: 'Upload failed before the server returned details.',
      }))) as CatalogImageUploadResponse;

      if (!response.ok || !payload.ok) {
        setUploadError(payload.ok ? 'Upload failed.' : payload.error);
        return;
      }

      addUploadedImageUrl(payload.data.url);
      setUploadError(optimization.message);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const saveItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    const price = parsePrice(form.rentalPrice);
    const code = form.code.trim();
    const name = form.name.trim();
    const duplicateCode = catalogItems.some(
      (item) => item.code.toLowerCase() === code.toLowerCase() && item.id !== editingItem?.id,
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

    setIsSaving(true);
    setFormError('');

    const nextItem = createItemFromForm(form, editingItem?.id ?? `catalog-${Date.now()}`);
    const result = await saveCatalogItemAction(nextItem);

    if (result.ok) {
      writeSavedCatalogItems(result.data);
      closeCatalogModal();
    } else {
      setFormError(result.error);
    }

    setIsSaving(false);
  };

  const deleteItem = async (itemId: string) => {
    const result = await deleteCatalogItemAction(itemId);

    if (result.ok) {
      writeSavedCatalogItems(result.data);
      setCatalogError('');
    } else {
      setCatalogError(result.error);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCoverageFilter('all');
    setQualityFilter('all');
  };

  const coverUrl = form.imageUrls.find((url) => url.trim()) ?? '';
  const filledImageCount = form.imageUrls.filter((url) => url.trim()).length;
  const canAddImageSlot = form.imageUrls.length < maxImageSlots;
  const editingProjectedItem = editingItem
    ? projectedItems.find((item) => item.id === editingItem.id) ?? null
    : null;

  const selectLibraryImage = (url: string) => {
    const slotIndex = pickerTarget;

    if (slotIndex === null || slotIndex === 'append') {
      addUploadedImageUrl(url);
      return;
    }

    setImageUrl(slotIndex, url);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Catalog manager
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
            Public collection inventory
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            Manage item identity, pricing, photos, and occasion coverage. Rental availability comes
            from POS transactions.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={isLoadingCatalog}
          className="inline-flex items-center justify-center gap-2 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 sm:self-start lg:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
      </div>

      {(isLoadingCatalog || catalogError) && (
        <div
          className={`border px-4 py-3 text-sm font-semibold ${
            catalogError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600'
          }`}
        >
          {catalogError || 'Loading catalog from database...'}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Catalog items
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {catalogSummary.total}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Customer-facing item records</p>
        </div>
        <div className="border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
            Available
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-900">
            {catalogSummary.available}
          </p>
          <p className="mt-2 text-sm text-emerald-700">Ready to offer now</p>
        </div>
        <div className="border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Rented</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-900">
            {catalogSummary.rented}
          </p>
          <p className="mt-2 text-sm text-amber-700">Needs return-date discipline</p>
        </div>
        <div className="border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-700">
            Maintenance
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-red-900">
            {catalogSummary.maintenance}
          </p>
          <p className="mt-2 text-sm text-red-700">Cleaning or repair queue</p>
        </div>
        <div className="border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Data issues
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {catalogSummary.issues}
          </p>
          <p className="mt-2 text-sm text-neutral-500">Photos, copy, dates, or prices</p>
        </div>
      </div>

      <section className="border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">Landing coverage</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Occasion categories used by the landing page and catalog filters.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {categoryCoverage.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  onClick={() => setCoverageFilter(category.slug)}
                  className={`border px-3 py-2 text-left transition-colors ${
                    coverageFilter === category.slug
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-white'
                  }`}
                >
                  <span className="block text-xs font-semibold">
                    {category.emoji} {category.title}
                  </span>
                  <span
                    className={`mt-1 block text-[11px] ${
                      coverageFilter === category.slug ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    {category.readyCount} ready / {category.count} matching
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[minmax(260px,1fr)_180px_180px_170px_auto] lg:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name, code, model, or color..."
              className="w-full border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-4 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as KebayaItem['status'] | 'all')
            }
            className={selectCls}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={coverageFilter}
            onChange={(event) => setCoverageFilter(event.target.value as CoverageFilter)}
            className={selectCls}
          >
            <option value="all">All Occasions</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={qualityFilter}
            onChange={(event) => setQualityFilter(event.target.value as 'all' | 'issues')}
            className={selectCls}
          >
            <option value="all">All Data</option>
            <option value="issues">Needs Review</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
          >
            Reset
          </button>
        </div>
      </section>

      <section className="overflow-hidden border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">Catalog items</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Showing {filteredItems.length} of {catalogItems.length} items
            </p>
          </div>
          {qualityFilter === 'issues' && (
            <span className="inline-flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              Review mode active
            </span>
          )}
        </div>

        <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Item</th>
                <th className="px-5 py-4 font-semibold">Public Fit</th>
                <th className="px-5 py-4 font-semibold">Price</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Data Quality</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredItems.map((item) => {
                const categories = getItemCategories(item);
                const issues = getItemQualityIssues(item);

                return (
                  <tr key={item.id} className="transition-colors hover:bg-neutral-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <ProductImages item={item} />
                        <div className="min-w-0">
                          <span className="block max-w-[280px] truncate font-semibold text-neutral-950">
                            {item.name}
                          </span>
                          <span className="mt-1 block font-mono text-xs uppercase tracking-wider text-neutral-400">
                            {item.code}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-neutral-900">
                          {item.model} / Size {item.size}
                        </span>
                        <span className="text-xs text-neutral-500">{item.color}</span>
                        <div className="flex max-w-[260px] flex-wrap gap-1.5">
                          {categories.slice(0, 3).map((category) => (
                            <span
                              key={category}
                              className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-600"
                            >
                              {categoryLabel(category)}
                            </span>
                          ))}
                          {categories.length > 3 && (
                            <span className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-500">
                              +{categories.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-neutral-950">
                      {formatPrice(item.rentalPrice)}
                      <span className="ml-1 text-[10px] font-normal text-neutral-400">/3 hari</span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                      {item.status === 'rented' && (
                        <span className="mt-2 block text-xs text-neutral-500">
                          Return: {formatDate(item.rentalEndDate)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {issues.length > 0 ? (
                        <div className="flex max-w-[260px] flex-wrap gap-1.5">
                          {issues.map((issue) => (
                            <span
                              key={issue}
                              className="border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Ready
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                        onClick={() => openEditModal(item.id)}
                          aria-label={`Edit ${item.name}`}
                          className="p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          aria-label={`Delete ${item.name}`}
                          className="p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-neutral-200 xl:hidden">
          {filteredItems.map((item) => {
            const categories = getItemCategories(item);
            const issues = getItemQualityIssues(item);

            return (
              <article key={item.id} className="p-4">
                <div className="flex gap-3">
                  <ProductImages item={item} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-950">
                          {item.name}
                        </h3>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                          {item.code}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="border border-neutral-200 bg-neutral-50 p-2">
                        <span className="block text-neutral-400">Model</span>
                        <span className="mt-0.5 block font-semibold text-neutral-800">
                          {item.model} / {item.size}
                        </span>
                      </div>
                      <div className="border border-neutral-200 bg-neutral-50 p-2">
                        <span className="block text-neutral-400">Price</span>
                        <span className="mt-0.5 block font-semibold text-neutral-800">
                          {formatPrice(item.rentalPrice)} <span className="text-[10px] font-normal text-neutral-500">/3 hari</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {categories.map((category) => (
                        <span
                          key={category}
                          className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-600"
                        >
                          {categoryLabel(category)}
                        </span>
                      ))}
                    </div>

                    {item.status === 'rented' && (
                      <p className="mt-2 text-xs text-neutral-500">
                        Return: {formatDate(item.rentalEndDate)}
                      </p>
                    )}

                    {issues.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {issues.map((issue) => (
                          <span
                            key={issue}
                            className="border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(item.id)}
                    className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    className="inline-flex items-center justify-center gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="border-t border-neutral-200 px-6 py-12 text-center">
            <PackageSearch className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-3 text-sm font-semibold text-neutral-900">No catalog items found.</p>
            <p className="mt-1 text-sm text-neutral-500">
              Try another filter or add a new catalog item.
            </p>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[92vh] xl:flex-row">
            <div className="flex max-h-64 shrink-0 flex-col border-b border-neutral-200 bg-neutral-50 xl:max-h-none xl:w-72 xl:border-b-0 xl:border-r">
              <div className="hidden aspect-[3/4] w-full overflow-hidden bg-neutral-200 xl:block">
                {coverUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={coverUrl} alt="Cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-300">
                    <ImagePlus className="h-10 w-10" />
                    <span className="text-xs">Cover photo</span>
                  </div>
                )}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <SectionLabel>
                  Photos ({filledImageCount}/{maxImageSlots})
                </SectionLabel>
                <div className="mb-3 space-y-2">
                  <label
                    className={`flex w-full items-center justify-center gap-2 border px-3 py-2.5 text-xs font-semibold transition-colors ${
                      isUploadingImage || filledImageCount >= maxImageSlots
                        ? 'cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400'
                        : 'cursor-pointer border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {isUploadingImage ? 'Uploading...' : 'Upload photo'}
                    <input
                      type="file"
                      accept={acceptedUploadInput}
                      disabled={isUploadingImage || filledImageCount >= maxImageSlots}
                      onChange={uploadImage}
                      className="sr-only"
                    />
                  </label>
                  <p className="text-[10px] leading-relaxed text-neutral-400">
                    JPG, PNG, or WebP. Max 5 MB each.
                  </p>
                  {uploadError && (
                    <p className="border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-medium text-red-600">
                      {uploadError}
                    </p>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {form.imageUrls.map((url, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-100">
                        {url.trim() && !imgErrors[index] ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={url}
                            alt={`Foto ${index + 1}`}
                            className="h-full w-full object-cover"
                            onError={() => setImgErrors((prev) => ({ ...prev, [index]: true }))}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-neutral-300">
                            {index + 1}
                          </div>
                        )}
                        {index === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-neutral-900/70 py-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-white">
                            Cover
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <input
                          type="url"
                          value={url}
                          onChange={(event) => setImageUrl(index, event.target.value)}
                          placeholder={`URL foto ${index + 1}`}
                          className="w-full border border-neutral-200 bg-white px-2 py-1.5 text-xs transition-all focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                        />
                        {imgErrors[index] && url.trim() && (
                          <p className="mt-0.5 text-[10px] text-red-500">URL tidak valid</p>
                        )}
                        <button
                          type="button"
                          onClick={() => setPickerTarget(index)}
                          className="mt-1 inline-flex items-center gap-1.5 border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900"
                        >
                          <Images className="h-3 w-3" />
                          Choose
                        </button>
                      </div>

                      <div className="flex shrink-0 flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveImage(index, index - 1)}
                          disabled={index === 0}
                          aria-label="Pindah ke atas"
                          className="flex h-5 w-5 items-center justify-center text-neutral-300 transition-colors hover:text-neutral-700 disabled:opacity-20"
                        >
                          <GripVertical className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImageSlot(index)}
                          aria-label={`Hapus foto ${index + 1}`}
                          className="flex h-5 w-5 items-center justify-center text-neutral-300 transition-colors hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {canAddImageSlot && (
                  <button
                    type="button"
                    onClick={addImageSlot}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-700"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Add URL field
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPickerTarget('append')}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 border border-neutral-200 bg-white py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                >
                  <Images className="h-3.5 w-3.5" />
                  Choose from library
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6 sm:py-5">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {editingItem ? 'Edit catalog item' : 'Add catalog item'}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Keep this aligned with what shoppers see on catalog cards and product details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close catalog item form"
                  className="shrink-0 p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={saveItem} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="space-y-5">
                      <section className="border border-neutral-200 bg-white p-4">
                        <SectionLabel>1. Product identity</SectionLabel>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldLabel label="Name">
                            <input
                              type="text"
                              value={form.name}
                              onChange={(event) => updateFormField('name', event.target.value)}
                              placeholder="Kebaya Brokat Modern Sage Green"
                              className={inputCls}
                            />
                          </FieldLabel>
                          <FieldLabel label="Inventory code">
                            <input
                              type="text"
                              value={form.code}
                              onChange={(event) =>
                                updateFormField('code', event.target.value.toUpperCase())
                              }
                              placeholder="KB-NEW-11"
                              className={inputCls}
                            />
                          </FieldLabel>
                          <FieldLabel label="Model">
                            <select
                              value={form.model}
                              onChange={(event) =>
                                updateFormField('model', event.target.value as KebayaItem['model'])
                              }
                              className={selectCls}
                            >
                              {modelOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </FieldLabel>
                          <FieldLabel label="Size label">
                            <select
                              value={form.size}
                              onChange={(event) =>
                                updateFormField('size', event.target.value as KebayaItem['size'])
                              }
                              className={selectCls}
                            >
                              {sizeOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </FieldLabel>
                          <div className="md:col-span-2">
                            <FieldLabel label="Color">
                              <input
                                type="text"
                                value={form.color}
                                onChange={(event) => updateFormField('color', event.target.value)}
                                placeholder="Sage Green"
                                className={inputCls}
                              />
                            </FieldLabel>
                          </div>
                          <div className="md:col-span-2">
                            <span className="mb-1 block text-sm font-medium text-neutral-700">
                              Landing categories
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {categoryOptions.map((category) => {
                                const checked = form.categories.includes(category.value);

                                return (
                                  <label
                                    key={category.value}
                                    className={`flex cursor-pointer select-none items-center gap-2 border px-3 py-2 text-sm transition-colors ${
                                      checked
                                        ? 'border-neutral-900 bg-neutral-900 text-white'
                                        : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      checked={checked}
                                      onChange={() => {
                                        const next = checked
                                          ? form.categories.filter((item) => item !== category.value)
                                          : [...form.categories, category.value];
                                        updateFormField('categories', next);
                                      }}
                                    />
                                    <span>{category.emoji}</span>
                                    <span className="font-medium">{category.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <p className="mt-2 text-xs text-neutral-400">
                              Leave empty to use automatic matching from model, color, and description.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="border border-neutral-200 bg-white p-4">
                        <SectionLabel>2. Pricing</SectionLabel>
                        <p className="mb-4 text-sm text-neutral-500">
                          Admin controls the rental price here.
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldLabel label="Rental price (3-day base)">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={form.rentalPrice}
                                onChange={(event) =>
                                  updateFormField('rentalPrice', event.target.value)
                                }
                                placeholder="250000"
                                className={`${inputCls} pl-9`}
                              />
                            </div>
                            <p className="mt-1 text-[10px] text-neutral-400">
                              Tarif dasar untuk durasi sewa standar 3 hari.
                            </p>
                          </FieldLabel>
                          <FieldLabel label="Kategori sewa">
                            <input
                              list="rental-category-options"
                              type="text"
                              value={form.measurements.rentalCategory}
                              onChange={(event) =>
                                updateMeasurementField('rentalCategory', event.target.value)
                              }
                              placeholder="Offline Studio"
                              className={inputCls}
                            />
                          </FieldLabel>
                        </div>
                        <datalist id="rental-category-options">
                          {rentalCategoryOptions.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      </section>

                      <section className="border border-neutral-200 bg-white p-4">
                        <div className="flex flex-col gap-1 border-b border-neutral-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <SectionLabel>3. Detail ukuran</SectionLabel>
                            <p className="text-sm text-neutral-500">
                              These values appear inside the public product detail modal.
                            </p>
                          </div>
                          <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                            use cm text, e.g. 94 cm
                          </span>
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          <FieldLabel label="Lingkar dada">
                            <input
                              type="text"
                              value={form.measurements.bust}
                              onChange={(event) =>
                                updateMeasurementField('bust', event.target.value)
                              }
                              placeholder="94 cm"
                              className={inputCls}
                            />
                          </FieldLabel>
                          <FieldLabel label="Lingkar pinggang">
                            <input
                              type="text"
                              value={form.measurements.waist}
                              onChange={(event) =>
                                updateMeasurementField('waist', event.target.value)
                              }
                              placeholder="76 cm"
                              className={inputCls}
                            />
                          </FieldLabel>
                          <FieldLabel label="Panjang baju">
                            <input
                              type="text"
                              value={form.measurements.length}
                              onChange={(event) =>
                                updateMeasurementField('length', event.target.value)
                              }
                              placeholder="62 cm"
                              className={inputCls}
                            />
                          </FieldLabel>
                          <FieldLabel label="Panjang lengan">
                            <input
                              type="text"
                              value={form.measurements.sleeveLength}
                              onChange={(event) =>
                                updateMeasurementField('sleeveLength', event.target.value)
                              }
                              placeholder="54 cm"
                              className={inputCls}
                            />
                          </FieldLabel>
                          <FieldLabel label="Kerung ketiak">
                            <input
                              type="text"
                              value={form.measurements.armhole}
                              onChange={(event) =>
                                updateMeasurementField('armhole', event.target.value)
                              }
                              placeholder="44 cm"
                              className={inputCls}
                            />
                          </FieldLabel>
                          <div className="sm:col-span-2 lg:col-span-3">
                            <FieldLabel label="Detail lainnya">
                              <textarea
                                rows={3}
                                value={form.measurements.otherDetails}
                                onChange={(event) =>
                                  updateMeasurementField('otherDetails', event.target.value)
                                }
                                placeholder="Contoh: bahan stretch, bagian pinggang bisa disesuaikan, cocok untuk tinggi 155-165 cm."
                                className={`${inputCls} resize-none`}
                              />
                            </FieldLabel>
                          </div>
                        </div>
                      </section>

                      <section className="border border-neutral-200 bg-white p-4">
                        <SectionLabel>4. Product story</SectionLabel>
                        <textarea
                          rows={4}
                          value={form.description}
                          onChange={(event) => updateFormField('description', event.target.value)}
                          placeholder="Describe material, detailing, fit, and best occasion..."
                          className={`${inputCls} resize-none`}
                        />
                      </section>
                    </div>

                    <aside className="hidden self-start border border-neutral-200 bg-neutral-50 p-4 xl:block">
                      <SectionLabel>Public detail preview</SectionLabel>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-neutral-950">
                            {form.name || 'Product name'}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                            {form.code || 'CODE'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={editingProjectedItem?.status ?? 'available'} />
                          <span className="border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                            Size {form.size}
                          </span>
                        </div>
                        <div className="space-y-2 border-y border-neutral-200 py-3 text-xs">
                          {[
                            ['Lingkar Dada', form.measurements.bust || '-'],
                            ['Lingkar Pinggang', form.measurements.waist || '-'],
                            ['Panjang Baju', form.measurements.length || '-'],
                            ['Panjang Lengan', form.measurements.sleeveLength || '-'],
                            ['Kerung Ketiak', form.measurements.armhole || '-'],
                            ['Kategori Sewa', form.measurements.rentalCategory || '-'],
                          ].map(([label, value]) => (
                            <div key={label} className="flex justify-between gap-3">
                              <span className="text-neutral-500">{label}</span>
                              <span className="text-right font-semibold text-neutral-900">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs leading-relaxed text-neutral-500">
                          {form.measurements.otherDetails ||
                            'Detail lainnya will appear as an extra note on the public modal.'}
                        </p>
                      </div>
                    </aside>
                  </div>
                </div>

                <div className="border-t border-neutral-200 px-4 py-4 sm:px-6">
                  {formError && (
                    <p className="mb-3 text-sm font-medium text-red-600">{formError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSaving}
                      className="border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? 'Saving to database...' : editingItem ? 'Save item' : 'Add item'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <MediaLibraryPicker
        open={pickerTarget !== null}
        title="Choose product photo"
        onClose={() => setPickerTarget(null)}
        onSelect={selectLibraryImage}
      />
    </div>
  );
}
