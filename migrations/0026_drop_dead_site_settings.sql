-- Drop dead site_settings columns that were persisted but never drove any
-- rendered output. See admin settings cleanup: logo/favicon are now hardcoded
-- brand assets, catalog card mode was only a preset shortcut, and status,
-- currency, default_product_status, default_sort, brand_color, and
-- show_promo_banner had no live consumers.
--
-- Deploy order: ship the application code that stops reading/writing these
-- columns BEFORE running this migration. Take a D1 backup first.
--
-- Why this order is safe: the dropped columns are all NOT NULL with no DEFAULT.
-- site_settings holds a single row (id='main'), so saving settings hits the
-- ON CONFLICT(id) DO UPDATE path, which leaves these still-present columns
-- untouched. The bare INSERT path would violate NOT NULL on the omitted
-- columns, but that only fires on a DB with no 'main' row yet — not an
-- existing/production DB. On a fresh DB, run this migration before first save.
ALTER TABLE site_settings DROP COLUMN status;
ALTER TABLE site_settings DROP COLUMN currency;
ALTER TABLE site_settings DROP COLUMN default_product_status;
ALTER TABLE site_settings DROP COLUMN default_sort;
ALTER TABLE site_settings DROP COLUMN catalog_card_mode;
ALTER TABLE site_settings DROP COLUMN brand_color;
ALTER TABLE site_settings DROP COLUMN logo_url;
ALTER TABLE site_settings DROP COLUMN favicon_url;
ALTER TABLE site_settings DROP COLUMN show_promo_banner;
