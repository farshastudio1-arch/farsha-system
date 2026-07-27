'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { BookingCatalogPressureMap } from '@/lib/booking-db';
import { writeSavedCatalogItems } from '@/lib/catalog-storage';
import {
  fetchAdminCatalogItemsAction,
  fetchBookingCatalogPressureAction,
  fetchPosLedgerAction,
} from '@/lib/farsha-actions';
import { writeSavedPosLedger } from '@/lib/pos-ledger';

type CatalogDataContextValue = {
  bookingPressure: BookingCatalogPressureMap;
  setBookingPressure: (value: BookingCatalogPressureMap) => void;
  isLoadingCatalog: boolean;
  catalogError: string;
  setCatalogError: (value: string) => void;
  // Re-pull the booking snapshot after a save/delete without a full reload.
  refreshBookingPressure: () => Promise<void>;
};

const CatalogDataContext = createContext<CatalogDataContextValue | null>(null);

// Loads catalog items, POS ledger, and booking pressure once for the whole
// /admin/catalog section. Items and ledger flow into their global stores so
// every sub-page (Overview, Products, Upcoming, Report) reads the same data
// without refetching on navigation — the section layout keeps this mounted.
export function CatalogDataProvider({ children }: { children: ReactNode }) {
  const [bookingPressure, setBookingPressure] = useState<BookingCatalogPressureMap>({});
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadCatalogData() {
      setIsLoadingCatalog(true);
      const [result, ledgerResult, bookingPressureResult] = await Promise.all([
        fetchAdminCatalogItemsAction(),
        fetchPosLedgerAction(),
        fetchBookingCatalogPressureAction(),
      ]);

      if (!active) {
        return;
      }

      if (result.ok) {
        writeSavedCatalogItems(result.data);
        setCatalogError('');
      } else {
        setCatalogError(result.error);
      }

      if (ledgerResult.ok) {
        writeSavedPosLedger(ledgerResult.data);
      }

      if (bookingPressureResult.ok) {
        setBookingPressure(bookingPressureResult.data);
      }

      setIsLoadingCatalog(false);
    }

    loadCatalogData();

    return () => {
      active = false;
    };
  }, []);

  const refreshBookingPressure = useCallback(async () => {
    const bookingPressureResult = await fetchBookingCatalogPressureAction();
    if (bookingPressureResult.ok) {
      setBookingPressure(bookingPressureResult.data);
    }
  }, []);

  return (
    <CatalogDataContext.Provider
      value={{
        bookingPressure,
        setBookingPressure,
        isLoadingCatalog,
        catalogError,
        setCatalogError,
        refreshBookingPressure,
      }}
    >
      {children}
    </CatalogDataContext.Provider>
  );
}

export function useCatalogData() {
  const context = useContext(CatalogDataContext);

  if (!context) {
    throw new Error('useCatalogData must be used within a CatalogDataProvider');
  }

  return context;
}
