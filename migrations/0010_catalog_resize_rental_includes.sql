CREATE TABLE kebaya_items_catalog_details_new (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  size TEXT NOT NULL CHECK (size IN ('S-M', 'M-L', 'L-XL')),
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
  compare_at_rental_price INTEGER CHECK (
    compare_at_rental_price IS NULL OR compare_at_rental_price >= 0
  ),
  can_resize INTEGER NOT NULL DEFAULT 0 CHECK (can_resize IN (0, 1)),
  status TEXT NOT NULL CHECK (status IN ('available', 'rented', 'maintenance', 'archived')),
  rental_end_date TEXT,
  image_urls TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  wear_styles TEXT NOT NULL DEFAULT '["Hijab","Non-Hijab"]',
  rental_includes TEXT NOT NULL DEFAULT '["Skirt","Kebaya","Hijab","Manset","Bustier"]',
  categories TEXT NOT NULL DEFAULT '[]',
  measurements TEXT NOT NULL DEFAULT '{}'
);

INSERT INTO kebaya_items_catalog_details_new (
  id,
  code,
  name,
  color,
  size,
  model,
  rental_price,
  compare_at_rental_price,
  can_resize,
  status,
  rental_end_date,
  image_urls,
  description,
  created_at,
  updated_at,
  wear_styles,
  rental_includes,
  categories,
  measurements
)
SELECT
  id,
  code,
  name,
  color,
  CASE
    WHEN size IN ('M-L', 'M') THEN 'M-L'
    WHEN size IN ('L-XL', 'L', 'XL', 'Custom') THEN 'L-XL'
    ELSE 'S-M'
  END,
  model,
  rental_price,
  compare_at_rental_price,
  0,
  status,
  rental_end_date,
  image_urls,
  description,
  created_at,
  updated_at,
  wear_styles,
  '["Skirt","Kebaya","Hijab","Manset","Bustier"]',
  categories,
  measurements
FROM kebaya_items;

DROP TABLE kebaya_items;

ALTER TABLE kebaya_items_catalog_details_new RENAME TO kebaya_items;

CREATE INDEX IF NOT EXISTS idx_kebaya_items_code ON kebaya_items (code);
CREATE INDEX IF NOT EXISTS idx_kebaya_items_status ON kebaya_items (status);
CREATE INDEX IF NOT EXISTS idx_kebaya_items_model ON kebaya_items (model);
