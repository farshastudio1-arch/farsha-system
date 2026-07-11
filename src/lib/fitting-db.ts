import { getD1Database } from '@/lib/cloudflare';

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

export type CreateFittingAppointmentInput = {
  appointmentDate: string;
  startTime: string;
  customerName: string;
  customerWhatsapp: string;
  customerEmail?: string | null;
  notes?: string | null;
  source?: FittingAppointmentSource;
  createdBy?: string | null;
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

  return message.includes('no such table: fitting_appointments');
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
          notes,
          appointment_date,
          start_time,
          end_time,
          source,
          created_by,
          updated_by
        )
        VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        fittingCode,
        customerName,
        customerWhatsapp,
        customerEmail,
        notes,
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
        `SELECT id,
                fitting_code,
                status,
                customer_name,
                customer_whatsapp,
                customer_email,
                notes,
                appointment_date,
                start_time,
                end_time,
                source,
                created_by,
                updated_by,
                created_at,
                updated_at
         FROM fitting_appointments
         ORDER BY appointment_date ASC, start_time ASC, created_at DESC
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
      `SELECT id,
              fitting_code,
              status,
              customer_name,
              customer_whatsapp,
              customer_email,
              notes,
              appointment_date,
              start_time,
              end_time,
              source,
              created_by,
              updated_by,
              created_at,
              updated_at
       FROM fitting_appointments
       WHERE id = ?
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
