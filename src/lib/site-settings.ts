'use client';

import { useSyncExternalStore } from 'react';

import { mockSiteSettings, SiteSettings } from '@/data/mockData';

const storageKey = 'farsha-site-settings-v1';
const storageChangeEvent = 'farsha-site-settings-storage-change';

let cachedStoredValue: string | null | undefined;
let cachedSettings: SiteSettings = mockSiteSettings;

type CatalogCardDisplayOptions = Pick<
  SiteSettings,
  | 'showPrices'
  | 'showAvailabilityBadges'
  | 'showProductCode'
  | 'showProductModel'
  | 'showProductSize'
  | 'showProductColor'
  | 'showProductDescription'
  | 'showCardCta'
>;

export const catalogCardModePresets: Record<
  SiteSettings['catalogCardMode'],
  CatalogCardDisplayOptions
> = {
  minimal: {
    showPrices: false,
    showAvailabilityBadges: true,
    showProductCode: false,
    showProductModel: false,
    showProductSize: false,
    showProductColor: false,
    showProductDescription: false,
    showCardCta: false,
  },
  standard: {
    showPrices: true,
    showAvailabilityBadges: true,
    showProductCode: false,
    showProductModel: true,
    showProductSize: true,
    showProductColor: false,
    showProductDescription: false,
    showCardCta: false,
  },
  detailed: {
    showPrices: true,
    showAvailabilityBadges: true,
    showProductCode: true,
    showProductModel: true,
    showProductSize: true,
    showProductColor: true,
    showProductDescription: true,
    showCardCta: true,
  },
};

function isCatalogCardMode(value: unknown): value is SiteSettings['catalogCardMode'] {
  return value === 'minimal' || value === 'standard' || value === 'detailed';
}

export function normalizeSiteSettings(value: Partial<SiteSettings>): SiteSettings {
  const catalogCardMode = isCatalogCardMode(value.catalogCardMode)
    ? value.catalogCardMode
    : mockSiteSettings.catalogCardMode;

  return {
    ...mockSiteSettings,
    ...value,
    catalogCardMode,
    currency: 'IDR',
    defaultMobileGrid:
      value.defaultMobileGrid === 2 || value.defaultMobileGrid === 1
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

export function readSavedSiteSettings() {
  if (typeof window === 'undefined') {
    return mockSiteSettings;
  }

  const storedValue = window.localStorage.getItem(storageKey);

  if (storedValue === cachedStoredValue) {
    return cachedSettings;
  }

  cachedStoredValue = storedValue;

  if (!storedValue) {
    cachedSettings = mockSiteSettings;
    return cachedSettings;
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<SiteSettings>;
    cachedSettings = normalizeSiteSettings(parsed);
  } catch {
    cachedSettings = mockSiteSettings;
  }

  return cachedSettings;
}

export function writeSavedSiteSettings(nextSettings: SiteSettings) {
  const serializedSettings = JSON.stringify(nextSettings);

  window.localStorage.setItem(storageKey, serializedSettings);
  cachedStoredValue = serializedSettings;
  cachedSettings = nextSettings;
  window.dispatchEvent(new Event(storageChangeEvent));
}

function subscribeToSavedSiteSettings(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(storageChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(storageChangeEvent, onStoreChange);
  };
}

export function useSavedSiteSettings() {
  return useSyncExternalStore(
    subscribeToSavedSiteSettings,
    readSavedSiteSettings,
    () => mockSiteSettings,
  );
}

export function applyCatalogCardMode(
  settings: SiteSettings,
  mode: SiteSettings['catalogCardMode'],
) {
  return {
    ...settings,
    catalogCardMode: mode,
    ...catalogCardModePresets[mode],
  };
}
