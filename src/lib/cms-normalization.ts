import { CMSContent, mockCMS } from '@/data/mockData';

function normalizeText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
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
  };
}
