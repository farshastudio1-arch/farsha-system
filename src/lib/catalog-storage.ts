'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { KebayaItem, mockKebayas } from '@/data/mockData';
import { normalizeCatalogItems } from '@/lib/catalog-normalization';

const catalogChangeEvent = 'farsha-catalog-items-cache-change';

let cachedCatalogItems: KebayaItem[] = mockKebayas;

function notifyCatalogSubscribers() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(catalogChangeEvent));
}

export function seedSavedCatalogItems(items: KebayaItem[]) {
  cachedCatalogItems = normalizeCatalogItems(items);
  notifyCatalogSubscribers();
}

export function readSavedCatalogItems() {
  return cachedCatalogItems;
}

export function writeSavedCatalogItems(nextItems: KebayaItem[]) {
  seedSavedCatalogItems(nextItems);
}

function subscribeToSavedCatalogItems(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(catalogChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener(catalogChangeEvent, onStoreChange);
  };
}

export function useSavedCatalogItems(initialItems?: KebayaItem[]) {
  useEffect(() => {
    if (initialItems) {
      seedSavedCatalogItems(initialItems);
    }
  }, [initialItems]);

  return useSyncExternalStore(
    subscribeToSavedCatalogItems,
    readSavedCatalogItems,
    () => initialItems ?? mockKebayas,
  );
}

export { normalizeCatalogItems };
