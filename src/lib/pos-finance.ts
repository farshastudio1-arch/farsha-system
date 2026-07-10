import { getD1Database } from '@/lib/cloudflare';
import type { PosPaymentMethod } from '@/lib/pos-ledger';

export const POS_FINANCE_TIME_ZONE = 'Asia/Jakarta' as const;

export type PosFinancePreset = 'today' | 'week' | 'month' | 'custom';
export type PosFinanceCashMethod = Extract<PosPaymentMethod, 'cash' | 'transfer' | 'qris'>;
export type PosFinanceAccountingType =
  | 'rental_revenue'
  | 'booking_dp_revenue'
  | 'penalty_revenue'
  | 'adjustment_revenue'
  | 'deposit_in'
  | 'deposit_refund'
  | 'expense'
  | 'document';

export type PosFinancePeriod = {
  preset: PosFinancePreset;
  fromDate: string;
  toDate: string;
  timeZone: typeof POS_FINANCE_TIME_ZONE;
};

export type PosFinanceSourceType =
  | 'pos_receipt'
  | 'booking_payment'
  | 'booking_invoice'
  | 'booking_receipt'
  | 'expense';

export type PosFinanceActivityEntry = {
  id: string;
  sourceType: PosFinanceSourceType;
  sourceId: string;
  sourceNumber: string;
  accountingType: PosFinanceAccountingType;
  customerName: string;
  description: string;
  amount: number;
  direction: 'in' | 'out' | 'none';
  cashAmount: number;
  revenueAmount: number;
  depositAmount: number;
  expenseAmount: number;
  paymentMethod: PosPaymentMethod;
  occurredAt: string;
  href: string | null;
};

export type PosFinanceDocumentEntry = {
  id: string;
  sourceType: 'booking_invoice' | 'booking_receipt';
  documentNumber: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  status: string;
  totalAmount: number;
  issuedAt: string;
  href: string;
};

export type PosFinanceReceiptEntry = {
  id: string;
  sourceType: 'pos_receipt' | 'booking_receipt';
  receiptNumber: string;
  referenceNumber: string;
  customerName: string;
  itemLabel: string;
  amount: number;
  direction: 'in' | 'out';
  paymentMethod: PosPaymentMethod;
  occurredAt: string;
  href: string | null;
};

export type PosExpenseCategory = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'archived';
  sortOrder: number;
};

export type PosExpenseEntry = {
  id: string;
  expenseDate: string;
  categoryId: string | null;
  categoryName: string;
  vendor: string;
  amount: number;
  paymentMethod: PosFinanceCashMethod;
  note: string;
  createdBy: string | null;
  createdAt: string;
};

export type PosDailyClosing = {
  id: string;
  closeDate: string;
  cashExpected: number;
  cashCounted: number;
  cashVariance: number;
  transferExpected: number;
  transferCounted: number;
  transferVariance: number;
  qrisExpected: number;
  qrisCounted: number;
  qrisVariance: number;
  notes: string;
  closedBy: string | null;
  closedAt: string;
  updatedAt: string;
};

export type PosFinanceSummary = {
  period: PosFinancePeriod;
  revenueTotal: number;
  bookingRevenue: number;
  posRevenue: number;
  expensesTotal: number;
  netIncome: number;
  depositIn: number;
  depositOut: number;
  depositHeld: number;
  cashIn: number;
  cashOut: number;
  netMovement: number;
  paymentByMethod: Record<PosPaymentMethod, number>;
  activity: PosFinanceActivityEntry[];
  receipts: PosFinanceReceiptEntry[];
  invoices: PosFinanceDocumentEntry[];
  expenses: PosExpenseEntry[];
  expenseCategories: PosExpenseCategory[];
  dailyClosings: PosDailyClosing[];
};

type PosReceiptFinanceRow = {
  id: string;
  receiptNumber: string;
  transactionId: string;
  transactionNumber: string;
  action: string;
  title: string;
  itemCode: string;
  itemName: string;
  customerName: string;
  kind: string;
  paymentMethod: PosPaymentMethod;
  baseAmount: number;
  depositReceived: number;
  refundedAmount: number;
  penaltyAmount: number;
  adjustmentAmount: number;
  eventAmount: number;
  createdAt: string;
};

type PosTransactionLiabilityRow = {
  depositReceived: number;
  refundedAmount: number;
  penaltyAmount: number;
};

type BookingPaymentFinanceRow = {
  id: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  amountDue: number;
  amountPaid: number;
  method: Exclude<PosPaymentMethod, 'card'>;
  reference: string | null;
  verifiedAt: string;
};

type BookingInvoiceFinanceRow = {
  id: string;
  bookingId: string;
  bookingNumber: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  issuedAt: string;
  customerName: string;
};

type BookingReceiptFinanceRow = {
  id: string;
  bookingId: string;
  bookingNumber: string;
  receiptNumber: string;
  status: string;
  totalAmount: number;
  issuedAt: string;
  customerName: string;
};

type ExpenseCategoryRow = {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'archived';
  sort_order: number;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  category_id: string | null;
  category_name: string;
  vendor: string | null;
  amount: number;
  payment_method: PosFinanceCashMethod;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

type ClosingRow = {
  id: string;
  close_date: string;
  cash_expected: number;
  cash_counted: number;
  cash_variance: number;
  transfer_expected: number;
  transfer_counted: number;
  transfer_variance: number;
  qris_expected: number;
  qris_counted: number;
  qris_variance: number;
  notes: string | null;
  closed_by: string | null;
  closed_at: string;
  updated_at: string;
};

const emptyPaymentByMethod: Record<PosPaymentMethod, number> = {
  cash: 0,
  transfer: 0,
  qris: 0,
  card: 0,
  other: 0,
};

export const defaultExpenseCategories = [
  { id: 'expense-category-laundry', name: 'Laundry', slug: 'laundry', sortOrder: 10 },
  { id: 'expense-category-ads', name: 'Ads', slug: 'ads', sortOrder: 20 },
  { id: 'expense-category-electricity-bill', name: 'Electricity Bill', slug: 'electricity-bill', sortOrder: 30 },
  { id: 'expense-category-salary', name: 'Salary', slug: 'salary', sortOrder: 40 },
  { id: 'expense-category-wifi-bill', name: 'Wifi Bill', slug: 'wifi-bill', sortOrder: 50 },
  { id: 'expense-category-water-bill', name: 'Water Bill', slug: 'water-bill', sortOrder: 60 },
  { id: 'expense-category-other', name: 'Other', slug: 'other', sortOrder: 999 },
] as const;

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function getJakartaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: POS_FINANCE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function dateKeyFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = dateFromKey(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKeyFromDate(date);
}

function getWeekPeriod(today: string): Pick<PosFinancePeriod, 'fromDate' | 'toDate'> {
  const date = dateFromKey(today);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const fromDate = addDays(today, mondayOffset);

  return {
    fromDate,
    toDate: addDays(fromDate, 6),
  };
}

function getMonthPeriod(today: string): Pick<PosFinancePeriod, 'fromDate' | 'toDate'> {
  const fromDate = `${today.slice(0, 7)}-01`;
  const end = dateFromKey(fromDate);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCDate(0);

  return {
    fromDate,
    toDate: dateKeyFromDate(end),
  };
}

function isDateKey(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function makeTodayFinancePeriod(): PosFinancePeriod {
  const today = getJakartaDateKey();

  return {
    preset: 'today',
    fromDate: today,
    toDate: today,
    timeZone: POS_FINANCE_TIME_ZONE,
  };
}

export function makeFinancePeriod(input?: {
  preset?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
}): PosFinancePeriod {
  const today = getJakartaDateKey();
  const preset = input?.preset;

  if (preset === 'week') {
    return { preset, ...getWeekPeriod(today), timeZone: POS_FINANCE_TIME_ZONE };
  }

  if (preset === 'month') {
    return { preset, ...getMonthPeriod(today), timeZone: POS_FINANCE_TIME_ZONE };
  }

  const fromDate = input?.fromDate ?? '';
  const toDate = input?.toDate ?? '';

  if (isDateKey(fromDate) && isDateKey(toDate)) {
    return {
      preset: fromDate === today && toDate === today ? 'today' : 'custom',
      fromDate,
      toDate,
      timeZone: POS_FINANCE_TIME_ZONE,
    };
  }

  return makeTodayFinancePeriod();
}

function normalizeAmount(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(Number(value));
}

function normalizePaymentMethod(value: string | null | undefined): PosPaymentMethod {
  return value === 'cash' ||
    value === 'transfer' ||
    value === 'qris' ||
    value === 'card' ||
    value === 'other'
    ? value
    : 'other';
}

function normalizeCashMethod(value: string | null | undefined): PosFinanceCashMethod {
  return value === 'transfer' || value === 'qris' ? value : 'cash';
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function slugify(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function bookingHref(bookingId: string) {
  return `/pos/bookings?bookingId=${encodeURIComponent(bookingId)}`;
}

function hasMissingFinanceTables(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('no such table: pos_receipts') ||
    error.message.includes('no such table: booking_payments') ||
    error.message.includes('no such table: booking_invoices') ||
    error.message.includes('no such table: booking_receipts') ||
    error.message.includes('no such table: pos_expense_categories') ||
    error.message.includes('no such table: pos_expenses') ||
    error.message.includes('no such table: pos_daily_closings')
  );
}

function emptyFinanceSummary(period: PosFinancePeriod): PosFinanceSummary {
  return {
    period,
    revenueTotal: 0,
    bookingRevenue: 0,
    posRevenue: 0,
    expensesTotal: 0,
    netIncome: 0,
    depositIn: 0,
    depositOut: 0,
    depositHeld: 0,
    cashIn: 0,
    cashOut: 0,
    netMovement: 0,
    paymentByMethod: { ...emptyPaymentByMethod },
    activity: [],
    receipts: [],
    invoices: [],
    expenses: [],
    expenseCategories: defaultExpenseCategories.map((category) => ({ ...category, status: 'active' })),
    dailyClosings: [],
  };
}

function activityEntry(input: Omit<PosFinanceActivityEntry, 'amount' | 'direction'>): PosFinanceActivityEntry {
  const signedAmount =
    input.cashAmount !== 0
      ? input.cashAmount
      : input.revenueAmount > 0
        ? input.revenueAmount
        : input.depositAmount !== 0
          ? input.depositAmount
          : input.expenseAmount > 0
            ? -input.expenseAmount
            : 0;

  return {
    ...input,
    amount: Math.abs(signedAmount),
    direction: signedAmount > 0 ? 'in' : signedAmount < 0 ? 'out' : 'none',
  };
}

function categoryRowToModel(row: ExpenseCategoryRow): PosExpenseCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    sortOrder: row.sort_order,
  };
}

function expenseRowToModel(row: ExpenseRow): PosExpenseEntry {
  return {
    id: row.id,
    expenseDate: row.expense_date,
    categoryId: row.category_id,
    categoryName: row.category_name,
    vendor: row.vendor ?? '',
    amount: row.amount,
    paymentMethod: normalizeCashMethod(row.payment_method),
    note: row.note ?? '',
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function closingRowToModel(row: ClosingRow): PosDailyClosing {
  return {
    id: row.id,
    closeDate: row.close_date,
    cashExpected: row.cash_expected,
    cashCounted: row.cash_counted,
    cashVariance: row.cash_variance,
    transferExpected: row.transfer_expected,
    transferCounted: row.transfer_counted,
    transferVariance: row.transfer_variance,
    qrisExpected: row.qris_expected,
    qrisCounted: row.qris_counted,
    qrisVariance: row.qris_variance,
    notes: row.notes ?? '',
    closedBy: row.closed_by,
    closedAt: row.closed_at,
    updatedAt: row.updated_at,
  };
}

export async function listPosExpenseCategories(): Promise<PosExpenseCategory[]> {
  const db = await getD1Database();
  const result = await db
    .prepare(
      `SELECT id, name, slug, status, sort_order
       FROM pos_expense_categories
       WHERE status = 'active'
       ORDER BY sort_order ASC, name ASC`,
    )
    .all<ExpenseCategoryRow>();

  return result.results.map(categoryRowToModel);
}

export async function createPosExpense(input: {
  expenseDate: string;
  categoryId?: string | null;
  categoryName?: string | null;
  vendor?: string | null;
  amount: number;
  paymentMethod: string;
  note?: string | null;
  createdBy?: string | null;
}) {
  const db = await getD1Database();
  const expenseDate = isDateKey(input.expenseDate) ? input.expenseDate : getJakartaDateKey();
  const amount = normalizeAmount(input.amount);

  if (amount <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  const categories = await listPosExpenseCategories();
  const selectedCategory = categories.find((category) => category.id === input.categoryId) ?? null;
  const customName = normalizeText(input.categoryName);
  let category = customName ? null : selectedCategory;

  if (customName) {
    const slug = slugify(customName) || `category-${Date.now()}`;
    const existing = await db
      .prepare(
        `SELECT id, name, slug, status, sort_order
         FROM pos_expense_categories
         WHERE slug = ?
         LIMIT 1`,
      )
      .bind(slug)
      .first<ExpenseCategoryRow>();

    if (existing) {
      category = categoryRowToModel(existing);
    } else {
      category = {
        id: createId('expense-category'),
        name: customName,
        slug,
        status: 'active',
        sortOrder: 900,
      };
      await db
        .prepare(
          `INSERT INTO pos_expense_categories (id, name, slug, status, sort_order)
           VALUES (?, ?, ?, 'active', ?)`,
        )
        .bind(category.id, category.name, category.slug, category.sortOrder)
        .run();
    }
  }

  const fallbackCategory = categories.find((item) => item.slug === 'other') ?? null;
  const finalCategory = category ?? fallbackCategory;

  await db
    .prepare(
      `INSERT INTO pos_expenses (
        id, expense_date, category_id, category_name, vendor, amount, payment_method,
        note, created_by, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    )
    .bind(
      createId('pos-expense'),
      expenseDate,
      finalCategory?.id ?? null,
      finalCategory?.name ?? 'Other',
      normalizeText(input.vendor),
      amount,
      normalizeCashMethod(input.paymentMethod),
      normalizeText(input.note),
      normalizeText(input.createdBy) || null,
    )
    .run();
}

export async function upsertPosDailyClosing(input: {
  closeDate: string;
  cashCounted: number;
  transferCounted: number;
  qrisCounted: number;
  notes?: string | null;
  closedBy?: string | null;
}) {
  const closeDate = isDateKey(input.closeDate) ? input.closeDate : getJakartaDateKey();
  const expected = await getPosFinanceSummary({
    preset: 'custom',
    fromDate: closeDate,
    toDate: closeDate,
    timeZone: POS_FINANCE_TIME_ZONE,
  });
  const cashCounted = normalizeAmount(input.cashCounted);
  const transferCounted = normalizeAmount(input.transferCounted);
  const qrisCounted = normalizeAmount(input.qrisCounted);
  const cashExpected = expected.paymentByMethod.cash;
  const transferExpected = expected.paymentByMethod.transfer;
  const qrisExpected = expected.paymentByMethod.qris;
  const db = await getD1Database();

  await db
    .prepare(
      `INSERT INTO pos_daily_closings (
        id, close_date, cash_expected, cash_counted, cash_variance,
        transfer_expected, transfer_counted, transfer_variance,
        qris_expected, qris_counted, qris_variance,
        notes, closed_by, closed_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(close_date) DO UPDATE SET
        cash_expected = excluded.cash_expected,
        cash_counted = excluded.cash_counted,
        cash_variance = excluded.cash_variance,
        transfer_expected = excluded.transfer_expected,
        transfer_counted = excluded.transfer_counted,
        transfer_variance = excluded.transfer_variance,
        qris_expected = excluded.qris_expected,
        qris_counted = excluded.qris_counted,
        qris_variance = excluded.qris_variance,
        notes = excluded.notes,
        closed_by = excluded.closed_by,
        updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      createId('pos-close'),
      closeDate,
      cashExpected,
      cashCounted,
      cashCounted - cashExpected,
      transferExpected,
      transferCounted,
      transferCounted - transferExpected,
      qrisExpected,
      qrisCounted,
      qrisCounted - qrisExpected,
      normalizeText(input.notes),
      normalizeText(input.closedBy) || null,
    )
    .run();
}

export async function getPosFinanceSummary(period = makeTodayFinancePeriod()): Promise<PosFinanceSummary> {
  const db = await getD1Database();

  try {
    const [
      posReceipts,
      depositLiability,
      bookingPayments,
      bookingInvoices,
      bookingReceipts,
      expenseCategories,
      expensesResult,
      closingsResult,
    ] = await Promise.all([
      db
        .prepare(
          `SELECT id,
                  receipt_number AS receiptNumber,
                  transaction_id AS transactionId,
                  transaction_number AS transactionNumber,
                  action,
                  title,
                  item_code AS itemCode,
                  item_name AS itemName,
                  customer_name AS customerName,
                  kind,
                  payment_method AS paymentMethod,
                  base_amount AS baseAmount,
                  deposit_received AS depositReceived,
                  refunded_amount AS refundedAmount,
                  penalty_amount AS penaltyAmount,
                  adjustment_amount AS adjustmentAmount,
                  event_amount AS eventAmount,
                  created_at AS createdAt
           FROM pos_receipts
           WHERE date(created_at, '+7 hours') BETWEEN ? AND ?
           ORDER BY created_at ASC`,
        )
        .bind(period.fromDate, period.toDate)
        .all<PosReceiptFinanceRow>(),
      db
        .prepare(
          `SELECT deposit_received AS depositReceived,
                  refunded_amount AS refundedAmount,
                  penalty_amount AS penaltyAmount
           FROM pos_transactions
           WHERE status != 'void'`,
        )
        .all<PosTransactionLiabilityRow>(),
      db
        .prepare(
          `SELECT bp.id,
                  bp.booking_id AS bookingId,
                  b.booking_number AS bookingNumber,
                  b.customer_name AS customerName,
                  bp.amount_due AS amountDue,
                  bp.amount_paid AS amountPaid,
                  bp.method,
                  bp.reference,
                  bp.verified_at AS verifiedAt
           FROM booking_payments bp
           INNER JOIN bookings b ON b.id = bp.booking_id
           WHERE bp.status = 'verified'
             AND bp.verified_at IS NOT NULL
             AND date(bp.verified_at, '+7 hours') BETWEEN ? AND ?
           ORDER BY bp.verified_at DESC`,
        )
        .bind(period.fromDate, period.toDate)
        .all<BookingPaymentFinanceRow>(),
      db
        .prepare(
          `SELECT bi.id,
                  bi.booking_id AS bookingId,
                  b.booking_number AS bookingNumber,
                  bi.invoice_number AS invoiceNumber,
                  bi.status,
                  bi.total_amount AS totalAmount,
                  bi.issued_at AS issuedAt,
                  b.customer_name AS customerName
           FROM booking_invoices bi
           INNER JOIN bookings b ON b.id = bi.booking_id
           WHERE date(bi.issued_at, '+7 hours') BETWEEN ? AND ?
           ORDER BY bi.issued_at DESC`,
        )
        .bind(period.fromDate, period.toDate)
        .all<BookingInvoiceFinanceRow>(),
      db
        .prepare(
          `SELECT br.id,
                  br.booking_id AS bookingId,
                  b.booking_number AS bookingNumber,
                  br.receipt_number AS receiptNumber,
                  br.status,
                  br.total_amount AS totalAmount,
                  br.issued_at AS issuedAt,
                  b.customer_name AS customerName
           FROM booking_receipts br
           INNER JOIN bookings b ON b.id = br.booking_id
           WHERE date(br.issued_at, '+7 hours') BETWEEN ? AND ?
           ORDER BY br.issued_at DESC`,
        )
        .bind(period.fromDate, period.toDate)
        .all<BookingReceiptFinanceRow>(),
      db
        .prepare(
          `SELECT id, name, slug, status, sort_order
           FROM pos_expense_categories
           WHERE status = 'active'
           ORDER BY sort_order ASC, name ASC`,
        )
        .all<ExpenseCategoryRow>(),
      db
        .prepare(
          `SELECT id, expense_date, category_id, category_name, vendor, amount,
                  payment_method, note, created_by, created_at
           FROM pos_expenses
           WHERE expense_date BETWEEN ? AND ?
           ORDER BY expense_date DESC, created_at DESC`,
        )
        .bind(period.fromDate, period.toDate)
        .all<ExpenseRow>(),
      db
        .prepare(
          `SELECT *
           FROM pos_daily_closings
           WHERE close_date BETWEEN ? AND ?
           ORDER BY close_date DESC`,
        )
        .bind(period.fromDate, period.toDate)
        .all<ClosingRow>(),
    ]);

    const activity: PosFinanceActivityEntry[] = [];
    const receipts: PosFinanceReceiptEntry[] = [];
    const invoices: PosFinanceDocumentEntry[] = [];
    const previousByTransaction = new Map<
      string,
      { depositReceived: number; refundedAmount: number; penaltyAmount: number; adjustmentAmount: number }
    >();

    posReceipts.results.forEach((receipt) => {
      const paymentMethod = normalizePaymentMethod(receipt.paymentMethod);
      const previous = previousByTransaction.get(receipt.transactionId) ?? {
        depositReceived: 0,
        refundedAmount: 0,
        penaltyAmount: 0,
        adjustmentAmount: 0,
      };
      const baseRevenue = receipt.action === 'create' ? normalizeAmount(receipt.baseAmount) : 0;
      const depositDelta = Math.max(normalizeAmount(receipt.depositReceived - previous.depositReceived), 0);
      const refundDelta = Math.max(normalizeAmount(receipt.refundedAmount - previous.refundedAmount), 0);
      const penaltyDelta = Math.max(normalizeAmount(receipt.penaltyAmount - previous.penaltyAmount), 0);
      const adjustmentDelta = normalizeAmount(receipt.adjustmentAmount - previous.adjustmentAmount);

      previousByTransaction.set(receipt.transactionId, {
        depositReceived: normalizeAmount(receipt.depositReceived),
        refundedAmount: normalizeAmount(receipt.refundedAmount),
        penaltyAmount: normalizeAmount(receipt.penaltyAmount),
        adjustmentAmount: normalizeAmount(receipt.adjustmentAmount),
      });

      if (baseRevenue > 0) {
        activity.push(
          activityEntry({
            id: `pos-revenue-${receipt.id}`,
            sourceType: 'pos_receipt',
            sourceId: receipt.id,
            sourceNumber: receipt.receiptNumber,
            accountingType: 'rental_revenue',
            customerName: receipt.customerName,
            description: `${receipt.title} - ${receipt.itemCode}`,
            cashAmount: baseRevenue,
            revenueAmount: baseRevenue,
            depositAmount: 0,
            expenseAmount: 0,
            paymentMethod,
            occurredAt: receipt.createdAt,
            href: `/pos/transactions?transactionId=${encodeURIComponent(receipt.transactionId)}`,
          }),
        );
      }

      if (depositDelta > 0) {
        activity.push(
          activityEntry({
            id: `pos-deposit-${receipt.id}`,
            sourceType: 'pos_receipt',
            sourceId: receipt.id,
            sourceNumber: receipt.receiptNumber,
            accountingType: 'deposit_in',
            customerName: receipt.customerName,
            description: `Refundable security deposit - ${receipt.itemCode}`,
            cashAmount: depositDelta,
            revenueAmount: 0,
            depositAmount: depositDelta,
            expenseAmount: 0,
            paymentMethod,
            occurredAt: receipt.createdAt,
            href: `/pos/transactions?transactionId=${encodeURIComponent(receipt.transactionId)}`,
          }),
        );
      }

      if (refundDelta > 0) {
        activity.push(
          activityEntry({
            id: `pos-refund-${receipt.id}`,
            sourceType: 'pos_receipt',
            sourceId: receipt.id,
            sourceNumber: receipt.receiptNumber,
            accountingType: 'deposit_refund',
            customerName: receipt.customerName,
            description: `Security deposit refunded - ${receipt.itemCode}`,
            cashAmount: -refundDelta,
            revenueAmount: 0,
            depositAmount: -refundDelta,
            expenseAmount: 0,
            paymentMethod,
            occurredAt: receipt.createdAt,
            href: `/pos/transactions?transactionId=${encodeURIComponent(receipt.transactionId)}`,
          }),
        );
      }

      if (penaltyDelta > 0) {
        const cashAmount = receipt.action === 'penalty' ? penaltyDelta : Math.max(normalizeAmount(receipt.eventAmount), 0);
        activity.push(
          activityEntry({
            id: `pos-penalty-${receipt.id}`,
            sourceType: 'pos_receipt',
            sourceId: receipt.id,
            sourceNumber: receipt.receiptNumber,
            accountingType: 'penalty_revenue',
            customerName: receipt.customerName,
            description: `Penalty revenue - ${receipt.itemCode}`,
            cashAmount: Math.min(cashAmount, penaltyDelta),
            revenueAmount: penaltyDelta,
            depositAmount: 0,
            expenseAmount: 0,
            paymentMethod,
            occurredAt: receipt.createdAt,
            href: `/pos/transactions?transactionId=${encodeURIComponent(receipt.transactionId)}`,
          }),
        );
      }

      if (adjustmentDelta !== 0) {
        activity.push(
          activityEntry({
            id: `pos-adjustment-${receipt.id}`,
            sourceType: 'pos_receipt',
            sourceId: receipt.id,
            sourceNumber: receipt.receiptNumber,
            accountingType: adjustmentDelta > 0 ? 'adjustment_revenue' : 'deposit_refund',
            customerName: receipt.customerName,
            description: `POS adjustment - ${receipt.itemCode}`,
            cashAmount: adjustmentDelta,
            revenueAmount: adjustmentDelta > 0 ? adjustmentDelta : 0,
            depositAmount: adjustmentDelta < 0 ? adjustmentDelta : 0,
            expenseAmount: 0,
            paymentMethod,
            occurredAt: receipt.createdAt,
            href: `/pos/transactions?transactionId=${encodeURIComponent(receipt.transactionId)}`,
          }),
        );
      }

      const signedEventAmount = normalizeAmount(receipt.eventAmount);
      if (signedEventAmount !== 0) {
        receipts.push({
          id: `pos-receipt-${receipt.id}`,
          sourceType: 'pos_receipt',
          receiptNumber: receipt.receiptNumber,
          referenceNumber: receipt.transactionNumber,
          customerName: receipt.customerName,
          itemLabel: `${receipt.itemCode} / ${receipt.itemName}`,
          amount: Math.abs(signedEventAmount),
          direction: signedEventAmount < 0 ? 'out' : 'in',
          paymentMethod,
          occurredAt: receipt.createdAt,
          href: `/pos/transactions?transactionId=${encodeURIComponent(receipt.transactionId)}`,
        });
      }
    });

    bookingPayments.results.forEach((payment) => {
      const amount = normalizeAmount(payment.amountPaid > 0 ? payment.amountPaid : payment.amountDue);
      const paymentMethod = normalizePaymentMethod(payment.method);

      activity.push(
        activityEntry({
          id: `booking-payment-${payment.id}`,
          sourceType: 'booking_payment',
          sourceId: payment.id,
          sourceNumber: payment.bookingNumber,
          accountingType: 'booking_dp_revenue',
          customerName: payment.customerName,
          description: payment.reference ? `Biaya Booking verified - ${payment.reference}` : 'Biaya Booking verified',
          cashAmount: amount,
          revenueAmount: amount,
          depositAmount: 0,
          expenseAmount: 0,
          paymentMethod,
          occurredAt: payment.verifiedAt,
          href: bookingHref(payment.bookingId),
        }),
      );
    });

    bookingInvoices.results.forEach((invoice) => {
      invoices.push({
        id: `booking-invoice-${invoice.id}`,
        sourceType: 'booking_invoice',
        documentNumber: invoice.invoiceNumber,
        bookingId: invoice.bookingId,
        bookingNumber: invoice.bookingNumber,
        customerName: invoice.customerName,
        status: invoice.status,
        totalAmount: normalizeAmount(invoice.totalAmount),
        issuedAt: invoice.issuedAt,
        href: bookingHref(invoice.bookingId),
      });

      activity.push(
        activityEntry({
          id: `booking-invoice-${invoice.id}`,
          sourceType: 'booking_invoice',
          sourceId: invoice.id,
          sourceNumber: invoice.invoiceNumber,
          accountingType: 'document',
          customerName: invoice.customerName,
          description: `Invoice ${invoice.bookingNumber}`,
          cashAmount: 0,
          revenueAmount: 0,
          depositAmount: 0,
          expenseAmount: 0,
          paymentMethod: 'transfer',
          occurredAt: invoice.issuedAt,
          href: bookingHref(invoice.bookingId),
        }),
      );
    });

    bookingReceipts.results.forEach((receipt) => {
      const amount = normalizeAmount(receipt.totalAmount);

      receipts.push({
        id: `booking-receipt-${receipt.id}`,
        sourceType: 'booking_receipt',
        receiptNumber: receipt.receiptNumber,
        referenceNumber: receipt.bookingNumber,
        customerName: receipt.customerName,
        itemLabel: 'Biaya Booking',
        amount,
        direction: 'in',
        paymentMethod: 'transfer',
        occurredAt: receipt.issuedAt,
        href: bookingHref(receipt.bookingId),
      });

      activity.push(
        activityEntry({
          id: `booking-receipt-${receipt.id}`,
          sourceType: 'booking_receipt',
          sourceId: receipt.id,
          sourceNumber: receipt.receiptNumber,
          accountingType: 'document',
          customerName: receipt.customerName,
          description: `Paid receipt ${receipt.bookingNumber}`,
          cashAmount: 0,
          revenueAmount: 0,
          depositAmount: 0,
          expenseAmount: 0,
          paymentMethod: 'transfer',
          occurredAt: receipt.issuedAt,
          href: bookingHref(receipt.bookingId),
        }),
      );
    });

    const expenses = expensesResult.results.map(expenseRowToModel);
    expenses.forEach((expense) => {
      activity.push(
        activityEntry({
          id: `expense-${expense.id}`,
          sourceType: 'expense',
          sourceId: expense.id,
          sourceNumber: expense.categoryName,
          accountingType: 'expense',
          customerName: expense.vendor || '-',
          description: expense.note ? `${expense.categoryName} - ${expense.note}` : expense.categoryName,
          cashAmount: -expense.amount,
          revenueAmount: 0,
          depositAmount: 0,
          expenseAmount: expense.amount,
          paymentMethod: expense.paymentMethod,
          occurredAt: `${expense.expenseDate}T00:00:00.000Z`,
          href: null,
        }),
      );
    });

    activity.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    receipts.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    invoices.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    const revenueTotal = activity.reduce((sum, entry) => sum + entry.revenueAmount, 0);
    const bookingRevenue = activity
      .filter((entry) => entry.accountingType === 'booking_dp_revenue')
      .reduce((sum, entry) => sum + entry.revenueAmount, 0);
    const posRevenue = revenueTotal - bookingRevenue;
    const expensesTotal = activity.reduce((sum, entry) => sum + entry.expenseAmount, 0);
    const cashIn = activity.reduce((sum, entry) => sum + Math.max(entry.cashAmount, 0), 0);
    const cashOut = activity.reduce((sum, entry) => sum + Math.max(-entry.cashAmount, 0), 0);
    const paymentByMethod = activity.reduce<Record<PosPaymentMethod, number>>(
      (totals, entry) => {
        totals[entry.paymentMethod] += entry.cashAmount;
        return totals;
      },
      { ...emptyPaymentByMethod },
    );
    const depositHeld = depositLiability.results.reduce(
      (sum, row) =>
        sum +
        Math.max(
          normalizeAmount(row.depositReceived) -
            normalizeAmount(row.refundedAmount) -
            normalizeAmount(row.penaltyAmount),
          0,
        ),
      0,
    );

    return {
      period,
      revenueTotal,
      bookingRevenue,
      posRevenue,
      expensesTotal,
      netIncome: revenueTotal - expensesTotal,
      depositIn: activity
        .filter((entry) => entry.accountingType === 'deposit_in')
        .reduce((sum, entry) => sum + entry.depositAmount, 0),
      depositOut: Math.abs(
        activity
          .filter((entry) => entry.accountingType === 'deposit_refund')
          .reduce((sum, entry) => sum + entry.depositAmount, 0),
      ),
      depositHeld,
      cashIn,
      cashOut,
      netMovement: cashIn - cashOut,
      paymentByMethod,
      activity,
      receipts,
      invoices,
      expenses,
      expenseCategories: expenseCategories.results.map(categoryRowToModel),
      dailyClosings: closingsResult.results.map(closingRowToModel),
    };
  } catch (error) {
    if (hasMissingFinanceTables(error)) {
      return emptyFinanceSummary(period);
    }

    throw error;
  }
}
