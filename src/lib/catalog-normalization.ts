import {
  kebayaModelOptions,
  kebayaOccasions,
  kebayaRentalCategoryOptions,
  kebayaSizeOptions,
  kebayaWearStyleOptions,
  KebayaItem,
  KebayaMeasurements,
} from '@/data/mockData';

const defaultImageUrl =
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80';

const validSizes = new Set<KebayaItem['size']>(kebayaSizeOptions);
const validModels = new Set<KebayaItem['model']>(kebayaModelOptions);
const validCategories = new Set<NonNullable<KebayaItem['categories']>[number]>(kebayaOccasions);
const validRentalCategories = new Set<string>(kebayaRentalCategoryOptions);
const validWearStyles = new Set<KebayaItem['wearStyles'][number]>(kebayaWearStyleOptions);
const validStatuses = new Set<KebayaItem['status']>([
  'available',
  'rented',
  'maintenance',
]);

export function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeSize(value: unknown): KebayaItem['size'] {
  const size = normalizeText(value);

  if (validSizes.has(size as KebayaItem['size'])) {
    return size as KebayaItem['size'];
  }

  if (size === 'L' || size === 'XL' || size === 'Custom') {
    return 'L-XL';
  }

  return 'S-M';
}

function normalizeModel(value: unknown): KebayaItem['model'] {
  const model = normalizeText(value);

  if (validModels.has(model as KebayaItem['model'])) {
    return model as KebayaItem['model'];
  }

  if (model === 'Kutubaru') {
    return 'Kebaya Kutubaru';
  }

  if (model === 'Klasik' || model === 'Kartini') {
    return 'Kebaya Janggan';
  }

  return 'Kebaya Modern';
}

function normalizeRentalCategory(value: unknown): string {
  const rentalCategory = normalizeText(value);
  return validRentalCategories.has(rentalCategory) ? rentalCategory : 'Makassar Only';
}

export function normalizeNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

function normalizeOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
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
    rentalCategory: normalizeRentalCategory(measurements.rentalCategory),
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

export function normalizeWearStyles(value: unknown): KebayaItem['wearStyles'] {
  if (!Array.isArray(value)) {
    return ['Hijab', 'Non-Hijab'];
  }

  const wearStyles = value.filter((style): style is KebayaItem['wearStyles'][number] =>
    validWearStyles.has(style as KebayaItem['wearStyles'][number]),
  );

  return wearStyles.length > 0 ? wearStyles : ['Hijab', 'Non-Hijab'];
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
    size: normalizeSize(value.size),
    model: normalizeModel(value.model),
    rentalPrice: normalizeNumber(value.rentalPrice, 0),
    compareAtRentalPrice: normalizeOptionalNumber(value.compareAtRentalPrice),
    status: validStatuses.has(value.status as KebayaItem['status'])
      ? (value.status as KebayaItem['status'])
      : 'available',
    rentalEndDate: typeof value.rentalEndDate === 'string' ? value.rentalEndDate : null,
    imageUrls: imageUrls.length > 0 ? imageUrls : [defaultImageUrl],
    description: normalizeText(value.description),
    wearStyles: normalizeWearStyles(value.wearStyles),
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
