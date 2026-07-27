-- Draft / published state. Unpublished items are hidden from the public storefront
-- (catalog + booking) but remain visible to admin and POS. Existing items default
-- to published so nothing disappears from the storefront after migrating.
ALTER TABLE kebaya_items
ADD COLUMN published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1));
