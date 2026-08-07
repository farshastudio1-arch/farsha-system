-- Consignor self-service account settings.
-- avatar_seed  : DiceBear "critters" seed the consignor picked (NULL = derive from id).
-- payout_method: 'bank' or 'ewallet'. The destination columns (bank_account_name,
--                bank_name, bank_account_number) are reused for both methods —
--                for e-wallet, bank_name holds the provider (GoPay/OVO/DANA/…) and
--                bank_account_number holds the e-wallet phone/number.
ALTER TABLE consignors ADD COLUMN avatar_seed TEXT;
ALTER TABLE consignors ADD COLUMN payout_method TEXT NOT NULL DEFAULT 'bank';
