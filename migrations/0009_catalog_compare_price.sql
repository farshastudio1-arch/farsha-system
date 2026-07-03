ALTER TABLE kebaya_items
ADD COLUMN compare_at_rental_price INTEGER CHECK (
  compare_at_rental_price IS NULL OR compare_at_rental_price >= 0
);
