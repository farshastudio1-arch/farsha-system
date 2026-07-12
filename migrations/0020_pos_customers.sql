PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  primary_phone TEXT NOT NULL,
  normalized_phone TEXT NOT NULL UNIQUE,
  email TEXT,
  instagram TEXT,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  first_source TEXT NOT NULL DEFAULT 'manual' CHECK (first_source IN ('manual', 'pos', 'booking', 'fitting', 'imported')),
  last_seen_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_status_name
  ON customers (status, display_name);

CREATE INDEX IF NOT EXISTS idx_customers_search
  ON customers (display_name, primary_phone, email, instagram);

ALTER TABLE pos_transactions ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE fitting_appointments ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pos_transactions_customer
  ON pos_transactions (customer_id, created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_customer
  ON bookings (customer_id, created_at);

CREATE INDEX IF NOT EXISTS idx_fitting_appointments_customer
  ON fitting_appointments (customer_id, appointment_date, start_time);

INSERT INTO customers (
  id,
  display_name,
  primary_phone,
  normalized_phone,
  email,
  instagram,
  notes,
  status,
  first_source,
  last_seen_at,
  created_at,
  updated_at
)
SELECT
  'customer-' || lower(hex(randomblob(16))),
  display_name,
  primary_phone,
  normalized_phone,
  email,
  instagram,
  '',
  'active',
  first_source,
  last_seen_at,
  last_seen_at,
  last_seen_at
FROM (
  SELECT
    customer_name AS display_name,
    customer_phone AS primary_phone,
    CASE
      WHEN substr(phone_digits, 1, 2) = '62' THEN phone_digits
      WHEN substr(phone_digits, 1, 1) = '0' THEN '62' || substr(phone_digits, 2)
      WHEN substr(phone_digits, 1, 1) = '8' THEN '62' || phone_digits
      ELSE phone_digits
    END AS normalized_phone,
    NULL AS email,
    NULL AS instagram,
    'pos' AS first_source,
    COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS last_seen_at
  FROM (
    SELECT
      customer_name,
      customer_phone,
      updated_at,
      created_at,
      replace(replace(replace(replace(replace(replace(replace(customer_phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '/', '') AS phone_digits
    FROM pos_transactions
    WHERE customer_phone IS NOT NULL AND trim(customer_phone) != ''
  )
  GROUP BY normalized_phone
)
WHERE normalized_phone != ''
ON CONFLICT(normalized_phone) DO NOTHING;

INSERT INTO customers (
  id,
  display_name,
  primary_phone,
  normalized_phone,
  email,
  instagram,
  notes,
  status,
  first_source,
  last_seen_at,
  created_at,
  updated_at
)
SELECT
  'customer-' || lower(hex(randomblob(16))),
  display_name,
  primary_phone,
  normalized_phone,
  email,
  instagram,
  '',
  'active',
  first_source,
  last_seen_at,
  last_seen_at,
  last_seen_at
FROM (
  SELECT
    customer_name AS display_name,
    customer_whatsapp AS primary_phone,
    CASE
      WHEN substr(phone_digits, 1, 2) = '62' THEN phone_digits
      WHEN substr(phone_digits, 1, 1) = '0' THEN '62' || substr(phone_digits, 2)
      WHEN substr(phone_digits, 1, 1) = '8' THEN '62' || phone_digits
      ELSE phone_digits
    END AS normalized_phone,
    customer_email AS email,
    customer_instagram AS instagram,
    'booking' AS first_source,
    COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS last_seen_at
  FROM (
    SELECT
      customer_name,
      customer_whatsapp,
      customer_email,
      customer_instagram,
      updated_at,
      created_at,
      replace(replace(replace(replace(replace(replace(replace(customer_whatsapp, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '/', '') AS phone_digits
    FROM bookings
    WHERE customer_whatsapp IS NOT NULL AND trim(customer_whatsapp) != ''
  )
  GROUP BY normalized_phone
)
WHERE normalized_phone != ''
ON CONFLICT(normalized_phone) DO UPDATE SET
  email = COALESCE(customers.email, excluded.email),
  instagram = COALESCE(customers.instagram, excluded.instagram),
  last_seen_at = CASE
    WHEN customers.last_seen_at IS NULL OR excluded.last_seen_at > customers.last_seen_at THEN excluded.last_seen_at
    ELSE customers.last_seen_at
  END,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO customers (
  id,
  display_name,
  primary_phone,
  normalized_phone,
  email,
  instagram,
  notes,
  status,
  first_source,
  last_seen_at,
  created_at,
  updated_at
)
SELECT
  'customer-' || lower(hex(randomblob(16))),
  display_name,
  primary_phone,
  normalized_phone,
  email,
  NULL,
  '',
  'active',
  first_source,
  last_seen_at,
  last_seen_at,
  last_seen_at
FROM (
  SELECT
    customer_name AS display_name,
    customer_whatsapp AS primary_phone,
    CASE
      WHEN substr(phone_digits, 1, 2) = '62' THEN phone_digits
      WHEN substr(phone_digits, 1, 1) = '0' THEN '62' || substr(phone_digits, 2)
      WHEN substr(phone_digits, 1, 1) = '8' THEN '62' || phone_digits
      ELSE phone_digits
    END AS normalized_phone,
    customer_email AS email,
    'fitting' AS first_source,
    COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) AS last_seen_at
  FROM (
    SELECT
      customer_name,
      customer_whatsapp,
      customer_email,
      updated_at,
      created_at,
      replace(replace(replace(replace(replace(replace(replace(customer_whatsapp, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '/', '') AS phone_digits
    FROM fitting_appointments
    WHERE customer_whatsapp IS NOT NULL AND trim(customer_whatsapp) != ''
  )
  GROUP BY normalized_phone
)
WHERE normalized_phone != ''
ON CONFLICT(normalized_phone) DO UPDATE SET
  email = COALESCE(customers.email, excluded.email),
  last_seen_at = CASE
    WHEN customers.last_seen_at IS NULL OR excluded.last_seen_at > customers.last_seen_at THEN excluded.last_seen_at
    ELSE customers.last_seen_at
  END,
  updated_at = CURRENT_TIMESTAMP;

UPDATE pos_transactions
SET customer_id = (
  SELECT id
  FROM customers
  WHERE normalized_phone = CASE
    WHEN substr(phone_digits, 1, 2) = '62' THEN phone_digits
    WHEN substr(phone_digits, 1, 1) = '0' THEN '62' || substr(phone_digits, 2)
    WHEN substr(phone_digits, 1, 1) = '8' THEN '62' || phone_digits
    ELSE phone_digits
  END
  LIMIT 1
)
FROM (
  SELECT
    id AS transaction_id,
    replace(replace(replace(replace(replace(replace(replace(customer_phone, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '/', '') AS phone_digits
  FROM pos_transactions
) normalized
WHERE pos_transactions.id = normalized.transaction_id
  AND pos_transactions.customer_id IS NULL
  AND phone_digits != '';

UPDATE bookings
SET customer_id = (
  SELECT id
  FROM customers
  WHERE normalized_phone = CASE
    WHEN substr(phone_digits, 1, 2) = '62' THEN phone_digits
    WHEN substr(phone_digits, 1, 1) = '0' THEN '62' || substr(phone_digits, 2)
    WHEN substr(phone_digits, 1, 1) = '8' THEN '62' || phone_digits
    ELSE phone_digits
  END
  LIMIT 1
)
FROM (
  SELECT
    id AS booking_id,
    replace(replace(replace(replace(replace(replace(replace(customer_whatsapp, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '/', '') AS phone_digits
  FROM bookings
) normalized
WHERE bookings.id = normalized.booking_id
  AND bookings.customer_id IS NULL
  AND phone_digits != '';

UPDATE fitting_appointments
SET customer_id = (
  SELECT id
  FROM customers
  WHERE normalized_phone = CASE
    WHEN substr(phone_digits, 1, 2) = '62' THEN phone_digits
    WHEN substr(phone_digits, 1, 1) = '0' THEN '62' || substr(phone_digits, 2)
    WHEN substr(phone_digits, 1, 1) = '8' THEN '62' || phone_digits
    ELSE phone_digits
  END
  LIMIT 1
)
FROM (
  SELECT
    id AS appointment_id,
    replace(replace(replace(replace(replace(replace(replace(customer_whatsapp, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '/', '') AS phone_digits
  FROM fitting_appointments
) normalized
WHERE fitting_appointments.id = normalized.appointment_id
  AND fitting_appointments.customer_id IS NULL
  AND phone_digits != '';
