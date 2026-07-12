import { getD1Database } from '@/lib/cloudflare';

export type CustomerStatus = 'active' | 'archived';
export type CustomerSource = 'manual' | 'pos' | 'booking' | 'fitting' | 'imported';
export type CustomerActivityType = 'pos_transaction' | 'pos_receipt' | 'booking' | 'fitting';
export type CustomerDateBasis = 'activity' | 'profile' | 'all';

export type CustomerRecord = {
  id: string;
  displayName: string;
  primaryPhone: string;
  normalizedPhone: string;
  email: string | null;
  instagram: string | null;
  notes: string;
  status: CustomerStatus;
  firstSource: CustomerSource;
  lastSeenAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  firstActivityAt: string | null;
  lastActivityAt: string | null;
  posTransactionCount: number;
  bookingCount: number;
  fittingCount: number;
  openTransactionCount: number;
};

export type CustomerActivityEntry = {
  id: string;
  type: CustomerActivityType;
  reference: string;
  title: string;
  detail: string;
  status: string;
  amount: number | null;
  occurredAt: string;
  href: string;
};

export type CustomerOrderedItem = {
  id: string;
  source: 'pos' | 'booking';
  reference: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  status: string;
  amount: number;
  orderedAt: string;
  dueDate: string | null;
  href: string;
};

export type CustomerProfile = {
  customer: CustomerRecord;
  activity: CustomerActivityEntry[];
  orderedItems: CustomerOrderedItem[];
};

export type CreateCustomerInput = {
  displayName: string;
  primaryPhone: string;
  email?: string | null;
  instagram?: string | null;
  notes?: string | null;
  source?: CustomerSource;
  actor?: string | null;
};

export type UpdateCustomerInput = {
  id: string;
  displayName: string;
  primaryPhone: string;
  email?: string | null;
  instagram?: string | null;
  notes?: string | null;
  status?: CustomerStatus;
  actor?: string | null;
};

type CustomerRow = {
  id: string;
  display_name: string;
  primary_phone: string;
  normalized_phone: string;
  email: string | null;
  instagram: string | null;
  notes: string | null;
  status: CustomerStatus;
  first_source: CustomerSource;
  last_seen_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  first_activity_at?: string | null;
  last_activity_at?: string | null;
  pos_transaction_count?: number;
  booking_count?: number;
  fitting_count?: number;
  open_transaction_count?: number;
};

type ActivityRow = {
  id: string;
  type: CustomerActivityType;
  reference: string;
  title: string;
  detail: string;
  status: string;
  amount: number | null;
  occurred_at: string;
  href: string;
};

type OrderedItemRow = {
  id: string;
  source: 'pos' | 'booking';
  reference: string;
  item_id: string;
  item_code: string;
  item_name: string;
  status: string;
  amount: number;
  ordered_at: string;
  due_date: string | null;
  href: string;
};

export class CustomerDbError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'CUSTOMER_ERROR') {
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

function normalizeDateInput(value: unknown) {
  const text = normalizeText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  return text;
}

function normalizeSource(value: unknown): CustomerSource {
  return value === 'pos' ||
    value === 'booking' ||
    value === 'fitting' ||
    value === 'imported'
    ? value
    : 'manual';
}

function normalizeStatus(value: unknown): CustomerStatus {
  return value === 'archived' ? 'archived' : 'active';
}

function normalizeDateBasis(value: unknown): CustomerDateBasis {
  return value === 'profile' || value === 'all' ? value : 'activity';
}

export function normalizeCustomerPhone(value: unknown) {
  const digits = normalizeText(value).replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.startsWith('62')) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }

  if (digits.startsWith('8')) {
    return `62${digits}`;
  }

  return digits;
}

function assertCustomerPhone(value: unknown) {
  const normalizedPhone = normalizeCustomerPhone(value);

  if (!normalizedPhone || normalizedPhone.length < 8) {
    throw new CustomerDbError('Nomor WhatsApp customer wajib diisi.', 400, 'CUSTOMER_PHONE_REQUIRED');
  }

  return normalizedPhone;
}

function isMissingCustomerSchema(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes('no such table: customers') ||
    message.includes('no such column: customer_id')
  );
}

function getDateRangeSql(expression: string, dateFrom: string | null, dateTo: string | null) {
  const normalizedExpression = `date(replace(${expression}, 'T', ' '))`;

  if (dateFrom && dateTo) {
    return {
      sql: `${normalizedExpression} BETWEEN ? AND ?`,
      bindings: [dateFrom, dateTo],
    };
  }

  if (dateFrom) {
    return {
      sql: `${normalizedExpression} >= ?`,
      bindings: [dateFrom],
    };
  }

  if (dateTo) {
    return {
      sql: `${normalizedExpression} <= ?`,
      bindings: [dateTo],
    };
  }

  return null;
}

function getCustomerDateCondition(
  dateBasis: CustomerDateBasis,
  dateFrom: string | null,
  dateTo: string | null,
) {
  if (!dateFrom && !dateTo) {
    return null;
  }

  const activityRange = getDateRangeSql('matched_at', dateFrom, dateTo);
  const createdRange = getDateRangeSql('c.created_at', dateFrom, dateTo);
  const updatedRange = getDateRangeSql('c.updated_at', dateFrom, dateTo);
  const lastSeenRange = getDateRangeSql('c.last_seen_at', dateFrom, dateTo);

  if (!activityRange || !createdRange || !updatedRange || !lastSeenRange) {
    return null;
  }

  const activitySql = `EXISTS (
    SELECT 1
    FROM (
      SELECT pt.created_at AS matched_at
      FROM pos_transactions pt
      WHERE pt.customer_id = c.id
      UNION ALL
      SELECT pr.created_at AS matched_at
      FROM pos_receipts pr
      INNER JOIN pos_transactions pt ON pt.id = pr.transaction_id
      WHERE pt.customer_id = c.id
      UNION ALL
      SELECT b.created_at AS matched_at
      FROM bookings b
      WHERE b.customer_id = c.id
      UNION ALL
      SELECT fa.appointment_date || ' ' || fa.start_time || ':00' AS matched_at
      FROM fitting_appointments fa
      WHERE fa.customer_id = c.id
    )
    WHERE ${activityRange.sql}
  )`;
  const profileSql = `(
    ${createdRange.sql}
    OR ${updatedRange.sql}
    OR ${lastSeenRange.sql}
  )`;
  const activityBindings = activityRange.bindings;
  const profileBindings = [
    ...createdRange.bindings,
    ...updatedRange.bindings,
    ...lastSeenRange.bindings,
  ];

  if (dateBasis === 'activity') {
    return {
      sql: activitySql,
      bindings: activityBindings,
    };
  }

  if (dateBasis === 'profile') {
    return {
      sql: profileSql,
      bindings: profileBindings,
    };
  }

  return {
    sql: `(${activitySql} OR ${profileSql})`,
    bindings: [...activityBindings, ...profileBindings],
  };
}

function toCustomerRecord(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    displayName: row.display_name,
    primaryPhone: row.primary_phone,
    normalizedPhone: row.normalized_phone,
    email: row.email,
    instagram: row.instagram,
    notes: row.notes ?? '',
    status: row.status,
    firstSource: row.first_source,
    lastSeenAt: row.last_seen_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    firstActivityAt: row.first_activity_at ?? null,
    lastActivityAt: row.last_activity_at ?? null,
    posTransactionCount: Number(row.pos_transaction_count ?? 0),
    bookingCount: Number(row.booking_count ?? 0),
    fittingCount: Number(row.fitting_count ?? 0),
    openTransactionCount: Number(row.open_transaction_count ?? 0),
  };
}

function toActivity(row: ActivityRow): CustomerActivityEntry {
  return {
    id: row.id,
    type: row.type,
    reference: row.reference,
    title: row.title,
    detail: row.detail,
    status: row.status,
    amount: row.amount,
    occurredAt: row.occurred_at,
    href: row.href,
  };
}

function toOrderedItem(row: OrderedItemRow): CustomerOrderedItem {
  return {
    id: row.id,
    source: row.source,
    reference: row.reference,
    itemId: row.item_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    status: row.status,
    amount: row.amount,
    orderedAt: row.ordered_at,
    dueDate: row.due_date,
    href: row.href,
  };
}

function customerSelectSql(whereSql: string) {
  return `SELECT c.id,
                 c.display_name,
                 c.primary_phone,
                 c.normalized_phone,
                 c.email,
                 c.instagram,
                 c.notes,
                 c.status,
                 c.first_source,
                 c.last_seen_at,
                 c.created_by,
                 c.updated_by,
                 c.created_at,
                 c.updated_at,
                 (
                   SELECT MIN(activity_at)
                   FROM (
                     SELECT pt.created_at AS activity_at
                     FROM pos_transactions pt
                     WHERE pt.customer_id = c.id
                     UNION ALL
                     SELECT pr.created_at AS activity_at
                     FROM pos_receipts pr
                     INNER JOIN pos_transactions pt ON pt.id = pr.transaction_id
                     WHERE pt.customer_id = c.id
                     UNION ALL
                     SELECT b.created_at AS activity_at
                     FROM bookings b
                     WHERE b.customer_id = c.id
                     UNION ALL
                     SELECT fa.appointment_date || 'T' || fa.start_time || ':00' AS activity_at
                     FROM fitting_appointments fa
                     WHERE fa.customer_id = c.id
                   )
                 ) AS first_activity_at,
                 (
                   SELECT MAX(activity_at)
                   FROM (
                     SELECT pt.created_at AS activity_at
                     FROM pos_transactions pt
                     WHERE pt.customer_id = c.id
                     UNION ALL
                     SELECT pr.created_at AS activity_at
                     FROM pos_receipts pr
                     INNER JOIN pos_transactions pt ON pt.id = pr.transaction_id
                     WHERE pt.customer_id = c.id
                     UNION ALL
                     SELECT b.created_at AS activity_at
                     FROM bookings b
                     WHERE b.customer_id = c.id
                     UNION ALL
                     SELECT fa.appointment_date || 'T' || fa.start_time || ':00' AS activity_at
                     FROM fitting_appointments fa
                     WHERE fa.customer_id = c.id
                   )
                 ) AS last_activity_at,
                 (
                   SELECT COUNT(*)
                   FROM pos_transactions pt
                   WHERE pt.customer_id = c.id
                 ) AS pos_transaction_count,
                 (
                   SELECT COUNT(*)
                   FROM bookings b
                   WHERE b.customer_id = c.id
                 ) AS booking_count,
                 (
                   SELECT COUNT(*)
                   FROM fitting_appointments fa
                   WHERE fa.customer_id = c.id
                 ) AS fitting_count,
                 (
                   SELECT COUNT(*)
                   FROM pos_transactions pt
                   WHERE pt.customer_id = c.id AND pt.status = 'open'
                 ) AS open_transaction_count
          FROM customers c
          ${whereSql}`;
}

export async function listCustomers(input: {
  query?: string;
  status?: CustomerStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
  dateBasis?: CustomerDateBasis;
  limit?: number;
} = {}): Promise<CustomerRecord[]> {
  const db = await getD1Database();
  const query = normalizeText(input.query).toLowerCase();
  const status = input.status ?? 'all';
  const dateFrom = normalizeDateInput(input.dateFrom);
  const dateTo = normalizeDateInput(input.dateTo);
  const dateBasis = normalizeDateBasis(input.dateBasis);
  const limit = Math.min(Math.max(Number(input.limit) || 200, 1), 500);
  const conditions: string[] = [];
  const bindings: Array<string | number> = [];

  if (status !== 'all') {
    conditions.push('c.status = ?');
    bindings.push(status);
  }

  if (query) {
    conditions.push(`(
      lower(c.display_name) LIKE ?
      OR lower(c.primary_phone) LIKE ?
      OR lower(c.normalized_phone) LIKE ?
      OR lower(COALESCE(c.email, '')) LIKE ?
      OR lower(COALESCE(c.instagram, '')) LIKE ?
    )`);
    const likeQuery = `%${query}%`;
    bindings.push(likeQuery, likeQuery, likeQuery, likeQuery, likeQuery);
  }

  const dateCondition = getCustomerDateCondition(dateBasis, dateFrom, dateTo);

  if (dateCondition) {
    conditions.push(dateCondition.sql);
    bindings.push(...dateCondition.bindings);
  }

  bindings.push(limit);

  try {
    const result = await db
      .prepare(
        `${customerSelectSql(conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '')}
         ORDER BY COALESCE(c.last_seen_at, c.updated_at, c.created_at) DESC, c.display_name ASC
         LIMIT ?`,
      )
      .bind(...bindings)
      .all<CustomerRow>();

    return result.results.map(toCustomerRecord);
  } catch (error) {
    if (isMissingCustomerSchema(error)) {
      return [];
    }

    throw error;
  }
}

export async function getCustomerById(customerId: string): Promise<CustomerRecord | null> {
  const id = normalizeText(customerId);

  if (!id) {
    return null;
  }

  try {
    const db = await getD1Database();
    const row = await db
      .prepare(`${customerSelectSql('WHERE c.id = ?')} LIMIT 1`)
      .bind(id)
      .first<CustomerRow>();

    return row ? toCustomerRecord(row) : null;
  } catch (error) {
    if (isMissingCustomerSchema(error)) {
      return null;
    }

    throw error;
  }
}

export async function getCustomerByPhone(phone: string): Promise<CustomerRecord | null> {
  const normalizedPhone = normalizeCustomerPhone(phone);

  if (!normalizedPhone) {
    return null;
  }

  try {
    const db = await getD1Database();
    const row = await db
      .prepare(`${customerSelectSql('WHERE c.normalized_phone = ?')} LIMIT 1`)
      .bind(normalizedPhone)
      .first<CustomerRow>();

    return row ? toCustomerRecord(row) : null;
  } catch (error) {
    if (isMissingCustomerSchema(error)) {
      return null;
    }

    throw error;
  }
}

export async function upsertCustomerFromContact(input: CreateCustomerInput): Promise<CustomerRecord> {
  const db = await getD1Database();
  const normalizedPhone = assertCustomerPhone(input.primaryPhone);
  const displayName = normalizeText(input.displayName, 'Pelanggan Umum') || 'Pelanggan Umum';
  const primaryPhone = normalizeText(input.primaryPhone);
  const email = normalizeOptionalText(input.email);
  const instagram = normalizeOptionalText(input.instagram);
  const notes = normalizeText(input.notes);
  const source = normalizeSource(input.source);
  const actor = normalizeOptionalText(input.actor);
  const existing = await db
    .prepare('SELECT id, display_name, email, instagram, notes FROM customers WHERE normalized_phone = ? LIMIT 1')
    .bind(normalizedPhone)
    .first<Pick<CustomerRow, 'id' | 'display_name' | 'email' | 'instagram' | 'notes'>>();

  if (existing) {
    const nextName =
      existing.display_name && existing.display_name !== 'Pelanggan Umum'
        ? existing.display_name
        : displayName;
    const nextNotes = existing.notes || notes;

    await db
      .prepare(
        `UPDATE customers
         SET display_name = ?,
             primary_phone = ?,
             email = COALESCE(email, ?),
             instagram = COALESCE(instagram, ?),
             notes = ?,
             status = 'active',
             last_seen_at = CURRENT_TIMESTAMP,
             updated_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(
        nextName,
        primaryPhone,
        email,
        instagram,
        nextNotes,
        actor,
        existing.id,
      )
      .run();

    const customer = await getCustomerById(existing.id);

    if (!customer) {
      throw new CustomerDbError('Customer tidak ditemukan setelah update.', 404, 'CUSTOMER_NOT_FOUND');
    }

    return customer;
  }

  const id = createId('customer');

  await db
    .prepare(
      `INSERT INTO customers (
        id,
        display_name,
        primary_phone,
        normalized_phone,
        email,
        instagram,
        notes,
        status,
        first_source,
        last_seen_at,
        created_by,
        updated_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, ?, ?)`,
    )
    .bind(
      id,
      displayName,
      primaryPhone,
      normalizedPhone,
      email,
      instagram,
      notes,
      source,
      actor,
      actor,
    )
    .run();

  const customer = await getCustomerById(id);

  if (!customer) {
    throw new CustomerDbError('Customer tidak ditemukan setelah dibuat.', 404, 'CUSTOMER_NOT_FOUND');
  }

  return customer;
}

export async function updateCustomer(input: UpdateCustomerInput): Promise<CustomerRecord> {
  const db = await getD1Database();
  const id = normalizeText(input.id);
  const displayName = normalizeText(input.displayName);
  const normalizedPhone = assertCustomerPhone(input.primaryPhone);
  const primaryPhone = normalizeText(input.primaryPhone);
  const actor = normalizeOptionalText(input.actor);

  if (!id) {
    throw new CustomerDbError('Customer tidak valid.', 400, 'INVALID_CUSTOMER');
  }

  if (!displayName) {
    throw new CustomerDbError('Nama customer wajib diisi.', 400, 'CUSTOMER_NAME_REQUIRED');
  }

  const duplicate = await db
    .prepare('SELECT id FROM customers WHERE normalized_phone = ? AND id != ? LIMIT 1')
    .bind(normalizedPhone, id)
    .first<{ id: string }>();

  if (duplicate) {
    throw new CustomerDbError('Nomor WhatsApp sudah dipakai customer lain.', 409, 'CUSTOMER_PHONE_DUPLICATE');
  }

  await db
    .prepare(
      `UPDATE customers
       SET display_name = ?,
           primary_phone = ?,
           normalized_phone = ?,
           email = ?,
           instagram = ?,
           notes = ?,
           status = ?,
           updated_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(
      displayName,
      primaryPhone,
      normalizedPhone,
      normalizeOptionalText(input.email),
      normalizeOptionalText(input.instagram),
      normalizeText(input.notes),
      normalizeStatus(input.status),
      actor,
      id,
    )
    .run();

  const customer = await getCustomerById(id);

  if (!customer) {
    throw new CustomerDbError('Customer tidak ditemukan.', 404, 'CUSTOMER_NOT_FOUND');
  }

  return customer;
}

export async function archiveCustomer(customerId: string, actor?: string | null): Promise<CustomerRecord> {
  const db = await getD1Database();
  const id = normalizeText(customerId);

  if (!id) {
    throw new CustomerDbError('Customer tidak valid.', 400, 'INVALID_CUSTOMER');
  }

  await db
    .prepare(
      `UPDATE customers
       SET status = 'archived',
           updated_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(normalizeOptionalText(actor), id)
    .run();

  const customer = await getCustomerById(id);

  if (!customer) {
    throw new CustomerDbError('Customer tidak ditemukan.', 404, 'CUSTOMER_NOT_FOUND');
  }

  return customer;
}

export async function attachCustomerToRecord(input: {
  customerId: string;
  targetType: 'pos_transaction' | 'booking' | 'fitting';
  targetId: string;
  actor?: string | null;
}) {
  const db = await getD1Database();
  const customerId = normalizeText(input.customerId);
  const targetId = normalizeText(input.targetId);

  if (!customerId || !targetId) {
    throw new CustomerDbError('Customer atau target tidak valid.', 400, 'INVALID_CUSTOMER_LINK');
  }

  const customer = await getCustomerById(customerId);

  if (!customer) {
    throw new CustomerDbError('Customer tidak ditemukan.', 404, 'CUSTOMER_NOT_FOUND');
  }

  if (input.targetType === 'pos_transaction') {
    await db
      .prepare(
        `UPDATE pos_transactions
         SET customer_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(customerId, targetId)
      .run();
  } else if (input.targetType === 'booking') {
    await db
      .prepare(
        `UPDATE bookings
         SET customer_id = ?,
             updated_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(customerId, normalizeOptionalText(input.actor), targetId)
      .run();
  } else {
    await db
      .prepare(
        `UPDATE fitting_appointments
         SET customer_id = ?,
             updated_by = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(customerId, normalizeOptionalText(input.actor), targetId)
      .run();
  }

  await db
    .prepare(
      `UPDATE customers
       SET last_seen_at = CURRENT_TIMESTAMP,
           updated_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(normalizeOptionalText(input.actor), customerId)
    .run();

  return getCustomerProfile(customerId);
}

async function getCustomerActivity(
  db: D1Database,
  customerId: string,
  input: {
    dateFrom?: string;
    dateTo?: string;
  } = {},
) {
  const dateFrom = normalizeDateInput(input.dateFrom);
  const dateTo = normalizeDateInput(input.dateTo);
  const dateRange = getDateRangeSql('occurred_at', dateFrom, dateTo);
  const whereSql = dateRange ? `WHERE ${dateRange.sql}` : '';
  const bindings = [
    customerId,
    customerId,
    customerId,
    customerId,
    ...(dateRange?.bindings ?? []),
  ];
  const result = await db
    .prepare(
      `SELECT id,
              type,
              reference,
              title,
              detail,
              status,
              amount,
              occurred_at,
              href
       FROM (
         SELECT pt.id AS id,
                'pos_transaction' AS type,
                pt.transaction_number AS reference,
                pt.item_name AS title,
                pt.customer_name || ' - ' || pt.item_code AS detail,
                pt.status AS status,
                pt.item_price + pt.deposit_received + pt.penalty_amount + pt.adjustment_amount - pt.refunded_amount AS amount,
                pt.created_at AS occurred_at,
                '/pos/transactions?transactionId=' || pt.id AS href
         FROM pos_transactions pt
         WHERE pt.customer_id = ?

         UNION ALL

         SELECT pr.id AS id,
                'pos_receipt' AS type,
                pr.receipt_number AS reference,
                pr.title AS title,
                pr.item_name || ' - ' || pr.transaction_number AS detail,
                pr.status AS status,
                CASE WHEN pr.event_amount != 0 THEN pr.event_amount ELSE pr.total_collected END AS amount,
                pr.created_at AS occurred_at,
                '/pos/transactions?transactionId=' || pr.transaction_id AS href
         FROM pos_receipts pr
         INNER JOIN pos_transactions pt ON pt.id = pr.transaction_id
         WHERE pt.customer_id = ?

         UNION ALL

         SELECT b.id AS id,
                'booking' AS type,
                b.booking_number AS reference,
                COALESCE(
                  (
                    SELECT group_concat(bi.item_code, ', ')
                    FROM booking_items bi
                    WHERE bi.booking_id = b.id AND bi.item_status = 'active'
                  ),
                  'Booking'
                ) AS title,
                b.customer_name || ' - ' || b.source AS detail,
                b.status AS status,
                b.dp_total AS amount,
                b.created_at AS occurred_at,
                '/pos/bookings?bookingId=' || b.id AS href
         FROM bookings b
         WHERE b.customer_id = ?

         UNION ALL

         SELECT fa.id AS id,
                'fitting' AS type,
                fa.fitting_code AS reference,
                'Fitting appointment' AS title,
                fa.appointment_date || ' ' || fa.start_time AS detail,
                fa.status AS status,
                NULL AS amount,
                fa.appointment_date || ' ' || fa.start_time || ':00' AS occurred_at,
                '/pos/fitting' AS href
         FROM fitting_appointments fa
         WHERE fa.customer_id = ?
       )
       ${whereSql}
       ORDER BY occurred_at DESC
       LIMIT 120`,
    )
    .bind(...bindings)
    .all<ActivityRow>();

  return result.results.map(toActivity);
}

async function getCustomerOrderedItems(
  db: D1Database,
  customerId: string,
  input: {
    dateFrom?: string;
    dateTo?: string;
  } = {},
) {
  const dateFrom = normalizeDateInput(input.dateFrom);
  const dateTo = normalizeDateInput(input.dateTo);
  const dateRange = getDateRangeSql('ordered_at', dateFrom, dateTo);
  const whereSql = dateRange ? `WHERE ${dateRange.sql}` : '';
  const bindings = [
    customerId,
    customerId,
    ...(dateRange?.bindings ?? []),
  ];
  const result = await db
    .prepare(
      `SELECT id,
              source,
              reference,
              item_id,
              item_code,
              item_name,
              status,
              amount,
              ordered_at,
              due_date,
              href
       FROM (
         SELECT pt.id AS id,
                'pos' AS source,
                pt.transaction_number AS reference,
                pt.item_id AS item_id,
                pt.item_code AS item_code,
                pt.item_name AS item_name,
                pt.status AS status,
                pt.item_price AS amount,
                pt.created_at AS ordered_at,
                pt.due_date AS due_date,
                '/pos/transactions?transactionId=' || pt.id AS href
         FROM pos_transactions pt
         WHERE pt.customer_id = ?

         UNION ALL

         SELECT bi.id AS id,
                'booking' AS source,
                b.booking_number AS reference,
                bi.item_id AS item_id,
                bi.item_code AS item_code,
                bi.item_name AS item_name,
                b.status AS status,
                bi.rental_price_snapshot + bi.extra_return_fee AS amount,
                bi.pickup_date || ' 00:00:00' AS ordered_at,
                bi.return_due_date AS due_date,
                '/pos/bookings?bookingId=' || b.id AS href
         FROM booking_items bi
         INNER JOIN bookings b ON b.id = bi.booking_id
         WHERE b.customer_id = ?
           AND bi.item_status = 'active'
       )
       ${whereSql}
       ORDER BY ordered_at DESC
       LIMIT 120`,
    )
    .bind(...bindings)
    .all<OrderedItemRow>();

  return result.results.map(toOrderedItem);
}

export async function getCustomerProfile(
  customerId: string,
  input: {
    dateFrom?: string;
    dateTo?: string;
  } = {},
): Promise<CustomerProfile | null> {
  const customer = await getCustomerById(customerId);

  if (!customer) {
    return null;
  }

  const db = await getD1Database();
  const [activity, orderedItems] = await Promise.all([
    getCustomerActivity(db, customer.id, input),
    getCustomerOrderedItems(db, customer.id, input),
  ]);

  return {
    customer,
    activity,
    orderedItems,
  };
}
