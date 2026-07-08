import { getD1Database } from '@/lib/cloudflare';
import { mediaKeyToUrl } from '@/lib/media-library';

export type BookingStatus =
  | 'requested'
  | 'payment_submitted'
  | 'dp_confirmed'
  | 'fitting_link_sent'
  | 'picked_up'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export type BookingSource = 'catalog' | 'whatsapp' | 'walk_in' | 'admin';
export type BookingPickupMethod = 'store' | 'gosend';

export type BookingDateSet = {
  pickupDate: string;
  eventDate: string;
  returnStartDate: string;
  returnDueDate: string;
  maintenanceStartDate: string;
  maintenanceEndDate: string;
};

export type BookingAvailabilityBlock = {
  source: 'pos_transaction' | 'pos_maintenance' | 'booking' | 'legacy_catalog';
  reason: 'rented' | 'maintenance' | 'booking';
  label: string;
  reference: string | null;
  itemId: string;
  startDate: string;
  endDate: string;
};

export type CreateBookingInput = {
  itemIds: string[];
  pickupDate: string;
  eventDate?: string;
  returnDueDate?: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail?: string;
  customerInstagram?: string;
  pickupMethod?: BookingPickupMethod;
  deliveryAddress?: string;
  notes?: string;
  source?: BookingSource;
  status?: Extract<BookingStatus, 'requested' | 'payment_submitted'>;
  dpPerItem?: number;
  instagramDiscountAmount?: number;
  extraReturnFeeTotal?: number;
  rentalEstimateTotal?: number;
  paymentReference?: string;
  createdBy?: string;
};

export type BookingQueueRow = {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  source: BookingSource;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string | null;
  customerInstagram: string | null;
  pickupMethod: BookingPickupMethod;
  deliveryAddress: string | null;
  notes: string;
  rejectedReason: string | null;
  cancelledReason: string | null;
  dpTotal: number;
  instagramDiscountAmount: number;
  extraReturnFeeTotal: number;
  rentalEstimateTotal: number;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  firstPickupDate: string | null;
  firstEventDate: string | null;
  lastReturnDueDate: string | null;
  lastMaintenanceEndDate: string | null;
  firstItemId: string | null;
  firstItemCode: string | null;
  firstItemName: string | null;
  itemLabel: string | null;
  paymentStatus: string | null;
  paymentReference: string | null;
  proofCount: number;
  proofUrl: string | null;
  proofFilename: string | null;
  receiptNumber: string | null;
  receiptIssuedAt: string | null;
};

export type BookingInvoiceSnapshot = {
  bookingNumber: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string | null;
  customerInstagram: string | null;
  pickupMethod: BookingPickupMethod;
  deliveryAddress: string | null;
  notes: string;
  itemCount: number;
  items: Array<{
    itemCode: string;
    itemName: string;
    rentalPrice: number;
    dpAmount: number;
    extraReturnFee: number;
    pickupDate: string;
    eventDate: string;
    returnDueDate: string;
  }>;
  paymentReference: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  rentalEstimateTotal: number;
  extraReturnFeeTotal: number;
  bank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    isConfigured: boolean;
  };
};

export type BookingInvoiceRecord = {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  htmlSnapshot: string | null;
  r2Key: string | null;
  url: string | null;
  issuedAt: string;
};

export type BookingReceiptRecord = {
  id: string;
  bookingId: string;
  receiptNumber: string;
  receiptType: string;
  status: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  htmlSnapshot: string | null;
  r2Key: string | null;
  url: string | null;
  issuedAt: string;
};

export type CloseBookingAction = 'reject' | 'cancel';

type CatalogItemRow = {
  id: string;
  code: string;
  name: string;
  rental_price: number;
  status: string;
  rental_end_date: string | null;
};

type BookingItemRow = {
  id: string;
  item_id: string;
  pickup_date: string;
  event_date: string;
  return_due_date: string;
  maintenance_end_date: string;
};

type PaymentRow = {
  id: string;
  status: string;
  amount_due: number;
  reference: string;
};

type BookingInvoiceSource = {
  bookingStatus: BookingStatus;
  snapshot: BookingInvoiceSnapshot;
};

const bookingBlockingStatuses: BookingStatus[] = [
  'dp_confirmed',
  'fitting_link_sent',
  'picked_up',
];

const defaultDpPerItem = 100000;
const extraReturnFeePerDay = 100000;

export class BookingDbError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'BOOKING_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeOptionalText(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

function normalizeAmount(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
}

function parseDatePart(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDatePart(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeDatePart(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const datePart = value.slice(0, 10);
  const date = parseDatePart(datePart);

  return Number.isNaN(date.getTime()) ? null : formatDatePart(date);
}

function addDays(value: string, days: number) {
  const date = parseDatePart(value);
  date.setDate(date.getDate() + days);
  return formatDatePart(date);
}

function getTodayDatePart() {
  return formatDatePart(new Date());
}

function getDayDifference(startDate: string, endDate: string) {
  const start = parseDatePart(startDate).getTime();
  const end = parseDatePart(endDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0;
  }

  return Math.max(0, Math.round((end - start) / 86400000));
}

function makeBookingNumber(pickupDate: string) {
  const month = pickupDate.slice(0, 7).replace('-', '');
  const suffix = Date.now().toString().slice(-4);

  return `BK-${month}-${suffix}`;
}

function makeInvoiceNumber(bookingNumber: string) {
  return `INV-${bookingNumber.replace(/^BK-/, '')}`;
}

function makeReceiptNumber(bookingNumber: string) {
  return `RCP-${bookingNumber.replace(/^BK-/, '')}`;
}

function getBookingBankConfig() {
  const bankName = normalizeText(process.env.FARSHA_BANK_NAME);
  const accountName = normalizeText(process.env.FARSHA_BANK_ACCOUNT_NAME);
  const accountNumber = normalizeText(process.env.FARSHA_BANK_ACCOUNT_NUMBER);

  return {
    bankName,
    accountName,
    accountNumber,
    isConfigured: Boolean(bankName && accountName && accountNumber),
  };
}

function hasMissingMigration(error: unknown) {
  const message = String(error);
  return message.includes('no such table') || message.includes('no such column');
}

export function calculateBookingDatesFromPickup(
  pickupDateValue: string,
  returnDueDateValue?: string | null,
): BookingDateSet | null {
  const pickupDate = normalizeDatePart(pickupDateValue);

  if (!pickupDate) {
    return null;
  }

  const eventDate = addDays(pickupDate, 1);
  const returnStartDate = addDays(pickupDate, 2);
  const defaultReturnDueDate = addDays(pickupDate, 2);
  const requestedReturnDate = returnDueDateValue ? normalizeDatePart(returnDueDateValue) : null;
  const returnDueDate =
    requestedReturnDate && requestedReturnDate > defaultReturnDueDate
      ? requestedReturnDate
      : defaultReturnDueDate;

  return {
    pickupDate,
    eventDate,
    returnStartDate,
    returnDueDate,
    maintenanceStartDate: addDays(returnDueDate, 1),
    maintenanceEndDate: addDays(returnDueDate, 2),
  };
}

export function doesDateRangeOverlap(
  firstStartDate: string,
  firstEndDate: string,
  secondStartDate: string,
  secondEndDate: string,
) {
  return firstStartDate <= secondEndDate && secondStartDate <= firstEndDate;
}

async function getCatalogItemsByIds(db: D1Database, itemIds: string[]) {
  const uniqueItemIds = Array.from(new Set(itemIds.map((itemId) => itemId.trim()).filter(Boolean)));

  if (uniqueItemIds.length === 0) {
    throw new BookingDbError('Pilih minimal satu item kebaya.');
  }

  const results = await db.batch(
    uniqueItemIds.map((itemId) =>
      db
        .prepare(
          `SELECT id, code, name, rental_price, status, rental_end_date
           FROM kebaya_items
           WHERE id = ? AND status != 'archived'
           LIMIT 1`,
        )
        .bind(itemId),
    ),
  );

  const items = results
    .map((result) => result.results?.[0] as CatalogItemRow | undefined)
    .filter((item): item is CatalogItemRow => Boolean(item));

  if (items.length !== uniqueItemIds.length) {
    throw new BookingDbError('Ada item kebaya yang tidak ditemukan.', 404, 'ITEM_NOT_FOUND');
  }

  return items;
}

async function getBlockingBookingConflict(
  db: D1Database,
  itemId: string,
  dates: Pick<BookingDateSet, 'pickupDate' | 'maintenanceEndDate'>,
  excludedBookingId?: string,
) {
  const excludedClause = excludedBookingId ? 'AND b.id != ?' : '';
  const params = excludedBookingId
    ? [
        itemId,
        dates.maintenanceEndDate,
        dates.pickupDate,
        excludedBookingId,
      ]
    : [itemId, dates.maintenanceEndDate, dates.pickupDate];

  return db
    .prepare(
      `SELECT b.booking_number AS reference, bi.pickup_date AS start_date, bi.maintenance_end_date AS end_date
       FROM booking_items bi
       JOIN bookings b ON b.id = bi.booking_id
       WHERE bi.item_id = ?
         AND bi.item_status = 'active'
         AND b.status IN ('dp_confirmed', 'fitting_link_sent', 'picked_up')
         AND bi.pickup_date <= ?
         AND bi.maintenance_end_date >= ?
         ${excludedClause}
       ORDER BY bi.pickup_date ASC
       LIMIT 1`,
    )
    .bind(...params)
    .first<{ reference: string; start_date: string; end_date: string }>();
}

export async function getAvailabilityConflictForDates(
  db: D1Database,
  itemId: string,
  dates: Pick<BookingDateSet, 'pickupDate' | 'maintenanceEndDate'>,
  excludedBookingId?: string,
): Promise<BookingAvailabilityBlock | null> {
  try {
    const posTransaction = await db
      .prepare(
        `SELECT transaction_number, start_date, COALESCE(due_date, start_date) AS end_date
         FROM pos_transactions
         WHERE item_id = ?
           AND kind = 'rental'
           AND status = 'open'
           AND start_date <= ?
           AND COALESCE(due_date, start_date) >= ?
         ORDER BY start_date ASC
         LIMIT 1`,
      )
      .bind(itemId, dates.maintenanceEndDate, dates.pickupDate)
      .first<{ transaction_number: string; start_date: string; end_date: string }>();

    if (posTransaction) {
      return {
        source: 'pos_transaction',
        reason: 'rented',
        label: 'Sedang disewa',
        reference: posTransaction.transaction_number,
        itemId,
        startDate: posTransaction.start_date,
        endDate: posTransaction.end_date,
      };
    }

    const maintenance = await db
      .prepare(
        `SELECT maintenance_number,
                substr(opened_at, 1, 10) AS start_date,
                COALESCE(substr(auto_release_at, 1, 10), date(substr(opened_at, 1, 10), '+2 day')) AS end_date
         FROM pos_maintenance_holds
         WHERE item_id = ?
           AND status = 'open'
           AND substr(opened_at, 1, 10) <= ?
           AND COALESCE(substr(auto_release_at, 1, 10), date(substr(opened_at, 1, 10), '+2 day')) >= ?
         ORDER BY opened_at ASC
         LIMIT 1`,
      )
      .bind(itemId, dates.maintenanceEndDate, dates.pickupDate)
      .first<{ maintenance_number: string; start_date: string; end_date: string }>();

    if (maintenance) {
      return {
        source: 'pos_maintenance',
        reason: 'maintenance',
        label: 'Sedang dicuci',
        reference: maintenance.maintenance_number,
        itemId,
        startDate: maintenance.start_date,
        endDate: maintenance.end_date,
      };
    }

    const booking = await getBlockingBookingConflict(db, itemId, dates, excludedBookingId);

    if (booking) {
      return {
        source: 'booking',
        reason: 'booking',
        label: 'Tanggal sudah ter-booking',
        reference: booking.reference,
        itemId,
        startDate: booking.start_date,
        endDate: booking.end_date,
      };
    }

    const legacyItem = await db
      .prepare(
        `SELECT id, status, rental_end_date
         FROM kebaya_items
         WHERE id = ?
         LIMIT 1`,
      )
      .bind(itemId)
      .first<{ id: string; status: string; rental_end_date: string | null }>();

    if (legacyItem?.status === 'rented' && legacyItem.rental_end_date) {
      const startDate = getTodayDatePart();
      const endDate = normalizeDatePart(legacyItem.rental_end_date) ?? startDate;

      if (doesDateRangeOverlap(dates.pickupDate, dates.maintenanceEndDate, startDate, endDate)) {
        return {
          source: 'legacy_catalog',
          reason: 'rented',
          label: 'Sedang disewa',
          reference: null,
          itemId,
          startDate,
          endDate,
        };
      }
    }

    if (legacyItem?.status === 'maintenance') {
      const startDate = getTodayDatePart();
      const endDate = addDays(startDate, 2);

      if (doesDateRangeOverlap(dates.pickupDate, dates.maintenanceEndDate, startDate, endDate)) {
        return {
          source: 'legacy_catalog',
          reason: 'maintenance',
          label: 'Sedang dicuci',
          reference: null,
          itemId,
          startDate,
          endDate,
        };
      }
    }

    return null;
  } catch (error) {
    if (hasMissingMigration(error)) {
      return null;
    }

    throw error;
  }
}

export async function listAvailabilityBlocksForItem(
  itemId: string,
  rangeStartDate: string,
  rangeEndDate: string,
) {
  const db = await getD1Database();
  const blocks: BookingAvailabilityBlock[] = [];

  try {
    const transactions = await db
      .prepare(
        `SELECT transaction_number, start_date, COALESCE(due_date, start_date) AS end_date
         FROM pos_transactions
         WHERE item_id = ?
           AND kind = 'rental'
           AND status = 'open'
           AND start_date <= ?
           AND COALESCE(due_date, start_date) >= ?
         ORDER BY start_date ASC`,
      )
      .bind(itemId, rangeEndDate, rangeStartDate)
      .all<{ transaction_number: string; start_date: string; end_date: string }>();

    blocks.push(
      ...transactions.results.map((transaction) => ({
        source: 'pos_transaction' as const,
        reason: 'rented' as const,
        label: 'Sedang disewa',
        reference: transaction.transaction_number,
        itemId,
        startDate: transaction.start_date,
        endDate: transaction.end_date,
      })),
    );

    const maintenanceHolds = await db
      .prepare(
        `SELECT maintenance_number,
                substr(opened_at, 1, 10) AS start_date,
                COALESCE(substr(auto_release_at, 1, 10), date(substr(opened_at, 1, 10), '+2 day')) AS end_date
         FROM pos_maintenance_holds
         WHERE item_id = ?
           AND status = 'open'
           AND substr(opened_at, 1, 10) <= ?
           AND COALESCE(substr(auto_release_at, 1, 10), date(substr(opened_at, 1, 10), '+2 day')) >= ?
         ORDER BY opened_at ASC`,
      )
      .bind(itemId, rangeEndDate, rangeStartDate)
      .all<{ maintenance_number: string; start_date: string; end_date: string }>();

    blocks.push(
      ...maintenanceHolds.results.map((maintenance) => ({
        source: 'pos_maintenance' as const,
        reason: 'maintenance' as const,
        label: 'Sedang dicuci',
        reference: maintenance.maintenance_number,
        itemId,
        startDate: maintenance.start_date,
        endDate: maintenance.end_date,
      })),
    );

    const bookings = await db
      .prepare(
        `SELECT b.booking_number, bi.pickup_date, bi.maintenance_end_date
         FROM booking_items bi
         JOIN bookings b ON b.id = bi.booking_id
         WHERE bi.item_id = ?
           AND bi.item_status = 'active'
           AND b.status IN ('dp_confirmed', 'fitting_link_sent', 'picked_up')
           AND bi.pickup_date <= ?
           AND bi.maintenance_end_date >= ?
         ORDER BY bi.pickup_date ASC`,
      )
      .bind(itemId, rangeEndDate, rangeStartDate)
      .all<{ booking_number: string; pickup_date: string; maintenance_end_date: string }>();

    blocks.push(
      ...bookings.results.map((booking) => ({
        source: 'booking' as const,
        reason: 'booking' as const,
        label: 'Tanggal sudah ter-booking',
        reference: booking.booking_number,
        itemId,
        startDate: booking.pickup_date,
        endDate: booking.maintenance_end_date,
      })),
    );
  } catch (error) {
    if (!hasMissingMigration(error)) {
      throw error;
    }
  }

  const legacyItem = await db
    .prepare(
      `SELECT status, rental_end_date
       FROM kebaya_items
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(itemId)
    .first<{ status: string; rental_end_date: string | null }>();

  if (legacyItem?.status === 'rented' && legacyItem.rental_end_date) {
    const startDate = getTodayDatePart();
    const endDate = normalizeDatePart(legacyItem.rental_end_date) ?? startDate;

    if (doesDateRangeOverlap(rangeStartDate, rangeEndDate, startDate, endDate)) {
      blocks.push({
        source: 'legacy_catalog',
        reason: 'rented',
        label: 'Sedang disewa',
        reference: null,
        itemId,
        startDate,
        endDate,
      });
    }
  }

  if (legacyItem?.status === 'maintenance') {
    const startDate = getTodayDatePart();
    const endDate = addDays(startDate, 2);

    if (doesDateRangeOverlap(rangeStartDate, rangeEndDate, startDate, endDate)) {
      blocks.push({
        source: 'legacy_catalog',
        reason: 'maintenance',
        label: 'Sedang dicuci',
        reference: null,
        itemId,
        startDate,
        endDate,
      });
    }
  }

  return blocks;
}

export async function createBooking(input: CreateBookingInput) {
  const db = await getD1Database();
  const pickupDate = normalizeDatePart(input.pickupDate);

  if (!pickupDate) {
    throw new BookingDbError('Tanggal pickup tidak valid.');
  }

  const dates = calculateBookingDatesFromPickup(pickupDate, input.returnDueDate);

  if (!dates) {
    throw new BookingDbError('Tanggal booking tidak valid.');
  }

  if (input.eventDate && normalizeDatePart(input.eventDate) !== dates.eventDate) {
    throw new BookingDbError('Tanggal acara tidak sesuai dengan tanggal pickup.');
  }

  const customerName = normalizeText(input.customerName);
  const customerWhatsapp = normalizeText(input.customerWhatsapp);

  if (!customerName) {
    throw new BookingDbError('Nama customer wajib diisi.');
  }

  if (!customerWhatsapp) {
    throw new BookingDbError('Nomor WhatsApp wajib diisi.');
  }

  const items = await getCatalogItemsByIds(db, input.itemIds);

  for (const item of items) {
    const conflict = await getAvailabilityConflictForDates(db, item.id, dates);

    if (conflict) {
      throw new BookingDbError(
        `${item.code} tidak tersedia pada tanggal tersebut.`,
        409,
        'BOOKING_DATE_CONFLICT',
      );
    }
  }

  const bookingId = createId('booking');
  const bookingNumber = makeBookingNumber(dates.pickupDate);
  const dpPerItem = normalizeAmount(input.dpPerItem, defaultDpPerItem);
  const dpTotal = dpPerItem * items.length;
  const instagramDiscountAmount = normalizeAmount(input.instagramDiscountAmount);
  const extraReturnDays = getDayDifference(addDays(dates.pickupDate, 2), dates.returnDueDate);
  const extraReturnFeeTotal =
    input.extraReturnFeeTotal !== undefined
      ? normalizeAmount(input.extraReturnFeeTotal)
      : extraReturnDays * extraReturnFeePerDay * items.length;
  const rentalEstimateTotal =
    input.rentalEstimateTotal !== undefined
      ? normalizeAmount(input.rentalEstimateTotal)
      : items.reduce((sum, item) => sum + item.rental_price, 0) + extraReturnFeeTotal;
  const paymentId = createId('booking-payment');
  const status = input.status === 'payment_submitted' ? 'payment_submitted' : 'requested';

  const statements = [
    db
      .prepare(
        `INSERT INTO bookings (
          id,
          booking_number,
          status,
          source,
          customer_name,
          customer_whatsapp,
          customer_email,
          customer_instagram,
          pickup_method,
          delivery_address,
          notes,
          dp_total,
          instagram_discount_amount,
          extra_return_fee_total,
          rental_estimate_total,
          created_by,
          updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        bookingId,
        bookingNumber,
        status,
        input.source ?? 'catalog',
        customerName,
        customerWhatsapp,
        normalizeOptionalText(input.customerEmail),
        normalizeOptionalText(input.customerInstagram),
        input.pickupMethod === 'gosend' ? 'gosend' : 'store',
        normalizeOptionalText(input.deliveryAddress),
        normalizeText(input.notes),
        dpTotal,
        instagramDiscountAmount,
        extraReturnFeeTotal,
        rentalEstimateTotal,
        normalizeOptionalText(input.createdBy),
        normalizeOptionalText(input.createdBy),
      ),
    ...items.map((item) =>
      db
        .prepare(
          `INSERT INTO booking_items (
            id,
            booking_id,
            item_id,
            item_code,
            item_name,
            rental_price_snapshot,
            dp_amount,
            extra_return_fee,
            pickup_date,
            event_date,
            return_start_date,
            return_due_date,
            maintenance_start_date,
            maintenance_end_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          createId('booking-item'),
          bookingId,
          item.id,
          item.code,
          item.name,
          item.rental_price,
          dpPerItem,
          extraReturnDays * extraReturnFeePerDay,
          dates.pickupDate,
          dates.eventDate,
          dates.returnStartDate,
          dates.returnDueDate,
          dates.maintenanceStartDate,
          dates.maintenanceEndDate,
        ),
    ),
    db
      .prepare(
        `INSERT INTO booking_payments (
          id,
          booking_id,
          status,
          amount_due,
          amount_paid,
          method,
          reference
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        paymentId,
        bookingId,
        status === 'payment_submitted' ? 'submitted' : 'pending',
        Math.max(dpTotal - instagramDiscountAmount, 0),
        0,
        'transfer',
        normalizeText(input.paymentReference),
      ),
    db
      .prepare(
        `INSERT INTO booking_status_history (
          id,
          booking_id,
          from_status,
          to_status,
          action,
          note,
          actor
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        createId('booking-history'),
        bookingId,
        null,
        status,
        'create',
        input.source === 'whatsapp' || input.source === 'admin'
          ? 'Manual booking created.'
          : 'Catalog booking request created.',
        normalizeOptionalText(input.createdBy),
      ),
  ];

  await db.batch(statements);

  return {
    id: bookingId,
    bookingNumber,
    status,
    dates,
    itemCount: items.length,
    dpTotal,
    payNowTotal: Math.max(dpTotal - instagramDiscountAmount, 0),
  };
}

export async function listBookingQueue() {
  const db = await getD1Database();

  try {
    const result = await db
      .prepare(
        `SELECT b.id,
                b.booking_number AS bookingNumber,
                b.status,
                b.source,
                b.customer_name AS customerName,
                b.customer_whatsapp AS customerWhatsapp,
                b.customer_email AS customerEmail,
                b.customer_instagram AS customerInstagram,
                b.pickup_method AS pickupMethod,
                b.delivery_address AS deliveryAddress,
                b.notes,
                b.rejected_reason AS rejectedReason,
                b.cancelled_reason AS cancelledReason,
                b.dp_total AS dpTotal,
                b.instagram_discount_amount AS instagramDiscountAmount,
                b.extra_return_fee_total AS extraReturnFeeTotal,
                b.rental_estimate_total AS rentalEstimateTotal,
                b.created_at AS createdAt,
                b.updated_at AS updatedAt,
                COUNT(DISTINCT bi.id) AS itemCount,
                MIN(bi.pickup_date) AS firstPickupDate,
                MIN(bi.event_date) AS firstEventDate,
                MAX(bi.return_due_date) AS lastReturnDueDate,
                MAX(bi.maintenance_end_date) AS lastMaintenanceEndDate,
                MIN(bi.item_id) AS firstItemId,
                MIN(bi.item_code) AS firstItemCode,
                MIN(bi.item_name) AS firstItemName,
                MIN(bi.item_code || ' / ' || bi.item_name) AS itemLabel,
                MAX(bp.status) AS paymentStatus,
                MAX(bp.reference) AS paymentReference,
                COUNT(DISTINCT bpp.id) AS proofCount,
                MAX(bpp.url) AS proofUrl,
                MAX(bpp.filename) AS proofFilename,
                MAX(br.receipt_number) AS receiptNumber,
                MAX(br.issued_at) AS receiptIssuedAt
         FROM bookings b
         LEFT JOIN booking_items bi ON bi.booking_id = b.id
         LEFT JOIN booking_payments bp ON bp.booking_id = b.id
         LEFT JOIN booking_payment_proofs bpp ON bpp.booking_id = b.id
         LEFT JOIN booking_receipts br ON br.booking_id = b.id AND br.status = 'paid'
         GROUP BY b.id
         ORDER BY b.created_at DESC`,
      )
      .all<BookingQueueRow>();

    return result.results;
  } catch (error) {
    if (hasMissingMigration(error)) {
      return [];
    }

    throw error;
  }
}

export async function recordBookingPaymentProof(input: {
  bookingId: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedBy?: string | null;
}) {
  const db = await getD1Database();
  const booking = await db
    .prepare(
      `SELECT id, status
       FROM bookings
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(input.bookingId)
    .first<{ id: string; status: BookingStatus }>();

  if (!booking) {
    throw new BookingDbError('Booking tidak ditemukan.', 404, 'BOOKING_NOT_FOUND');
  }

  const payment = await db
    .prepare(
      `SELECT id, status, amount_due, reference
       FROM booking_payments
       WHERE booking_id = ? AND payment_type = 'dp'
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(input.bookingId)
    .first<PaymentRow>();

  if (!payment) {
    throw new BookingDbError('Data pembayaran Biaya Booking belum tersedia.', 404, 'PAYMENT_NOT_FOUND');
  }

  const proofId = createId('booking-proof');
  const nextBookingStatus =
    booking.status === 'requested' ? 'payment_submitted' : booking.status;
  const url = mediaKeyToUrl(input.key);

  await db.batch([
    db
      .prepare(
        `INSERT INTO booking_payment_proofs (
          id,
          payment_id,
          booking_id,
          r2_key,
          url,
          filename,
          content_type,
          size,
          uploaded_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        proofId,
        payment.id,
        input.bookingId,
        input.key,
        url,
        input.filename,
        input.contentType,
        normalizeAmount(input.size),
        normalizeOptionalText(input.uploadedBy),
      ),
    db
      .prepare(
        `UPDATE booking_payments
         SET status = 'submitted',
             amount_paid = CASE WHEN amount_paid = 0 THEN amount_due ELSE amount_paid END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(payment.id),
    db
      .prepare(
        `UPDATE bookings
         SET status = ?,
             updated_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(nextBookingStatus, normalizeOptionalText(input.uploadedBy), input.bookingId),
    db
      .prepare(
        `INSERT INTO booking_status_history (
          id,
          booking_id,
          from_status,
          to_status,
          action,
          note,
          actor
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        createId('booking-history'),
        input.bookingId,
        booking.status,
        nextBookingStatus,
        'payment_proof_uploaded',
        `Bukti transfer uploaded: ${input.filename}`,
        normalizeOptionalText(input.uploadedBy),
      ),
  ]);

  return { id: proofId, url, key: input.key, status: nextBookingStatus };
}

async function getBookingInvoiceRecord(db: D1Database, bookingId: string) {
  return db
    .prepare(
      `SELECT id,
              booking_id AS bookingId,
              invoice_number AS invoiceNumber,
              invoice_type AS invoiceType,
              status,
              subtotal_amount AS subtotalAmount,
              discount_amount AS discountAmount,
              total_amount AS totalAmount,
              html_snapshot AS htmlSnapshot,
              r2_key AS r2Key,
              url,
              issued_at AS issuedAt
       FROM booking_invoices
       WHERE booking_id = ?
       ORDER BY issued_at DESC
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<BookingInvoiceRecord>();
}

async function getBookingReceiptRecord(db: D1Database, bookingId: string) {
  return db
    .prepare(
      `SELECT id,
              booking_id AS bookingId,
              receipt_number AS receiptNumber,
              receipt_type AS receiptType,
              status,
              subtotal_amount AS subtotalAmount,
              discount_amount AS discountAmount,
              total_amount AS totalAmount,
              html_snapshot AS htmlSnapshot,
              r2_key AS r2Key,
              url,
              issued_at AS issuedAt
       FROM booking_receipts
       WHERE booking_id = ?
       ORDER BY issued_at DESC
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<BookingReceiptRecord>();
}

async function buildBookingInvoiceSource(db: D1Database, bookingId: string): Promise<BookingInvoiceSource> {
  const booking = await db
    .prepare(
      `SELECT id,
              booking_number,
              status,
              customer_name,
              customer_whatsapp,
              customer_email,
              customer_instagram,
              pickup_method,
              delivery_address,
              notes,
              dp_total,
              instagram_discount_amount,
              extra_return_fee_total,
              rental_estimate_total
       FROM bookings
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<{
      id: string;
      booking_number: string;
      status: BookingStatus;
      customer_name: string;
      customer_whatsapp: string;
      customer_email: string | null;
      customer_instagram: string | null;
      pickup_method: BookingPickupMethod;
      delivery_address: string | null;
      notes: string;
      dp_total: number;
      instagram_discount_amount: number;
      extra_return_fee_total: number;
      rental_estimate_total: number;
    }>();

  if (!booking) {
    throw new BookingDbError('Booking tidak ditemukan.', 404, 'BOOKING_NOT_FOUND');
  }

  const items = await db
    .prepare(
      `SELECT item_code AS itemCode,
              item_name AS itemName,
              rental_price_snapshot AS rentalPrice,
              dp_amount AS dpAmount,
              extra_return_fee AS extraReturnFee,
              pickup_date AS pickupDate,
              event_date AS eventDate,
              return_due_date AS returnDueDate
       FROM booking_items
       WHERE booking_id = ? AND item_status = 'active'
       ORDER BY created_at ASC`,
    )
    .bind(bookingId)
    .all<BookingInvoiceSnapshot['items'][number]>();
  const payment = await db
    .prepare(
      `SELECT reference
       FROM booking_payments
       WHERE booking_id = ? AND payment_type = 'dp'
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<{ reference: string | null }>();
  const subtotalAmount = normalizeAmount(booking.dp_total);
  const discountAmount = Math.min(normalizeAmount(booking.instagram_discount_amount), subtotalAmount);
  const totalAmount = Math.max(subtotalAmount - discountAmount, 0);

  return {
    bookingStatus: booking.status,
    snapshot: {
      bookingNumber: booking.booking_number,
      customerName: booking.customer_name,
      customerWhatsapp: booking.customer_whatsapp,
      customerEmail: booking.customer_email,
      customerInstagram: booking.customer_instagram,
      pickupMethod: booking.pickup_method,
      deliveryAddress: booking.delivery_address,
      notes: booking.notes,
      itemCount: items.results.length,
      items: items.results,
      paymentReference: normalizeOptionalText(payment?.reference),
      subtotalAmount,
      discountAmount,
      totalAmount,
      rentalEstimateTotal: normalizeAmount(booking.rental_estimate_total),
      extraReturnFeeTotal: normalizeAmount(booking.extra_return_fee_total),
      bank: getBookingBankConfig(),
    },
  };
}

function makeBookingReceiptInsert(
  db: D1Database,
  input: {
    id: string;
    bookingId: string;
    receiptNumber: string;
    snapshot: BookingInvoiceSnapshot;
    createdBy?: string | null;
  },
) {
  return db
    .prepare(
      `INSERT INTO booking_receipts (
        id,
        booking_id,
        receipt_number,
        subtotal_amount,
        discount_amount,
        total_amount,
        html_snapshot,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.bookingId,
      input.receiptNumber,
      input.snapshot.subtotalAmount,
      input.snapshot.discountAmount,
      input.snapshot.totalAmount,
      JSON.stringify(input.snapshot),
      normalizeOptionalText(input.createdBy),
    );
}

function makeBookingInvoiceInsert(
  db: D1Database,
  input: {
    id: string;
    bookingId: string;
    invoiceNumber: string;
    snapshot: BookingInvoiceSnapshot;
    createdBy?: string | null;
  },
) {
  return db
    .prepare(
      `INSERT INTO booking_invoices (
        id,
        booking_id,
        invoice_number,
        subtotal_amount,
        discount_amount,
        total_amount,
        html_snapshot,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.id,
      input.bookingId,
      input.invoiceNumber,
      input.snapshot.subtotalAmount,
      input.snapshot.discountAmount,
      input.snapshot.totalAmount,
      JSON.stringify(input.snapshot),
      normalizeOptionalText(input.createdBy),
    );
}

export async function generateBookingInvoice(bookingId: string, actor?: string | null) {
  const db = await getD1Database();
  const existingInvoice = await getBookingInvoiceRecord(db, bookingId);

  if (existingInvoice) {
    return existingInvoice;
  }

  const invoiceId = createId('booking-invoice');
  const { bookingStatus, snapshot } = await buildBookingInvoiceSource(db, bookingId);
  const invoiceNumber = makeInvoiceNumber(snapshot.bookingNumber);

  await db.batch([
    makeBookingInvoiceInsert(db, {
      id: invoiceId,
      bookingId,
      invoiceNumber,
      snapshot,
      createdBy: actor,
    }),
    db
      .prepare(
        `INSERT INTO booking_status_history (
          id,
          booking_id,
          from_status,
          to_status,
          action,
          note,
          actor
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        createId('booking-history'),
        bookingId,
        bookingStatus,
        bookingStatus,
        'invoice_generated',
        'Booking fee invoice generated.',
        normalizeOptionalText(actor),
      ),
  ]);

  const invoice = await getBookingInvoiceRecord(db, bookingId);

  if (!invoice) {
    throw new BookingDbError('Invoice belum bisa dibuat.', 500, 'INVOICE_CREATE_FAILED');
  }

  return invoice;
}

export async function generateBookingReceipt(bookingId: string, actor?: string | null) {
  const db = await getD1Database();
  const existingReceipt = await getBookingReceiptRecord(db, bookingId);

  if (existingReceipt) {
    return existingReceipt;
  }

  const { bookingStatus, snapshot } = await buildBookingInvoiceSource(db, bookingId);

  if (!['dp_confirmed', 'fitting_link_sent', 'picked_up', 'completed'].includes(bookingStatus)) {
    throw new BookingDbError(
      'Receipt baru bisa dibuat setelah Biaya Booking dikonfirmasi.',
      409,
      'DP_NOT_CONFIRMED',
    );
  }

  const receiptId = createId('booking-receipt');
  const receiptNumber = makeReceiptNumber(snapshot.bookingNumber);

  await db.batch([
    makeBookingReceiptInsert(db, {
      id: receiptId,
      bookingId,
      receiptNumber,
      snapshot,
      createdBy: actor,
    }),
    db
      .prepare(
        `INSERT INTO booking_status_history (
          id,
          booking_id,
          from_status,
          to_status,
          action,
          note,
          actor
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        createId('booking-history'),
        bookingId,
        bookingStatus,
        bookingStatus,
        'receipt_generated',
        'Paid booking fee receipt generated.',
        normalizeOptionalText(actor),
      ),
  ]);

  const receipt = await getBookingReceiptRecord(db, bookingId);

  if (!receipt) {
    throw new BookingDbError('Receipt belum bisa dibuat.', 500, 'RECEIPT_CREATE_FAILED');
  }

  return receipt;
}

export async function confirmBookingDp(bookingId: string, actor?: string | null) {
  const db = await getD1Database();
  const booking = await db
    .prepare(
      `SELECT id, booking_number, status, dp_total, instagram_discount_amount
       FROM bookings
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<{
      id: string;
      booking_number: string;
      status: BookingStatus;
      dp_total: number;
      instagram_discount_amount: number;
    }>();

  if (!booking) {
    throw new BookingDbError('Booking tidak ditemukan.', 404, 'BOOKING_NOT_FOUND');
  }

  const payment = await db
    .prepare(
      `SELECT id, status, amount_due, reference
       FROM booking_payments
       WHERE booking_id = ? AND payment_type = 'dp'
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<PaymentRow>();

  if (!payment) {
    throw new BookingDbError('Data pembayaran Biaya Booking belum tersedia.', 404, 'PAYMENT_NOT_FOUND');
  }

  const proofCount = await db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM booking_payment_proofs
       WHERE booking_id = ?`,
    )
    .bind(bookingId)
    .first<{ total: number }>();

  if (!proofCount?.total) {
    throw new BookingDbError(
      'Upload bukti transfer sebelum konfirmasi Biaya Booking.',
      409,
      'PAYMENT_PROOF_REQUIRED',
    );
  }

  const bookingItems = await db
    .prepare(
      `SELECT id, item_id, pickup_date, event_date, return_due_date, maintenance_end_date
       FROM booking_items
       WHERE booking_id = ? AND item_status = 'active'`,
    )
    .bind(bookingId)
    .all<BookingItemRow>();

  for (const item of bookingItems.results) {
    const conflict = await getAvailabilityConflictForDates(
      db,
      item.item_id,
      {
        pickupDate: item.pickup_date,
        maintenanceEndDate: item.maintenance_end_date,
      },
      bookingId,
    );

    if (conflict) {
      throw new BookingDbError(
        `Tanggal bentrok dengan ${conflict.reference ?? conflict.label}.`,
        409,
        'BOOKING_DATE_CONFLICT',
      );
    }
  }

  const existingInvoice = await getBookingInvoiceRecord(db, bookingId);
  const invoiceId = existingInvoice?.id ?? createId('booking-invoice');
  const invoiceNumber = existingInvoice?.invoiceNumber ?? makeInvoiceNumber(booking.booking_number);
  const { snapshot } = await buildBookingInvoiceSource(db, bookingId);
  const invoiceStatements = existingInvoice
    ? []
    : [
        makeBookingInvoiceInsert(db, {
          id: invoiceId,
          bookingId,
          invoiceNumber,
          snapshot,
          createdBy: actor,
        }),
      ];

  await db.batch([
    db
      .prepare(
        `UPDATE bookings
         SET status = 'dp_confirmed',
             confirmation_conflict_checked_at = CURRENT_TIMESTAMP,
             updated_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(normalizeOptionalText(actor), bookingId),
    db
      .prepare(
        `UPDATE booking_payments
         SET status = 'verified',
             verified_by = ?,
             verified_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(normalizeOptionalText(actor), payment.id),
    ...invoiceStatements,
    db
      .prepare(
        `INSERT INTO booking_status_history (
          id,
          booking_id,
          from_status,
          to_status,
          action,
          note,
          actor
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        createId('booking-history'),
        bookingId,
        booking.status,
        'dp_confirmed',
        'confirm_dp',
        'Booking fee verified and date block activated.',
        normalizeOptionalText(actor),
      ),
  ]);

  return {
    id: bookingId,
    bookingNumber: booking.booking_number,
    status: 'dp_confirmed' as const,
    invoice: {
      id: invoiceId,
      invoiceNumber,
      totalAmount: snapshot.totalAmount,
    },
  };
}

export async function markFittingLinkSent(bookingId: string, actor?: string | null) {
  const db = await getD1Database();
  const booking = await db
    .prepare(
      `SELECT id, booking_number, status
       FROM bookings
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<{ id: string; booking_number: string; status: BookingStatus }>();

  if (!booking) {
    throw new BookingDbError('Booking tidak ditemukan.', 404, 'BOOKING_NOT_FOUND');
  }

  if (booking.status === 'fitting_link_sent') {
    return {
      id: bookingId,
      bookingNumber: booking.booking_number,
      status: booking.status,
    };
  }

  if (booking.status !== 'dp_confirmed') {
    throw new BookingDbError(
      'Link fitting baru bisa dikirim setelah Biaya Booking dikonfirmasi.',
      409,
      'DP_NOT_CONFIRMED',
    );
  }

  await db.batch([
    db
      .prepare(
        `UPDATE bookings
         SET status = 'fitting_link_sent',
             updated_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(normalizeOptionalText(actor), bookingId),
    db
      .prepare(
        `INSERT INTO booking_status_history (
          id,
          booking_id,
          from_status,
          to_status,
          action,
          note,
          actor
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        createId('booking-history'),
        bookingId,
        booking.status,
        'fitting_link_sent',
        'fitting_link_sent',
        'Fitting schedule link sent to customer.',
        normalizeOptionalText(actor),
      ),
  ]);

  return {
    id: bookingId,
    bookingNumber: booking.booking_number,
    status: 'fitting_link_sent' as const,
  };
}

export async function closeBooking(input: {
  bookingId: string;
  action: CloseBookingAction;
  reason?: string | null;
  actor?: string | null;
}) {
  const db = await getD1Database();
  const nextStatus: Extract<BookingStatus, 'rejected' | 'cancelled'> =
    input.action === 'reject' ? 'rejected' : 'cancelled';
  const reason = normalizeText(input.reason);
  const booking = await db
    .prepare(
      `SELECT id, booking_number, status
       FROM bookings
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(input.bookingId)
    .first<{ id: string; booking_number: string; status: BookingStatus }>();

  if (!booking) {
    throw new BookingDbError('Booking tidak ditemukan.', 404, 'BOOKING_NOT_FOUND');
  }

  if (['completed', 'rejected', 'cancelled', 'expired'].includes(booking.status)) {
    throw new BookingDbError(
      'Booking ini sudah ditutup.',
      409,
      'BOOKING_ALREADY_CLOSED',
    );
  }

  await db.batch([
    db
      .prepare(
        `UPDATE bookings
         SET status = ?,
             rejected_reason = CASE WHEN ? = 'rejected' THEN ? ELSE rejected_reason END,
             cancelled_reason = CASE WHEN ? = 'cancelled' THEN ? ELSE cancelled_reason END,
             updated_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(
        nextStatus,
        nextStatus,
        reason,
        nextStatus,
        reason,
        normalizeOptionalText(input.actor),
        input.bookingId,
      ),
    db
      .prepare(
        `UPDATE booking_items
         SET item_status = 'cancelled',
             updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = ?`,
      )
      .bind(input.bookingId),
    db
      .prepare(
        `INSERT INTO booking_status_history (
          id,
          booking_id,
          from_status,
          to_status,
          action,
          note,
          actor
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        createId('booking-history'),
        input.bookingId,
        booking.status,
        nextStatus,
        input.action,
        reason || (input.action === 'reject' ? 'Booking rejected by admin.' : 'Booking cancelled by admin.'),
        normalizeOptionalText(input.actor),
      ),
  ]);

  return {
    id: input.bookingId,
    bookingNumber: booking.booking_number,
    previousStatus: booking.status,
    status: nextStatus,
  };
}

export async function getBookingInvoice(bookingId: string) {
  const db = await getD1Database();

  return getBookingInvoiceRecord(db, bookingId);
}

export async function getBookingReceipt(bookingId: string) {
  const db = await getD1Database();

  return getBookingReceiptRecord(db, bookingId);
}

export function getBookingBlockingStatuses() {
  return bookingBlockingStatuses;
}
