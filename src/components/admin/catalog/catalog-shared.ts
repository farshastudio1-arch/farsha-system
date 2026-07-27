import type { BookingCatalogPressureMap } from '@/lib/booking-db';
import { KebayaItem } from '@/data/mockData';
import { matchesLandingCategory, occasionCategories } from '@/lib/landing-categories';

// Resolve the occasion categories for an item, falling back to automatic matching
// from model/color/description when none are explicitly assigned.
export function getItemCategories(item: KebayaItem) {
  if (item.categories && item.categories.length > 0) {
    return item.categories;
  }

  return occasionCategories
    .filter((category) => matchesLandingCategory(item, category.value))
    .map((category) => category.value);
}

// Data-quality gaps that make an item look unfinished on the public storefront.
export function getItemQualityIssues(item: KebayaItem) {
  const issues: string[] = [];
  const measurements = item.measurements;

  if (item.imageUrls.length < 2) {
    issues.push('Needs more photos');
  }

  if (!item.description.trim()) {
    issues.push('Missing description');
  }

  if (item.rentalPrice <= 0) {
    issues.push('Missing price');
  }

  if (
    !measurements?.bust ||
    !measurements?.waist ||
    !measurements?.length ||
    !measurements?.sleeveLength ||
    !measurements?.armhole
  ) {
    issues.push('Missing measurements');
  }

  if (!measurements?.rentalCategory) {
    issues.push('Missing rental category');
  }

  return issues;
}

export function getCatalogBookingPressureSummary(
  pressure: BookingCatalogPressureMap,
  itemId: string,
) {
  return (
    pressure[itemId] ?? {
      itemBookings: [],
      confirmedBookings: [],
      confirmedCount: 0,
      requestedCount: 0,
      paymentSubmittedCount: 0,
      nextConfirmed: null,
      nextPickupDate: null,
      nextReturnDate: null,
      nextAvailableDate: null,
      conflictingRequests: [],
      hasBookingPressure: false,
    }
  );
}

// Aggregate the catalog + booking snapshot used by the Overview stat cards.
export function computeCatalogSummary(
  projectedItems: KebayaItem[],
  catalogItems: KebayaItem[],
  bookingPressure: BookingCatalogPressureMap,
) {
  const availableItems = projectedItems.filter((item) => item.status === 'available');
  const rentedItems = projectedItems.filter((item) => item.status === 'rented');
  const maintenanceItems = projectedItems.filter((item) => item.status === 'maintenance');
  const issueItems = catalogItems.filter((item) => getItemQualityIssues(item).length > 0);
  const bookingSummaries = Object.values(bookingPressure);
  const activeBookingIds = new Set<string>();
  const confirmedBookingIds = new Set<string>();
  const requestedBookingIds = new Set<string>();
  const paymentSubmittedBookingIds = new Set<string>();
  const bookedItemIds = new Set<string>();
  const conflictBookingIds = new Set<string>();

  for (const summary of bookingSummaries) {
    for (const booking of summary.itemBookings) {
      activeBookingIds.add(booking.bookingId);

      if (booking.status === 'requested') {
        requestedBookingIds.add(booking.bookingId);
      }

      if (booking.status === 'payment_submitted') {
        paymentSubmittedBookingIds.add(booking.bookingId);
      }
    }

    for (const booking of summary.confirmedBookings) {
      confirmedBookingIds.add(booking.bookingId);
      bookedItemIds.add(booking.itemId);
    }

    for (const booking of summary.conflictingRequests) {
      conflictBookingIds.add(booking.bookingId);
    }
  }

  return {
    total: projectedItems.length,
    available: availableItems.length,
    rented: rentedItems.length,
    maintenance: maintenanceItems.length,
    issues: issueItems.length,
    activeBookings: activeBookingIds.size,
    confirmedBookings: confirmedBookingIds.size,
    requestedBookings: requestedBookingIds.size,
    paymentSubmittedBookings: paymentSubmittedBookingIds.size,
    bookedItems: bookedItemIds.size,
    bookingConflicts: conflictBookingIds.size,
    hasBookingSnapshot:
      activeBookingIds.size > 0 ||
      paymentSubmittedBookingIds.size > 0 ||
      requestedBookingIds.size > 0 ||
      conflictBookingIds.size > 0,
  };
}
