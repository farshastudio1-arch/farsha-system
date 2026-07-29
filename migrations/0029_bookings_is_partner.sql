ALTER TABLE bookings ADD COLUMN is_partner INTEGER NOT NULL DEFAULT 0 CHECK (is_partner IN (0, 1));
