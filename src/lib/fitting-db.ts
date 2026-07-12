import { getD1Database } from '@/lib/cloudflare';
import { upsertCustomerFromContact } from '@/lib/customer-db';

export type FittingAppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export type FittingAppointmentSource = 'public' | 'admin' | 'whatsapp';

export type FittingSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
  blockedBy: FittingAppointmentStatus | 'past' | null;
};

export type FittingAppointment = {
  id: string;
  fittingCode: string;
  status: FittingAppointmentStatus;
  bookingId: string | null;
  bookingNumber: string | null;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string | null;
  notes: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  source: FittingAppointmentSource;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type FittingAppointmentRow = {
  id: string;
  fitting_code: string;
  status: FittingAppointmentStatus;
  booking_id?: string | null;
  booking_number?: string | null;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string | null;
  notes: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  source: FittingAppointmentSource;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type BlockedSlotRow = {
  start_time: string;
  status: FittingAppointmentStatus;
};

type BookingContextRow = {
  id: string;
  booking_number: string;
  status: string;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string | null;
  customer_instagram: string | null;
  notes: string;
  first_pickup_date: string | null;
  first_event_date: string | null;
  last_return_due_date: string | null;
  item_count: number;
};

type BookingContextItemRow = {
  item_id: string;
  item_code: string;
  item_name: string;
  image_urls: string | null;
  pickup_date: string;
  event_date: string;
  return_due_date: string;
};

export type CreateFittingAppointmentInput = {
  appointmentDate: string;
  startTime: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail?: string | null;
  notes?: string | null;
  source?: FittingAppointmentSource;
  createdBy?: string | null;
  bookingNumber?: string | null;
  bookingToken?: string | null;
};

export type FittingBookingContext = {
  bookingId: string;
  bookingNumber: string;
  status: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail: string | null;
  customerInstagram: string | null;
  notes: string;
  firstPickupDate: string | null;
  firstEventDate: string | null;
  lastReturnDueDate: string | null;
  itemCount: number;
  items: Array<{
    itemId: string;
    itemCode: string;
    itemName: string;
    imageUrl: string | null;
    pickupDate: string;
    eventDate: string;
    returnDueDate: string;
  }>;
};

export type BookingFittingLink = {
  bookingId: string;
  bookingNumber: string;
  token: string;
  fittingPath: string;
  fittingUrl: string;
};

export class FittingDbError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'FITTING_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const fittingTimeSlots: Array<Pick<FittingSlot, 'startTime' | 'endTime'>> = Array.from(
  { length: 9 },
  (_, index) => {
    const startHour = 10 + index;
    const endHour = startHour + 1;

    return {
      startTime: `${String(startHour).padStart(2, '0')}:00`,
      endTime: `${String(endHour).padStart(2, '0')}:00`,
    };
  },
);

const jakartaTimeZone = 'Asia/Jakarta';
const activeSlotStatuses: FittingAppointmentStatus[] = ['pending', 'confirmed'];
const validStatuses: FittingAppointmentStatus[] = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
];

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

function getJakartaDateTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: jakartaTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return {
    date: `${getPart('year')}-${getPart('month')}-${getPart('day')}`,
    time: `${getPart('hour')}:${getPart('minute')}`,
  };
}

function isValidDatePart(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getSlotByStartTime(startTime: string) {
  return fittingTimeSlots.find((slot) => slot.startTime === startTime) ?? null;
}

function toAppointment(row: FittingAppointmentRow): FittingAppointment {
  return {
    id: row.id,
    fittingCode: row.fitting_code,
    status: row.status,
    bookingId: row.booking_id ?? null,
    bookingNumber: row.booking_number ?? null,
    customerName: row.customer_name,
    customerWhatsapp: row.customer_whatsapp,
    customerEmail: row.customer_email,
    notes: row.notes,
    appointmentDate: row.appointment_date,
    startTime: row.start_time,
    endTime: row.end_time,
    source: row.source,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hasMissingMigration(error: unknown) {
  const message = String(error);

  return (
    message.includes('no such table: fitting_appointments') ||
    message.includes('no such table: booking_fitting_links') ||
    message.includes('no such column: booking_id')
  );
}

function hasUniqueSlotConflict(error: unknown) {
  const message = String(error);

  return (
    message.includes('idx_fitting_appointments_active_slot') ||
    message.includes('UNIQUE constraint failed: fitting_appointments.appointment_date')
  );
}

function makeFittingCode(appointmentDate: string) {
  const datePart = appointmentDate.replaceAll('-', '');
  const randomPart = crypto.randomUUID().replaceAll('-', '').slice(0, 4).toUpperCase();

  return `FIT-${datePart}-${randomPart}`;
}

function createToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseImageUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) && typeof parsed[0] === 'string' ? parsed[0] : null;
  } catch {
    return null;
  }
}

function buildFittingPath(bookingNumber: string, token: string) {
  return `/fitting?booking=${encodeURIComponent(bookingNumber)}&token=${encodeURIComponent(token)}`;
}

function validateAppointmentDate(value: string) {
  if (!isValidDatePart(value)) {
    throw new FittingDbError('Tanggal fitting tidak valid.', 400, 'INVALID_DATE');
  }

  const today = getJakartaDateTimeParts().date;

  if (value < today) {
    throw new FittingDbError('Tanggal fitting tidak boleh di masa lalu.', 400, 'PAST_DATE');
  }

  return value;
}

function validateStartTime(value: string) {
  const slot = getSlotByStartTime(value);

  if (!slot) {
    throw new FittingDbError('Jam fitting harus antara 10:00 sampai 18:00.', 400, 'INVALID_TIME');
  }

  return slot;
}

function isPastSlot(appointmentDate: string, startTime: string) {
  const now = getJakartaDateTimeParts();

  return appointmentDate < now.date || (appointmentDate === now.date && startTime <= now.time);
}

function assertBookableSlot(appointmentDate: string, startTime: string) {
  if (isPastSlot(appointmentDate, startTime)) {
    throw new FittingDbError('Slot fitting ini sudah lewat.', 409, 'PAST_SLOT');
  }
}

export function getTodayJakartaDate() {
  return getJakartaDateTimeParts().date;
}

export function getFittingRelatedRevalidationPaths() {
  return ['/fitting', '/pos', '/pos/fitting'];
}

export async function createBookingFittingLink(input: {
  bookingId: string;
  actor?: string | null;
  origin?: string | null;
}): Promise<BookingFittingLink> {
  const bookingId = normalizeText(input.bookingId);
  const actor = normalizeOptionalText(input.actor);
  const db = await getD1Database();
  const booking = await db
    .prepare(
      `SELECT id, booking_number
       FROM bookings
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<{ id: string; booking_number: string }>();

  if (!booking) {
    throw new FittingDbError('Booking tidak ditemukan.', 404, 'BOOKING_NOT_FOUND');
  }

  const token = createToken();
  const tokenHash = await hashToken(token);
  const linkId = createId('booking-fitting-link');

  try {
    await db.batch([
      db
        .prepare(
          `UPDATE booking_fitting_links
           SET status = 'revoked',
               updated_at = CURRENT_TIMESTAMP
           WHERE booking_id = ?
             AND status = 'active'`,
        )
        .bind(booking.id),
      db
        .prepare(
          `INSERT INTO booking_fitting_links (
            id,
            booking_id,
            token_hash,
            status,
            created_by
          )
          VALUES (?, ?, ?, 'active', ?)`,
        )
        .bind(linkId, booking.id, tokenHash, actor),
    ]);
  } catch (error) {
    if (hasMissingMigration(error)) {
      throw new FittingDbError('Database fitting link belum siap. Jalankan migration terlebih dahulu.', 500, 'MISSING_MIGRATION');
    }

    throw error;
  }

  const fittingPath = buildFittingPath(booking.booking_number, token);
  const origin = normalizeText(input.origin).replace(/\/$/, '');

  return {
    bookingId: booking.id,
    bookingNumber: booking.booking_number,
    token,
    fittingPath,
    fittingUrl: origin ? `${origin}${fittingPath}` : fittingPath,
  };
}

export async function getFittingBookingContext(input: {
  bookingNumber: string;
  token: string;
}): Promise<FittingBookingContext> {
  const bookingNumber = normalizeText(input.bookingNumber);
  const token = normalizeText(input.token);

  if (!bookingNumber || !token) {
    throw new FittingDbError('Link fitting tidak valid.', 400, 'INVALID_FITTING_LINK');
  }

  const tokenHash = await hashToken(token);
  const db = await getD1Database();

  try {
    const booking = await db
      .prepare(
        `SELECT b.id,
                b.booking_number,
                b.status,
                b.customer_name,
                b.customer_whatsapp,
                b.customer_email,
                b.customer_instagram,
                b.notes,
                MIN(bi.pickup_date) AS first_pickup_date,
                MIN(bi.event_date) AS first_event_date,
                MAX(bi.return_due_date) AS last_return_due_date,
                COUNT(DISTINCT bi.id) AS item_count
         FROM booking_fitting_links bfl
         JOIN bookings b ON b.id = bfl.booking_id
         LEFT JOIN booking_items bi ON bi.booking_id = b.id AND bi.item_status = 'active'
         WHERE b.booking_number = ?
           AND bfl.token_hash = ?
           AND bfl.status = 'active'
           AND b.status NOT IN ('rejected', 'cancelled', 'expired')
           AND (bfl.expires_at IS NULL OR bfl.expires_at > CURRENT_TIMESTAMP)
         GROUP BY b.id
         LIMIT 1`,
      )
      .bind(bookingNumber, tokenHash)
      .first<BookingContextRow>();

    if (!booking) {
      throw new FittingDbError('Link fitting tidak ditemukan atau sudah tidak aktif.', 404, 'FITTING_LINK_NOT_FOUND');
    }

    const items = await db
      .prepare(
        `SELECT bi.item_id,
                bi.item_code,
                bi.item_name,
                ki.image_urls,
                bi.pickup_date,
                bi.event_date,
                bi.return_due_date
         FROM booking_items bi
         LEFT JOIN kebaya_items ki ON ki.id = bi.item_id
         WHERE bi.booking_id = ?
           AND bi.item_status = 'active'
         ORDER BY bi.created_at ASC`,
      )
      .bind(booking.id)
      .all<BookingContextItemRow>();

    return {
      bookingId: booking.id,
      bookingNumber: booking.booking_number,
      status: booking.status,
      customerName: booking.customer_name,
      customerWhatsapp: booking.customer_whatsapp,
      customerEmail: booking.customer_email,
      customerInstagram: booking.customer_instagram,
      notes: booking.notes,
      firstPickupDate: booking.first_pickup_date,
      firstEventDate: booking.first_event_date,
      lastReturnDueDate: booking.last_return_due_date,
      itemCount: booking.item_count,
      items: items.results.map((item) => ({
        itemId: item.item_id,
        itemCode: item.item_code,
        itemName: item.item_name,
        imageUrl: parseImageUrl(item.image_urls),
        pickupDate: item.pickup_date,
        eventDate: item.event_date,
        returnDueDate: item.return_due_date,
      })),
    };
  } catch (error) {
    if (error instanceof FittingDbError) {
      throw error;
    }

    if (hasMissingMigration(error)) {
      throw new FittingDbError('Database fitting link belum siap. Jalankan migration terlebih dahulu.', 500, 'MISSING_MIGRATION');
    }

    throw error;
  }
}

export async function listFittingSlotsForDate(appointmentDateInput: string): Promise<FittingSlot[]> {
  const appointmentDate = validateAppointmentDate(appointmentDateInput);
  const db = await getD1Database();

  try {
    const result = await db
      .prepare(
        `SELECT start_time, status
         FROM fitting_appointments
         WHERE appointment_date = ?
           AND status IN ('pending', 'confirmed')`,
      )
      .bind(appointmentDate)
      .all<BlockedSlotRow>();
    const blockedSlots = new Map(result.results.map((row) => [row.start_time, row.status]));

    return fittingTimeSlots.map((slot) => {
      const blockedBy = blockedSlots.get(slot.startTime) ?? null;
      const past = isPastSlot(appointmentDate, slot.startTime);

      return {
        ...slot,
        available: !blockedBy && !past,
        blockedBy: past ? 'past' : blockedBy,
      };
    });
  } catch (error) {
    if (hasMissingMigration(error)) {
      throw new FittingDbError('Database fitting belum siap. Jalankan migration terlebih dahulu.', 500, 'MISSING_MIGRATION');
    }

    throw error;
  }
}

export async function createFittingAppointment(input: CreateFittingAppointmentInput) {
  const appointmentDate = validateAppointmentDate(normalizeText(input.appointmentDate));
  const slot = validateStartTime(normalizeText(input.startTime));
  const customerName = normalizeText(input.customerName);
  const customerWhatsapp = normalizeText(input.customerWhatsapp);
  const customerEmail = normalizeOptionalText(input.customerEmail);
  const notes = normalizeText(input.notes);
  const source = input.source ?? 'public';
  const createdBy = normalizeOptionalText(input.createdBy);
  const bookingNumber = normalizeOptionalText(input.bookingNumber);
  const bookingToken = normalizeOptionalText(input.bookingToken);
  const bookingContext =
    bookingNumber && bookingToken
      ? await getFittingBookingContext({ bookingNumber, token: bookingToken })
      : null;

  if (!customerName) {
    throw new FittingDbError('Nama customer wajib diisi.', 400, 'CUSTOMER_NAME_REQUIRED');
  }

  if (!customerWhatsapp) {
    throw new FittingDbError('Nomor WhatsApp wajib diisi.', 400, 'CUSTOMER_WHATSAPP_REQUIRED');
  }

  if (!['public', 'admin', 'whatsapp'].includes(source)) {
    throw new FittingDbError('Sumber fitting tidak valid.', 400, 'INVALID_SOURCE');
  }

  assertBookableSlot(appointmentDate, slot.startTime);

  const db = await getD1Database();
  const activeConflict = await db
    .prepare(
      `SELECT id
       FROM fitting_appointments
       WHERE appointment_date = ?
         AND start_time = ?
         AND status IN ('pending', 'confirmed')
       LIMIT 1`,
    )
    .bind(appointmentDate, slot.startTime)
    .first<{ id: string }>();

  if (activeConflict) {
    throw new FittingDbError('Slot fitting ini sudah diambil. Pilih jam lain.', 409, 'FITTING_SLOT_TAKEN');
  }

  const id = createId('fitting');
  const fittingCode = makeFittingCode(appointmentDate);
  const customer = await upsertCustomerFromContact({
    displayName: customerName,
    primaryPhone: customerWhatsapp,
    email: customerEmail,
    source: 'fitting',
    actor: createdBy,
  });

  try {
    await db
      .prepare(
        `INSERT INTO fitting_appointments (
          id,
          fitting_code,
          status,
          customer_name,
          customer_whatsapp,
          customer_email,
          customer_id,
          notes,
          booking_id,
          appointment_date,
          start_time,
          end_time,
          source,
          created_by,
          updated_by
        )
        VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        fittingCode,
        customerName,
        customerWhatsapp,
        customerEmail,
        customer.id,
        notes,
        bookingContext?.bookingId ?? null,
        appointmentDate,
        slot.startTime,
        slot.endTime,
        source,
        createdBy,
        createdBy,
      )
      .run();
  } catch (error) {
    if (hasMissingMigration(error)) {
      throw new FittingDbError('Database fitting belum siap. Jalankan migration terlebih dahulu.', 500, 'MISSING_MIGRATION');
    }

    if (hasUniqueSlotConflict(error)) {
      throw new FittingDbError('Slot fitting ini sudah diambil. Pilih jam lain.', 409, 'FITTING_SLOT_TAKEN');
    }

    throw error;
  }

  return {
    id,
    fittingCode,
    status: 'pending' as const,
    appointmentDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
  };
}

export async function listFittingAppointments(): Promise<FittingAppointment[]> {
  const db = await getD1Database();

  try {
    const result = await db
      .prepare(
        `SELECT fa.id,
                fa.fitting_code,
                fa.status,
                fa.booking_id,
                b.booking_number,
                fa.customer_name,
                fa.customer_whatsapp,
                fa.customer_email,
                fa.notes,
                fa.appointment_date,
                fa.start_time,
                fa.end_time,
                fa.source,
                fa.created_by,
                fa.updated_by,
                fa.created_at,
                fa.updated_at
         FROM fitting_appointments fa
         LEFT JOIN bookings b ON b.id = fa.booking_id
         ORDER BY fa.appointment_date ASC, fa.start_time ASC, fa.created_at DESC
         LIMIT 500`,
      )
      .all<FittingAppointmentRow>();

    return result.results.map(toAppointment);
  } catch (error) {
    if (hasMissingMigration(error)) {
      return [];
    }

    throw error;
  }
}

export async function updateFittingAppointmentStatus(input: {
  appointmentId: string;
  status: FittingAppointmentStatus;
  actor?: string | null;
}) {
  const appointmentId = normalizeText(input.appointmentId);
  const actor = normalizeOptionalText(input.actor);

  if (!appointmentId) {
    throw new FittingDbError('Appointment fitting tidak valid.', 400, 'INVALID_APPOINTMENT');
  }

  if (!validStatuses.includes(input.status)) {
    throw new FittingDbError('Status fitting tidak valid.', 400, 'INVALID_STATUS');
  }

  const db = await getD1Database();
  const existing = await db
    .prepare(
      `SELECT id
       FROM fitting_appointments
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(appointmentId)
    .first<{ id: string }>();

  if (!existing) {
    throw new FittingDbError('Appointment fitting tidak ditemukan.', 404, 'FITTING_NOT_FOUND');
  }

  try {
    await db
      .prepare(
        `UPDATE fitting_appointments
         SET status = ?,
             updated_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(input.status, actor, appointmentId)
      .run();
  } catch (error) {
    if (hasUniqueSlotConflict(error)) {
      throw new FittingDbError('Slot fitting ini sudah dipakai appointment lain.', 409, 'FITTING_SLOT_TAKEN');
    }

    throw error;
  }

  const updated = await db
    .prepare(
      `SELECT fa.id,
              fa.fitting_code,
              fa.status,
              fa.booking_id,
              b.booking_number,
              fa.customer_name,
              fa.customer_whatsapp,
              fa.customer_email,
              fa.notes,
              fa.appointment_date,
              fa.start_time,
              fa.end_time,
              fa.source,
              fa.created_by,
              fa.updated_by,
              fa.created_at,
              fa.updated_at
       FROM fitting_appointments fa
       LEFT JOIN bookings b ON b.id = fa.booking_id
       WHERE fa.id = ?
       LIMIT 1`,
    )
    .bind(appointmentId)
    .first<FittingAppointmentRow>();

  if (!updated) {
    throw new FittingDbError('Appointment fitting tidak ditemukan.', 404, 'FITTING_NOT_FOUND');
  }

  return toAppointment(updated);
}

export { activeSlotStatuses };
