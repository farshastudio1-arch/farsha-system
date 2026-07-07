'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';

import {
  deriveAvailabilityProjection,
  getServerPosLedgerSnapshot,
  readSavedPosLedgerSnapshot,
  subscribeToPosLedger,
  writeSavedPosLedger,
  type PosLedgerState,
} from '@/lib/pos-ledger';
import type { KebayaItem } from '@/data/mockData';

export function useSavedPosLedger(initialLedger?: PosLedgerState) {
  const serverSnapshot = getServerPosLedgerSnapshot(initialLedger);

  useEffect(() => {
    if (initialLedger) {
      writeSavedPosLedger(initialLedger);
    }
  }, [initialLedger]);

  return useSyncExternalStore(subscribeToPosLedger, readSavedPosLedgerSnapshot, () => serverSnapshot);
}

export function useAvailabilityProjection(items: KebayaItem[]) {
  const ledger = useSavedPosLedger();

  return useMemo(() => deriveAvailabilityProjection(items, ledger), [items, ledger]);
}
