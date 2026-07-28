import { mockSiteSettings, SiteSettings } from '@/data/mockData';

function normalizeHexColor(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim())
    ? value.trim().toUpperCase()
    : fallback;
}

function normalizeRadius(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= 32
    ? numberValue
    : fallback;
}

export function normalizeSiteSettings(value: Partial<SiteSettings>): SiteSettings {
  return {
    ...mockSiteSettings,
    ...value,
    accentColor: normalizeHexColor(value.accentColor, mockSiteSettings.accentColor),
    backgroundColor: normalizeHexColor(value.backgroundColor, mockSiteSettings.backgroundColor),
    textColor: normalizeHexColor(value.textColor, mockSiteSettings.textColor),
    primaryColor: normalizeHexColor(value.primaryColor, mockSiteSettings.primaryColor),
    surfaceColor: normalizeHexColor(value.surfaceColor, mockSiteSettings.surfaceColor),
    borderColor: normalizeHexColor(value.borderColor, mockSiteSettings.borderColor),
    borderRadius: normalizeRadius(value.borderRadius, mockSiteSettings.borderRadius),
    defaultMobileGrid:
      value.defaultMobileGrid === 3 ||
      value.defaultMobileGrid === 2 ||
      value.defaultMobileGrid === 1
        ? value.defaultMobileGrid
        : mockSiteSettings.defaultMobileGrid,
    defaultDesktopGrid:
      value.defaultDesktopGrid === 2 ||
      value.defaultDesktopGrid === 3 ||
      value.defaultDesktopGrid === 4
        ? value.defaultDesktopGrid
        : mockSiteSettings.defaultDesktopGrid,
  };
}
