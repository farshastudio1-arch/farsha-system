PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS booking_receipts (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  receipt_number TEXT NOT NULL UNIQUE,
  receipt_type TEXT NOT NULL DEFAULT 'booking_dp_paid' CHECK (receipt_type IN ('booking_dp_paid')),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'void')),
  subtotal_amount INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
  discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total_amount INTEGER NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  html_snapshot TEXT,
  r2_key TEXT,
  url TEXT,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  voided_at TEXT,
  created_by TEXT,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_receipts_booking
  ON booking_receipts (booking_id, issued_at);
