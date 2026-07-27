-- Internal per-item acquisition cost (modal). Used for BEP / earned-back tracking.
-- Nullable: existing items have no recorded cost until an admin fills it in.
ALTER TABLE kebaya_items
ADD COLUMN cost INTEGER CHECK (cost IS NULL OR cost >= 0);
