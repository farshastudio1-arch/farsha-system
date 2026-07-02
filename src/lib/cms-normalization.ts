import { CMSContent, LandingCategoryContent, mockCMS } from '@/data/mockData';
import { landingCategories } from '@/lib/landing-categories';

export const maxLandingCategoryImages = 5;

function normalizeText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeAvailabilityTone(value: unknown, fallback: LandingCategoryContent['availabilityTone']) {
  return value === 'ready' || value === 'soon' ? value : fallback;
}

function normalizeImageUrls(value: unknown, fallback: string[]) {
  const imageUrls = Array.isArray(value)
    ? value.map((url) => (typeof url === 'string' ? url.trim() : '')).filter(Boolean)
    : [];

  return (imageUrls.length > 0 ? imageUrls : fallback).slice(0, maxLandingCategoryImages);
}

function normalizeLandingCategories(value: unknown): LandingCategoryContent[] {
  const overrides = Array.isArray(value) ? value : [];

  return landingCategories.map((category) => {
    const override = overrides.find(
      (item): item is Partial<LandingCategoryContent> =>
        Boolean(item) && typeof item === 'object' && 'slug' in item && item.slug === category.slug,
    );

    const fallbackImageUrls =
      category.imageUrls && category.imageUrls.length > 0 ? category.imageUrls : [category.imageUrl];
    const imageUrls = normalizeImageUrls(override?.imageUrls, fallbackImageUrls);
    const imageUrl = normalizeText(override?.imageUrl, imageUrls[0] ?? category.imageUrl);

    return {
      slug: category.slug,
      emoji: normalizeText(override?.emoji, category.emoji),
      title: normalizeText(override?.title, category.title),
      descriptor: normalizeText(override?.descriptor, category.descriptor),
      action: normalizeText(override?.action, category.action),
      availabilityCue: normalizeText(override?.availabilityCue, category.availabilityCue),
      availabilityTone: normalizeAvailabilityTone(override?.availabilityTone, category.availabilityTone),
      imageUrl,
      imageUrls: imageUrls.includes(imageUrl)
        ? imageUrls
        : [imageUrl, ...imageUrls].slice(0, maxLandingCategoryImages),
    };
  });
}

export function normalizeCmsContent(value: Partial<CMSContent>): CMSContent {
  return {
    heroTitle: normalizeText(value.heroTitle, mockCMS.heroTitle),
    heroSubtitle: normalizeText(value.heroSubtitle, mockCMS.heroSubtitle),
    heroImageUrl: normalizeText(value.heroImageUrl, mockCMS.heroImageUrl),
    promoText: typeof value.promoText === 'string' ? value.promoText.trim() : mockCMS.promoText,
    aboutTitle: normalizeText(value.aboutTitle, mockCMS.aboutTitle),
    aboutText: normalizeText(value.aboutText, mockCMS.aboutText),
    studioAddress: normalizeText(value.studioAddress, mockCMS.studioAddress),
    studioPhone: normalizeText(value.studioPhone, mockCMS.studioPhone),
    landingCategories: normalizeLandingCategories(value.landingCategories),
  };
}
