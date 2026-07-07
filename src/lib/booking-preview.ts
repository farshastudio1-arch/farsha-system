import type { KebayaItem } from '@/data/mockData';
import type { PosLedgerState } from '@/lib/pos-ledger';

export type PreviewBookingStatus =
  | 'requested'
  | 'payment_submitted'
  | 'dp_confirmed'
  | 'pickup_ready'
  | 'converted_to_rental'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface PreviewBooking {
  id: string;
  bookingNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail?: string;
  customerInstagram?: string;
  eventDate: string;
  pickupDate: string;
  returnDate: string;
  bufferUntilDate: string;
  status: PreviewBookingStatus;
  dpAmount: number;
  securityDeposit: number;
  paymentMethod: 'transfer' | 'cash' | 'qris' | 'other';
  paymentReference: string;
  paymentProofUrl?: string;
  paymentProofKey?: string;
  paymentProofFilename?: string;
  notes: string;
  source: 'catalog' | 'whatsapp' | 'walk-in';
  createdAt: string;
  conflictWith?: string;
}

export interface BookingDateSet {
  eventDate: string;
  pickupDate: string;
  returnDate: string;
  bufferUntilDate: string;
}

export interface PreviewAvailabilityBlock {
  reason: 'rented' | 'maintenance';
  source: 'pos' | 'catalog';
  label: string;
  reference: string | null;
  startDate: string;
  endDate: string;
}

export interface PreviewCheckoutBookingInput {
  item: KebayaItem;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string;
  customerInstagram: string;
  deliveryAddress: string;
  eventDate: string;
  pickupDate: string;
  returnDate: string;
  bufferUntilDate: string;
  pickupMethod: 'store' | 'gosend';
  notes: string;
  itemCount: number;
  dpTotal: number;
  extraReturnFee: number;
}

const previewBookingStorageKey = 'farsha-preview-bookings-v1';
const previewBookingChangeEvent = 'farsha-preview-bookings-change';

export const previewDpAmount = 100000;
export const previewSecurityDeposit = 100000;
export const previewExtraReturnDayFee = 100000;
export const previewMaintenanceBlockDays = 3;

export const blockingPreviewBookingStatuses: PreviewBookingStatus[] = [
  'dp_confirmed',
  'pickup_ready',
  'converted_to_rental',
];

export const previewBookings: PreviewBooking[] = [
  {
    id: 'booking-preview-001',
    bookingNumber: 'BK-202608-0001',
    itemId: '1',
    itemCode: 'KB-SGE-01',
    itemName: 'Kebaya Brokat Modern Sage Green',
    customerName: 'Nur Aulia',
    customerWhatsapp: '081245670011',
    customerEmail: 'aulia@example.com',
    customerInstagram: '@nuraulia',
    eventDate: '2026-08-12',
    pickupDate: '2026-08-11',
    returnDate: '2026-08-13',
    bufferUntilDate: '2026-08-16',
    status: 'dp_confirmed',
    dpAmount: previewDpAmount,
    securityDeposit: previewSecurityDeposit,
    paymentMethod: 'transfer',
    paymentReference: 'BCA-0812-AULIA',
    notes: 'Lamaran keluarga, minta fitting minggu sebelumnya.',
    source: 'catalog',
    createdAt: '2026-07-04T08:30:00.000Z',
  },
  {
    id: 'booking-preview-002',
    bookingNumber: 'BK-202608-0002',
    itemId: '2',
    itemCode: 'KB-BLV-02',
    itemName: 'Kebaya Klasik Solo Beludru Hitam',
    customerName: 'Maya Putri',
    customerWhatsapp: '081345670022',
    customerEmail: 'maya@example.com',
    customerInstagram: '@mayaputri',
    eventDate: '2026-08-20',
    pickupDate: '2026-08-19',
    returnDate: '2026-08-21',
    bufferUntilDate: '2026-08-22',
    status: 'payment_submitted',
    dpAmount: previewDpAmount,
    securityDeposit: previewSecurityDeposit,
    paymentMethod: 'qris',
    paymentReference: 'QRIS-MAYA-0820',
    notes: 'Bukti DP sudah dikirim, menunggu review POS.',
    source: 'whatsapp',
    createdAt: '2026-07-04T09:15:00.000Z',
  },
  {
    id: 'booking-preview-003',
    bookingNumber: 'BK-202608-0003',
    itemId: '3',
    itemCode: 'KB-IVR-03',
    itemName: 'Kebaya Kartini Putih Gading (Ivory)',
    customerName: 'Adelia Safitri',
    customerWhatsapp: '081456780033',
    customerInstagram: '@adeliasafitri',
    eventDate: '2026-08-28',
    pickupDate: '2026-08-27',
    returnDate: '2026-08-29',
    bufferUntilDate: '2026-08-30',
    status: 'requested',
    dpAmount: previewDpAmount,
    securityDeposit: previewSecurityDeposit,
    paymentMethod: 'transfer',
    paymentReference: '',
    notes: 'Customer baru tanya tanggal dari katalog.',
    source: 'catalog',
    createdAt: '2026-07-04T10:00:00.000Z',
  },
  {
    id: 'booking-preview-004',
    bookingNumber: 'BK-202608-0004',
    itemId: '1',
    itemCode: 'KB-SGE-01',
    itemName: 'Kebaya Brokat Modern Sage Green',
    customerName: 'Salsa Rahma',
    customerWhatsapp: '081567890044',
    customerEmail: 'salsa@example.com',
    eventDate: '2026-08-13',
    pickupDate: '2026-08-12',
    returnDate: '2026-08-14',
    bufferUntilDate: '2026-08-15',
    status: 'requested',
    dpAmount: previewDpAmount,
    securityDeposit: previewSecurityDeposit,
    paymentMethod: 'transfer',
    paymentReference: '',
    notes: 'Preview konflik dengan booking Aulia.',
    source: 'catalog',
    createdAt: '2026-07-04T10:35:00.000Z',
    conflictWith: 'BK-202608-0001',
  },
  {
    id: 'booking-preview-005',
    bookingNumber: 'BK-202607-0005',
    itemId: '4',
    itemCode: 'KB-KTB-04',
    itemName: 'Kebaya Kutubaru Sutra Merah Floral',
    customerName: 'Intan Permata',
    customerWhatsapp: '081678900055',
    customerInstagram: '@intanpermata',
    eventDate: '2026-07-10',
    pickupDate: '2026-07-09',
    returnDate: '2026-07-11',
    bufferUntilDate: '2026-07-14',
    status: 'pickup_ready',
    dpAmount: previewDpAmount,
    securityDeposit: previewSecurityDeposit,
    paymentMethod: 'cash',
    paymentReference: 'CASH-DP-INTAN',
    notes: 'Pickup dekat, siapkan fitting dan pelunasan.',
    source: 'walk-in',
    createdAt: '2026-07-03T14:30:00.000Z',
  },
];

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeDatePart(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const directDate = parseDate(value.slice(0, 10));

  if (!Number.isNaN(directDate.getTime())) {
    return formatDatePart(directDate);
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? null : formatDatePart(parsedDate);
}

function addDays(value: string, days: number) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return formatDatePart(date);
}

export function getPreviewBookingChangeEventName() {
  return previewBookingChangeEvent;
}

export function addPreviewDays(value: string, days: number) {
  return addDays(value, days);
}

export function getPreviewDayDifference(startDate: string, endDate: string) {
  const start = parseDate(startDate).getTime();
  const end = parseDate(endDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / (24 * 60 * 60 * 1000)));
}

export function readStoredPreviewBookings(): PreviewBooking[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(previewBookingStorageKey);
    if (!storedValue) {
      return [];
    }

    const parsed = JSON.parse(storedValue);
    return Array.isArray(parsed) ? parsed.filter(isPreviewBooking) : [];
  } catch {
    return [];
  }
}

export function mergePreviewBookings(
  storedBookings: PreviewBooking[],
  baseBookings = previewBookings,
) {
  const seenIds = new Set<string>();

  return [...storedBookings, ...baseBookings].filter((booking) => {
    if (seenIds.has(booking.id)) {
      return false;
    }

    seenIds.add(booking.id);
    return true;
  });
}

export function writeStoredPreviewBookings(bookings: PreviewBooking[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(previewBookingStorageKey, JSON.stringify(bookings));
  window.dispatchEvent(new Event(previewBookingChangeEvent));
}

export function createCheckoutPreviewBooking(input: PreviewCheckoutBookingInput): PreviewBooking {
  const ordinal = Date.now();
  const month = input.eventDate.slice(0, 7).replace('-', '');

  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `booking-${crypto.randomUUID()}`
        : `booking-${ordinal}`,
    bookingNumber: `BK-${month}-${String(ordinal).slice(-4)}`,
    itemId: input.item.id,
    itemCode: input.item.code,
    itemName:
      input.itemCount > 1
        ? `${input.item.name} +${input.itemCount - 1} item`
        : input.item.name,
    customerName: input.customerName.trim(),
    customerWhatsapp: input.customerWhatsapp.trim(),
    customerEmail: input.customerEmail.trim(),
    customerInstagram: input.customerInstagram.trim(),
    eventDate: input.eventDate,
    pickupDate: input.pickupDate,
    returnDate: input.returnDate,
    bufferUntilDate: input.bufferUntilDate,
    status: 'payment_submitted',
    dpAmount: input.dpTotal,
    securityDeposit: previewSecurityDeposit * input.itemCount,
    paymentMethod: 'transfer',
    paymentReference: input.customerInstagram.trim()
      ? `WEB-${input.customerInstagram.trim()}`
      : 'WEB-CHECKOUT',
    notes: [
      input.notes.trim(),
      `Pickup: ${input.pickupMethod === 'gosend' ? 'GoSend Instant' : 'Ambil di store'}`,
      input.customerEmail.trim() ? `Email invoice: ${input.customerEmail.trim()}` : '',
      input.customerInstagram.trim() ? `Instagram: ${input.customerInstagram.trim()}` : '',
      input.deliveryAddress.trim() ? `Alamat kirim: ${input.deliveryAddress.trim()}` : '',
      input.extraReturnFee > 0 ? `Extra return fee: ${input.extraReturnFee}` : '',
    ]
      .filter(Boolean)
      .join(' / '),
    source: 'catalog',
    createdAt: new Date().toISOString(),
  };
}

export function saveCheckoutPreviewBooking(input: PreviewCheckoutBookingInput) {
  const booking = createCheckoutPreviewBooking(input);
  const storedBookings = readStoredPreviewBookings();
  writeStoredPreviewBookings([booking, ...storedBookings]);
  return booking;
}

function isPreviewBooking(value: unknown): value is PreviewBooking {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const booking = value as Partial<PreviewBooking>;
  return Boolean(
    booking.id &&
      booking.bookingNumber &&
      booking.itemId &&
      booking.itemCode &&
      booking.itemName &&
      booking.customerName &&
      booking.customerWhatsapp &&
      booking.eventDate &&
      booking.pickupDate &&
      booking.returnDate &&
      booking.bufferUntilDate &&
      booking.status,
  );
}

export function getPreviewBookingStatusLabel(status: PreviewBookingStatus) {
  const labels: Record<PreviewBookingStatus, string> = {
    requested: 'Requested',
    payment_submitted: 'Payment submitted',
    dp_confirmed: 'DP confirmed',
    pickup_ready: 'Pickup ready',
    converted_to_rental: 'Converted to rental',
    completed: 'Completed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };

  return labels[status];
}

export function getPreviewBookingStatusClass(status: PreviewBookingStatus) {
  const classes: Record<PreviewBookingStatus, string> = {
    requested: 'border-neutral-200 bg-neutral-50 text-neutral-700',
    payment_submitted: 'border-sky-200 bg-sky-50 text-sky-800',
    dp_confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    pickup_ready: 'border-amber-200 bg-amber-50 text-amber-800',
    converted_to_rental: 'border-violet-200 bg-violet-50 text-violet-800',
    completed: 'border-neutral-200 bg-white text-neutral-500',
    rejected: 'border-red-200 bg-red-50 text-red-700',
    cancelled: 'border-neutral-200 bg-neutral-100 text-neutral-500',
  };

  return classes[status];
}

export function calculatePreviewBookingDates(eventDate: string): BookingDateSet | null {
  if (!eventDate || Number.isNaN(parseDate(eventDate).getTime())) {
    return null;
  }

  return {
    eventDate,
    pickupDate: addDays(eventDate, -1),
    returnDate: addDays(eventDate, 1),
    bufferUntilDate: addDays(eventDate, 2),
  };
}

export function doPreviewBookingDatesOverlap(
  first: Pick<BookingDateSet, 'pickupDate' | 'bufferUntilDate'>,
  second: Pick<BookingDateSet, 'pickupDate' | 'bufferUntilDate'>,
) {
  const firstStart = parseDate(first.pickupDate).getTime();
  const firstEnd = parseDate(first.bufferUntilDate).getTime();
  const secondStart = parseDate(second.pickupDate).getTime();
  const secondEnd = parseDate(second.bufferUntilDate).getTime();

  return firstStart <= secondEnd && secondStart <= firstEnd;
}

export function getBlockingPreviewBookingsForItem(itemId: string, bookings = previewBookings) {
  return bookings.filter(
    (booking) =>
      booking.itemId === itemId && blockingPreviewBookingStatuses.includes(booking.status),
  );
}

export function getPreviewBookingConflict(
  itemId: string,
  dates: BookingDateSet | null,
  bookings = previewBookings,
) {
  if (!dates) {
    return null;
  }

  return (
    getBlockingPreviewBookingsForItem(itemId, bookings).find((booking) =>
      doPreviewBookingDatesOverlap(dates, booking),
    ) ?? null
  );
}

function doesBlockOverlapDates(
  dates: BookingDateSet,
  block: Pick<PreviewAvailabilityBlock, 'startDate' | 'endDate'>,
) {
  return doPreviewBookingDatesOverlap(dates, {
    pickupDate: block.startDate,
    bufferUntilDate: block.endDate,
  });
}

function getTodayDatePart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return formatDatePart(today);
}

export function getPosAvailabilityBlockForBooking(
  item: Pick<KebayaItem, 'id' | 'status' | 'rentalEndDate'>,
  dates: BookingDateSet | null,
  ledger?: PosLedgerState,
): PreviewAvailabilityBlock | null {
  if (!dates) {
    return null;
  }

  const openTransaction = ledger?.transactions.find(
    (transaction) =>
      transaction.itemId === item.id &&
      transaction.kind === 'rental' &&
      transaction.status === 'open',
  );

  if (openTransaction) {
    const startDate = normalizeDatePart(openTransaction.startDate) ?? getTodayDatePart();
    const endDate = normalizeDatePart(openTransaction.dueDate) ?? startDate;
    const block: PreviewAvailabilityBlock = {
      reason: 'rented',
      source: 'pos',
      label: 'Sedang disewa',
      reference: openTransaction.transactionNumber,
      startDate,
      endDate,
    };

    return doesBlockOverlapDates(dates, block) ? block : null;
  }

  const openMaintenance = ledger?.maintenanceHolds.find(
    (hold) => hold.itemId === item.id && hold.status === 'open',
  );

  if (openMaintenance) {
    const startDate = normalizeDatePart(openMaintenance.openedAt) ?? getTodayDatePart();
    const endDate = addDays(startDate, previewMaintenanceBlockDays - 1);
    const block: PreviewAvailabilityBlock = {
      reason: 'maintenance',
      source: 'pos',
      label: 'Sedang dicuci',
      reference: openMaintenance.maintenanceNumber,
      startDate,
      endDate,
    };

    return doesBlockOverlapDates(dates, block) ? block : null;
  }

  if (item.status === 'rented' && item.rentalEndDate) {
    const startDate = getTodayDatePart();
    const endDate = normalizeDatePart(item.rentalEndDate) ?? startDate;
    const block: PreviewAvailabilityBlock = {
      reason: 'rented',
      source: 'catalog',
      label: 'Sedang disewa',
      reference: null,
      startDate,
      endDate,
    };

    return doesBlockOverlapDates(dates, block) ? block : null;
  }

  if (item.status === 'maintenance') {
    const startDate = getTodayDatePart();
    const endDate = addDays(startDate, previewMaintenanceBlockDays - 1);
    const block: PreviewAvailabilityBlock = {
      reason: 'maintenance',
      source: 'catalog',
      label: 'Sedang dicuci',
      reference: null,
      startDate,
      endDate,
    };

    return doesBlockOverlapDates(dates, block) ? block : null;
  }

  return null;
}

export function getPreviewBookingsForItem(itemId: string, bookings = previewBookings) {
  return bookings
    .filter((booking) => booking.itemId === itemId)
    .slice()
    .sort((first, second) => first.pickupDate.localeCompare(second.pickupDate));
}

export function getPreviewBookingSummaryForItem(item: Pick<KebayaItem, 'id'>, bookings = previewBookings) {
  const itemBookings = getPreviewBookingsForItem(item.id, bookings);
  const confirmedBookings = itemBookings.filter((booking) =>
    blockingPreviewBookingStatuses.includes(booking.status),
  );
  const nextConfirmed = confirmedBookings[0] ?? null;
  const latestBuffer = confirmedBookings.reduce<string | null>(
    (latest, booking) =>
      !latest || booking.bufferUntilDate > latest ? booking.bufferUntilDate : latest,
    null,
  );
  const conflictingRequests = itemBookings.filter(
    (booking) => booking.status === 'requested' && Boolean(booking.conflictWith),
  );

  return {
    itemBookings,
    confirmedBookings,
    confirmedCount: confirmedBookings.length,
    requestedCount: itemBookings.filter((booking) => booking.status === 'requested').length,
    paymentSubmittedCount: itemBookings.filter((booking) => booking.status === 'payment_submitted')
      .length,
    nextConfirmed,
    nextPickupDate: nextConfirmed?.pickupDate ?? null,
    nextReturnDate: nextConfirmed?.returnDate ?? null,
    nextAvailableDate: latestBuffer ? addDays(latestBuffer, 1) : null,
    conflictingRequests,
    hasBookingPressure: confirmedBookings.length > 0 || conflictingRequests.length > 0,
  };
}
