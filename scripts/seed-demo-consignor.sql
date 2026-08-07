-- Demo consignor for local testing. Regenerate with: node scripts/seed-demo-consignor.mjs > scripts/seed-demo-consignor.sql
-- Login: demo@titipsewa.test / demo1234
INSERT INTO consignors (id, email, password_hash, password_salt, name, phone, status, terms_version, terms_accepted_at)
VALUES ('consignor-demo-local', 'demo@titipsewa.test', 'pbkdf2-sha256$100000$efab1ec0be6acc7e8f706b3aa1e71242511f113b67c71d1112c7b3d985e167c9', '7a19bbe0edd92dfd5b23b57eef057db1', 'Demo Partner', '081234567890', 'active', 'v1', CURRENT_TIMESTAMP)
ON CONFLICT(email) DO UPDATE SET
  password_hash = excluded.password_hash,
  password_salt = excluded.password_salt,
  status = 'active',
  terms_version = 'v1',
  terms_accepted_at = COALESCE(consignors.terms_accepted_at, CURRENT_TIMESTAMP),
  updated_at = CURRENT_TIMESTAMP;

-- Two consigned garments so "Baju kamu" is populated. image_urls uses a bundled
-- public asset so the dashboard thumbnails render without external dependencies.
INSERT INTO kebaya_items (id, code, name, color, size, model, rental_price, status, description, published, consignor_id, image_urls)
VALUES
  ('kebaya-demo-001', 'DEMO-01', 'Kebaya Kartini Emerald', 'Emerald', 'M-L', 'Kebaya Modern', 250000, 'available', 'Kebaya modern warna emerald untuk demo consignment.', 1, 'consignor-demo-local', '["/logo-mark.png"]'),
  ('kebaya-demo-002', 'DEMO-02', 'Dress Brokat Dusty Pink', 'Dusty Pink', 'S-M', 'Dress Premium', 200000, 'rented', 'Dress brokat dusty pink untuk demo consignment.', 1, 'consignor-demo-local', '["/logo-mark.png"]')
ON CONFLICT(id) DO UPDATE SET
  consignor_id = excluded.consignor_id,
  status = excluded.status,
  image_urls = excluded.image_urls,
  updated_at = CURRENT_TIMESTAMP;
