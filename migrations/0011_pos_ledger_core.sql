PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pos_transactions (
  id TEXT PRIMARY KEY,
  transaction_number TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('rental', 'sale')),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'void')),
  item_id TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_price INTEGER NOT NULL CHECK (item_price >= 0),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  due_date TEXT,
  closed_at TEXT,
  deposit_received INTEGER NOT NULL DEFAULT 0 CHECK (deposit_received >= 0),
  refunded_amount INTEGER NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  penalty_amount INTEGER NOT NULL DEFAULT 0 CHECK (penalty_amount >= 0),
  adjustment_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'qris', 'card', 'other')),
  notes TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES kebaya_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_item_status
  ON pos_transactions (item_id, kind, status);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_dates
  ON pos_transactions (item_id, start_date, due_date);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_number
  ON pos_transactions (transaction_number);

CREATE TABLE IF NOT EXISTS pos_receipts (
  id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL UNIQUE,
  transaction_id TEXT NOT NULL,
  transaction_number TEXT NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN (
      'create',
      'update',
      'close',
      'deposit',
      'refund',
      'penalty',
      'adjustment',
      'print',
      'maintenance_open',
      'maintenance_close',
      'void'
    )
  ),
  title TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('rental', 'sale')),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'void')),
  base_amount INTEGER NOT NULL DEFAULT 0,
  deposit_received INTEGER NOT NULL DEFAULT 0,
  refunded_amount INTEGER NOT NULL DEFAULT 0,
  penalty_amount INTEGER NOT NULL DEFAULT 0,
  adjustment_amount INTEGER NOT NULL DEFAULT 0,
  event_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'qris', 'card', 'other')),
  total_collected INTEGER NOT NULL DEFAULT 0,
  balance_due INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pos_receipts_transaction
  ON pos_receipts (transaction_id, created_at);

CREATE INDEX IF NOT EXISTS idx_pos_receipts_number
  ON pos_receipts (receipt_number);

CREATE TABLE IF NOT EXISTS pos_audit_history (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  transaction_number TEXT NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN (
      'create',
      'update',
      'close',
      'deposit',
      'refund',
      'penalty',
      'adjustment',
      'print',
      'maintenance_open',
      'maintenance_close',
      'void'
    )
  ),
  summary TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  before_snapshot TEXT,
  after_snapshot TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pos_audit_history_transaction
  ON pos_audit_history (transaction_id, created_at);

CREATE TABLE IF NOT EXISTS pos_maintenance_holds (
  id TEXT PRIMARY KEY,
  maintenance_number TEXT NOT NULL UNIQUE,
  item_id TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  source_transaction_id TEXT NOT NULL,
  transaction_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  auto_release_at TEXT,
  closed_at TEXT,
  opened_note TEXT NOT NULL DEFAULT '',
  closed_note TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_by TEXT,
  closed_by TEXT,
  FOREIGN KEY (item_id) REFERENCES kebaya_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pos_maintenance_holds_item_status
  ON pos_maintenance_holds (item_id, status);

CREATE INDEX IF NOT EXISTS idx_pos_maintenance_holds_source_transaction
  ON pos_maintenance_holds (source_transaction_id);
