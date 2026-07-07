import { getD1Database } from '@/lib/cloudflare';
import {
  normalizePosLedger,
  type PosAuditEntry,
  type PosLedgerAction,
  type PosLedgerState,
  type PosMaintenanceHold,
  type PosMaintenanceStatus,
  type PosPaymentMethod,
  type PosReceipt,
  type PosTransaction,
  type PosTransactionKind,
  type PosTransactionStatus,
} from '@/lib/pos-ledger';

type D1Value = string | number | null;

type PosTransactionRow = {
  id: string;
  transaction_number: string;
  kind: PosTransactionKind;
  status: PosTransactionStatus;
  item_id: string;
  item_code: string;
  item_name: string;
  item_price: number;
  customer_name: string;
  customer_phone: string | null;
  start_date: string;
  due_date: string | null;
  closed_at: string | null;
  deposit_received: number;
  refunded_amount: number;
  penalty_amount: number;
  adjustment_amount: number;
  payment_method: PosPaymentMethod;
  notes: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};

type PosReceiptRow = {
  id: string;
  receipt_number: string;
  transaction_id: string;
  transaction_number: string;
  action: PosLedgerAction;
  title: string;
  item_id: string;
  item_code: string;
  item_name: string;
  customer_name: string;
  customer_phone: string | null;
  kind: PosTransactionKind;
  status: PosTransactionStatus;
  base_amount: number;
  deposit_received: number;
  refunded_amount: number;
  penalty_amount: number;
  adjustment_amount: number;
  event_amount: number;
  payment_method: PosPaymentMethod;
  total_collected: number;
  balance_due: number;
  note: string | null;
  revision: number;
  created_at: string;
};

type PosAuditRow = {
  id: string;
  transaction_id: string;
  transaction_number: string;
  action: PosLedgerAction;
  summary: string;
  reason: string | null;
  before_snapshot: string | null;
  after_snapshot: string | null;
  created_at: string;
};

type PosMaintenanceRow = {
  id: string;
  maintenance_number: string;
  item_id: string;
  item_code: string;
  item_name: string;
  source_transaction_id: string;
  transaction_number: string;
  status: PosMaintenanceStatus;
  opened_at: string;
  closed_at: string | null;
  opened_note: string | null;
  closed_note: string | null;
  revision: number;
};

function safeParseTransaction(value: string | null): PosTransaction | null {
  if (!value) {
    return null;
  }

  try {
    return normalizePosLedger({ transactions: [JSON.parse(value)] }).transactions[0] ?? null;
  } catch {
    return null;
  }
}

function transactionRowToModel(row: PosTransactionRow): PosTransaction {
  return {
    id: row.id,
    transactionNumber: row.transaction_number,
    kind: row.kind,
    status: row.status,
    itemId: row.item_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    itemPrice: row.item_price,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? '',
    startDate: row.start_date,
    dueDate: row.due_date,
    closedAt: row.closed_at,
    depositReceived: row.deposit_received,
    refundedAmount: row.refunded_amount,
    penaltyAmount: row.penalty_amount,
    adjustmentAmount: row.adjustment_amount,
    paymentMethod: row.payment_method,
    notes: row.notes ?? '',
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function receiptRowToModel(row: PosReceiptRow): PosReceipt {
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    transactionId: row.transaction_id,
    transactionNumber: row.transaction_number,
    action: row.action,
    title: row.title,
    itemId: row.item_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? '',
    kind: row.kind,
    status: row.status,
    baseAmount: row.base_amount,
    depositReceived: row.deposit_received,
    refundedAmount: row.refunded_amount,
    penaltyAmount: row.penalty_amount,
    adjustmentAmount: row.adjustment_amount,
    eventAmount: row.event_amount,
    paymentMethod: row.payment_method,
    totalCollected: row.total_collected,
    balanceDue: row.balance_due,
    note: row.note ?? '',
    revision: row.revision,
    createdAt: row.created_at,
  };
}

function auditRowToModel(row: PosAuditRow): PosAuditEntry {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    transactionNumber: row.transaction_number,
    action: row.action,
    summary: row.summary,
    reason: row.reason ?? '',
    before: safeParseTransaction(row.before_snapshot),
    after: safeParseTransaction(row.after_snapshot),
    createdAt: row.created_at,
  };
}

function maintenanceRowToModel(row: PosMaintenanceRow): PosMaintenanceHold {
  return {
    id: row.id,
    maintenanceNumber: row.maintenance_number,
    itemId: row.item_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    sourceTransactionId: row.source_transaction_id,
    transactionNumber: row.transaction_number,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    openedNote: row.opened_note ?? '',
    closedNote: row.closed_note ?? '',
    revision: row.revision,
  };
}

function extractOrdinal(value: string, prefix: string) {
  const match = value.match(new RegExp(`^${prefix}-\\d{6}-(\\d+)$`));
  return match ? Number(match[1]) || 0 : 0;
}

function getLedgerCounters(ledger: Omit<PosLedgerState, 'counters'>): PosLedgerState['counters'] {
  return {
    transaction: Math.max(
      ledger.transactions.length,
      ...ledger.transactions.map((row) => extractOrdinal(row.transactionNumber, 'TRX')),
      0,
    ),
    receipt: Math.max(
      ledger.receipts.length,
      ...ledger.receipts.map((row) => extractOrdinal(row.receiptNumber, 'RCP')),
      0,
    ),
    history: ledger.history.length,
    maintenance: Math.max(
      ledger.maintenanceHolds.length,
      ...ledger.maintenanceHolds.map((row) => extractOrdinal(row.maintenanceNumber, 'MNT')),
      0,
    ),
  };
}

function isMissingPosSchema(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('no such table: pos_transactions') ||
    message.includes('no such table: pos_receipts') ||
    message.includes('no such table: pos_audit_history') ||
    message.includes('no such table: pos_maintenance_holds') ||
    message.includes('no such column:')
  );
}

export async function listPosLedger(): Promise<PosLedgerState> {
  try {
    const db = await getD1Database();
    const [transactionsResult, receiptsResult, historyResult, maintenanceResult] = await Promise.all([
      db.prepare('SELECT * FROM pos_transactions ORDER BY created_at DESC').all<PosTransactionRow>(),
      db.prepare('SELECT * FROM pos_receipts ORDER BY created_at ASC').all<PosReceiptRow>(),
      db.prepare('SELECT * FROM pos_audit_history ORDER BY created_at ASC').all<PosAuditRow>(),
      db.prepare('SELECT * FROM pos_maintenance_holds ORDER BY opened_at DESC').all<PosMaintenanceRow>(),
    ]);

    const ledger = {
      transactions: transactionsResult.results.map(transactionRowToModel),
      receipts: receiptsResult.results.map(receiptRowToModel),
      history: historyResult.results.map(auditRowToModel),
      maintenanceHolds: maintenanceResult.results.map(maintenanceRowToModel),
    };

    return normalizePosLedger({
      ...ledger,
      counters: getLedgerCounters(ledger),
    });
  } catch (error) {
    if (isMissingPosSchema(error)) {
      return normalizePosLedger(null);
    }

    throw error;
  }
}

function transactionStatement(db: D1Database, transaction: PosTransaction) {
  return db
    .prepare(
      `INSERT INTO pos_transactions (
        id, transaction_number, kind, status, item_id, item_code, item_name, item_price,
        customer_name, customer_phone, start_date, due_date, closed_at, deposit_received,
        refunded_amount, penalty_amount, adjustment_amount, payment_method, notes, revision,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        transaction_number = excluded.transaction_number,
        kind = excluded.kind,
        status = excluded.status,
        item_id = excluded.item_id,
        item_code = excluded.item_code,
        item_name = excluded.item_name,
        item_price = excluded.item_price,
        customer_name = excluded.customer_name,
        customer_phone = excluded.customer_phone,
        start_date = excluded.start_date,
        due_date = excluded.due_date,
        closed_at = excluded.closed_at,
        deposit_received = excluded.deposit_received,
        refunded_amount = excluded.refunded_amount,
        penalty_amount = excluded.penalty_amount,
        adjustment_amount = excluded.adjustment_amount,
        payment_method = excluded.payment_method,
        notes = excluded.notes,
        revision = excluded.revision,
        updated_at = excluded.updated_at`,
    )
    .bind(
      transaction.id,
      transaction.transactionNumber,
      transaction.kind,
      transaction.status,
      transaction.itemId,
      transaction.itemCode,
      transaction.itemName,
      transaction.itemPrice,
      transaction.customerName,
      transaction.customerPhone,
      transaction.startDate,
      transaction.dueDate,
      transaction.closedAt,
      transaction.depositReceived,
      transaction.refundedAmount,
      transaction.penaltyAmount,
      transaction.adjustmentAmount,
      transaction.paymentMethod,
      transaction.notes,
      transaction.revision,
      transaction.createdAt,
      transaction.updatedAt,
    );
}

function receiptStatement(db: D1Database, receipt: PosReceipt) {
  return db
    .prepare(
      `INSERT OR IGNORE INTO pos_receipts (
        id, receipt_number, transaction_id, transaction_number, action, title, item_id,
        item_code, item_name, customer_name, customer_phone, kind, status, base_amount,
        deposit_received, refunded_amount, penalty_amount, adjustment_amount, event_amount,
        payment_method, total_collected, balance_due, note, revision, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      receipt.id,
      receipt.receiptNumber,
      receipt.transactionId,
      receipt.transactionNumber,
      receipt.action,
      receipt.title,
      receipt.itemId,
      receipt.itemCode,
      receipt.itemName,
      receipt.customerName,
      receipt.customerPhone,
      receipt.kind,
      receipt.status,
      receipt.baseAmount,
      receipt.depositReceived,
      receipt.refundedAmount,
      receipt.penaltyAmount,
      receipt.adjustmentAmount,
      receipt.eventAmount,
      receipt.paymentMethod,
      receipt.totalCollected,
      receipt.balanceDue,
      receipt.note,
      receipt.revision,
      receipt.createdAt,
    );
}

function historyStatement(db: D1Database, entry: PosAuditEntry) {
  return db
    .prepare(
      `INSERT OR IGNORE INTO pos_audit_history (
        id, transaction_id, transaction_number, action, summary, reason,
        before_snapshot, after_snapshot, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      entry.id,
      entry.transactionId,
      entry.transactionNumber,
      entry.action,
      entry.summary,
      entry.reason,
      entry.before ? JSON.stringify(entry.before) : null,
      entry.after ? JSON.stringify(entry.after) : null,
      entry.createdAt,
    );
}

function maintenanceStatement(db: D1Database, hold: PosMaintenanceHold) {
  const values: D1Value[] = [
    hold.id,
    hold.maintenanceNumber,
    hold.itemId,
    hold.itemCode,
    hold.itemName,
    hold.sourceTransactionId,
    hold.transactionNumber,
    hold.status,
    hold.openedAt,
    hold.closedAt,
    hold.openedNote,
    hold.closedNote,
    hold.revision,
  ];

  return db
    .prepare(
      `INSERT INTO pos_maintenance_holds (
        id, maintenance_number, item_id, item_code, item_name, source_transaction_id,
        transaction_number, status, opened_at, closed_at, opened_note, closed_note, revision
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        closed_at = excluded.closed_at,
        opened_note = excluded.opened_note,
        closed_note = excluded.closed_note,
        revision = excluded.revision`,
    )
    .bind(...values);
}

export async function savePosLedgerSnapshot(ledger: PosLedgerState): Promise<PosLedgerState> {
  const normalized = normalizePosLedger(ledger);
  const db = await getD1Database();
  const statements = [
    ...normalized.transactions.map((transaction) => transactionStatement(db, transaction)),
    ...normalized.receipts.map((receipt) => receiptStatement(db, receipt)),
    ...normalized.history.map((entry) => historyStatement(db, entry)),
    ...normalized.maintenanceHolds.map((hold) => maintenanceStatement(db, hold)),
  ];

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return listPosLedger();
}
