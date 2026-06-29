'use client';

export function readLocalStorageItem(key: string) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalStorageItem(key: string, value: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function dispatchBrowserEvent(eventName: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.dispatchEvent(new Event(eventName));
  } catch {
    // Storage-backed UI should keep working even when a browser blocks custom events.
  }
}
