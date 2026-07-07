PRAGMA foreign_keys = ON;

DELETE FROM booking_status_history;
DELETE FROM booking_invoices;
DELETE FROM booking_payment_proofs;
DELETE FROM booking_payments;
DELETE FROM booking_items;
DELETE FROM bookings;

DELETE FROM pos_audit_history;
DELETE FROM pos_receipts;
DELETE FROM pos_maintenance_holds;
DELETE FROM pos_transactions;

DELETE FROM name_generator_used_names
WHERE source = 'catalog';

DELETE FROM kebaya_items;
