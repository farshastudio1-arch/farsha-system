PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS fitting_appointments (
  id TEXT PRIMARY KEY,
  fitting_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')
  ),
  customer_name TEXT NOT NULL,
  customer_whatsapp TEXT NOT NULL,
  customer_email TEXT,
  notes TEXT NOT NULL DEFAULT '',
  appointment_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'public' CHECK (source IN ('public', 'admin', 'whatsapp')),
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fitting_appointments_active_slot
  ON fitting_appointments (appointment_date, start_time)
  WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_fitting_appointments_status_date
  ON fitting_appointments (status, appointment_date, start_time);

CREATE INDEX IF NOT EXISTS idx_fitting_appointments_customer_whatsapp
  ON fitting_appointments (customer_whatsapp);
