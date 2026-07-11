PRAGMA foreign_keys = ON;

ALTER TABLE fitting_appointments ADD COLUMN booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fitting_appointments_booking
  ON fitting_appointments (booking_id);

CREATE TABLE IF NOT EXISTS booking_fitting_links (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  expires_at TEXT,
  used_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_booking_fitting_links_booking_status
  ON booking_fitting_links (booking_id, status, created_at);
