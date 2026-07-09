import { getD1Database } from '@/lib/cloudflare';
import type { PosPaymentMethod } from '@/lib/pos-ledger';

export const POS_FINANCE_TIME_ZONE = 'Asia/Jakarta' as const;

export type PosFinancePeriod = {
  preset: 'today' | 'custom';
  fromDate: string;
  toDate: string;
  timeZone: typeof POS_FINANCE_TIME_ZONE;
};

export type PosFinanceSourceType =
  | 'pos_receipt'
  | 'booking_payment'
  | 'booking_invoice'
  | 'booking_receipt';

export type PosFinanceActivityEntry = {
  id: string;
  sourceType: PosFinanceSourceType;
  sourceId: string;
  sourceNumber: string;
  customerName: string;
  description: string;
  amount: number;
  direction: 'in' | 'out';
  recognizedRevenue: boolean;
  cashImpact: boolean;
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

export type PosFinanceSummary = {
  period: PosFinancePeriod;
  revenueTotal: number;
  bookingRevenue: number;
  posRevenue: number;
  cashIn: number;
  cashOut: number;
  netMovement: number;
  paymentByMethod: Record<PosPaymentMethod, number>;
  activity: PosFinanceActivityEntry[];
  receipts: PosFinanceReceiptEntry[];
  invoices: PosFinanceDocumentEntry[];
};

type PosReceiptFinanceRow = {
  id: string;
  receiptNumber: string;
  transactionId: string;
  transactionNumber: string;
  title: string;
  itemCode: string;
  itemName: string;
  customerName: string;
  paymentMethod: PosPaymentMethod;
  eventAmount: number;
  totalCollected: number;
  balanceDue: number;
  createdAt: string;
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

const emptyPaymentByMethod: Record<PosPaymentMethod, number> = {
  cash: 0,
  transfer: 0,
  qris: 0,
  card: 0,
  other: 0,
};

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
  fromDate?: string | null;
  toDate?: string | null;
}): PosFinancePeriod {
  const today = getJakartaDateKey();
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
    error.message.includes('no such table: booking_receipts')
  );
}

function emptyFinanceSummary(period: PosFinancePeriod): PosFinanceSummary {
  return {
    period,
    revenueTotal: 0,
    bookingRevenue: 0,
    posRevenue: 0,
    cashIn: 0,
    cashOut: 0,
    netMovement: 0,
    paymentByMethod: { ...emptyPaymentByMethod },
    activity: [],
    receipts: [],
    invoices: [],
  };
}

export async function getPosFinanceSummary(period = makeTodayFinancePeriod()): Promise<PosFinanceSummary> {
  const db = await getD1Database();

  try {
    const [posReceipts, bookingPayments, bookingInvoices, bookingReceipts] = await Promise.all([
      db
        .prepare(
          `SELECT id,
                  receipt_number AS receiptNumber,
                  transaction_id AS transactionId,
                  transaction_number AS transactionNumber,
                  title,
                  item_code AS itemCode,
                  item_name AS itemName,
                  customer_name AS customerName,
                  payment_method AS paymentMethod,
                  event_amount AS eventAmount,
                  total_collected AS totalCollected,
                  balance_due AS balanceDue,
                  created_at AS createdAt
           FROM pos_receipts
           WHERE date(created_at, '+7 hours') BETWEEN ? AND ?
           ORDER BY created_at DESC`,
        )
        .bind(period.fromDate, period.toDate)
        .all<PosReceiptFinanceRow>(),
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
    ]);

    const activity: PosFinanceActivityEntry[] = [];
    const receipts: PosFinanceReceiptEntry[] = [];
    const invoices: PosFinanceDocumentEntry[] = [];

    posReceipts.results.forEach((receipt) => {
      const signedAmount = normalizeAmount(receipt.eventAmount);
      const amount = Math.abs(signedAmount);
      const direction = signedAmount < 0 ? 'out' : 'in';
      const paymentMethod = normalizePaymentMethod(receipt.paymentMethod);

      activity.push({
        id: `pos-receipt-${receipt.id}`,
        sourceType: 'pos_receipt',
        sourceId: receipt.id,
        sourceNumber: receipt.receiptNumber,
        customerName: receipt.customerName,
        description: `${receipt.title} - ${receipt.itemCode}`,
        amount,
        direction,
        recognizedRevenue: signedAmount > 0,
        cashImpact: true,
        paymentMethod,
        occurredAt: receipt.createdAt,
        href: `/pos/transactions?transactionId=${encodeURIComponent(receipt.transactionId)}`,
      });

      receipts.push({
        id: `pos-receipt-${receipt.id}`,
        sourceType: 'pos_receipt',
        receiptNumber: receipt.receiptNumber,
        referenceNumber: receipt.transactionNumber,
        customerName: receipt.customerName,
        itemLabel: `${receipt.itemCode} / ${receipt.itemName}`,
        amount,
        direction,
        paymentMethod,
        occurredAt: receipt.createdAt,
        href: `/pos/transactions?transactionId=${encodeURIComponent(receipt.transactionId)}`,
      });
    });

    bookingPayments.results.forEach((payment) => {
      const amount = normalizeAmount(payment.amountPaid > 0 ? payment.amountPaid : payment.amountDue);
      const paymentMethod = normalizePaymentMethod(payment.method);

      activity.push({
        id: `booking-payment-${payment.id}`,
        sourceType: 'booking_payment',
        sourceId: payment.id,
        sourceNumber: payment.bookingNumber,
        customerName: payment.customerName,
        description: payment.reference ? `Biaya Booking verified - ${payment.reference}` : 'Biaya Booking verified',
        amount,
        direction: 'in',
        recognizedRevenue: true,
        cashImpact: true,
        paymentMethod,
        occurredAt: payment.verifiedAt,
        href: bookingHref(payment.bookingId),
      });
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

      activity.push({
        id: `booking-invoice-${invoice.id}`,
        sourceType: 'booking_invoice',
        sourceId: invoice.id,
        sourceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        description: `Invoice ${invoice.bookingNumber}`,
        amount: normalizeAmount(invoice.totalAmount),
        direction: 'in',
        recognizedRevenue: false,
        cashImpact: false,
        paymentMethod: 'transfer',
        occurredAt: invoice.issuedAt,
        href: bookingHref(invoice.bookingId),
      });
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

      activity.push({
        id: `booking-receipt-${receipt.id}`,
        sourceType: 'booking_receipt',
        sourceId: receipt.id,
        sourceNumber: receipt.receiptNumber,
        customerName: receipt.customerName,
        description: `Paid receipt ${receipt.bookingNumber}`,
        amount,
        direction: 'in',
        recognizedRevenue: false,
        cashImpact: false,
        paymentMethod: 'transfer',
        occurredAt: receipt.issuedAt,
        href: bookingHref(receipt.bookingId),
      });
    });

    activity.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    receipts.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    invoices.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    const cashEntries = activity.filter((entry) => entry.cashImpact);
    const bookingRevenue = activity
      .filter((entry) => entry.sourceType === 'booking_payment' && entry.recognizedRevenue)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const posRevenue = activity
      .filter((entry) => entry.sourceType === 'pos_receipt' && entry.recognizedRevenue)
      .reduce((sum, entry) => sum + entry.amount, 0);
    const cashIn = cashEntries
      .filter((entry) => entry.direction === 'in')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const cashOut = cashEntries
      .filter((entry) => entry.direction === 'out')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const paymentByMethod = cashEntries.reduce<Record<PosPaymentMethod, number>>(
      (totals, entry) => {
        totals[entry.paymentMethod] += entry.direction === 'out' ? -entry.amount : entry.amount;
        return totals;
      },
      { ...emptyPaymentByMethod },
    );

    return {
      period,
      revenueTotal: bookingRevenue + posRevenue,
      bookingRevenue,
      posRevenue,
      cashIn,
      cashOut,
      netMovement: cashIn - cashOut,
      paymentByMethod,
      activity,
      receipts,
      invoices,
    };
  } catch (error) {
    if (hasMissingFinanceTables(error)) {
      return emptyFinanceSummary(period);
    }

    throw error;
  }
}
