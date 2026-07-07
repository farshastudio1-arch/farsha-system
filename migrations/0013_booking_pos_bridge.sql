PRAGMA foreign_keys = ON;

ALTER TABLE pos_transactions ADD COLUMN booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE pos_transactions ADD COLUMN booking_item_id TEXT REFERENCES booking_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pos_transactions_booking
  ON pos_transactions (booking_id);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_booking_item
  ON pos_transactions (booking_item_id);
