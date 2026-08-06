import { getD1Database } from '@/lib/cloudflare';
import type { KebayaItem } from '@/data/mockData';
import { type PosReceipt, type PosTransaction } from '@/lib/pos-ledger';
import { createToken, hashToken } from '@/lib/consignor-crypto';

export type ConsignorStatus = 'invited' | 'active' | 'suspended';

export type Consignor = {
  id: string;
  email: string;
  passwordHash: string | null;
  passwordSalt: string | null;
  name: string;
  phone: string;
  status: ConsignorStatus;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConsignorTokenPurpose = 'set_password' | 'reset_password';
export type ConsignorPayoutStatus = 'accrued' | 'paid';
export type ConsignorPayoutRequestStatus = 'pending' | 'settled' | 'rejected';
export type ConsignorWithdrawalRequestStatus = 'pending' | 'approved' | 'rejected';

export type ConsignorItemSummary = KebayaItem & {
  payoutBalance: number;
  payoutCount: number;
  lastPayoutAt: string | null;
  pendingWithdrawal: boolean;
};

export type ConsignorPayoutLine = {
  id: string;
  consignorId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  transactionId: string;
  transactionNumber: string;
  closeReceiptId: string;
  rentalNet: number;
  ratePercent: 40 | 50;
  payoutAmount: number;
  status: ConsignorPayoutStatus;
  accruedAt: string;
  paidAt: string | null;
  payoutRequestId: string | null;
  transferReference: string | null;
};

export type ConsignorPayoutRequest = {
  id: string;
  consignorId: string;
  amount: number;
  status: ConsignorPayoutRequestStatus;
  requestedAt: string;
  settledAt: string | null;
  reference: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
};

export type ConsignorWithdrawalRequest = {
  id: string;
  consignorId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  status: ConsignorWithdrawalRequestStatus;
  requestedAt: string;
  resolvedAt: string | null;
  note: string | null;
  adminNote: string | null;
};

export type ConsignorDashboard = {
  consignor: Consignor;
  items: ConsignorItemSummary[];
  payouts: ConsignorPayoutLine[];
  payoutRequests: ConsignorPayoutRequest[];
  withdrawalRequests: ConsignorWithdrawalRequest[];
  availableBalance: number;
  requestedBalance: number;
  paidBalance: number;
};

export type ConsignorWithInvite = Consignor & {
  inviteToken: string;
  inviteLink: string;
};

type ConsignorRow = {
  id: string;
  email: string;
  password_hash: string | null;
  password_salt: string | null;
  name: string;
  phone: string;
  status: ConsignorStatus;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

type ConsignorTokenRow = {
  id: string;
  consignor_id: string;
  token_hash: string;
  purpose: ConsignorTokenPurpose;
  expires_at: string;
  used_at: string | null;
};

type ConsignorPayoutRow = {
  id: string;
  consignor_id: string;
  item_id: string;
  transaction_id: string;
  close_receipt_id: string;
  rental_net: number;
  rate_percent: 40 | 50;
  payout_amount: number;
  status: ConsignorPayoutStatus;
  accrued_at: string;
  paid_at: string | null;
  payout_request_id: string | null;
  transfer_reference: string | null;
  item_code: string | null;
  item_name: string | null;
  transaction_number: string | null;
};

type ConsignorPayoutRequestRow = {
  id: string;
  consignor_id: string;
  amount: number;
  status: ConsignorPayoutRequestStatus;
  requested_at: string;
  settled_at: string | null;
  reference: string | null;
  bank_account_name: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
};

type ConsignorWithdrawalRequestRow = {
  id: string;
  consignor_id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  status: ConsignorWithdrawalRequestStatus;
  requested_at: string;
  resolved_at: string | null;
  note: string | null;
  admin_note: string | null;
};

type ConsignorItemRow = {
  id: string;
  code: string;
  name: string;
  color: string;
  size: KebayaItem['size'];
  model: KebayaItem['model'];
  rental_price: number;
  compare_at_rental_price: number | null;
  can_resize: number | null;
  status: KebayaItem['status'];
  rental_end_date: string | null;
  image_urls: string;
  description: string;
  hijab_friendly: number | null;
  cost: number | null;
  published: number | null;
  consignor_id: string | null;
  rental_includes: string | null;
  categories: string | null;
  measurements: string | null;
  payout_balance: number;
  payout_count: number;
  last_payout_at: string | null;
  pending_withdrawal: number;
};

type ConsignorSummaryRow = ConsignorRow & {
  active_item_count: number;
  accrued_balance: number;
  requested_balance: number;
  paid_balance: number;
  pending_payout_requests: number;
  pending_withdrawal_requests: number;
};

function isSchemaMissing(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('no such table: consignors') ||
    message.includes('no such table: consignor_sessions') ||
    message.includes('no such table: consignor_tokens') ||
    message.includes('no such table: consignor_payouts') ||
    message.includes('no such table: consignor_payout_requests') ||
    message.includes('no such table: consignor_withdrawal_requests') ||
    message.includes('no such column: consignor_id')
  );
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function itemRowToItem(row: ConsignorItemRow): ConsignorItemSummary {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    color: row.color,
    size: row.size,
    model: row.model,
    rentalPrice: row.rental_price,
    compareAtRentalPrice: row.compare_at_rental_price,
    canResize: row.can_resize === 1,
    status: row.status,
    rentalEndDate: row.rental_end_date,
    imageUrls: parseJson<string[]>(row.image_urls, []),
    description: row.description,
    hijabFriendly:
      row.hijab_friendly === null || row.hijab_friendly === undefined ? true : row.hijab_friendly === 1,
    cost: row.cost,
    published: row.published === null || row.published === undefined ? true : row.published === 1,
    consignorId: row.consignor_id,
    rentalIncludes: parseJson(row.rental_includes, undefined),
    categories: parseJson(row.categories, undefined),
    measurements: parseJson(row.measurements, undefined),
    payoutBalance: row.payout_balance,
    payoutCount: row.payout_count,
    lastPayoutAt: row.last_payout_at,
    pendingWithdrawal: row.pending_withdrawal === 1,
  };
}

function rowToConsignor(row: ConsignorRow): Consignor {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    name: row.name,
    phone: row.phone,
    status: row.status,
    bankAccountName: row.bank_account_name,
    bankName: row.bank_name,
    bankAccountNumber: row.bank_account_number,
    termsVersion: row.terms_version,
    termsAcceptedAt: row.terms_accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function readConsignorByRow(column: string, value: string) {
  const db = await getD1Database();
  const row = await db
    .prepare(
      `SELECT id, email, password_hash, password_salt, name, phone, status,
        bank_account_name, bank_name, bank_account_number, terms_version, terms_accepted_at,
        created_at, updated_at
       FROM consignors
       WHERE ${column} = ?
       LIMIT 1`,
    )
    .bind(value)
    .first<ConsignorRow>();

  return row ? rowToConsignor(row) : null;
}

export async function getConsignorByEmail(email: string) {
  try {
    return await readConsignorByRow('email', email.toLowerCase());
  } catch (error) {
    if (isSchemaMissing(error)) {
      return null;
    }

    throw error;
  }
}

export async function getConsignorById(consignorId: string) {
  try {
    return await readConsignorByRow('id', consignorId);
  } catch (error) {
    if (isSchemaMissing(error)) {
      return null;
    }

    throw error;
  }
}

export async function createConsignor(input: { name: string; email: string; phone: string }) {
  const db = await getD1Database();
  const existing = await getConsignorByEmail(input.email);
  const consignorId = existing?.id ?? createId('consignor');

  await db
    .prepare(
      `INSERT INTO consignors (id, email, name, phone, status)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         phone = excluded.phone,
         status = CASE
           WHEN consignors.password_hash IS NULL THEN 'invited'
           ELSE consignors.status
         END,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(consignorId, input.email.toLowerCase(), input.name.trim(), input.phone.trim(), 'invited')
    .run();

  return (await getConsignorById(consignorId))!;
}

export async function setConsignorPassword(input: {
  consignorId: string;
  passwordHash: string;
  passwordSalt: string;
}) {
  const db = await getD1Database();
  await db
    .prepare(
      `UPDATE consignors
       SET password_hash = ?, password_salt = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(input.passwordHash, input.passwordSalt, input.consignorId)
    .run();
}

export async function updateConsignorTerms(consignorId: string, termsVersion: string) {
  const db = await getD1Database();
  await db
    .prepare(
      `UPDATE consignors
       SET terms_version = ?, terms_accepted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(termsVersion, consignorId)
    .run();
}

export async function updateConsignorProfile(
  consignorId: string,
  input: { bankAccountName: string; bankName: string; bankAccountNumber: string },
) {
  const db = await getD1Database();
  await db
    .prepare(
      `UPDATE consignors
       SET bank_account_name = ?, bank_name = ?, bank_account_number = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    )
    .bind(input.bankAccountName.trim(), input.bankName.trim(), input.bankAccountNumber.trim(), consignorId)
    .run();
}

export async function createConsignorToken(input: {
  consignorId: string;
  purpose: ConsignorTokenPurpose;
  expiresAt: string;
}) {
  const db = await getD1Database();
  const token = createToken();
  const tokenHash = await hashToken(token);

  await db
    .prepare(
      `INSERT INTO consignor_tokens (id, consignor_id, token_hash, purpose, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(createId('consignor-token'), input.consignorId, tokenHash, input.purpose, input.expiresAt)
    .run();

  return { token, tokenHash };
}

export async function consumeConsignorToken(input: {
  token: string;
  purpose: ConsignorTokenPurpose | ConsignorTokenPurpose[];
}) {
  try {
    const db = await getD1Database();
    const tokenHash = await hashToken(input.token);
    const purposes = Array.isArray(input.purpose) ? input.purpose : [input.purpose];
    const purposePlaceholders = purposes.map(() => '?').join(', ');
    const row = await db
      .prepare(
        `SELECT id, consignor_id, token_hash, purpose, expires_at, used_at
         FROM consignor_tokens
         WHERE token_hash = ? AND purpose IN (${purposePlaceholders})
         LIMIT 1`,
      )
      .bind(tokenHash, ...purposes)
      .first<ConsignorTokenRow>();

    if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
      return null;
    }

    await db
      .prepare(
        `UPDATE consignor_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(row.id)
      .run();

    return {
      consignorId: row.consignor_id,
    };
  } catch (error) {
    if (isSchemaMissing(error)) {
      return null;
    }

    throw error;
  }
}

export async function createConsignorSession(input: { consignorId: string; expiresAt: string }) {
  const db = await getD1Database();
  const token = createToken();
  const tokenHash = await hashToken(token);

  await db
    .prepare(
      `INSERT INTO consignor_sessions (id, consignor_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(createId('consignor-session'), input.consignorId, tokenHash, input.expiresAt)
    .run();

  return { token, tokenHash };
}

export async function getConsignorBySessionToken(token: string) {
  try {
    const db = await getD1Database();
    const tokenHash = await hashToken(token);
    const row = await db
      .prepare(
        `SELECT c.id, c.email, c.password_hash, c.password_salt, c.name, c.phone, c.status,
          c.bank_account_name, c.bank_name, c.bank_account_number, c.terms_version, c.terms_accepted_at,
          c.created_at, c.updated_at
         FROM consignor_sessions s
         JOIN consignors c ON c.id = s.consignor_id
         WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
         LIMIT 1`,
      )
      .bind(tokenHash)
      .first<ConsignorRow>();

    return row ? rowToConsignor(row) : null;
  } catch (error) {
    if (isSchemaMissing(error)) {
      return null;
    }

    throw error;
  }
}

export async function deleteConsignorSession(token: string) {
  try {
    const db = await getD1Database();
    const tokenHash = await hashToken(token);
    await db.prepare('DELETE FROM consignor_sessions WHERE token_hash = ?').bind(tokenHash).run();
  } catch (error) {
    if (!isSchemaMissing(error)) {
      throw error;
    }
  }
}

export async function listConsignors() {
  try {
    const db = await getD1Database();
    const result = await db
      .prepare(
        `SELECT c.*,
          COALESCE((
            SELECT COUNT(*)
            FROM kebaya_items ki
            WHERE ki.consignor_id = c.id AND ki.status != 'archived'
          ), 0) AS active_item_count,
          COALESCE((
            SELECT SUM(CASE WHEN cp.status = 'accrued' THEN cp.payout_amount ELSE 0 END)
            FROM consignor_payouts cp
            WHERE cp.consignor_id = c.id
          ), 0) AS accrued_balance,
          COALESCE((
            SELECT SUM(CASE WHEN cp.status = 'accrued' AND cp.payout_request_id IS NOT NULL THEN cp.payout_amount ELSE 0 END)
            FROM consignor_payouts cp
            WHERE cp.consignor_id = c.id
          ), 0) AS requested_balance,
          COALESCE((
            SELECT SUM(CASE WHEN cp.status = 'paid' THEN cp.payout_amount ELSE 0 END)
            FROM consignor_payouts cp
            WHERE cp.consignor_id = c.id
          ), 0) AS paid_balance,
          COALESCE((
            SELECT COUNT(*)
            FROM consignor_payout_requests pr
            WHERE pr.consignor_id = c.id AND pr.status = 'pending'
          ), 0) AS pending_payout_requests,
          COALESCE((
            SELECT COUNT(*)
            FROM consignor_withdrawal_requests wr
            WHERE wr.consignor_id = c.id AND wr.status = 'pending'
          ), 0) AS pending_withdrawal_requests
         FROM consignors c
         ORDER BY c.created_at DESC`,
      )
      .all<ConsignorSummaryRow>();

    return result.results.map((row) => ({
      ...rowToConsignor(row),
      activeItemCount: row.active_item_count,
      accruedBalance: row.accrued_balance,
      requestedBalance: row.requested_balance,
      paidBalance: row.paid_balance,
      pendingPayoutRequests: row.pending_payout_requests,
      pendingWithdrawalRequests: row.pending_withdrawal_requests,
    }));
  } catch (error) {
    if (isSchemaMissing(error)) {
      return [];
    }

    throw error;
  }
}

export async function getConsignorDashboard(consignorId: string) {
  const db = await getD1Database();
  const consignor = await getConsignorById(consignorId);

  if (!consignor) {
    return null;
  }

  const [itemsResult, payoutsResult, payoutRequestsResult, withdrawalRequestsResult] =
    await Promise.all([
      db
        .prepare(
          `SELECT ki.id, ki.code, ki.name, ki.color, ki.size, ki.model, ki.rental_price,
            ki.compare_at_rental_price, ki.can_resize, ki.status, ki.rental_end_date, ki.image_urls,
            ki.description, ki.hijab_friendly, ki.cost, ki.published, ki.consignor_id,
            ki.rental_includes, ki.categories, ki.measurements,
            COALESCE((
              SELECT SUM(cp.payout_amount)
              FROM consignor_payouts cp
              WHERE cp.item_id = ki.id AND cp.consignor_id = ki.consignor_id
            ), 0) AS payout_balance,
            COALESCE((
              SELECT COUNT(*)
              FROM consignor_payouts cp
              WHERE cp.item_id = ki.id AND cp.consignor_id = ki.consignor_id
            ), 0) AS payout_count,
            (
              SELECT MAX(cp.accrued_at)
              FROM consignor_payouts cp
              WHERE cp.item_id = ki.id AND cp.consignor_id = ki.consignor_id
            ) AS last_payout_at,
            COALESCE((
              SELECT COUNT(*)
              FROM consignor_withdrawal_requests wr
              WHERE wr.item_id = ki.id AND wr.consignor_id = ki.consignor_id AND wr.status = 'pending'
            ), 0) AS pending_withdrawal
           FROM kebaya_items ki
           WHERE ki.consignor_id = ?
           ORDER BY ki.created_at DESC`,
        )
        .bind(consignorId)
        .all<ConsignorItemRow>(),
      db
        .prepare(
          `SELECT cp.id, cp.consignor_id, cp.item_id, cp.transaction_id, cp.close_receipt_id,
            cp.rental_net, cp.rate_percent, cp.payout_amount, cp.status, cp.accrued_at, cp.paid_at,
            cp.payout_request_id, cp.transfer_reference, ki.code AS item_code, ki.name AS item_name,
            pt.transaction_number
           FROM consignor_payouts cp
           LEFT JOIN kebaya_items ki ON ki.id = cp.item_id
           LEFT JOIN pos_transactions pt ON pt.id = cp.transaction_id
           WHERE cp.consignor_id = ?
           ORDER BY cp.accrued_at DESC`,
        )
        .bind(consignorId)
        .all<ConsignorPayoutRow>(),
      db
        .prepare(
          `SELECT id, consignor_id, amount, status, requested_at, settled_at, reference,
            bank_account_name, bank_name, bank_account_number
           FROM consignor_payout_requests
           WHERE consignor_id = ?
           ORDER BY requested_at DESC`,
        )
        .bind(consignorId)
        .all<ConsignorPayoutRequestRow>(),
      db
        .prepare(
          `SELECT wr.id, wr.consignor_id, wr.item_id, ki.code AS item_code, ki.name AS item_name,
            wr.status, wr.requested_at, wr.resolved_at, wr.note, wr.admin_note
           FROM consignor_withdrawal_requests wr
           JOIN kebaya_items ki ON ki.id = wr.item_id
           WHERE wr.consignor_id = ?
           ORDER BY wr.requested_at DESC`,
        )
        .bind(consignorId)
        .all<ConsignorWithdrawalRequestRow>(),
    ]);

  const payouts = payoutsResult.results.map((row) => ({
    id: row.id,
    consignorId: row.consignor_id,
    itemId: row.item_id,
    itemCode: row.item_code ?? '',
    itemName: row.item_name ?? '',
    transactionId: row.transaction_id,
    transactionNumber: row.transaction_number ?? '',
    closeReceiptId: row.close_receipt_id,
    rentalNet: row.rental_net,
    ratePercent: row.rate_percent,
    payoutAmount: row.payout_amount,
    status: row.status,
    accruedAt: row.accrued_at,
    paidAt: row.paid_at,
    payoutRequestId: row.payout_request_id,
    transferReference: row.transfer_reference,
  }));

  const requestedBalance = payouts
    .filter((row) => row.status === 'accrued' && row.payoutRequestId)
    .reduce((sum, row) => sum + row.payoutAmount, 0);
  const availableBalance = payouts
    .filter((row) => row.status === 'accrued' && !row.payoutRequestId)
    .reduce((sum, row) => sum + row.payoutAmount, 0);
  const paidBalance = payouts
    .filter((row) => row.status === 'paid')
    .reduce((sum, row) => sum + row.payoutAmount, 0);

  return {
    consignor,
    items: itemsResult.results.map(itemRowToItem),
    payouts,
    payoutRequests: payoutRequestsResult.results.map((row) => ({
      id: row.id,
      consignorId: row.consignor_id,
      amount: row.amount,
      status: row.status,
      requestedAt: row.requested_at,
      settledAt: row.settled_at,
      reference: row.reference,
      bankAccountName: row.bank_account_name,
      bankName: row.bank_name,
      bankAccountNumber: row.bank_account_number,
    })),
    withdrawalRequests: withdrawalRequestsResult.results.map((row) => ({
      id: row.id,
      consignorId: row.consignor_id,
      itemId: row.item_id,
      itemCode: row.item_code,
      itemName: row.item_name,
      status: row.status,
      requestedAt: row.requested_at,
      resolvedAt: row.resolved_at,
      note: row.note,
      adminNote: row.admin_note,
    })),
    availableBalance,
    requestedBalance,
    paidBalance,
  } satisfies ConsignorDashboard;
}

export async function requestConsignorPayout(input: {
  consignorId: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  minimumAmount: number;
}) {
  const db = await getD1Database();
  const dashboard = await getConsignorDashboard(input.consignorId);

  if (!dashboard) {
    throw new Error('Consignor not found.');
  }

  if (dashboard.availableBalance < input.minimumAmount) {
    throw new Error(`Minimum payout is Rp ${input.minimumAmount.toLocaleString('id-ID')}.`);
  }

  const eligibleRows = dashboard.payouts.filter(
    (row) => row.status === 'accrued' && !row.payoutRequestId,
  );
  const amount = eligibleRows.reduce((sum, row) => sum + row.payoutAmount, 0);

  if (amount < input.minimumAmount) {
    throw new Error(`Minimum payout is Rp ${input.minimumAmount.toLocaleString('id-ID')}.`);
  }

  const requestId = createId('consignor-payout-request');
  const payoutIds = eligibleRows.map((row) => row.id);

  await db.batch([
    db
      .prepare(
        `UPDATE consignors
         SET bank_account_name = ?, bank_name = ?, bank_account_number = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
      )
      .bind(input.bankAccountName.trim(), input.bankName.trim(), input.bankAccountNumber.trim(), input.consignorId),
    db
      .prepare(
        `INSERT INTO consignor_payout_requests (
          id, consignor_id, amount, status, bank_account_name, bank_name, bank_account_number
        ) VALUES (?, ?, ?, 'pending', ?, ?, ?)`,
      )
      .bind(
        requestId,
        input.consignorId,
        amount,
        input.bankAccountName.trim(),
        input.bankName.trim(),
        input.bankAccountNumber.trim(),
      ),
    ...payoutIds.map((payoutId) =>
      db
        .prepare(
          `UPDATE consignor_payouts
           SET payout_request_id = ?
           WHERE id = ? AND status = 'accrued' AND payout_request_id IS NULL`,
        )
        .bind(requestId, payoutId),
    ),
  ]);

  return { requestId, amount };
}

export async function settleConsignorPayoutRequest(input: {
  requestId: string;
  reference: string;
}) {
  const db = await getD1Database();
  const request = await db
    .prepare(
      `SELECT id, consignor_id, amount, status, requested_at, settled_at, reference,
        bank_account_name, bank_name, bank_account_number
       FROM consignor_payout_requests
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(input.requestId)
    .first<ConsignorPayoutRequestRow>();

  if (!request) {
    throw new Error('Payout request not found.');
  }

  if (request.status !== 'pending') {
    throw new Error('Payout request already settled.');
  }

  const payouts = await db
    .prepare(
      `SELECT id FROM consignor_payouts
       WHERE payout_request_id = ? AND status = 'accrued'`,
    )
    .bind(request.id)
    .all<{ id: string }>();

  await db.batch([
    db
      .prepare(
        `UPDATE consignor_payout_requests
         SET status = 'settled', settled_at = CURRENT_TIMESTAMP, reference = ?
         WHERE id = ?`,
      )
      .bind(input.reference.trim(), request.id),
    ...payouts.results.map((row) =>
      db
        .prepare(
          `UPDATE consignor_payouts
           SET status = 'paid', paid_at = CURRENT_TIMESTAMP, transfer_reference = ?
           WHERE id = ?`,
        )
        .bind(input.reference.trim(), row.id),
    ),
  ]);
}

export async function requestConsignorWithdrawal(input: {
  consignorId: string;
  itemId: string;
  note: string;
}) {
  const db = await getD1Database();
  const item = await db
    .prepare(
      `SELECT id, code, name, status, consignor_id
       FROM kebaya_items
       WHERE id = ? AND consignor_id = ?
       LIMIT 1`,
    )
    .bind(input.itemId, input.consignorId)
    .first<{ id: string; code: string; name: string; status: string; consignor_id: string | null }>();

  if (!item) {
    throw new Error('Item not found.');
  }

  if (item.status === 'rented') {
    throw new Error('Withdrawal can only be requested when the item is not currently rented.');
  }

  const existing = await db
    .prepare(
      `SELECT id FROM consignor_withdrawal_requests
       WHERE item_id = ? AND consignor_id = ? AND status = 'pending'
       LIMIT 1`,
    )
    .bind(input.itemId, input.consignorId)
    .first<{ id: string }>();

  if (existing) {
    return existing.id;
  }

  const id = createId('consignor-withdrawal-request');
  await db
    .prepare(
      `INSERT INTO consignor_withdrawal_requests (id, consignor_id, item_id, note)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(id, input.consignorId, input.itemId, input.note.trim())
    .run();

  return id;
}

export async function resolveConsignorWithdrawalRequest(input: {
  requestId: string;
  status: 'approved' | 'rejected';
  adminNote?: string | null;
}) {
  const db = await getD1Database();
  await db
    .prepare(
      `UPDATE consignor_withdrawal_requests
       SET status = ?, resolved_at = CURRENT_TIMESTAMP, admin_note = ?
       WHERE id = ?`,
    )
    .bind(input.status, input.adminNote ?? null, input.requestId)
    .run();
}

export async function listConsignorPendingActions() {
  return [];
}

export async function accrueConsignorPayouts(input: {
  transactions: PosTransaction[];
  receipts: PosReceipt[];
}) {
  try {
    const db = await getD1Database();
    const closedTransactions = input.transactions.filter(
      (transaction) => transaction.kind === 'rental' && transaction.status === 'closed' && Boolean(transaction.closedAt),
    );

    if (closedTransactions.length === 0) {
      return;
    }

    const itemIds = Array.from(
      new Set(
        closedTransactions.flatMap((transaction) => [
          transaction.itemId,
          ...transaction.items.map((item) => item.itemId),
        ]),
      ),
    );

    if (itemIds.length === 0) {
      return;
    }

    const placeholders = itemIds.map(() => '?').join(', ');
    const itemRows = await db
      .prepare(
        `SELECT id, consignor_id
         FROM kebaya_items
         WHERE id IN (${placeholders})`,
      )
      .bind(...itemIds)
      .all<{ id: string; consignor_id: string | null }>();

    const consignorByItemId = new Map(itemRows.results.map((row) => [row.id, row.consignor_id]));
    const activeCounts = new Map<string, number>();
    const consignorIds = Array.from(new Set(itemRows.results.map((row) => row.consignor_id).filter(Boolean))) as string[];

    if (consignorIds.length > 0) {
      const countPlaceholders = consignorIds.map(() => '?').join(', ');
      const countRows = await db
        .prepare(
          `SELECT consignor_id, COUNT(*) AS count
           FROM kebaya_items
           WHERE consignor_id IN (${countPlaceholders}) AND status != 'archived'
           GROUP BY consignor_id`,
        )
        .bind(...consignorIds)
        .all<{ consignor_id: string; count: number }>();

      countRows.results.forEach((row) => activeCounts.set(row.consignor_id, row.count));
    }

    const closeReceiptByTransaction = new Map(
      input.receipts
        .filter((receipt) => receipt.action === 'close')
        .map((receipt) => [receipt.transactionId, receipt]),
    );

    const payoutStatements: D1PreparedStatement[] = [];
    for (const transaction of closedTransactions) {
      const closeReceipt = closeReceiptByTransaction.get(transaction.id);

      if (!closeReceipt) {
        continue;
      }

      const lines =
        transaction.items.length > 0
          ? transaction.items
          : [
              {
                itemId: transaction.itemId,
                itemCode: transaction.itemCode,
                itemName: transaction.itemName,
                itemPrice: transaction.itemPrice,
                deposit: transaction.depositReceived,
              },
            ];
      const totalPrice = lines.reduce((sum, line) => sum + Math.max(0, line.itemPrice), 0);

      if (totalPrice <= 0) {
        continue;
      }

      let allocatedAdjustment = 0;

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const consignorId = consignorByItemId.get(line.itemId);

        if (!consignorId) {
          continue;
        }

        const isLastLine = index === lines.length - 1;
        const adjustmentShare = isLastLine
          ? transaction.adjustmentAmount - allocatedAdjustment
          : Math.round((transaction.adjustmentAmount * line.itemPrice) / totalPrice);
        allocatedAdjustment += adjustmentShare;
        const rentalNet = Math.max(0, Math.round(line.itemPrice - adjustmentShare));

        if (rentalNet <= 0) {
          continue;
        }

        const activeCount = activeCounts.get(consignorId) ?? 0;
        const ratePercent = activeCount >= Number(process.env.CONSIGNOR_TIER_THRESHOLD ?? 3)
          ? Number(process.env.CONSIGNOR_RATE_HIGH ?? 50)
          : Number(process.env.CONSIGNOR_RATE_LOW ?? 40);
        const payoutAmount = Math.round((rentalNet * ratePercent) / 100);

        if (payoutAmount <= 0) {
          continue;
        }

        payoutStatements.push(
          db
            .prepare(
              `INSERT OR IGNORE INTO consignor_payouts (
                id, consignor_id, item_id, transaction_id, close_receipt_id, rental_net,
                rate_percent, payout_amount, status, accrued_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'accrued', ?)`,
            )
            .bind(
              createId('consignor-payout'),
              consignorId,
              line.itemId,
              transaction.id,
              closeReceipt.id,
              rentalNet,
              ratePercent,
              payoutAmount,
              closeReceipt.createdAt ?? transaction.closedAt ?? transaction.updatedAt,
            ),
        );
      }
    }

    if (payoutStatements.length > 0) {
      await db.batch(payoutStatements);
    }
  } catch (error) {
    if (!isSchemaMissing(error)) {
      throw error;
    }
  }
}
