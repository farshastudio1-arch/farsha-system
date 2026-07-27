-- Collapse the multi-value wear_styles list into a single hijab_friendly flag.
-- Existing rows keep the versatile default (1) unless they were tagged Non-Hijab only.
ALTER TABLE kebaya_items
ADD COLUMN hijab_friendly INTEGER NOT NULL DEFAULT 1 CHECK (hijab_friendly IN (0, 1));

-- Backfill: an item is hijab friendly when its wear_styles JSON contains the
-- exact token "Hijab" (the leading quote excludes the "Non-Hijab" token).
UPDATE kebaya_items
SET hijab_friendly = CASE
  WHEN wear_styles LIKE '%"Hijab"%' THEN 1
  ELSE 0
END;
