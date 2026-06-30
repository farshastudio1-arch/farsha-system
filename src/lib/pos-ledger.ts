'use client';

import { useMemo, useSyncExternalStore } from 'react';

import { mockKebayas, type KebayaItem } from '@/data/mockData';
import {
  dispatchBrowserEvent,
  readLocalStorageItem,
  writeLocalStorageItem,
} from '@/lib/browser-storage';

export type PosTransactionKind = 'rental' | 'sale';
export type PosTransactionStatus = 'open' | 'closed' | 'void';
export type PosLedgerAction =
  | 'create'
  | 'update'
  | 'close'
  | 'deposit'
  | 'refund'
  | 'penalty'
  | 'adjustment'
  | 'print';

export interface PosTransaction {
  id: string;
  transactionNumber: string;
  kind: PosTransactionKind;
  status: PosTransactionStatus;
  itemId: string;
  itemCode: string;
  itemName: string;
  itemPrice: number;
  customerName: string;
  customerPhone: string;
  startDate: string;
  dueDate: string | null;
  closedAt: string | null;
  depositReceived: number;
  refundedAmount: number;
  penaltyAmount: number;
  adjustmentAmount: number;
  notes: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface PosReceipt {
  id: string;
  receiptNumber: string;
  transactionId: string;
  transactionNumber: string;
  action: PosLedgerAction;
  title: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  customerName: string;
  customerPhone: string;
  kind: PosTransactionKind;
  status: PosTransactionStatus;
  baseAmount: number;
  depositReceived: number;
  refundedAmount: number;
  penaltyAmount: number;
  adjustmentAmount: number;
  totalCollected: number;
  balanceDue: number;
  createdAt: string;
  note: string;
  revision: number;
}

export interface PosAuditEntry {
  id: string;
  transactionId: string;
  transactionNumber: string;
  action: PosLedgerAction;
  summary: string;
  before: PosTransaction | null;
  after: PosTransaction | null;
  createdAt: string;
}

export interface PosLedgerState {
  transactions: PosTransaction[];
  receipts: PosReceipt[];
  history: PosAuditEntry[];
  counters: {
    transaction: number;
    receipt: number;
    history: number;
  };
}

export interface AvailabilityProjection {
  itemId: string;
  itemCode: string;
  masterStatus: KebayaItem['status'];
  effectiveStatus: KebayaItem['status'];
  dueDate: string | null;
  openTransactionId: string | null;
  openTransactionNumber: string | null;
  customerName: string | null;
  customerPhone: string | null;
  source: 'master' | 'ledger';
  isOverdue: boolean;
  activeDeposit: number;
  openTransactionCount: number;
  hasConflict: boolean;
}

export interface CreateRentalInput {
  item: KebayaItem;
  customerName: string;
  customerPhone: string;
  startDate: string;
  dueDate: string;
  depositReceived: number;
  notes?: string;
}

export interface UpdateTransactionInput {
  customerName: string;
  customerPhone: string;
  dueDate: string | null;
  notes?: string;
}

export interface FinancialEventInput {
  amount: number;
  note?: string;
}

export interface CloseTransactionInput {
  returnDate: string;
  refundedAmount?: number;
  penaltyAmount?: number;
  adjustmentAmount?: number;
  note?: string;
}

const storageKey = 'farsha-pos-ledger-v1';
const storageChangeEvent = 'farsha-pos-ledger-storage-change';

let cachedStoredValue: string | null | undefined;
let cachedLedger: PosLedgerState | undefined;

function nowIso() {
  return new Date().toISOString();
}

function padNumber(value: number, size = 4) {
  return String(value).padStart(size, '0');
}

function formatReference(prefix: string, ordinal: number) {
  const now = new Date();
  const month = padNumber(now.getMonth() + 1, 2);
  return `${prefix}-${now.getFullYear()}${month}-${padNumber(ordinal)}`;
}

function createId(prefix: string, ordinal: number) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${ordinal}`;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeTransactionStatus(value: unknown): PosTransactionStatus {
  return value === 'open' || value === 'closed' || value === 'void' ? value : 'open';
}

function normalizeTransactionKind(value: unknown): PosTransactionKind {
  return value === 'sale' ? 'sale' : 'rental';
}

function normalizeTransaction(value: Partial<PosTransaction>, ordinal: number): PosTransaction | null {
  const itemId = normalizeText(value.itemId);
  const itemCode = normalizeText(value.itemCode);
  const itemName = normalizeText(value.itemName);

  if (!itemId || !itemCode || !itemName) {
    return null;
  }

  const createdAt = normalizeText(value.createdAt, nowIso());

  return {
    id: normalizeText(value.id, createId('trx', ordinal)),
    transactionNumber: normalizeText(value.transactionNumber, formatReference('TRX', ordinal)),
    kind: normalizeTransactionKind(value.kind),
    status: normalizeTransactionStatus(value.status),
    itemId,
    itemCode,
    itemName,
    itemPrice: normalizeNumber(value.itemPrice),
    customerName: normalizeText(value.customerName, 'Pelanggan Umum'),
    customerPhone: normalizeText(value.customerPhone),
    startDate: normalizeText(value.startDate, createdAt.slice(0, 10)),
    dueDate: typeof value.dueDate === 'string' ? value.dueDate : null,
    closedAt: typeof value.closedAt === 'string' ? value.closedAt : null,
    depositReceived: normalizeNumber(value.depositReceived),
    refundedAmount: normalizeNumber(value.refundedAmount),
    penaltyAmount: normalizeNumber(value.penaltyAmount),
    adjustmentAmount: normalizeNumber(value.adjustmentAmount, 0),
    notes: normalizeText(value.notes),
    revision: Number.isFinite(value.revision) ? Number(value.revision) : 1,
    createdAt,
    updatedAt: normalizeText(value.updatedAt, createdAt),
  };
}

function normalizeReceipt(value: Partial<PosReceipt>, ordinal: number): PosReceipt | null {
  const transactionId = normalizeText(value.transactionId);
  const transactionNumber = normalizeText(value.transactionNumber);
  const itemCode = normalizeText(value.itemCode);
  const itemName = normalizeText(value.itemName);

  if (!transactionId || !transactionNumber || !itemCode || !itemName) {
    return null;
  }

  const createdAt = normalizeText(value.createdAt, nowIso());

  return {
    id: normalizeText(value.id, createId('rcp', ordinal)),
    receiptNumber: normalizeText(value.receiptNumber, formatReference('RCP', ordinal)),
    transactionId,
    transactionNumber,
    action: normalizeReceiptAction(value.action),
    title: normalizeText(value.title, 'Receipt'),
    itemId: normalizeText(value.itemId),
    itemCode,
    itemName,
    customerName: normalizeText(value.customerName, 'Pelanggan Umum'),
    customerPhone: normalizeText(value.customerPhone),
    kind: normalizeTransactionKind(value.kind),
    status: normalizeTransactionStatus(value.status),
    baseAmount: normalizeNumber(value.baseAmount),
    depositReceived: normalizeNumber(value.depositReceived),
    refundedAmount: normalizeNumber(value.refundedAmount),
    penaltyAmount: normalizeNumber(value.penaltyAmount),
    adjustmentAmount: normalizeNumber(value.adjustmentAmount, 0),
    totalCollected: normalizeNumber(value.totalCollected),
    balanceDue: normalizeNumber(value.balanceDue),
    createdAt,
    note: normalizeText(value.note),
    revision: Number.isFinite(value.revision) ? Number(value.revision) : 1,
  };
}

function normalizeReceiptAction(value: unknown): PosLedgerAction {
  return value === 'update' ||
    value === 'close' ||
    value === 'deposit' ||
    value === 'refund' ||
    value === 'penalty' ||
    value === 'adjustment' ||
    value === 'print'
    ? value
    : 'create';
}

function normalizeAuditEntry(value: Partial<PosAuditEntry>, ordinal: number): PosAuditEntry | null {
  const transactionId = normalizeText(value.transactionId);
  const transactionNumber = normalizeText(value.transactionNumber);

  if (!transactionId || !transactionNumber) {
    return null;
  }

  const createdAt = normalizeText(value.createdAt, nowIso());

  return {
    id: normalizeText(value.id, createId('hst', ordinal)),
    transactionId,
    transactionNumber,
    action: normalizeReceiptAction(value.action),
    summary: normalizeText(value.summary, 'Transaction updated'),
    before: value.before ? normalizeTransaction(value.before, ordinal) : null,
    after: value.after ? normalizeTransaction(value.after, ordinal) : null,
    createdAt,
  };
}

function createLegacySeedLedger(): PosLedgerState {
  const transactions: PosTransaction[] = [];
  const receipts: PosReceipt[] = [];
  const history: PosAuditEntry[] = [];

  mockKebayas.forEach((item, index) => {
    if (item.status !== 'rented') {
      return;
    }

    const transaction = normalizeTransaction(
      {
        id: `legacy-trx-${item.id}`,
        transactionNumber: formatReference('TRX', index + 1),
        kind: 'rental',
        status: 'open',
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        itemPrice: item.rentalPrice,
        customerName: 'Legacy rental',
        customerPhone: '',
        startDate: item.rentalEndDate ?? nowIso().slice(0, 10),
        dueDate: item.rentalEndDate,
        closedAt: null,
        depositReceived: 0,
        refundedAmount: 0,
        penaltyAmount: 0,
        adjustmentAmount: 0,
        notes: 'Seeded from legacy item status.',
        revision: 1,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      index + 1,
    );

    if (!transaction) {
      return;
    }

    transactions.push(transaction);
    receipts.push(
      normalizeReceipt(
        {
          id: `legacy-rcp-${item.id}`,
          receiptNumber: formatReference('RCP', index + 1),
          transactionId: transaction.id,
          transactionNumber: transaction.transactionNumber,
          action: 'create',
          title: 'Legacy rental seeded',
          itemId: item.id,
          itemCode: item.code,
          itemName: item.name,
          customerName: 'Legacy rental',
          customerPhone: '',
          kind: 'rental',
          status: 'open',
          baseAmount: item.rentalPrice,
          depositReceived: 0,
          refundedAmount: 0,
          penaltyAmount: 0,
          adjustmentAmount: 0,
          totalCollected: item.rentalPrice,
          balanceDue: item.rentalPrice,
          createdAt: nowIso(),
          note: 'Seeded from existing catalog status.',
          revision: 1,
        },
        index + 1,
      )!,
    );

    history.push(
      normalizeAuditEntry(
        {
          id: `legacy-hst-${item.id}`,
          transactionId: transaction.id,
          transactionNumber: transaction.transactionNumber,
          action: 'create',
          summary: 'Seeded from legacy item status',
          before: null,
          after: transaction,
          createdAt: nowIso(),
        },
        index + 1,
      )!,
    );
  });

  return {
    transactions,
    receipts,
    history,
    counters: {
      transaction: transactions.length,
      receipt: receipts.length,
      history: history.length,
    },
  };
}

const serverLedgerSnapshot = createLegacySeedLedger();

function normalizeLedger(value: unknown): PosLedgerState {
  if (!value || typeof value !== 'object') {
    return createLegacySeedLedger();
  }

  const raw = value as Partial<PosLedgerState> & {
    transactions?: Partial<PosTransaction>[];
    receipts?: Partial<PosReceipt>[];
    history?: Partial<PosAuditEntry>[];
  };

  const transactions = Array.isArray(raw.transactions)
    ? raw.transactions
        .map((entry, index) => normalizeTransaction(entry, index + 1))
        .filter((entry): entry is PosTransaction => Boolean(entry))
    : [];

  const receipts = Array.isArray(raw.receipts)
    ? raw.receipts
        .map((entry, index) => normalizeReceipt(entry, index + 1))
        .filter((entry): entry is PosReceipt => Boolean(entry))
    : [];

  const history = Array.isArray(raw.history)
    ? raw.history
        .map((entry, index) => normalizeAuditEntry(entry, index + 1))
        .filter((entry): entry is PosAuditEntry => Boolean(entry))
    : [];

  if (transactions.length === 0 && receipts.length === 0 && history.length === 0) {
    return createLegacySeedLedger();
  }

  return {
    transactions,
    receipts,
    history,
    counters: {
      transaction: normalizeNumber(raw.counters?.transaction, transactions.length),
      receipt: normalizeNumber(raw.counters?.receipt, receipts.length),
      history: normalizeNumber(raw.counters?.history, history.length),
    },
  };
}

function readLedgerSnapshot() {
  if (typeof window === 'undefined') {
    return serverLedgerSnapshot;
  }

  const storedValue = readLocalStorageItem(storageKey);

  if (storedValue === cachedStoredValue && cachedLedger) {
    return cachedLedger;
  }

  cachedStoredValue = storedValue;

  if (!storedValue) {
    cachedLedger = createLegacySeedLedger();
    return cachedLedger;
  }

  try {
    cachedLedger = normalizeLedger(JSON.parse(storedValue));
  } catch {
    cachedLedger = createLegacySeedLedger();
  }

  return cachedLedger;
}

function writeLedgerSnapshot(nextLedger: PosLedgerState) {
  const serialized = JSON.stringify(nextLedger);
  writeLocalStorageItem(storageKey, serialized);
  cachedStoredValue = serialized;
  cachedLedger = nextLedger;
  dispatchBrowserEvent(storageChangeEvent);
}

function subscribeToLedger(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('storage', onStoreChange);
  window.addEventListener(storageChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(storageChangeEvent, onStoreChange);
  };
}

export function useSavedPosLedger() {
  return useSyncExternalStore(subscribeToLedger, readLedgerSnapshot, () => serverLedgerSnapshot);
}

function getTransactionCharge(transaction: PosTransaction) {
  return transaction.itemPrice + transaction.penaltyAmount + transaction.adjustmentAmount;
}

function getTransactionCollected(transaction: PosTransaction) {
  return transaction.itemPrice + transaction.depositReceived + transaction.penaltyAmount + transaction.adjustmentAmount - transaction.refundedAmount;
}

function getTransactionBalance(transaction: PosTransaction) {
  return Math.max(
    getTransactionCharge(transaction) - transaction.depositReceived + transaction.refundedAmount,
    0,
  );
}

function makeReceipt(
  transaction: PosTransaction,
  action: PosLedgerAction,
  title: string,
  note: string,
  receiptOrdinal: number,
): PosReceipt {
  return {
    id: createId('rcp', receiptOrdinal),
    receiptNumber: formatReference('RCP', receiptOrdinal),
    transactionId: transaction.id,
    transactionNumber: transaction.transactionNumber,
    action,
    title,
    itemId: transaction.itemId,
    itemCode: transaction.itemCode,
    itemName: transaction.itemName,
    customerName: transaction.customerName,
    customerPhone: transaction.customerPhone,
    kind: transaction.kind,
    status: transaction.status,
    baseAmount: transaction.itemPrice,
    depositReceived: transaction.depositReceived,
    refundedAmount: transaction.refundedAmount,
    penaltyAmount: transaction.penaltyAmount,
    adjustmentAmount: transaction.adjustmentAmount,
    totalCollected: getTransactionCollected(transaction),
    balanceDue: getTransactionBalance(transaction),
    createdAt: nowIso(),
    note,
    revision: transaction.revision,
  };
}

function makeHistoryEntry(
  transaction: PosTransaction,
  action: PosLedgerAction,
  summary: string,
  before: PosTransaction | null,
  historyOrdinal: number,
): PosAuditEntry {
  return {
    id: createId('hst', historyOrdinal),
    transactionId: transaction.id,
    transactionNumber: transaction.transactionNumber,
    action,
    summary,
    before,
    after: transaction,
    createdAt: nowIso(),
  };
}

function mutateLedger(
  update: (ledger: PosLedgerState) => PosLedgerState,
) {
  const nextLedger = update(readLedgerSnapshot());
  writeLedgerSnapshot(nextLedger);
  return nextLedger;
}

function findTransaction(ledger: PosLedgerState, transactionId: string) {
  return ledger.transactions.find((transaction) => transaction.id === transactionId) ?? null;
}

function replaceTransaction(
  ledger: PosLedgerState,
  transactionId: string,
  updater: (current: PosTransaction) => PosTransaction,
  action: PosLedgerAction,
  summary: string,
  note = '',
  createReceipt = true,
) {
  const nextTransactions = ledger.transactions.map((transaction) => {
    if (transaction.id !== transactionId) {
      return transaction;
    }

    const before = transaction;
    const updated = updater(transaction);

    return {
      ...updated,
      revision: before.revision + 1,
      updatedAt: nowIso(),
    };
  });

  const updatedTransaction = nextTransactions.find((transaction) => transaction.id === transactionId) ?? null;

  if (!updatedTransaction) {
    return ledger;
  }

  const nextHistoryOrdinal = ledger.counters.history + 1;
  const historyEntry = makeHistoryEntry(
    updatedTransaction,
    action,
    summary,
    findTransaction(ledger, transactionId),
    nextHistoryOrdinal,
  );
  const receipt = createReceipt
    ? makeReceipt(updatedTransaction, action, summary, note, ledger.counters.receipt + 1)
    : null;

  return {
    ...ledger,
    transactions: nextTransactions,
    receipts: receipt ? [...ledger.receipts, receipt] : ledger.receipts,
    history: [...ledger.history, historyEntry],
    counters: {
      transaction: ledger.counters.transaction,
      receipt: receipt ? ledger.counters.receipt + 1 : ledger.counters.receipt,
      history: nextHistoryOrdinal,
    },
  };
}

export function createRentalTransaction(input: CreateRentalInput) {
  return mutateLedger((ledger) => {
    const createdAt = nowIso();
    const nextOrdinal = ledger.counters.transaction + 1;
    const transaction: PosTransaction = {
      id: createId('trx', nextOrdinal),
      transactionNumber: formatReference('TRX', nextOrdinal),
      kind: 'rental',
      status: 'open',
      itemId: input.item.id,
      itemCode: input.item.code,
      itemName: input.item.name,
      itemPrice: input.item.rentalPrice,
      customerName: input.customerName.trim() || 'Pelanggan Umum',
      customerPhone: input.customerPhone.trim(),
      startDate: input.startDate,
      dueDate: input.dueDate,
      closedAt: null,
      depositReceived: Math.max(input.depositReceived, 0),
      refundedAmount: 0,
      penaltyAmount: 0,
      adjustmentAmount: 0,
      notes: input.notes?.trim() ?? '',
      revision: 1,
      createdAt,
      updatedAt: createdAt,
    };

    const receipt = makeReceipt(
      transaction,
      'create',
      'Rental created',
      input.notes?.trim() ?? '',
      ledger.counters.receipt + 1,
    );
    const historyEntry = makeHistoryEntry(
      transaction,
      'create',
      'Rental created',
      null,
      ledger.counters.history + 1,
    );

    return {
      ...ledger,
      transactions: [transaction, ...ledger.transactions],
      receipts: [...ledger.receipts, receipt],
      history: [...ledger.history, historyEntry],
      counters: {
        transaction: nextOrdinal,
        receipt: ledger.counters.receipt + 1,
        history: ledger.counters.history + 1,
      },
    };
  });
}

export function updateTransactionDetails(transactionId: string, input: UpdateTransactionInput) {
  return mutateLedger((ledger) =>
    replaceTransaction(
      ledger,
      transactionId,
      (transaction) => ({
        ...transaction,
        customerName: input.customerName.trim() || transaction.customerName,
        customerPhone: input.customerPhone.trim(),
        dueDate: input.dueDate,
        notes: input.notes?.trim() ?? transaction.notes,
      }),
      'update',
      'Transaction edited',
      input.notes?.trim() ?? '',
      false,
    ),
  );
}

export function addTransactionDeposit(transactionId: string, input: FinancialEventInput) {
  return mutateLedger((ledger) =>
    replaceTransaction(
      ledger,
      transactionId,
      (transaction) => ({
        ...transaction,
        depositReceived: transaction.depositReceived + Math.max(input.amount, 0),
      }),
      'deposit',
      'Deposit recorded',
      input.note?.trim() ?? '',
    ),
  );
}

export function addTransactionRefund(transactionId: string, input: FinancialEventInput) {
  return mutateLedger((ledger) =>
    replaceTransaction(
      ledger,
      transactionId,
      (transaction) => ({
        ...transaction,
        refundedAmount: transaction.refundedAmount + Math.max(input.amount, 0),
      }),
      'refund',
      'Refund recorded',
      input.note?.trim() ?? '',
    ),
  );
}

export function addTransactionPenalty(transactionId: string, input: FinancialEventInput) {
  return mutateLedger((ledger) =>
    replaceTransaction(
      ledger,
      transactionId,
      (transaction) => ({
        ...transaction,
        penaltyAmount: transaction.penaltyAmount + Math.max(input.amount, 0),
      }),
      'penalty',
      'Penalty recorded',
      input.note?.trim() ?? '',
    ),
  );
}

export function addTransactionAdjustment(transactionId: string, input: FinancialEventInput) {
  return mutateLedger((ledger) =>
    replaceTransaction(
      ledger,
      transactionId,
      (transaction) => ({
        ...transaction,
        adjustmentAmount: transaction.adjustmentAmount + input.amount,
      }),
      'adjustment',
      'Adjustment recorded',
      input.note?.trim() ?? '',
    ),
  );
}

export function closeRentalTransaction(transactionId: string, input: CloseTransactionInput) {
  return mutateLedger((ledger) =>
    replaceTransaction(
      ledger,
      transactionId,
      (transaction) => ({
        ...transaction,
        status: 'closed',
        closedAt: input.returnDate,
        dueDate: transaction.dueDate ?? input.returnDate,
        refundedAmount:
          transaction.refundedAmount + Math.max(input.refundedAmount ?? 0, 0),
        penaltyAmount:
          transaction.penaltyAmount + Math.max(input.penaltyAmount ?? 0, 0),
        adjustmentAmount: transaction.adjustmentAmount + (input.adjustmentAmount ?? 0),
        notes: input.note?.trim() || transaction.notes,
      }),
      'close',
      'Rental closed',
      input.note?.trim() ?? '',
    ),
  );
}

export function printTransactionReceipt(transactionId: string) {
  return mutateLedger((ledger) => {
    const transaction = findTransaction(ledger, transactionId);

    if (!transaction) {
      return ledger;
    }

    const receipt = makeReceipt(
      transaction,
      'print',
      'Receipt printed',
      'Receipt viewed from POS.',
      ledger.counters.receipt + 1,
    );

    const historyEntry = makeHistoryEntry(
      transaction,
      'print',
      'Receipt printed',
      findTransaction(ledger, transactionId),
      ledger.counters.history + 1,
    );

    return {
      ...ledger,
      receipts: [...ledger.receipts, receipt],
      history: [...ledger.history, historyEntry],
      counters: {
        ...ledger.counters,
        receipt: ledger.counters.receipt + 1,
        history: ledger.counters.history + 1,
      },
    };
  });
}

export function getActiveTransactions(ledger: PosLedgerState) {
  return ledger.transactions.filter((transaction) => transaction.status === 'open');
}

export function getClosedTransactions(ledger: PosLedgerState) {
  return ledger.transactions.filter((transaction) => transaction.status === 'closed');
}

export function getOverdueTransactions(ledger: PosLedgerState) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getActiveTransactions(ledger).filter((transaction) => {
    if (!transaction.dueDate) {
      return false;
    }

    const due = new Date(transaction.dueDate);
    return due < today;
  });
}

export function getLedgerMetrics(ledger: PosLedgerState) {
  const activeTransactions = getActiveTransactions(ledger);
  const overdueTransactions = getOverdueTransactions(ledger);
  const grossRevenue = ledger.transactions.reduce(
    (sum, transaction) => sum + transaction.itemPrice + transaction.penaltyAmount + transaction.adjustmentAmount,
    0,
  );
  const depositHeld = activeTransactions.reduce(
    (sum, transaction) => sum + Math.max(transaction.depositReceived - transaction.refundedAmount, 0),
    0,
  );
  const refunds = ledger.transactions.reduce((sum, transaction) => sum + transaction.refundedAmount, 0);
  const penalties = ledger.transactions.reduce((sum, transaction) => sum + transaction.penaltyAmount, 0);

  return {
    grossRevenue,
    depositHeld,
    refunds,
    penalties,
    activeCount: activeTransactions.length,
    overdueCount: overdueTransactions.length,
    closedCount: getClosedTransactions(ledger).length,
    totalCount: ledger.transactions.length,
  };
}

export function deriveAvailabilityProjection(
  items: KebayaItem[],
  ledger: PosLedgerState,
): Record<string, AvailabilityProjection> {
  const projections: Record<string, AvailabilityProjection> = {};

  items.forEach((item) => {
    const openTransactions = ledger.transactions.filter(
      (transaction) =>
        transaction.itemId === item.id &&
        transaction.kind === 'rental' &&
        transaction.status === 'open',
    );

    const openTransaction = openTransactions[0] ?? null;
    const masterStatus = item.status;
    const lockedStatus = masterStatus === 'maintenance' || masterStatus === 'archived';
    const effectiveStatus =
      lockedStatus || openTransaction ? (lockedStatus ? masterStatus : 'rented') : masterStatus;
    const dueDate =
      openTransaction?.dueDate ?? (masterStatus === 'rented' ? item.rentalEndDate ?? null : null);
    const isOverdue =
      Boolean(openTransaction?.dueDate) &&
      (() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(openTransaction?.dueDate ?? '');
        return due < today;
      })();

    projections[item.id] = {
      itemId: item.id,
      itemCode: item.code,
      masterStatus,
      effectiveStatus,
      dueDate,
      openTransactionId: openTransaction?.id ?? null,
      openTransactionNumber: openTransaction?.transactionNumber ?? null,
      customerName: openTransaction?.customerName ?? null,
      customerPhone: openTransaction?.customerPhone ?? null,
      source: openTransaction ? 'ledger' : 'master',
      isOverdue,
      activeDeposit: openTransaction
        ? Math.max(openTransaction.depositReceived - openTransaction.refundedAmount, 0)
        : 0,
      openTransactionCount: openTransactions.length,
      hasConflict: openTransactions.length > 1,
    };
  });

  return projections;
}

export function applyAvailabilityProjection(
  item: KebayaItem,
  projection?: AvailabilityProjection,
): KebayaItem {
  if (!projection) {
    return item;
  }

  return {
    ...item,
    status: projection.effectiveStatus,
    rentalEndDate: projection.dueDate ?? item.rentalEndDate,
  };
}

export function projectCatalogItems(items: KebayaItem[], ledger: PosLedgerState) {
  const projections = deriveAvailabilityProjection(items, ledger);
  return items.map((item) => applyAvailabilityProjection(item, projections[item.id]));
}

export function useAvailabilityProjection(items: KebayaItem[]) {
  const ledger = useSavedPosLedger();

  return useMemo(() => deriveAvailabilityProjection(items, ledger), [items, ledger]);
}
