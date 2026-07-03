'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { MediaAlbum, MediaAsset } from '@/lib/media-library';

const mediaChangeEvent = 'farsha-media-library-cache-change';
const emptyMediaLibrary: { albums: MediaAlbum[]; assets: MediaAsset[] } = {
  albums: [],
  assets: [],
};

let cachedMediaLibrary: { albums: MediaAlbum[]; assets: MediaAsset[] } = {
  albums: [],
  assets: [],
};

function notifyMediaSubscribers() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(mediaChangeEvent));
}

export function writeSavedMediaLibrary(nextLibrary: {
  albums: MediaAlbum[];
  assets: MediaAsset[];
}) {
  cachedMediaLibrary = nextLibrary;
  notifyMediaSubscribers();
}

export function writeSavedMediaAssets(assets: MediaAsset[]) {
  cachedMediaLibrary = {
    ...cachedMediaLibrary,
    assets,
  };
  notifyMediaSubscribers();
}

export function writeSavedMediaAlbums(albums: MediaAlbum[]) {
  cachedMediaLibrary = {
    ...cachedMediaLibrary,
    albums,
  };
  notifyMediaSubscribers();
}

function readSavedMediaLibrary() {
  return cachedMediaLibrary;
}

function subscribeToSavedMediaLibrary(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(mediaChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener(mediaChangeEvent, onStoreChange);
  };
}

export function useSavedMediaLibrary(initialLibrary?: {
  albums: MediaAlbum[];
  assets: MediaAsset[];
}) {
  const serverSnapshot = initialLibrary ?? emptyMediaLibrary;

  useEffect(() => {
    if (initialLibrary) {
      writeSavedMediaLibrary(initialLibrary);
    }
  }, [initialLibrary]);

  return useSyncExternalStore(
    subscribeToSavedMediaLibrary,
    readSavedMediaLibrary,
    () => serverSnapshot,
  );
}
