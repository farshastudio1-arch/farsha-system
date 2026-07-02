'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { mockSiteSettings, SiteSettings } from '@/data/mockData';
import {
  applyCatalogCardMode,
  catalogCardModePresets,
  normalizeSiteSettings,
} from '@/lib/site-settings-normalization';

const settingsChangeEvent = 'farsha-site-settings-cache-change';

let cachedSettings: SiteSettings = mockSiteSettings;

function notifySettingsSubscribers() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(settingsChangeEvent));
}

export function seedSavedSiteSettings(settings: SiteSettings) {
  cachedSettings = normalizeSiteSettings(settings);
  notifySettingsSubscribers();
}

export function readSavedSiteSettings() {
  return cachedSettings;
}

export function writeSavedSiteSettings(nextSettings: SiteSettings) {
  seedSavedSiteSettings(nextSettings);
}

function subscribeToSavedSiteSettings(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(settingsChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener(settingsChangeEvent, onStoreChange);
  };
}

export function useSavedSiteSettings(initialSettings?: SiteSettings) {
  useEffect(() => {
    if (initialSettings) {
      seedSavedSiteSettings(initialSettings);
    }
  }, [initialSettings]);

  return useSyncExternalStore(
    subscribeToSavedSiteSettings,
    readSavedSiteSettings,
    () => initialSettings ?? mockSiteSettings,
  );
}

export { applyCatalogCardMode, catalogCardModePresets, normalizeSiteSettings };
