import { KebayaItem, KebayaCategory, mockKebayas } from '@/data/mockData';

export type { KebayaCategory };

export type LandingCategorySlug = 'wisuda' | 'lamaran' | 'kondangan' | 'bridesmaid';

export interface LandingCategory {
  slug: LandingCategorySlug;
  emoji: string;
  title: string;
  descriptor: string;
  action: string;
  availabilityCue: string;
  availabilityTone: 'ready' | 'soon';
  imageUrl: string;
}

const fallbackCategoryImage = mockKebayas[0]?.imageUrls[0] ?? '';

export const landingCategories: LandingCategory[] = [
  {
    slug: 'wisuda',
    emoji: '🎓',
    title: 'Kebaya for Wisuda',
    descriptor: 'Rapi, ringan, dan fotogenik untuk hari kelulusan.',
    action: 'Lihat wisuda',
    availabilityCue: 'Now Ready',
    availabilityTone: 'ready',
    imageUrl: mockKebayas[5]?.imageUrls[0] ?? fallbackCategoryImage,
  },
  {
    slug: 'lamaran',
    emoji: '💍',
    title: 'Kebaya for Lamaran',
    descriptor: 'Siluet lembut untuk momen keluarga yang lebih formal.',
    action: 'Lihat lamaran',
    availabilityCue: 'Now Ready',
    availabilityTone: 'ready',
    imageUrl: mockKebayas[2]?.imageUrls[0] ?? fallbackCategoryImage,
  },
  {
    slug: 'kondangan',
    emoji: '✨',
    title: 'Dress premium untuk kondangan',
    descriptor: 'Pilihan dressy dan kebaya modern untuk undangan malam.',
    action: 'Lihat kondangan',
    availabilityCue: 'Now Ready',
    availabilityTone: 'ready',
    imageUrl: mockKebayas[4]?.imageUrls[0] ?? fallbackCategoryImage,
  },
  {
    slug: 'bridesmaid',
    emoji: '🌸',
    title: 'Seragam bridesmaid',
    descriptor: 'Nuansa senada untuk look rombongan yang tetap personal.',
    action: 'Lihat bridesmaid',
    availabilityCue: 'Coming Soon',
    availabilityTone: 'soon',
    imageUrl: mockKebayas[7]?.imageUrls[1] ?? fallbackCategoryImage,
  },
];

export function getLandingCategory(slug: string | null | undefined) {
  return landingCategories.find((category) => category.slug === slug) ?? null;
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
