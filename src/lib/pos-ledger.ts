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
export type PosMaintenanceStatus = 'open' | 'closed';
export type PosLedgerAction =
  | 'create'
  | 'update'
  | 'close'
  | 'deposit'
  | 'refund'
  | 'penalty'
  | 'adjustment'
  | 'print'
  | 'maintenance_open'
  | 'maintenance_close'
  | 'void';
export type PosPaymentMethod = 'cash' | 'transfer' | 'qris' | 'card' | 'other';

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
  paymentMethod: PosPaymentMethod;
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
  eventAmount: number;
  paymentMethod: PosPaymentMethod;
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
  reason: string;
  before: PosTransaction | null;
  after: PosTransaction | null;
  createdAt: string;
}

export interface PosMaintenanceHold {
  id: string;
  maintenanceNumber: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  sourceTransactionId: string;
  transactionNumber: string;
  status: PosMaintenanceStatus;
  openedAt: string;
  closedAt: string | null;
  openedNote: string;
  closedNote: string;
  revision: number;
}

export interface PosLedgerState {
  transactions: PosTransaction[];
  receipts: PosReceipt[];
  history: PosAuditEntry[];
  maintenanceHolds: PosMaintenanceHold[];
  counters: {
    transaction: number;
    receipt: number;
    history: number;
    maintenance: number;
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
  openMaintenanceId: string | null;
  openMaintenanceNumber: string | null;
  maintenanceOpenedAt: string | null;
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
  paymentMethod?: PosPaymentMethod;
  notes?: string;
  itemPrice?: number;
}

export interface UpdateTransactionInput {
  customerName: string;
  customerPhone: string;
  dueDate: string | null;
  notes?: string;
  reason: string;
}

export interface FinancialEventInput {
  amount: number;
  note?: string;
  paymentMethod?: PosPaymentMethod;
}

export interface CloseTransactionInput {
  returnDate: string;
  refundedAmount?: number;
  penaltyAmount?: number;
  adjustmentAmount?: number;
  note?: string;
  paymentMethod?: PosPaymentMethod;
}

export interface CompleteMaintenanceInput {
  note?: string;
}

export interface VoidTransactionInput {
  reason: string;
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

function normalizeSignedNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeTransactionStatus(value: unknown): PosTransactionStatus {
  return value === 'open' || value === 'closed' || value === 'void' ? value : 'open';
}

function normalizeMaintenanceStatus(value: unknown): PosMaintenanceStatus {
  return value === 'closed' ? 'closed' : 'open';
}

function normalizeTransactionKind(value: unknown): PosTransactionKind {
  return value === 'sale' ? 'sale' : 'rental';
}

function normalizePaymentMethod(value: unknown): PosPaymentMethod {
  return value === 'transfer' ||
    value === 'qris' ||
    value === 'card' ||
    value === 'other'
    ? value
    : 'cash';
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
    adjustmentAmount: normalizeSignedNumber(value.adjustmentAmount, 0),
    paymentMethod: normalizePaymentMethod(value.paymentMethod),
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

  const action = normalizeReceiptAction(value.action);
  const inferredEventAmount =
    value.eventAmount === undefined
      ? inferReceiptEventAmount(action, value)
      : normalizeSignedNumber(value.eventAmount);

  return {
    id: normalizeText(value.id, createId('rcp', ordinal)),
    receiptNumber: normalizeText(value.receiptNumber, formatReference('RCP', ordinal)),
    transactionId,
    transactionNumber,
    action,
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
    adjustmentAmount: normalizeSignedNumber(value.adjustmentAmount, 0),
    eventAmount: inferredEventAmount,
    paymentMethod: normalizePaymentMethod(value.paymentMethod),
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
    value === 'print' ||
    value === 'maintenance_open' ||
    value === 'maintenance_close' ||
    value === 'void'
    ? value
    : 'create';
}

function inferReceiptEventAmount(
  action: PosLedgerAction,
  value: Partial<PosReceipt>,
) {
  if (action === 'refund') {
    return -normalizeNumber(value.refundedAmount);
  }

  if (action === 'deposit') {
    return normalizeNumber(value.depositReceived);
  }

  if (action === 'penalty') {
    return normalizeNumber(value.penaltyAmount);
  }

  if (action === 'adjustment') {
    return normalizeSignedNumber(value.adjustmentAmount);
  }

  if (action === 'create') {
    return normalizeNumber(value.totalCollected);
  }

  return 0;
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
    reason: normalizeText(value.reason),
    before: value.before ? normalizeTransaction(value.before, ordinal) : null,
    after: value.after ? normalizeTransaction(value.after, ordinal) : null,
    createdAt,
  };
}

function normalizeMaintenanceHold(
  value: Partial<PosMaintenanceHold>,
  ordinal: number,
): PosMaintenanceHold | null {
  const itemId = normalizeText(value.itemId);
  const itemCode = normalizeText(value.itemCode);
  const itemName = normalizeText(value.itemName);
  const sourceTransactionId = normalizeText(value.sourceTransactionId);
  const transactionNumber = normalizeText(value.transactionNumber);

  if (!itemId || !itemCode || !itemName || !sourceTransactionId || !transactionNumber) {
    return null;
  }

  const openedAt = normalizeText(value.openedAt, nowIso());

  return {
    id: normalizeText(value.id, createId('mnt', ordinal)),
    maintenanceNumber: normalizeText(value.maintenanceNumber, formatReference('MNT', ordinal)),
    itemId,
    itemCode,
    itemName,
    sourceTransactionId,
    transactionNumber,
    status: normalizeMaintenanceStatus(value.status),
    openedAt,
    closedAt: typeof value.closedAt === 'string' ? value.closedAt : null,
    openedNote: normalizeText(value.openedNote),
    closedNote: normalizeText(value.closedNote),
    revision: Number.isFinite(value.revision) ? Number(value.revision) : 1,
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
        paymentMethod: 'cash',
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
          eventAmount: item.rentalPrice,
          paymentMethod: 'cash',
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
          reason: 'Imported from legacy catalog rental status.',
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
    maintenanceHolds: [],
    counters: {
      transaction: transactions.length,
      receipt: receipts.length,
      history: history.length,
      maintenance: 0,
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
    maintenanceHolds?: Partial<PosMaintenanceHold>[];
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

  const maintenanceHolds = Array.isArray(raw.maintenanceHolds)
    ? raw.maintenanceHolds
        .map((entry, index) => normalizeMaintenanceHold(entry, index + 1))
        .filter((entry): entry is PosMaintenanceHold => Boolean(entry))
    : [];

  if (
    transactions.length === 0 &&
    receipts.length === 0 &&
    history.length === 0 &&
    maintenanceHolds.length === 0
  ) {
    return createLegacySeedLedger();
  }

  return {
    transactions,
    receipts,
    history,
    maintenanceHolds,
    counters: {
      transaction: normalizeNumber(raw.counters?.transaction, transactions.length),
      receipt: normalizeNumber(raw.counters?.receipt, receipts.length),
      history: normalizeNumber(raw.counters?.history, history.length),
      maintenance: normalizeNumber(raw.counters?.maintenance, maintenanceHolds.length),
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
  options: {
    eventAmount?: number;
    paymentMethod?: PosPaymentMethod;
  } = {},
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
    eventAmount: options.eventAmount ?? 0,
    paymentMethod: options.paymentMethod ?? transaction.paymentMethod,
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
  reason = '',
): PosAuditEntry {
  return {
    id: createId('hst', historyOrdinal),
    transactionId: transaction.id,
    transactionNumber: transaction.transactionNumber,
    action,
    summary,
    reason: reason.trim(),
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
  options: {
    action: PosLedgerAction;
    summary: string;
    note?: string;
    reason?: string;
    createReceipt?: boolean;
    receiptEventAmount?: number;
    paymentMethod?: PosPaymentMethod;
  },
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
    options.action,
    options.summary,
    findTransaction(ledger, transactionId),
    nextHistoryOrdinal,
    options.reason ?? options.note ?? '',
  );
  const receipt = options.createReceipt === false
    ? null
    : makeReceipt(
        updatedTransaction,
        options.action,
        options.summary,
        options.note ?? options.reason ?? '',
        ledger.counters.receipt + 1,
        {
          eventAmount: options.receiptEventAmount ?? 0,
          paymentMethod: options.paymentMethod,
        },
      );

  return {
    ...ledger,
    transactions: nextTransactions,
    receipts: receipt ? [...ledger.receipts, receipt] : ledger.receipts,
    history: [...ledger.history, historyEntry],
    counters: {
      transaction: ledger.counters.transaction,
      receipt: receipt ? ledger.counters.receipt + 1 : ledger.counters.receipt,
      history: nextHistoryOrdinal,
      maintenance: ledger.counters.maintenance,
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
      itemPrice: input.itemPrice !== undefined ? input.itemPrice : input.item.rentalPrice,
      customerName: input.customerName.trim() || 'Pelanggan Umum',
      customerPhone: input.customerPhone.trim(),
      startDate: input.startDate,
      dueDate: input.dueDate,
      closedAt: null,
      depositReceived: Math.max(input.depositReceived, 0),
      refundedAmount: 0,
      penaltyAmount: 0,
      adjustmentAmount: 0,
      paymentMethod: input.paymentMethod ?? 'cash',
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
      {
        eventAmount: transaction.itemPrice + Math.max(input.depositReceived, 0),
        paymentMethod: input.paymentMethod ?? 'cash',
      },
    );
    const historyEntry = makeHistoryEntry(
      transaction,
      'create',
      'Rental created',
      null,
      ledger.counters.history + 1,
      input.notes?.trim() ?? '',
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
        maintenance: ledger.counters.maintenance,
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
      {
        action: 'update',
        summary: 'Transaction edited',
        note: input.reason.trim(),
        reason: input.reason,
        receiptEventAmount: 0,
      },
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
        paymentMethod: input.paymentMethod ?? transaction.paymentMethod,
      }),
      {
        action: 'deposit',
        summary: 'Deposit recorded',
        note: input.note?.trim() ?? '',
        receiptEventAmount: Math.max(input.amount, 0),
        paymentMethod: input.paymentMethod,
      },
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
        paymentMethod: input.paymentMethod ?? transaction.paymentMethod,
      }),
      {
        action: 'refund',
        summary: 'Refund recorded',
        note: input.note?.trim() ?? '',
        receiptEventAmount: -Math.max(input.amount, 0),
        paymentMethod: input.paymentMethod,
      },
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
        paymentMethod: input.paymentMethod ?? transaction.paymentMethod,
      }),
      {
        action: 'penalty',
        summary: 'Penalty recorded',
        note: input.note?.trim() ?? '',
        receiptEventAmount: Math.max(input.amount, 0),
        paymentMethod: input.paymentMethod,
      },
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
        paymentMethod: input.paymentMethod ?? transaction.paymentMethod,
      }),
      {
        action: 'adjustment',
        summary: 'Adjustment recorded',
        note: input.note?.trim() ?? '',
        receiptEventAmount: input.amount,
        paymentMethod: input.paymentMethod,
      },
    ),
  );
}

export function closeRentalTransaction(transactionId: string, input: CloseTransactionInput) {
  return mutateLedger((ledger) => {
    const before = findTransaction(ledger, transactionId);

    if (!before || before.status !== 'open') {
      return ledger;
    }

    const note = input.note?.trim() ?? '';
    const updatedTransaction: PosTransaction = {
      ...before,
      status: 'closed',
      closedAt: input.returnDate,
      dueDate: before.dueDate ?? input.returnDate,
      refundedAmount: before.refundedAmount + Math.max(input.refundedAmount ?? 0, 0),
      penaltyAmount: before.penaltyAmount + Math.max(input.penaltyAmount ?? 0, 0),
      adjustmentAmount: before.adjustmentAmount + (input.adjustmentAmount ?? 0),
      paymentMethod: input.paymentMethod ?? before.paymentMethod,
      notes: note || before.notes,
      revision: before.revision + 1,
      updatedAt: nowIso(),
    };
    const nextTransactions = ledger.transactions.map((transaction) =>
      transaction.id === transactionId ? updatedTransaction : transaction,
    );
    const closeReceipt = makeReceipt(
      updatedTransaction,
      'close',
      'Rental finished',
      note,
      ledger.counters.receipt + 1,
      {
        eventAmount:
          Math.max(input.penaltyAmount ?? 0, 0) +
          (input.adjustmentAmount ?? 0) -
          Math.max(input.refundedAmount ?? 0, 0),
        paymentMethod: input.paymentMethod,
      },
    );
    const closeHistory = makeHistoryEntry(
      updatedTransaction,
      'close',
      'Rental finished',
      before,
      ledger.counters.history + 1,
      note,
    );
    const hasOpenMaintenanceHold = ledger.maintenanceHolds.some(
      (hold) => hold.itemId === updatedTransaction.itemId && hold.status === 'open',
    );
    const maintenanceOrdinal = ledger.counters.maintenance + 1;
    const maintenanceHold: PosMaintenanceHold | null = hasOpenMaintenanceHold
      ? null
      : {
          id: createId('mnt', maintenanceOrdinal),
          maintenanceNumber: formatReference('MNT', maintenanceOrdinal),
          itemId: updatedTransaction.itemId,
          itemCode: updatedTransaction.itemCode,
          itemName: updatedTransaction.itemName,
          sourceTransactionId: updatedTransaction.id,
          transactionNumber: updatedTransaction.transactionNumber,
          status: 'open',
          openedAt: nowIso(),
          closedAt: null,
          openedNote: note || 'Returned item waiting for cleaning.',
          closedNote: '',
          revision: 1,
        };
    const maintenanceHistory = maintenanceHold
      ? makeHistoryEntry(
          updatedTransaction,
          'maintenance_open',
          'Maintenance opened after return',
          updatedTransaction,
          ledger.counters.history + 2,
          maintenanceHold.openedNote,
        )
      : null;

    return {
      ...ledger,
      transactions: nextTransactions,
      receipts: [...ledger.receipts, closeReceipt],
      history: maintenanceHistory
        ? [...ledger.history, closeHistory, maintenanceHistory]
        : [...ledger.history, closeHistory],
      maintenanceHolds: maintenanceHold
        ? [maintenanceHold, ...ledger.maintenanceHolds]
        : ledger.maintenanceHolds,
      counters: {
        transaction: ledger.counters.transaction,
        receipt: ledger.counters.receipt + 1,
        history: ledger.counters.history + (maintenanceHistory ? 2 : 1),
        maintenance: maintenanceHold ? maintenanceOrdinal : ledger.counters.maintenance,
      },
    };
  });
}

export function completeMaintenanceHold(maintenanceId: string, input: CompleteMaintenanceInput) {
  return mutateLedger((ledger) => {
    const currentHold = ledger.maintenanceHolds.find((hold) => hold.id === maintenanceId);

    if (!currentHold || currentHold.status !== 'open') {
      return ledger;
    }

    const note = input.note?.trim() ?? '';
    const closedHold: PosMaintenanceHold = {
      ...currentHold,
      status: 'closed',
      closedAt: nowIso(),
      closedNote: note,
      revision: currentHold.revision + 1,
    };
    const nextMaintenanceHolds = ledger.maintenanceHolds.map((hold) =>
      hold.id === maintenanceId ? closedHold : hold,
    );
    const sourceTransaction = findTransaction(ledger, currentHold.sourceTransactionId);
    const historyEntry = sourceTransaction
      ? makeHistoryEntry(
          sourceTransaction,
          'maintenance_close',
          'Maintenance completed',
          sourceTransaction,
          ledger.counters.history + 1,
          note,
        )
      : null;

    return {
      ...ledger,
      maintenanceHolds: nextMaintenanceHolds,
      history: historyEntry ? [...ledger.history, historyEntry] : ledger.history,
      counters: {
        ...ledger.counters,
        history: historyEntry ? ledger.counters.history + 1 : ledger.counters.history,
      },
    };
  });
}

export function voidTransaction(transactionId: string, input: VoidTransactionInput) {
  const reason = input.reason.trim() || 'Voided from POS';

  return mutateLedger((ledger) =>
    replaceTransaction(
      ledger,
      transactionId,
      (transaction) => ({
        ...transaction,
        status: 'void',
        closedAt: transaction.closedAt ?? nowIso().slice(0, 10),
        notes: transaction.notes
          ? `${transaction.notes}\nVoid reason: ${reason}`
          : `Void reason: ${reason}`,
      }),
      {
        action: 'void',
        summary: 'Transaction voided',
        note: reason,
        reason,
        receiptEventAmount: 0,
        paymentMethod: findTransaction(ledger, transactionId)?.paymentMethod,
      },
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

export function getReportableTransactions(ledger: PosLedgerState) {
  return ledger.transactions.filter((transaction) => transaction.status !== 'void');
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

export function getOpenMaintenanceHolds(ledger: PosLedgerState) {
  return ledger.maintenanceHolds.filter((hold) => hold.status === 'open');
}

export function getLedgerMetrics(ledger: PosLedgerState) {
  const activeTransactions = getActiveTransactions(ledger);
  const overdueTransactions = getOverdueTransactions(ledger);
  const openMaintenanceHolds = getOpenMaintenanceHolds(ledger);
  const reportableTransactions = getReportableTransactions(ledger);
  const voidedTransactions = ledger.transactions.filter(
    (transaction) => transaction.status === 'void',
  );
  const paymentByMethod: Record<PosPaymentMethod, number> = {
    cash: 0,
    transfer: 0,
    qris: 0,
    card: 0,
    other: 0,
  };

  ledger.receipts.forEach((receipt) => {
    paymentByMethod[receipt.paymentMethod] += receipt.eventAmount;
  });

  const paymentNet = Object.values(paymentByMethod).reduce((sum, amount) => sum + amount, 0);
  const paymentIn = ledger.receipts.reduce(
    (sum, receipt) => sum + Math.max(receipt.eventAmount, 0),
    0,
  );
  const paymentOut = ledger.receipts.reduce(
    (sum, receipt) => sum + Math.max(-receipt.eventAmount, 0),
    0,
  );
  const grossRevenue = reportableTransactions.reduce(
    (sum, transaction) => sum + transaction.itemPrice + transaction.penaltyAmount + transaction.adjustmentAmount,
    0,
  );
  const depositHeld = activeTransactions.reduce(
    (sum, transaction) => sum + Math.max(transaction.depositReceived - transaction.refundedAmount, 0),
    0,
  );
  const refunds = reportableTransactions.reduce((sum, transaction) => sum + transaction.refundedAmount, 0);
  const penalties = reportableTransactions.reduce((sum, transaction) => sum + transaction.penaltyAmount, 0);

  return {
    grossRevenue,
    depositHeld,
    refunds,
    penalties,
    paymentByMethod,
    paymentNet,
    paymentIn,
    paymentOut,
    activeCount: activeTransactions.length,
    overdueCount: overdueTransactions.length,
    closedCount: getClosedTransactions(ledger).length,
    maintenanceCount: openMaintenanceHolds.length,
    voidCount: voidedTransactions.length,
    totalCount: reportableTransactions.length,
    auditCount: ledger.history.length,
    receiptCount: ledger.receipts.length,
    ledgerCount: ledger.transactions.length,
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
    const openMaintenance = ledger.maintenanceHolds.find(
      (hold) => hold.itemId === item.id && hold.status === 'open',
    ) ?? null;
    const masterStatus = item.status;
    const effectiveStatus = openTransaction
      ? 'rented'
      : openMaintenance
        ? 'maintenance'
        : masterStatus;
    const dueDate = openTransaction?.dueDate ?? null;
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
      openMaintenanceId: openMaintenance?.id ?? null,
      openMaintenanceNumber: openMaintenance?.maintenanceNumber ?? null,
      maintenanceOpenedAt: openMaintenance?.openedAt ?? null,
      customerName: openTransaction?.customerName ?? null,
      customerPhone: openTransaction?.customerPhone ?? null,
      source: openTransaction || openMaintenance ? 'ledger' : 'master',
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
    rentalEndDate: projection.dueDate,
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
