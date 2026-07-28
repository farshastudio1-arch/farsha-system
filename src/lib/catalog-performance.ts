import type { KebayaItem } from '@/data/mockData';
import type { PosLedgerState } from '@/lib/pos-ledger';

// Where an item sits on the path from purchase cost to earning its keep.
// Note: "income" is realized rental revenue, and "profit" here means income has
// exceeded the item's acquisition cost — it is NOT net profit (it ignores
// laundry, repairs, deposits, and depreciation).
export type CatalogPerformanceStatus =
  | 'no-cost'
  | 'push-marketing'
  | 'approaching-bep'
  | 'bep-reached'
  | 'profit';

export interface CatalogItemPerformance {
  item: KebayaItem;
  cost: number | null;
  income: number;
  rentalCount: number;
  bepReached: boolean;
  profitSoFar: number | null;
  // income / cost, clamped at 0; null when there is no recorded cost.
  bepProgress: number | null;
  status: CatalogPerformanceStatus;
}

export interface CatalogPerformanceSummary {
  itemsTotal: number;
  itemsWithoutCost: number;
  itemsBepReached: number;
  itemsInProfit: number;
  itemsNeedingPush: number;
  totalCost: number;
  totalIncome: number;
  netAgainstCost: number;
}

export interface CatalogPerformanceResult {
  rows: CatalogItemPerformance[];
  summary: CatalogPerformanceSummary;
}

// Rank so the items that need attention (still paying themselves off) surface first.
const statusRank: Record<CatalogPerformanceStatus, number> = {
  'push-marketing': 0,
  'approaching-bep': 1,
  'bep-reached': 2,
  profit: 3,
  'no-cost': 4,
};

function classify(cost: number | null, income: number): CatalogPerformanceStatus {
  if (cost === null || cost <= 0) {
    return 'no-cost';
  }

  if (income > cost) {
    return 'profit';
  }

  if (income >= cost) {
    return 'bep-reached';
  }

  if (income >= cost * 0.5) {
    return 'approaching-bep';
  }

  return 'push-marketing';
}

function getTransactionIncome(transaction: PosLedgerState['transactions'][number]) {
  return Math.max(
    transaction.itemPrice + transaction.penaltyAmount + transaction.adjustmentAmount,
    0,
  );
}

// Sum realized rental revenue per item across the POS ledger (voids excluded).
function incomeByItemId(ledger: PosLedgerState) {
  const map = new Map<string, { income: number; count: number }>();

  for (const transaction of ledger.transactions) {
    if (transaction.status === 'void' || transaction.kind !== 'rental') {
      continue;
    }

    const current = map.get(transaction.itemId) ?? { income: 0, count: 0 };
    current.income += getTransactionIncome(transaction);
    current.count += 1;
    map.set(transaction.itemId, current);
  }

  return map;
}

export function computeCatalogPerformance(
  items: KebayaItem[],
  ledger: PosLedgerState,
): CatalogPerformanceResult {
  const incomeMap = incomeByItemId(ledger);

  const rows: CatalogItemPerformance[] = items.map((item) => {
    const cost = item.cost ?? null;
    const entry = incomeMap.get(item.id) ?? { income: 0, count: 0 };
    const income = Math.max(entry.income, 0);
    const status = classify(cost, income);
    const hasCost = cost !== null && cost > 0;

    return {
      item,
      cost,
      income,
      rentalCount: entry.count,
      bepReached: hasCost ? income >= cost : false,
      profitSoFar: hasCost ? income - cost : null,
      bepProgress: hasCost ? income / cost : null,
      status,
    };
  });

  rows.sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }
    // Within a bucket, least-recovered first (or highest income for no-cost).
    return (a.bepProgress ?? Infinity) - (b.bepProgress ?? Infinity);
  });

  const withCost = rows.filter((row) => row.cost !== null && row.cost > 0);

  const summary: CatalogPerformanceSummary = {
    itemsTotal: rows.length,
    itemsWithoutCost: rows.filter((row) => row.status === 'no-cost').length,
    itemsBepReached: withCost.filter((row) => row.bepReached).length,
    itemsInProfit: rows.filter((row) => row.status === 'profit').length,
    itemsNeedingPush: rows.filter((row) => row.status === 'push-marketing').length,
    totalCost: withCost.reduce((sum, row) => sum + (row.cost ?? 0), 0),
    totalIncome: withCost.reduce((sum, row) => sum + row.income, 0),
    netAgainstCost: withCost.reduce((sum, row) => sum + (row.profitSoFar ?? 0), 0),
  };

  return { rows, summary };
}
