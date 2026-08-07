// Generates the local-D1 seed SQL for a demo consignor login.
// Mirrors src/lib/consignor-crypto.ts (PBKDF2-SHA256, 100k iters, 256-bit).
// Usage: node scripts/seed-demo-consignor.mjs > scripts/seed-demo-consignor.sql

const EMAIL = 'demo@titipsewa.test';
const NAME = 'Demo Partner';
const PHONE = '081234567890';
const PASSWORD = 'demo1234';
const CONSIGNOR_ID = 'consignor-demo-local';

const encoder = new TextEncoder();
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const hexToBytes = (hex) => {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

const saltBytes = new Uint8Array(16);
crypto.getRandomValues(saltBytes);
const salt = toHex(saltBytes);

const baseKey = await crypto.subtle.importKey('raw', encoder.encode(PASSWORD), 'PBKDF2', false, [
  'deriveBits',
]);
const bits = await crypto.subtle.deriveBits(
  { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(salt), iterations: 100_000 },
  baseKey,
  256,
);
const passwordHash = `pbkdf2-sha256$100000$${toHex(new Uint8Array(bits))}`;

const sql = `-- Demo consignor for local testing. Regenerate with: node scripts/seed-demo-consignor.mjs > scripts/seed-demo-consignor.sql
-- Login: ${EMAIL} / ${PASSWORD}
INSERT INTO consignors (id, email, password_hash, password_salt, name, phone, status, terms_version, terms_accepted_at)
VALUES ('${CONSIGNOR_ID}', '${EMAIL}', '${passwordHash}', '${salt}', '${NAME}', '${PHONE}', 'active', 'v1', CURRENT_TIMESTAMP)
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
  ('kebaya-demo-001', 'DEMO-01', 'Kebaya Kartini Emerald', 'Emerald', 'M-L', 'Kebaya Modern', 250000, 'available', 'Kebaya modern warna emerald untuk demo consignment.', 1, '${CONSIGNOR_ID}', '["/logo-mark.png"]'),
  ('kebaya-demo-002', 'DEMO-02', 'Dress Brokat Dusty Pink', 'Dusty Pink', 'S-M', 'Dress Premium', 200000, 'rented', 'Dress brokat dusty pink untuk demo consignment.', 1, '${CONSIGNOR_ID}', '["/logo-mark.png"]')
ON CONFLICT(id) DO UPDATE SET
  consignor_id = excluded.consignor_id,
  status = excluded.status,
  image_urls = excluded.image_urls,
  updated_at = CURRENT_TIMESTAMP;
`;

process.stdout.write(sql);
