-- Consignor item withdrawal ("tarik barang") is now handled manually over
-- WhatsApp between consignor and studio, so the feature and its table are gone.
-- Dropping the table also removes idx_consignor_withdrawal_requests_consignor.
DROP TABLE IF EXISTS consignor_withdrawal_requests;
