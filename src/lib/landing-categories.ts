import {
  defaultLandingCategories,
  KebayaItem,
  KebayaCategory,
  kebayaOccasions,
  LandingCategoryContent,
} from '@/data/mockData';

export type { KebayaCategory };

export type LandingCategorySlug = KebayaCategory;

export interface LandingCategory extends LandingCategoryContent {
  slug: LandingCategorySlug;
}

export const landingCategories: LandingCategory[] = defaultLandingCategories;
export const occasionCategories: Array<{
  value: KebayaCategory;
  label: string;
  emoji: string;
}> = [
  { value: 'wisuda', label: 'Wisuda', emoji: '🎓' },
  { value: 'lamaran', label: 'Lamaran', emoji: '💍' },
  { value: 'kondangan', label: 'Kondangan', emoji: '✨' },
  { value: 'bridesmaid', label: 'Bridesmaid', emoji: '🌸' },
  { value: 'pengajian', label: 'Pengajian', emoji: '🕌' },
];

export function getLandingCategory(slug: string | null | undefined) {
  return landingCategories.find((category) => category.slug === slug) ?? null;
}

export function mergeLandingCategories(
  overrides: LandingCategoryContent[] | undefined,
): LandingCategory[] {
  return landingCategories.map((category) => {
    const override = overrides?.find((item) => item.slug === category.slug);
    return override ? { ...category, ...override, slug: category.slug } : category;
  });
}

function includesAny(value: string, terms: string[]) {
  const normalizedValue = value.toLowerCase();
  return terms.some((term) => normalizedValue.includes(term));
}

function itemText(item: KebayaItem) {
  return `${item.name} ${item.color} ${item.model} ${item.description}`.toLowerCase();
}

export function matchesLandingCategory(item: KebayaItem, slug: LandingCategorySlug) {
  // Manual override: if the item has explicit categories set, use those exclusively
  if (item.categories && item.categories.length > 0) {
    return item.categories.includes(slug as KebayaCategory);
  }

  const text = itemText(item);

  if (slug === 'wisuda') {
    return (
      item.model === 'Kebaya Modern' ||
      item.model === 'Kebaya Janggan' ||
      item.model === 'Kebaya Kutubaru' ||
      includesAny(text, ['wisuda', 'kelulusan', 'fotogenik'])
    );
  }

  if (slug === 'lamaran') {
    return (
      item.model === 'Kebaya Janggan' ||
      item.model === 'Kebaya Kutubaru' ||
      includesAny(text, ['lamaran', 'pertunangan', 'akad', 'ivory', 'putih', 'rose gold'])
    );
  }

  if (slug === 'kondangan') {
    return (
      item.model === 'Kebaya Modern' ||
      item.model === 'Dress Premium' ||
      item.rentalPrice >= 250000 ||
      includesAny(text, ['kondangan', 'formal', 'premium', 'mewah', 'pesta', 'organza'])
    );
  }

  if (slug === 'bridesmaid') {
    return (
      item.model === 'Kebaya Modern' ||
      item.model === 'Bajubodo Modern' ||
      includesAny(text, ['soft', 'pink', 'lilac', 'sage', 'rose', 'bridesmaid', 'rombongan'])
    );
  }

  return includesAny(text, ['pengajian', 'kajian', 'syari', 'syar’i', 'muslimah', 'kurung']);
}

export function getOccasionLabel(value: KebayaCategory) {
  return occasionCategories.find((category) => category.value === value)?.label ?? value;
}

export function isOccasionCategory(value: string): value is KebayaCategory {
  return kebayaOccasions.includes(value as KebayaCategory);
}
