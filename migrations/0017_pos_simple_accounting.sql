PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS pos_expense_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO pos_expense_categories (id, name, slug, sort_order) VALUES
  ('expense-category-laundry', 'Laundry', 'laundry', 10),
  ('expense-category-ads', 'Ads', 'ads', 20),
  ('expense-category-electricity-bill', 'Electricity Bill', 'electricity-bill', 30),
  ('expense-category-salary', 'Salary', 'salary', 40),
  ('expense-category-wifi-bill', 'Wifi Bill', 'wifi-bill', 50),
  ('expense-category-water-bill', 'Water Bill', 'water-bill', 60),
  ('expense-category-other', 'Other', 'other', 999);

CREATE TABLE IF NOT EXISTS pos_expenses (
  id TEXT PRIMARY KEY,
  expense_date TEXT NOT NULL,
  category_id TEXT,
  category_name TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'qris')),
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES pos_expense_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_expenses_date
  ON pos_expenses (expense_date, payment_method);

CREATE INDEX IF NOT EXISTS idx_pos_expenses_category
  ON pos_expenses (category_id, expense_date);

CREATE TABLE IF NOT EXISTS pos_daily_closings (
  id TEXT PRIMARY KEY,
  close_date TEXT NOT NULL UNIQUE,
  cash_expected INTEGER NOT NULL DEFAULT 0,
  cash_counted INTEGER NOT NULL DEFAULT 0,
  cash_variance INTEGER NOT NULL DEFAULT 0,
  transfer_expected INTEGER NOT NULL DEFAULT 0,
  transfer_counted INTEGER NOT NULL DEFAULT 0,
  transfer_variance INTEGER NOT NULL DEFAULT 0,
  qris_expected INTEGER NOT NULL DEFAULT 0,
  qris_counted INTEGER NOT NULL DEFAULT 0,
  qris_variance INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  closed_by TEXT,
  closed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pos_daily_closings_date
  ON pos_daily_closings (close_date);
