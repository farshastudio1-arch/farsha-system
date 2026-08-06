PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS consignors (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'suspended')),
  bank_account_name TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  terms_version TEXT,
  terms_accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consignors_status
  ON consignors (status, created_at);

CREATE TABLE IF NOT EXISTS consignor_sessions (
  id TEXT PRIMARY KEY,
  consignor_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consignor_id) REFERENCES consignors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consignor_sessions_consignor
  ON consignor_sessions (consignor_id, expires_at);

CREATE TABLE IF NOT EXISTS consignor_tokens (
  id TEXT PRIMARY KEY,
  consignor_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('set_password', 'reset_password')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (consignor_id) REFERENCES consignors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consignor_tokens_consignor
  ON consignor_tokens (consignor_id, purpose, expires_at);

CREATE TABLE IF NOT EXISTS consignor_payout_requests (
  id TEXT PRIMARY KEY,
  consignor_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'rejected')),
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  settled_at TEXT,
  reference TEXT,
  bank_account_name TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  FOREIGN KEY (consignor_id) REFERENCES consignors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consignor_payout_requests_consignor
  ON consignor_payout_requests (consignor_id, status, requested_at);

CREATE TABLE IF NOT EXISTS consignor_payouts (
  id TEXT PRIMARY KEY,
  consignor_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  close_receipt_id TEXT NOT NULL,
  rental_net INTEGER NOT NULL CHECK (rental_net >= 0),
  rate_percent INTEGER NOT NULL CHECK (rate_percent IN (40, 50)),
  payout_amount INTEGER NOT NULL CHECK (payout_amount >= 0),
  status TEXT NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued', 'paid')),
  accrued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT,
  payout_request_id TEXT,
  transfer_reference TEXT,
  FOREIGN KEY (consignor_id) REFERENCES consignors(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES kebaya_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (transaction_id) REFERENCES pos_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (close_receipt_id) REFERENCES pos_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (payout_request_id) REFERENCES consignor_payout_requests(id) ON DELETE SET NULL,
  UNIQUE (close_receipt_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_consignor_payouts_consignor
  ON consignor_payouts (consignor_id, status, accrued_at);

CREATE INDEX IF NOT EXISTS idx_consignor_payouts_request
  ON consignor_payouts (payout_request_id, status);

CREATE TABLE IF NOT EXISTS consignor_withdrawal_requests (
  id TEXT PRIMARY KEY,
  consignor_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  note TEXT,
  admin_note TEXT,
  FOREIGN KEY (consignor_id) REFERENCES consignors(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES kebaya_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_consignor_withdrawal_requests_consignor
  ON consignor_withdrawal_requests (consignor_id, status, requested_at);

ALTER TABLE kebaya_items ADD COLUMN consignor_id TEXT REFERENCES consignors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kebaya_items_consignor
  ON kebaya_items (consignor_id, status);
