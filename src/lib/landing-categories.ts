import {
  defaultLandingCategories,
  KebayaItem,
  KebayaCategory,
  LandingCategoryContent,
} from '@/data/mockData';

export type { KebayaCategory };

export type LandingCategorySlug = 'wisuda' | 'lamaran' | 'kondangan' | 'bridesmaid';

export interface LandingCategory extends LandingCategoryContent {
  slug: LandingCategorySlug;
}

export const landingCategories: LandingCategory[] = defaultLandingCategories;

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
      item.model === 'Modern' ||
      item.model === 'Kartini' ||
      item.model === 'Kutubaru' ||
      includesAny(text, ['wisuda', 'kelulusan', 'fotogenik'])
    );
  }

  if (slug === 'lamaran') {
    return (
      item.model === 'Klasik' ||
      item.model === 'Kartini' ||
      item.model === 'Kutubaru' ||
      includesAny(text, ['lamaran', 'pertunangan', 'akad', 'ivory', 'putih', 'rose gold'])
    );
  }

  if (slug === 'kondangan') {
    return (
      item.model === 'Modern' ||
      item.rentalPrice >= 250000 ||
      includesAny(text, ['kondangan', 'formal', 'premium', 'mewah', 'pesta', 'organza'])
    );
  }

  return (
    item.model === 'Modern' ||
    includesAny(text, ['soft', 'pink', 'lilac', 'sage', 'rose', 'bridesmaid', 'rombongan'])
  );
}
