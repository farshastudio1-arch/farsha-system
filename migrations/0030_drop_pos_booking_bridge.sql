-- Drop the unwired booking<->POS bridge added in 0013_booking_pos_bridge.sql.
-- pos_transactions.booking_id and pos_transactions.booking_item_id (plus their
-- indexes) were scaffolded for linking POS transactions back to bookings, but
-- no application code ever read or wrote them: the INSERT INTO pos_transactions
-- statement, the PosTransactionRow type, and transactionRowToModel all omit
-- these columns. Confirmed abandoned.
--
-- Deploy order: no application code references these columns, so there is no
-- code change to ship first. Take a D1 backup before running this migration.
--
-- Why this order is safe: SQLite/D1 cannot drop a column that participates in an
-- index, so both indexes are dropped first. Both columns are nullable
-- (TEXT ... ON DELETE SET NULL) with no data written by the app, so dropping
-- them cannot violate NOT NULL and loses no live data.
DROP INDEX IF EXISTS idx_pos_transactions_booking;
DROP INDEX IF EXISTS idx_pos_transactions_booking_item;
ALTER TABLE pos_transactions DROP COLUMN booking_item_id;
ALTER TABLE pos_transactions DROP COLUMN booking_id;
