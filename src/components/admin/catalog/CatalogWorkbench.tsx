'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  GripVertical,
  ImagePlus,
  Images,
  PackageSearch,
  Plus,
  Search,
  Tag,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';

import MediaLibraryPicker from '@/components/admin/MediaLibraryPicker';
import { useCatalogData } from '@/components/admin/catalog/CatalogDataProvider';
import {
  getCatalogBookingPressureSummary,
  getItemCategories,
  getItemQualityIssues,
} from '@/components/admin/catalog/catalog-shared';
import {
  kebayaModelOptions,
  kebayaRentalCategoryOptions,
  kebayaRentalIncludeOptions,
  kebayaSizeOptions,
  KebayaCategory,
  KebayaItem,
  KebayaMeasurements,
} from '@/data/mockData';
import { optimizeImageBeforeUpload } from '@/lib/client-image-optimizer';
import {
  deleteCatalogItemAction,
  saveCatalogItemAction,
} from '@/lib/farsha-actions';
import type { BookingCatalogPressureMap } from '@/lib/booking-db';
import { useSavedCatalogItems, writeSavedCatalogItems } from '@/lib/catalog-storage';
import { getOccasionLabel, occasionCategories } from '@/lib/landing-categories';
import { projectCatalogItems } from '@/lib/pos-ledger';
import { useSavedPosLedger } from '@/lib/pos-ledger-client';

type CatalogFormState = {
  name: string;
  code: string;
  consignorId: string;
  rentalPrice: string;
  compareAtRentalPrice: string;
  model: KebayaItem['model'];
  size: KebayaItem['size'];
  color: string;
  canResize: boolean;
  hijabFriendly: boolean;
  cost: string;
  published: boolean;
  rentalIncludes: NonNullable<KebayaItem['rentalIncludes']>;
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

type MediaUploadResponse =
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
  consignorId: '',
  rentalPrice: '',
  compareAtRentalPrice: '',
  model: 'Kebaya Modern',
  size: 'S-M',
  color: '',
  canResize: false,
  hijabFriendly: true,
  cost: '',
  published: true,
  rentalIncludes: ['Skirt', 'Kebaya', 'Hijab', 'Manset', 'Bustier'],
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
    rentalCategory: 'Makassar Only',
  },
};

const categoryOptions = occasionCategories;

const statusOptions: { value: KebayaItem['status'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'AVAILABLE' },
  { value: 'rented', label: 'RENTED' },
  { value: 'maintenance', label: 'DICUCI' },
];

const modelOptions = kebayaModelOptions;
const sizeOptions = kebayaSizeOptions;
const rentalCategoryOptions = kebayaRentalCategoryOptions;
const rentalIncludeOptions = kebayaRentalIncludeOptions;
const modelCodePrefixes: Record<KebayaItem['model'], string> = {
  'Kebaya Modern': 'KB',
  'Kebaya Kutubaru': 'KK',
  'Kebaya Janggan': 'KJ',
  'Dress Premium': 'DP',
  'Bajubodo Modern': 'BM',
  'Kurung Melayu': 'KM',
};

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

function parseOptionalPrice(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return parsePrice(trimmedValue);
}

function getModelPrefix(model: KebayaItem['model']) {
  return modelCodePrefixes[model];
}

function formatInventoryDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  return `${day}${month}${year}`;
}

function formatCatalogSequence(value: number) {
  return String(Math.max(1, value)).padStart(3, '0');
}

function buildInventoryCode(model: KebayaItem['model'], date: Date, catalogSequence: number) {
  return `FC${formatCatalogSequence(catalogSequence)}${getModelPrefix(model)}${formatInventoryDate(date)}`;
}

function createEmptyForm(date = new Date(), catalogSequence = 1): CatalogFormState {
  return {
    ...emptyForm,
    code: buildInventoryCode(emptyForm.model, date, catalogSequence),
  };
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
  return getOccasionLabel(value);
}

function itemToForm(item: KebayaItem): CatalogFormState {
  return {
    name: item.name,
    code: item.code,
    consignorId: item.consignorId ?? '',
    rentalPrice: String(item.rentalPrice),
    compareAtRentalPrice: item.compareAtRentalPrice ? String(item.compareAtRentalPrice) : '',
    model: item.model,
    size: item.size,
    color: item.color,
    canResize: item.canResize ?? false,
    hijabFriendly: item.hijabFriendly ?? true,
    cost: item.cost != null ? String(item.cost) : '',
    published: item.published !== false,
    rentalIncludes:
      item.rentalIncludes && item.rentalIncludes.length > 0
        ? item.rentalIncludes
        : ['Skirt', 'Kebaya', 'Hijab', 'Manset', 'Bustier'],
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
      rentalCategory: item.measurements?.rentalCategory ?? 'Makassar Only',
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
    consignorId: form.consignorId.trim() || null,
    name: form.name.trim(),
    color: form.color.trim() || 'Neutral',
    canResize: form.canResize,
    hijabFriendly: form.hijabFriendly,
    cost: parseOptionalPrice(form.cost),
    published: form.published,
    rentalIncludes: form.rentalIncludes,
    size: form.size,
    model: form.model,
    rentalPrice: parsePrice(form.rentalPrice),
    compareAtRentalPrice: parseOptionalPrice(form.compareAtRentalPrice),
    status: 'available',
    rentalEndDate: null,
    imageUrls: validUrls.length > 0 ? validUrls : [defaultImageUrl],
    description: form.description.trim(),
    categories: form.categories.length > 0 ? form.categories : undefined,
    measurements: Object.values(measurements).some(Boolean) ? measurements : undefined,
  };
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

function BookingVisibility({
  item,
  pressure,
  compact = false,
}: {
  item: KebayaItem;
  pressure: BookingCatalogPressureMap;
  compact?: boolean;
}) {
  const summary = getCatalogBookingPressureSummary(pressure, item.id);

  if (!summary.hasBookingPressure) {
    return compact ? (
      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        No upcoming booking
      </span>
    ) : (
      <div className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
        No upcoming booking
      </div>
    );
  }

  const pressureLabel =
    summary.confirmedCount > 1
      ? 'Multiple future bookings'
      : summary.confirmedCount > 0
        ? 'Booked soon'
        : summary.conflictingRequests.length > 0
          ? 'Request conflict'
          : summary.paymentSubmittedCount > 0
            ? 'Payment proof pending'
            : 'Booking request';
  return (
    <div className={`space-y-2 ${compact ? 'text-xs' : ''}`}>
      <div className="border border-amber-200 bg-amber-50 p-2 text-amber-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider">{pressureLabel}</span>
          <span className="text-[10px] font-semibold">
            {summary.confirmedCount} confirmed / {summary.requestedCount} request /{' '}
            {summary.paymentSubmittedCount} paid proof
          </span>
        </div>
        {summary.nextPickupDate && (
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-amber-900">
            <span>Pickup: {formatDate(summary.nextPickupDate)}</span>
            <span>Return: {formatDate(summary.nextReturnDate)}</span>
            <span className="col-span-2">
              Next available: {formatDate(summary.nextAvailableDate)}
            </span>
          </div>
        )}
        {summary.conflictingRequests.length > 0 && (
          <p className="mt-1 text-[11px] font-medium">
            {summary.conflictingRequests.length} requested booking has a preview conflict.
          </p>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900';
const selectCls =
  'w-full border border-neutral-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900';

type CatalogTab = 'details' | 'pricing' | 'photos';

const catalogTabs: { id: CatalogTab; icon: typeof Images; label: string; hint: string }[] = [
  { id: 'photos', icon: Images, label: 'Photos', hint: 'Cover & gallery' },
  { id: 'details', icon: Tag, label: 'Details', hint: 'Identity, categories & story' },
  { id: 'pricing', icon: Banknote, label: 'Pricing & Fit', hint: 'Rates & measurements' },
];

type CatalogWorkbenchMode = 'published' | 'draft';

export default function CatalogWorkbench({
  mode = 'published',
  consignorOptions = [],
}: {
  mode?: CatalogWorkbenchMode;
  consignorOptions?: Array<{ id: string; name: string; email: string }>;
}) {
  const isDraftMode = mode === 'draft';
  const {
    bookingPressure,
    isLoadingCatalog,
    catalogError,
    setCatalogError,
    refreshBookingPressure,
  } = useCatalogData();
  const catalogItems = useSavedCatalogItems();
  const ledger = useSavedPosLedger();
  const projectedItems = useMemo(() => projectCatalogItems(catalogItems, ledger), [catalogItems, ledger]);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<KebayaItem['status'] | 'all'>('all');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'issues'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CatalogTab>('details');
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<KebayaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KebayaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<CatalogFormState>(emptyForm);
  const [inventoryCodeDate, setInventoryCodeDate] = useState(() => new Date());
  const [formError, setFormError] = useState('');
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pickerTarget, setPickerTarget] = useState<number | 'append' | null>(null);
  const nextCatalogSequence = catalogItems.length + 1;

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return projectedItems.filter((item) => {
      // Products = published catalog; Upcoming = unpublished drafts.
      const matchesMode = isDraftMode ? item.published === false : item.published !== false;
      if (!matchesMode) {
        return false;
      }

      const itemCategories = getItemCategories(item);
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.color.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query);
      const matchesStatus =
        isDraftMode || statusFilter === 'all' || item.status === statusFilter;
      const matchesCoverage = coverageFilter === 'all' || itemCategories.includes(coverageFilter);
      const matchesQuality =
        qualityFilter === 'all' || getItemQualityIssues(item).length > 0;

      return matchesQuery && matchesStatus && matchesCoverage && matchesQuality;
    });
  }, [projectedItems, coverageFilter, isDraftMode, qualityFilter, searchQuery, statusFilter]);

  const totalInMode = useMemo(
    () =>
      projectedItems.filter((item) =>
        isDraftMode ? item.published === false : item.published !== false,
      ).length,
    [projectedItems, isDraftMode],
  );

  const openCreateModal = () => {
    const codeDate = new Date();
    setInventoryCodeDate(codeDate);
    setEditingItem(null);
    // New items in the Upcoming section start as drafts.
    setForm({ ...createEmptyForm(codeDate, nextCatalogSequence), published: !isDraftMode });
    setActiveTab('photos');
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
    setActiveTab('photos');
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
    setForm(createEmptyForm(inventoryCodeDate, nextCatalogSequence));
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
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (!editingItem && key === 'model') {
        return {
          ...next,
          code: buildInventoryCode(next.model, inventoryCodeDate, nextCatalogSequence),
        };
      }

      return next;
    });
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
      formData.append('filenameHint', form.code.trim() || editingItem?.code || 'draft');
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

      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json().catch(() => ({
        ok: false,
        error: 'Upload failed before the server returned details.',
      }))) as MediaUploadResponse;

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
    const compareAtPrice = parseOptionalPrice(form.compareAtRentalPrice);
    const code = form.code.trim();
    const name = form.name.trim();
    const duplicateCode = catalogItems.some(
      (item) => item.code.toLowerCase() === code.toLowerCase() && item.id !== editingItem?.id,
    );

    if (!name || !code || !form.color.trim()) {
      setActiveTab('details');
      setFormError('Name, code, and color are required.');
      return;
    }

    if (form.rentalIncludes.length === 0) {
      setActiveTab('details');
      setFormError('Choose at least one item included in the rent.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setActiveTab('pricing');
      setFormError('Rental price must be greater than 0.');
      return;
    }

    if (
      compareAtPrice !== null &&
      (!Number.isFinite(compareAtPrice) || compareAtPrice <= price)
    ) {
      setActiveTab('pricing');
      setFormError('Before price must be higher than the rental price, or left empty.');
      return;
    }

    if (duplicateCode) {
      setActiveTab('details');
      setFormError('Code already exists. Use a unique inventory code.');
      return;
    }

    setIsSaving(true);
    setFormError('');

    const nextItem = createItemFromForm(form, editingItem?.id ?? `catalog-${Date.now()}`);
    const result = await saveCatalogItemAction(nextItem);

    if (result.ok) {
      writeSavedCatalogItems(result.data);
      await refreshBookingPressure();
      closeCatalogModal();
    } else {
      setFormError(result.error);
    }

    setIsSaving(false);
  };

  const requestDeleteItem = (item: KebayaItem) => {
    setCatalogError('');
    setDeleteTarget(item);
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) {
      return;
    }

    setDeleteTarget(null);
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget || isDeleting) {
      return;
    }

    setIsDeleting(true);
    const result = await deleteCatalogItemAction(deleteTarget.id);

    if (result.ok) {
      writeSavedCatalogItems(result.data);
      await refreshBookingPressure();
      setCatalogError('');
      setDeleteTarget(null);
    } else {
      setCatalogError(result.error);
    }

    setIsDeleting(false);
  };

  const publishItem = async (itemId: string) => {
    const baseItem = catalogItems.find((entry) => entry.id === itemId);
    if (!baseItem || publishingId) {
      return;
    }

    setPublishingId(itemId);
    setCatalogError('');
    const result = await saveCatalogItemAction({ ...baseItem, published: true });

    if (result.ok) {
      writeSavedCatalogItems(result.data);
      await refreshBookingPressure();
    } else {
      setCatalogError(result.error);
    }

    setPublishingId(null);
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
  const activeTabIndex = catalogTabs.findIndex((tab) => tab.id === activeTab);
  // Below md the modal shows every section at once; md+ switches to tabs.
  const tabPanelClass = (tab: CatalogTab) => (activeTab === tab ? '' : 'md:hidden');
  const previewRentalPrice = parsePrice(form.rentalPrice);
  const previewCompareAtPrice = parseOptionalPrice(form.compareAtRentalPrice);
  const editingProjectedItem = editingItem
    ? projectedItems.find((item) => item.id === editingItem.id) ?? null
    : null;
  const editingBookingSummary = editingProjectedItem
    ? getCatalogBookingPressureSummary(bookingPressure, editingProjectedItem.id)
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
            {isDraftMode ? 'Upcoming' : 'Products'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 sm:text-base">
            {isDraftMode
              ? 'Draft items hidden from the public storefront. Finish the details, then publish to move them into Products.'
              : 'Manage item identity, pricing, photos, and occasion coverage. Rental availability comes from POS transactions.'}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={isLoadingCatalog}
          className="inline-flex items-center justify-center gap-2 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 sm:self-start lg:self-auto"
        >
          <Plus className="h-4 w-4" />
          {isDraftMode ? 'Add draft' : 'Add item'}
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

      <section className="border border-neutral-200 bg-white shadow-sm">
        <div
          className={`grid gap-3 p-4 sm:p-5 lg:items-center ${
            isDraftMode
              ? 'lg:grid-cols-[minmax(260px,1fr)_180px_170px_auto]'
              : 'lg:grid-cols-[minmax(260px,1fr)_180px_180px_170px_auto]'
          }`}
        >
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

          {!isDraftMode && (
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
          )}

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
            <h2 className="text-base font-semibold text-neutral-950">
              {isDraftMode ? 'Draft items' : 'Catalog items'}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Showing {filteredItems.length} of {totalInMode} items
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
                {!isDraftMode && <th className="px-5 py-4 font-semibold">Status</th>}
                <th className="px-5 py-4 font-semibold">Data Quality</th>
                {!isDraftMode && (
                  <th className="px-5 py-4 font-semibold">Booking Preview</th>
                )}
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
                          {item.model} / Fit {item.size}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {[item.color, item.hijabFriendly ? 'Hijab Friendly' : null]
                            .filter(Boolean)
                            .join(' / ')}
                        </span>
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
                    {!isDraftMode && (
                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                        {item.status === 'rented' && (
                          <span className="mt-2 block text-xs text-neutral-500">
                            Return: {formatDate(item.rentalEndDate)}
                          </span>
                        )}
                      </td>
                    )}
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
                    {!isDraftMode && (
                      <td className="px-5 py-4">
                        <div className="max-w-[260px]">
                          <BookingVisibility item={item} pressure={bookingPressure} />
                        </div>
                      </td>
                    )}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isDraftMode && (
                          <button
                            type="button"
                            onClick={() => publishItem(item.id)}
                            disabled={publishingId === item.id}
                            className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {publishingId === item.id ? 'Publishing...' : 'Publish'}
                          </button>
                        )}
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
                          onClick={() => requestDeleteItem(item)}
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
                      {!isDraftMode && <StatusBadge status={item.status} />}
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

                    {!isDraftMode && item.status === 'rented' && (
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

                    {!isDraftMode && (
                      <div className="mt-3">
                        <BookingVisibility item={item} pressure={bookingPressure} compact />
                      </div>
                    )}
                  </div>
                </div>

                {isDraftMode && (
                  <button
                    type="button"
                    onClick={() => publishItem(item.id)}
                    disabled={publishingId === item.id}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {publishingId === item.id ? 'Publishing...' : 'Publish to Products'}
                  </button>
                )}

                <div className="mt-2 grid grid-cols-2 gap-2">
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
                    onClick={() => requestDeleteItem(item)}
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
            <p className="mt-3 text-sm font-semibold text-neutral-900">
              {isDraftMode ? 'No draft items.' : 'No catalog items found.'}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {isDraftMode
                ? 'Add a draft here, or unpublish an item from Products to park it as upcoming.'
                : 'Try another filter or add a new catalog item.'}
            </p>
          </div>
        )}
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-red-100 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-500">
                  Confirm delete
                </p>
                <h2 className="mt-1 text-lg font-semibold text-neutral-950">
                  Delete {deleteTarget.name}?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  This removes the kebaya item from the catalog. Use this confirmation to avoid
                  accidental trash-button presses.
                </p>
                <p className="mt-3 font-mono text-xs font-semibold text-neutral-500">
                  {deleteTarget.code} / {deleteTarget.color} / Fit {deleteTarget.size}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                disabled={isDeleting}
                className="bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[92vh]">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="hidden h-14 w-11 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-100 sm:block">
                    {coverUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={coverUrl}
                        alt="Cover preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-300">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      {editingItem
                        ? `Editing / ${editingItem.code}`
                        : isDraftMode
                          ? 'New draft'
                          : 'New item'}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-neutral-900">
                      {editingItem ? 'Edit catalog item' : 'Add catalog item'}
                    </h2>
                  </div>
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

              <div className="hidden shrink-0 items-stretch gap-1 overflow-x-auto border-b border-neutral-200 bg-neutral-50 px-2 sm:px-4 md:flex">
                {catalogTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const filledCount = tab.id === 'photos' ? filledImageCount : 0;
                  const TabIcon = tab.icon;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex shrink-0 items-center gap-2.5 border-b-2 px-2 py-3 text-left transition-colors sm:px-3 ${
                        isActive
                          ? 'border-neutral-900'
                          : 'border-transparent hover:border-neutral-300'
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-neutral-900 text-white'
                            : 'bg-neutral-200 text-neutral-500'
                        }`}
                      >
                        <TabIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex flex-col leading-tight">
                        <span
                          className={`text-sm font-semibold ${
                            isActive ? 'text-neutral-900' : 'text-neutral-500'
                          }`}
                        >
                          {tab.label}
                          {tab.id === 'photos' && filledCount > 0 && (
                            <span
                              className={`ml-1.5 font-mono text-[10px] ${
                                isActive ? 'text-neutral-500' : 'text-neutral-400'
                              }`}
                            >
                              {filledCount}
                            </span>
                          )}
                        </span>
                        <span className="hidden text-[10px] font-medium text-neutral-400 lg:block">
                          {tab.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={saveItem} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  {!isDraftMode && editingProjectedItem && editingBookingSummary?.hasBookingPressure && (
                    <div className="mb-5 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        <div>
                          <p className="font-semibold">Upcoming booking preview on this item.</p>
                          <p className="mt-1 text-xs leading-relaxed">
                            This catalog edit can change what a booked customer expects. Booking actions stay in POS;
                            use the POS link from the item list to review dates and DP state.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={`flex flex-col gap-6 ${activeTab === 'photos' ? '' : 'xl:flex-row'}`}>
                    <div className="flex min-w-0 flex-1 flex-col gap-5">
                      <section className={`border border-neutral-200 bg-white p-4 ${tabPanelClass('details')}`}>
                        <SectionLabel>Product identity</SectionLabel>
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
                              readOnly
                              placeholder={buildInventoryCode(form.model, new Date(), nextCatalogSequence)}
                              className={`${inputCls} bg-neutral-100 font-mono text-neutral-700`}
                            />
                            <p className="mt-1 text-[10px] text-neutral-400">
                              {editingItem
                                ? 'Saved code is kept when editing an existing item.'
                                : `Generated from FC, next catalog number ${formatCatalogSequence(
                                    nextCatalogSequence,
                                  )}, model, and today.`}
                            </p>
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
                          <FieldLabel label="Consignor">
                            <select
                              value={form.consignorId}
                              onChange={(event) => updateFormField('consignorId', event.target.value)}
                              className={selectCls}
                            >
                              <option value="">Studio owned / buyout</option>
                              {consignorOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name} · {option.email}
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
                          <div className="flex items-end">
                            <label
                              className={`flex min-h-[46px] w-full cursor-pointer select-none items-center justify-between gap-3 border px-3 py-2 text-sm transition-colors ${
                                form.canResize
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400'
                              }`}
                            >
                              <span>
                                <span className="block font-medium">Bisa Resize</span>
                                <span
                                  className={`block text-[10px] ${
                                    form.canResize ? 'text-neutral-300' : 'text-neutral-400'
                                  }`}
                                >
                                  Tampil di detail produk
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={form.canResize}
                                onChange={(event) =>
                                  updateFormField('canResize', event.target.checked)
                                }
                              />
                              <span
                                aria-hidden="true"
                                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                                  form.canResize ? 'bg-white' : 'bg-neutral-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
                                    form.canResize
                                      ? 'translate-x-4 bg-neutral-900'
                                      : 'translate-x-0.5 bg-white'
                                  }`}
                                />
                              </span>
                            </label>
                          </div>
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
                              Hijab friendly
                            </span>
                            <label
                              className={`flex min-h-[46px] w-full cursor-pointer select-none items-center justify-between gap-3 border px-3 py-2 text-sm transition-colors ${
                                form.hijabFriendly
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400'
                              }`}
                            >
                              <span>
                                <span className="block font-medium">Hijab Friendly</span>
                                <span
                                  className={`block text-[10px] ${
                                    form.hijabFriendly ? 'text-neutral-300' : 'text-neutral-400'
                                  }`}
                                >
                                  Tampil sebagai badge di katalog publik
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={form.hijabFriendly}
                                onChange={(event) =>
                                  updateFormField('hijabFriendly', event.target.checked)
                                }
                              />
                              <span
                                aria-hidden="true"
                                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                                  form.hijabFriendly ? 'bg-white' : 'bg-neutral-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
                                    form.hijabFriendly
                                      ? 'translate-x-4 bg-neutral-900'
                                      : 'translate-x-0.5 bg-white'
                                  }`}
                                />
                              </span>
                            </label>
                          </div>
                          <div className="md:col-span-2">
                            <span className="mb-1 block text-sm font-medium text-neutral-700">
                              Included in rent
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {rentalIncludeOptions.map((item) => {
                                const checked = form.rentalIncludes.includes(item);

                                return (
                                  <label
                                    key={item}
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
                                          ? form.rentalIncludes.filter((entry) => entry !== item)
                                          : [...form.rentalIncludes, item];
                                        updateFormField('rentalIncludes', next);
                                      }}
                                    />
                                    <span className="font-medium">{item}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <p className="mt-2 text-xs text-neutral-400">
                              Show what the customer receives with this specific rental item.
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <span className="mb-1 block text-sm font-medium text-neutral-700">
                              Occasion categories
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
                          <div className="md:col-span-2">
                            <span className="mb-1 block text-sm font-medium text-neutral-700">
                              Visibility
                            </span>
                            <label
                              className={`flex min-h-[46px] w-full cursor-pointer select-none items-center justify-between gap-3 border px-3 py-2 text-sm transition-colors ${
                                form.published
                                  ? 'border-neutral-900 bg-neutral-900 text-white'
                                  : 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400'
                              }`}
                            >
                              <span>
                                <span className="block font-medium">
                                  {form.published ? 'Published' : 'Draft (upcoming)'}
                                </span>
                                <span
                                  className={`block text-[10px] ${
                                    form.published ? 'text-neutral-300' : 'text-amber-700'
                                  }`}
                                >
                                  {form.published
                                    ? 'Visible on the public storefront'
                                    : 'Hidden from customers until published'}
                                </span>
                              </span>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={form.published}
                                onChange={(event) =>
                                  updateFormField('published', event.target.checked)
                                }
                              />
                              <span
                                aria-hidden="true"
                                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                                  form.published ? 'bg-white' : 'bg-amber-300'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${
                                    form.published
                                      ? 'translate-x-4 bg-neutral-900'
                                      : 'translate-x-0.5 bg-white'
                                  }`}
                                />
                              </span>
                            </label>
                          </div>
                        </div>
                      </section>

                      <section className={`border border-neutral-200 bg-white p-4 ${tabPanelClass('pricing')}`}>
                        <SectionLabel>Pricing</SectionLabel>
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
                          <FieldLabel label="Before price (crossed-out)">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={form.compareAtRentalPrice}
                                onChange={(event) =>
                                  updateFormField('compareAtRentalPrice', event.target.value)
                                }
                                placeholder="650000"
                                className={`${inputCls} pl-9`}
                              />
                            </div>
                            <p className="mt-1 text-[10px] text-neutral-400">
                              Optional. Must be higher than the rental price to appear publicly.
                            </p>
                          </FieldLabel>
                          <FieldLabel label="Modal / cost per item (internal)">
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={form.cost}
                                onChange={(event) => updateFormField('cost', event.target.value)}
                                placeholder="1500000"
                                className={`${inputCls} pl-9`}
                              />
                            </div>
                            <p className="mt-1 text-[10px] text-neutral-400">
                              Internal only — never shown to customers. Used for BEP / earned-back
                              tracking in the Report.
                            </p>
                          </FieldLabel>
                          <FieldLabel label="Kategori sewa">
                            <select
                              value={form.measurements.rentalCategory}
                              onChange={(event) =>
                                updateMeasurementField('rentalCategory', event.target.value)
                              }
                              className={selectCls}
                            >
                              {rentalCategoryOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </FieldLabel>
                        </div>
                      </section>

                      <section className={`border border-neutral-200 bg-white p-4 ${tabPanelClass('pricing')}`}>
                        <div className="flex flex-col gap-1 border-b border-neutral-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <SectionLabel>Detail ukuran</SectionLabel>
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

                      <section className={`border border-neutral-200 bg-white p-4 ${tabPanelClass('details')}`}>
                        <SectionLabel>Product story</SectionLabel>
                        <textarea
                          rows={4}
                          value={form.description}
                          onChange={(event) => updateFormField('description', event.target.value)}
                          placeholder="Describe material, detailing, fit, and best occasion..."
                          className={`${inputCls} resize-none`}
                        />
                      </section>

                      <section className={`border border-neutral-200 bg-white p-4 ${tabPanelClass('photos')}`}>
                          <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <SectionLabel>
                                Photos ({filledImageCount}/{maxImageSlots})
                              </SectionLabel>
                              <p className="text-sm text-neutral-500">
                                First photo is the cover. Reorder to control the public gallery.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <label
                                className={`inline-flex items-center justify-center gap-2 border px-3 py-2 text-xs font-semibold transition-colors ${
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
                              <button
                                type="button"
                                onClick={() => setPickerTarget('append')}
                                className="inline-flex items-center justify-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                              >
                                <Images className="h-4 w-4" />
                                From library
                              </button>
                            </div>
                          </div>

                          <p className="mt-3 text-[10px] leading-relaxed text-neutral-400">
                            JPG, PNG, or WebP. Max 5 MB each.
                          </p>
                          {uploadError && (
                            <p className="mt-2 border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-medium text-red-600">
                              {uploadError}
                            </p>
                          )}

                          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {form.imageUrls.map((url, index) => (
                              <div key={index} className="group flex flex-col gap-1.5">
                                <div className="relative aspect-[3/4] overflow-hidden border border-neutral-200 bg-neutral-100">
                                  {url.trim() && !imgErrors[index] ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={url}
                                      alt={`Foto ${index + 1}`}
                                      className="h-full w-full object-cover"
                                      onError={() =>
                                        setImgErrors((prev) => ({ ...prev, [index]: true }))
                                      }
                                    />
                                  ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-neutral-300">
                                      <ImagePlus className="h-5 w-5" />
                                      <span className="font-mono text-[10px] font-bold">
                                        {index + 1}
                                      </span>
                                    </div>
                                  )}

                                  {index === 0 ? (
                                    <span className="absolute left-0 top-0 bg-neutral-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                                      Cover
                                    </span>
                                  ) : (
                                    <span className="absolute left-0 top-0 bg-neutral-900/70 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
                                      {index + 1}
                                    </span>
                                  )}

                                  <div className="absolute right-1 top-1 flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => moveImage(index, index - 1)}
                                      disabled={index === 0}
                                      aria-label="Pindahkan lebih awal"
                                      className="flex h-6 w-6 items-center justify-center bg-white/90 text-neutral-600 shadow-sm transition-colors hover:bg-white hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-30"
                                    >
                                      <GripVertical className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeImageSlot(index)}
                                      aria-label={`Hapus foto ${index + 1}`}
                                      className="flex h-6 w-6 items-center justify-center bg-white/90 text-neutral-600 shadow-sm transition-colors hover:bg-red-50 hover:text-red-600"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <input
                                  type="url"
                                  value={url}
                                  onChange={(event) => setImageUrl(index, event.target.value)}
                                  placeholder={`URL foto ${index + 1}`}
                                  className="w-full border border-neutral-200 bg-white px-2 py-1.5 text-xs transition-all focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                                />
                                {imgErrors[index] && url.trim() && (
                                  <p className="text-[10px] text-red-500">URL tidak valid</p>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setPickerTarget(index)}
                                  className="inline-flex items-center justify-center gap-1.5 border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-colors hover:bg-white hover:text-neutral-900"
                                >
                                  <Images className="h-3 w-3" />
                                  Choose
                                </button>
                              </div>
                            ))}

                            {canAddImageSlot && (
                              <button
                                type="button"
                                onClick={addImageSlot}
                                className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 border border-dashed border-neutral-300 text-xs font-medium text-neutral-500 transition-colors hover:border-neutral-500 hover:text-neutral-700"
                              >
                                <ImagePlus className="h-5 w-5" />
                                Add URL field
                              </button>
                            )}
                          </div>
                        </section>
                    </div>

                    {activeTab !== 'photos' && (
                    <aside className="hidden self-start border border-neutral-200 bg-neutral-50 p-4 xl:block xl:w-[280px] xl:shrink-0">
                      <SectionLabel>Public detail preview</SectionLabel>
                      <div className="space-y-3">
                        <div className="aspect-[3/4] w-full overflow-hidden border border-neutral-200 bg-neutral-100">
                          {coverUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={coverUrl}
                              alt="Cover preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-neutral-300">
                              <ImagePlus className="h-8 w-8" />
                              <span className="text-xs">Cover photo</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-950">
                            {form.name || 'Product name'}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                            {form.code || 'CODE'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {!isDraftMode && (
                            <StatusBadge status={editingProjectedItem?.status ?? 'available'} />
                          )}
                          <span className="border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                            Fit {form.size}
                          </span>
                          {form.canResize && (
                            <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                              Bisa Resize
                            </span>
                          )}
                          {form.hijabFriendly && (
                            <span className="border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-600">
                              Hijab Friendly
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-neutral-200 pt-3">
                          <span className="text-lg font-semibold text-neutral-950">
                            {previewRentalPrice > 0 ? formatPrice(previewRentalPrice) : 'Rp0'}
                          </span>
                          <span className="text-[10px] font-normal text-neutral-400">/3 hari</span>
                          {previewCompareAtPrice !== null &&
                            previewCompareAtPrice > previewRentalPrice && (
                              <span className="text-xs font-medium text-neutral-400 line-through">
                                {formatPrice(previewCompareAtPrice)}
                              </span>
                            )}
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
                        <div className="border border-neutral-200 bg-white p-3">
                          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                            Included in rent
                          </p>
                          <p className="mt-2 text-xs font-semibold leading-relaxed text-neutral-900">
                            {form.rentalIncludes.length > 0
                              ? form.rentalIncludes.join(' / ')
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </aside>
                    )}
                  </div>
                </div>

                <div className="border-t border-neutral-200 bg-white px-4 py-4 sm:px-6">
                  {formError && (
                    <p className="mb-3 border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                      {formError}
                    </p>
                  )}
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="hidden items-center gap-2 md:flex">
                      <button
                        type="button"
                        onClick={() => setActiveTab(catalogTabs[activeTabIndex - 1].id)}
                        disabled={activeTabIndex === 0}
                        className="inline-flex items-center gap-1.5 border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab(catalogTabs[activeTabIndex + 1].id)}
                        disabled={activeTabIndex === catalogTabs.length - 1}
                        className="inline-flex items-center gap-1.5 border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <span className="hidden font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-400 sm:block">
                        Step {activeTabIndex + 1} / {catalogTabs.length}
                      </span>
                    </div>
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
                        {isSaving ? 'Saving...' : editingItem ? 'Save item' : 'Add item'}
                      </button>
                    </div>
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
