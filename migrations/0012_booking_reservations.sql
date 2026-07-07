PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  booking_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (
    status IN (
      'requested',
      'payment_submitted',
      'dp_confirmed',
      'fitting_link_sent',
      'picked_up',
      'completed',
      'rejected',
      'cancelled',
      'expired'
    )
  ),
  source TEXT NOT NULL CHECK (source IN ('catalog', 'whatsapp', 'walk_in', 'admin')),
  customer_name TEXT NOT NULL,
  customer_whatsapp TEXT NOT NULL,
  customer_email TEXT,
  customer_instagram TEXT,
  pickup_method TEXT NOT NULL DEFAULT 'store' CHECK (pickup_method IN ('store', 'gosend')),
  delivery_address TEXT,
  notes TEXT NOT NULL DEFAULT '',
  dp_total INTEGER NOT NULL DEFAULT 0 CHECK (dp_total >= 0),
  instagram_discount_amount INTEGER NOT NULL DEFAULT 0 CHECK (instagram_discount_amount >= 0),
  extra_return_fee_total INTEGER NOT NULL DEFAULT 0 CHECK (extra_return_fee_total >= 0),
  rental_estimate_total INTEGER NOT NULL DEFAULT 0 CHECK (rental_estimate_total >= 0),
  confirmation_conflict_checked_at TEXT,
  rejected_reason TEXT,
  cancelled_reason TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_status_created
  ON bookings (status, created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_whatsapp
  ON bookings (customer_whatsapp);

CREATE TABLE IF NOT EXISTS booking_items (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  rental_price_snapshot INTEGER NOT NULL DEFAULT 0 CHECK (rental_price_snapshot >= 0),
  dp_amount INTEGER NOT NULL DEFAULT 0 CHECK (dp_amount >= 0),
  extra_return_fee INTEGER NOT NULL DEFAULT 0 CHECK (extra_return_fee >= 0),
  pickup_date TEXT NOT NULL,
  event_date TEXT NOT NULL,
  return_start_date TEXT NOT NULL,
  return_due_date TEXT NOT NULL,
  maintenance_start_date TEXT NOT NULL,
  maintenance_end_date TEXT NOT NULL,
  item_status TEXT NOT NULL DEFAULT 'active' CHECK (item_status IN ('active', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES kebaya_items(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_booking_items_booking
  ON booking_items (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_items_item_dates
  ON booking_items (item_id, pickup_date, maintenance_end_date);

CREATE TABLE IF NOT EXISTS booking_payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'dp' CHECK (payment_type IN ('dp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'rejected')),
  amount_due INTEGER NOT NULL DEFAULT 0 CHECK (amount_due >= 0),
  amount_paid INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  method TEXT NOT NULL DEFAULT 'transfer' CHECK (method IN ('transfer', 'cash', 'qris', 'other')),
  reference TEXT NOT NULL DEFAULT '',
  verified_by TEXT,
  verified_at TEXT,
  rejected_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_payments_booking
  ON booking_payments (booking_id, status);

CREATE TABLE IF NOT EXISTS booking_payment_proofs (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  booking_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0 CHECK (size >= 0),
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES booking_payments(id) ON DELETE CASCADE,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_payment_proofs_booking
  ON booking_payment_proofs (booking_id, created_at);

CREATE TABLE IF NOT EXISTS booking_invoices (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_type TEXT NOT NULL DEFAULT 'booking_dp' CHECK (invoice_type IN ('booking_dp')),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'void')),
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

CREATE INDEX IF NOT EXISTS idx_booking_invoices_booking
  ON booking_invoices (booking_id, issued_at);

CREATE TABLE IF NOT EXISTS booking_status_history (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking
  ON booking_status_history (booking_id, created_at);
