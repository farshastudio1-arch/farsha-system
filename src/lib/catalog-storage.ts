'use client';

import { useSyncExternalStore } from 'react';

import { KebayaItem, mockKebayas } from '@/data/mockData';

const catalogStorageKey = 'farsha-catalog-items-v1';
const catalogChangeEvent = 'farsha-catalog-items-storage-change';

const defaultImageUrl =
  'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80';

let cachedStoredValue: string | null | undefined;
let cachedCatalogItems: KebayaItem[] = mockKebayas;

const validSizes = new Set<KebayaItem['size']>(['S', 'M', 'L', 'XL', 'Custom']);
const validModels = new Set<KebayaItem['model']>(['Modern', 'Klasik', 'Kartini', 'Kutubaru']);
const validStatuses = new Set<KebayaItem['status']>([
  'available',
  'rented',
  'maintenance',
  'archived',
]);

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

function normalizeCatalogItem(value: Partial<KebayaItem>, index: number): KebayaItem | null {
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
    size: validSizes.has(value.size as KebayaItem['size'])
      ? (value.size as KebayaItem['size'])
      : 'M',
    model: validModels.has(value.model as KebayaItem['model'])
      ? (value.model as KebayaItem['model'])
      : 'Modern',
    rentalPrice: normalizeNumber(value.rentalPrice, 0),
    status: validStatuses.has(value.status as KebayaItem['status'])
      ? (value.status as KebayaItem['status'])
      : 'available',
    rentalEndDate: typeof value.rentalEndDate === 'string' ? value.rentalEndDate : null,
    imageUrls: imageUrls.length > 0 ? imageUrls : [defaultImageUrl],
    description: normalizeText(value.description),
  };
}

export function normalizeCatalogItems(value: unknown): KebayaItem[] {
  if (!Array.isArray(value)) {
    return mockKebayas;
  }

  return value
    .map((item, index) => normalizeCatalogItem(item as Partial<KebayaItem>, index))
    .filter((item): item is KebayaItem => Boolean(item));
}

export function readSavedCatalogItems() {
  if (typeof window === 'undefined') {
    return mockKebayas;
  }

  const storedValue = window.localStorage.getItem(catalogStorageKey);

  if (storedValue === cachedStoredValue) {
    return cachedCatalogItems;
  }

  cachedStoredValue = storedValue;

  if (!storedValue) {
    cachedCatalogItems = mockKebayas;
    return cachedCatalogItems;
  }

  try {
    cachedCatalogItems = normalizeCatalogItems(JSON.parse(storedValue));
  } catch {
    cachedCatalogItems = mockKebayas;
  }

  return cachedCatalogItems;
}

export function writeSavedCatalogItems(nextItems: KebayaItem[]) {
  const normalizedItems = normalizeCatalogItems(nextItems);
  const serializedItems = JSON.stringify(normalizedItems);

  window.localStorage.setItem(catalogStorageKey, serializedItems);
  cachedStoredValue = serializedItems;
  cachedCatalogItems = normalizedItems;
  window.dispatchEvent(new Event(catalogChangeEvent));
}

function subscribeToSavedCatalogItems(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(catalogChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(catalogChangeEvent, onStoreChange);
  };
}

export function useSavedCatalogItems() {
  return useSyncExternalStore(
    subscribeToSavedCatalogItems,
    readSavedCatalogItems,
    () => mockKebayas,
  );
}
