import { KebayaItem, KebayaMeasurements } from '@/data/mockData';

const defaultImageUrl =
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80';

const validSizes = new Set<KebayaItem['size']>(['S', 'M', 'L', 'XL', 'Custom']);
const validModels = new Set<KebayaItem['model']>(['Modern', 'Klasik', 'Kartini', 'Kutubaru']);
const validCategories = new Set<NonNullable<KebayaItem['categories']>[number]>([
  'wisuda',
  'lamaran',
  'kondangan',
  'bridesmaid',
]);
const validStatuses = new Set<KebayaItem['status']>([
  'available',
  'rented',
  'maintenance',
]);

export function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function normalizeNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

export function normalizeMeasurements(value: unknown): Partial<KebayaMeasurements> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const measurements = value as Partial<KebayaMeasurements>;
  const normalized = {
    bust: normalizeText(measurements.bust),
    waist: normalizeText(measurements.waist),
    length: normalizeText(measurements.length),
    sleeveLength: normalizeText(measurements.sleeveLength),
    armhole: normalizeText(measurements.armhole),
    otherDetails: normalizeText(measurements.otherDetails),
    rentalCategory: normalizeText(measurements.rentalCategory),
  };

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

export function normalizeCategories(value: unknown): KebayaItem['categories'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const categories = value.filter(
    (category): category is NonNullable<KebayaItem['categories']>[number] =>
      validCategories.has(category as NonNullable<KebayaItem['categories']>[number]),
  );

  return categories.length > 0 ? categories : undefined;
}

export function normalizeCatalogItem(value: Partial<KebayaItem>, index: number): KebayaItem | null {
  const name = normalizeText(value.name);
  const code = normalizeText(value.code);

  if (!name || !code) {
    return null;
  }

  const imageUrls = Array.isArray(value.imageUrls)
    ? value.imageUrls.map((url) => normalizeText(url)).filter(Boolean)
    : [];

  return {
    id: normalizeText(value.id, `catalog-${index + 1}`),
    code,
    name,
    color: normalizeText(value.color, 'Neutral'),
    size: validSizes.has(value.size as KebayaItem['size'])
      ? (value.size as KebayaItem['size'])
      : 'M',
    model: validModels.has(value.model as KebayaItem['model'])
      ? (value.model as KebayaItem['model'])
      : 'Modern',
    rentalPrice: normalizeNumber(value.rentalPrice, 0),
    status: validStatuses.has(value.status as KebayaItem['status'])
      ? (value.status as KebayaItem['status'])
      : 'available',
    rentalEndDate: typeof value.rentalEndDate === 'string' ? value.rentalEndDate : null,
    imageUrls: imageUrls.length > 0 ? imageUrls : [defaultImageUrl],
    description: normalizeText(value.description),
    categories: normalizeCategories(value.categories),
    measurements: normalizeMeasurements(value.measurements),
  };
}

export function normalizeCatalogItems(value: unknown): KebayaItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => normalizeCatalogItem(item as Partial<KebayaItem>, index))
    .filter((item): item is KebayaItem => Boolean(item));
}
