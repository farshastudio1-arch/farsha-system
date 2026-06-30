'use client';

import { useSyncExternalStore } from 'react';

import {
  dispatchBrowserEvent,
  readLocalStorageItem,
  writeLocalStorageItem,
} from '@/lib/browser-storage';

export type MarketingNote = {
  id: string;
  title: string;
  body: string;
  category: string;
  createdAt: string;
  updatedAt: string;
};

export type MarketingCampaignStatus = 'idea' | 'planned' | 'active' | 'done';

export type MarketingCampaign = {
  id: string;
  name: string;
  objective: string;
  channel: string;
  status: MarketingCampaignStatus;
  startDate: string;
  endDate: string;
  budget: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

const notesStorageKey = 'farsha-marketing-notes-v1';
const campaignsStorageKey = 'farsha-marketing-campaigns-v1';
const notesChangeEvent = 'farsha-marketing-notes-storage-change';
const campaignsChangeEvent = 'farsha-marketing-campaigns-storage-change';

const validCampaignStatuses = new Set<MarketingCampaignStatus>([
  'idea',
  'planned',
  'active',
  'done',
]);

export const defaultMarketingNotes: MarketingNote[] = [
  {
    id: 'note-wisuda-hooks',
    title: 'Wisuda hook angles',
    body: 'Before/after fitting, detail close-up, and common mistake when choosing kebaya for graduation.',
    category: 'Short video',
    createdAt: '2026-06-30T08:00:00.000Z',
    updatedAt: '2026-06-30T08:00:00.000Z',
  },
  {
    id: 'note-lamaran-faq',
    title: 'Lamaran FAQ dump',
    body: 'Explain size flexibility, booking lead time, color matching, and how customers can ask via WhatsApp.',
    category: 'FAQ',
    createdAt: '2026-06-30T08:10:00.000Z',
    updatedAt: '2026-06-30T08:10:00.000Z',
  },
];

export const defaultMarketingCampaigns: MarketingCampaign[] = [
  {
    id: 'campaign-wisuda-july',
    name: 'July Wisuda Push',
    objective: 'Increase fitting inquiries for wisuda rentals.',
    channel: 'Instagram + TikTok',
    status: 'active',
    startDate: '2026-07-01',
    endDate: '2026-07-14',
    budget: 350000,
    notes: 'Focus on short-form education and catalog detail shots.',
    createdAt: '2026-06-30T08:20:00.000Z',
    updatedAt: '2026-06-30T08:20:00.000Z',
  },
  {
    id: 'campaign-bridesmaid-weekend',
    name: 'Bridesmaid Weekend',
    objective: 'Collect bridesmaid group leads.',
    channel: 'Instagram',
    status: 'planned',
    startDate: '2026-07-18',
    endDate: '2026-07-21',
    budget: 250000,
    notes: 'Show group styling options and ask viewers to send member count.',
    createdAt: '2026-06-30T08:25:00.000Z',
    updatedAt: '2026-06-30T08:25:00.000Z',
  },
];

let cachedNotesStoredValue: string | null | undefined;
let cachedNotes: MarketingNote[] = defaultMarketingNotes;
let cachedCampaignsStoredValue: string | null | undefined;
let cachedCampaigns: MarketingCampaign[] = defaultMarketingCampaigns;

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeDate(value: unknown, fallback: string) {
  const normalized = normalizeText(value);
  return normalized || fallback;
}

function normalizeNumber(value: unknown, fallback: number) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

function normalizeNote(value: Partial<MarketingNote>, index: number): MarketingNote | null {
  const title = normalizeText(value.title);
  const body = normalizeText(value.body);

  if (!title && !body) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    id: normalizeText(value.id, `marketing-note-${index + 1}`),
    title: title || 'Untitled idea',
    body,
    category: normalizeText(value.category, 'Idea dump'),
    createdAt: normalizeDate(value.createdAt, now),
    updatedAt: normalizeDate(value.updatedAt, now),
  };
}

function normalizeCampaign(
  value: Partial<MarketingCampaign>,
  index: number,
): MarketingCampaign | null {
  const name = normalizeText(value.name);

  if (!name) {
    return null;
  }

  const now = new Date().toISOString();
  const status = validCampaignStatuses.has(value.status as MarketingCampaignStatus)
    ? (value.status as MarketingCampaignStatus)
    : 'idea';

  return {
    id: normalizeText(value.id, `marketing-campaign-${index + 1}`),
    name,
    objective: normalizeText(value.objective),
    channel: normalizeText(value.channel, 'Instagram + TikTok'),
    status,
    startDate: normalizeText(value.startDate),
    endDate: normalizeText(value.endDate),
    budget: normalizeNumber(value.budget, 0),
    notes: normalizeText(value.notes),
    createdAt: normalizeDate(value.createdAt, now),
    updatedAt: normalizeDate(value.updatedAt, now),
  };
}

export function normalizeMarketingNotes(value: unknown): MarketingNote[] {
  if (!Array.isArray(value)) {
    return defaultMarketingNotes;
  }

  return value
    .map((note, index) => normalizeNote(note as Partial<MarketingNote>, index))
    .filter((note): note is MarketingNote => Boolean(note));
}

export function normalizeMarketingCampaigns(value: unknown): MarketingCampaign[] {
  if (!Array.isArray(value)) {
    return defaultMarketingCampaigns;
  }

  return value
    .map((campaign, index) => normalizeCampaign(campaign as Partial<MarketingCampaign>, index))
    .filter((campaign): campaign is MarketingCampaign => Boolean(campaign));
}

export function readSavedMarketingNotes() {
  if (typeof window === 'undefined') {
    return defaultMarketingNotes;
  }

  const storedValue = readLocalStorageItem(notesStorageKey);

  if (storedValue === cachedNotesStoredValue) {
    return cachedNotes;
  }

  cachedNotesStoredValue = storedValue;

  if (!storedValue) {
    cachedNotes = defaultMarketingNotes;
    return cachedNotes;
  }

  try {
    cachedNotes = normalizeMarketingNotes(JSON.parse(storedValue));
  } catch {
    cachedNotes = defaultMarketingNotes;
  }

  return cachedNotes;
}

export function writeSavedMarketingNotes(nextNotes: MarketingNote[]) {
  const normalizedNotes = normalizeMarketingNotes(nextNotes);
  const serializedNotes = JSON.stringify(normalizedNotes);

  writeLocalStorageItem(notesStorageKey, serializedNotes);
  cachedNotesStoredValue = serializedNotes;
  cachedNotes = normalizedNotes;
  dispatchBrowserEvent(notesChangeEvent);
}

export function readSavedMarketingCampaigns() {
  if (typeof window === 'undefined') {
    return defaultMarketingCampaigns;
  }

  const storedValue = readLocalStorageItem(campaignsStorageKey);

  if (storedValue === cachedCampaignsStoredValue) {
    return cachedCampaigns;
  }

  cachedCampaignsStoredValue = storedValue;

  if (!storedValue) {
    cachedCampaigns = defaultMarketingCampaigns;
    return cachedCampaigns;
  }

  try {
    cachedCampaigns = normalizeMarketingCampaigns(JSON.parse(storedValue));
  } catch {
    cachedCampaigns = defaultMarketingCampaigns;
  }

  return cachedCampaigns;
}

export function writeSavedMarketingCampaigns(nextCampaigns: MarketingCampaign[]) {
  const normalizedCampaigns = normalizeMarketingCampaigns(nextCampaigns);
  const serializedCampaigns = JSON.stringify(normalizedCampaigns);

  writeLocalStorageItem(campaignsStorageKey, serializedCampaigns);
  cachedCampaignsStoredValue = serializedCampaigns;
  cachedCampaigns = normalizedCampaigns;
  dispatchBrowserEvent(campaignsChangeEvent);
}

function subscribeToStorage(eventName: string, onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', onStoreChange);
  window.addEventListener(eventName, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(eventName, onStoreChange);
  };
}

export function useSavedMarketingNotes() {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToStorage(notesChangeEvent, onStoreChange),
    readSavedMarketingNotes,
    () => defaultMarketingNotes,
  );
}

export function useSavedMarketingCampaigns() {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToStorage(campaignsChangeEvent, onStoreChange),
    readSavedMarketingCampaigns,
    () => defaultMarketingCampaigns,
  );
}
