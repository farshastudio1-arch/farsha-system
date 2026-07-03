CREATE TABLE kebaya_items_taxonomy_new (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('S-M', 'L-XL')),
  model TEXT NOT NULL CHECK (
    model IN (
      'Kebaya Modern',
      'Kebaya Kutubaru',
      'Kebaya Janggan',
      'Dress Premium',
      'Bajubodo Modern',
      'Kurung Melayu'
    )
  ),
  rental_price INTEGER NOT NULL CHECK (rental_price >= 0),
  status TEXT NOT NULL CHECK (status IN ('available', 'rented', 'maintenance', 'archived')),
  rental_end_date TEXT,
  image_urls TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  categories TEXT NOT NULL DEFAULT '[]',
  measurements TEXT NOT NULL DEFAULT '{}'
);

INSERT INTO kebaya_items_taxonomy_new (
  id,
  code,
  name,
  color,
  size,
  model,
  rental_price,
  status,
  rental_end_date,
  image_urls,
  description,
  created_at,
  updated_at,
  categories,
  measurements
)
SELECT
  id,
  code,
  name,
  color,
  CASE
    WHEN size IN ('L-XL', 'L', 'XL', 'Custom') THEN 'L-XL'
    ELSE 'S-M'
  END,
  CASE
    WHEN model = 'Kebaya Kutubaru' OR model = 'Kutubaru' THEN 'Kebaya Kutubaru'
    WHEN model = 'Kebaya Janggan' OR model IN ('Klasik', 'Kartini') THEN 'Kebaya Janggan'
    WHEN model = 'Dress Premium' THEN 'Dress Premium'
    WHEN model = 'Bajubodo Modern' THEN 'Bajubodo Modern'
    WHEN model = 'Kurung Melayu' THEN 'Kurung Melayu'
    ELSE 'Kebaya Modern'
  END,
  rental_price,
  status,
  rental_end_date,
  image_urls,
  description,
  created_at,
  updated_at,
  categories,
  CASE
    WHEN measurements = '{}' OR measurements IS NULL THEN '{}'
    WHEN instr(measurements, '"Makassar Only"') > 0 THEN measurements
    WHEN instr(measurements, '"Bisa Luar Kota"') > 0 THEN measurements
    ELSE replace(
      replace(
        replace(
          replace(
            replace(measurements, '"Offline Studio"', '"Makassar Only"'),
            '"Studio Fitting"',
            '"Makassar Only"'
          ),
          '"Event Rental"',
          '"Bisa Luar Kota"'
        ),
        '"Bridesmaid Package"',
        '"Bisa Luar Kota"'
      ),
      '"Custom Booking"',
      '"Bisa Luar Kota"'
    )
  END
FROM kebaya_items;

DROP TABLE kebaya_items;

ALTER TABLE kebaya_items_taxonomy_new RENAME TO kebaya_items;

CREATE INDEX IF NOT EXISTS idx_kebaya_items_code ON kebaya_items (code);
CREATE INDEX IF NOT EXISTS idx_kebaya_items_status ON kebaya_items (status);
CREATE INDEX IF NOT EXISTS idx_kebaya_items_model ON kebaya_items (model);
